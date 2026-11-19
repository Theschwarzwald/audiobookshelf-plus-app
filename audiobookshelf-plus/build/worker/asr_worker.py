#!/usr/bin/env python3
"""
Speech-to-text worker for the Audiobookshelf transcription add-on.

Speaks JSON lines on stdin/stdout so the Node side can drive it:

  -> {"op": "load", "engine": "whisper", "model": "<hf repo>", "device": "auto|cuda|cpu", "threads": 0}
  -> {"op": "load", "engine": "sherpa", "archive": "<sherpa-onnx model archive>", "device": …, "threads": 0}
  <- {"ev": "downloading"}            (only when the model isn't cached yet)
  <- {"ev": "loaded", "device": "cuda", "compute": "float16", "batched": true}

  -> {"op": "transcribe", "id": 1, "url": "...", "headers": "Authorization: Bearer ...\\r\\n",
      "start": 0.0, "end": 3600.0, "language": null}
  <- {"ev": "language", "id": 1, "language": "en", "probability": 0.98}
  <- {"ev": "segment", "id": 1, "start": 1.2, "end": 5.6, "words": [{"w": " Hello", "s": 1.2, "e": 1.5}, ...]}
  <- {"ev": "progress", "id": 1, "t": 600.0}
  <- {"ev": "done", "id": 1}
  <- {"ev": "error", "id": 1, "msg": "..."}

Times are seconds in the audio file. Audio is decoded by ffmpeg straight from the
Audiobookshelf server in windows of WINDOW_SEC, so a 40-hour book never has to fit in memory.
A window only commits segments that end GUARD_SEC before its end; the next window starts
where the last committed segment ended, so no words are cut in half at window edges.

`python3 asr_worker.py --probe` prints the hardware and the engines that are installed, and exits:
{"cuda", "gpu", "vramMb", "cpus", "ramMb", "avx2", "avx512", "engines": {"whisper", "sherpa", "sherpaCuda"}}

Engines:
  whisper  faster-whisper (CTranslate2): OpenAI Whisper and Distil-Whisper. GPU (CUDA) or CPU.
  sherpa   sherpa-onnx (ONNX Runtime): NVIDIA NeMo Parakeet TDT 0.6B v2 / v3, int8. Very accurate,
           with punctuation and real per-token timestamps, and fast on a plain CPU. Same model files
           as the Android app. Uses CUDA when the CUDA build of sherpa-onnx is installed.

Pause/cancel: the Node side simply kills this process. Resuming starts a new one.
"""
import json
import os
import subprocess
import sys
import threading

WINDOW_SEC = float(os.environ.get("ASR_WINDOW_SEC", "600"))
GUARD_SEC = 3.0
SAMPLE_RATE = 16000

_out_lock = threading.Lock()


def emit(obj):
    with _out_lock:
        sys.stdout.write(json.dumps(obj, ensure_ascii=False) + "\n")
        sys.stdout.flush()


def log(msg):
    sys.stderr.write(f"[asr_worker] {msg}\n")
    sys.stderr.flush()


def gpu_info():
    """[(name, total MiB)] from nvidia-smi"""
    try:
        out = subprocess.run(
            ["nvidia-smi", "--query-gpu=name,memory.total", "--format=csv,noheader,nounits"],
            capture_output=True, text=True, timeout=10,
        )
        res = []
        for line in out.stdout.splitlines():
            parts = [x.strip() for x in line.split(",")]
            if len(parts) >= 2 and parts[0]:
                res.append((parts[0], int(float(parts[1])) if parts[1].replace(".", "", 1).isdigit() else 0))
        return res
    except Exception:
        return []


def gpu_name():
    g = gpu_info()
    return g[0][0] if g else None


def cpu_count():
    try:
        return len(os.sched_getaffinity(0))  # respects container CPU limits
    except Exception:
        return os.cpu_count() or 1


def ram_mb():
    try:
        # a container memory limit counts, if there is one
        for f in ("/sys/fs/cgroup/memory.max", "/sys/fs/cgroup/memory/memory.limit_in_bytes"):
            if os.path.exists(f):
                v = open(f).read().strip()
                if v.isdigit() and int(v) < 1 << 50:
                    return int(v) // (1024 * 1024)
        for line in open("/proc/meminfo"):
            if line.startswith("MemTotal:"):
                return int(line.split()[1]) // 1024
    except Exception:
        pass
    return 0


def cpu_flags():
    try:
        for line in open("/proc/cpuinfo"):
            if line.startswith("flags"):
                return set(line.split(":", 1)[1].split())
    except Exception:
        pass
    return set()


def engines():
    out = {"whisper": False, "sherpa": False, "sherpaCuda": False, "problems": []}
    try:
        import faster_whisper  # noqa: F401
        from faster_whisper.utils import download_model  # noqa: F401  (needs 'requests')
        out["whisper"] = True
    except Exception as e:
        out["problems"].append(f"Whisper: {e}")
    try:
        import sherpa_onnx
        out["sherpa"] = True
        out["sherpaVersion"] = getattr(sherpa_onnx, "__version__", "")
        out["sherpaCuda"] = "cuda" in out["sherpaVersion"].lower() or os.environ.get("SHERPA_CUDA") == "1"
    except Exception as e:
        out["problems"].append(f"Parakeet (sherpa-onnx): {e}")
    return out


def cuda_count():
    try:
        import ctranslate2
        return int(ctranslate2.get_cuda_device_count())
    except Exception as e:  # no CUDA runtime in the container, or no GPU passed through
        log(f"CUDA not available: {e}")
        return 0


def probe():
    n = cuda_count()
    gpus = gpu_info() if n > 0 else []
    flags = cpu_flags()
    emit({
        "cuda": n,
        "gpu": gpus[0][0] if gpus else None,
        "vramMb": max([g[1] for g in gpus], default=0),
        "cpus": cpu_count(),
        "ramMb": ram_mb(),
        "avx2": "avx2" in flags,
        "avx512": any(f.startswith("avx512") for f in flags),
        "engines": engines(),
    })


def supported_kwargs(fn, opts):
    """Drops options this faster-whisper version doesn't know (the API differs a little between releases)."""
    import inspect
    try:
        params = inspect.signature(fn).parameters
        if any(p.kind == p.VAR_KEYWORD for p in params.values()):
            return opts
        return {k: v for k, v in opts.items() if k in params}
    except (TypeError, ValueError):
        return opts


def is_oom(e):
    m = str(e).lower()
    return "out of memory" in m or "cuda_error_out_of_memory" in m or "cublas_status_alloc_failed" in m or "bad_alloc" in m


def free_memory():
    import gc
    gc.collect()
    try:
        import torch  # only present in some images; frees the VAD / pipeline caches
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
    except Exception:
        pass


def default_batch_size():
    """GPU batch size for the card: 16 needs ~8 GB with large models; small cards get less"""
    env = os.environ.get("ASR_BATCH_SIZE")
    if env:
        return max(1, int(env))
    vram = max([g[1] for g in gpu_info()], default=0)
    if vram and vram <= 4096:
        return 4
    if vram and vram <= 6144:
        return 8
    if vram and vram <= 8192:
        return 12
    return 16


class Engine:
    def __init__(self):
        self.model = None
        self.batched = None
        self.device = "cpu"
        self.compute = "int8"
        self.repo = None
        self.threads = 0
        self.batch_size = 16

    def load(self, repo, device="auto", threads=0, prefer_compute=None):
        from faster_whisper import WhisperModel

        self.repo, self.threads = repo, threads
        if self.model is not None:
            self.model = None
            self.batched = None
            free_memory()

        cache = os.environ.get("MODELS_DIR", "/models")
        try:
            from huggingface_hub import try_to_load_from_cache
            cached = try_to_load_from_cache(repo, "model.bin", cache_dir=cache)
            if not isinstance(cached, str):
                emit({"ev": "downloading"})
        except Exception:
            pass

        want = device
        if want == "auto":
            want = "cuda" if cuda_count() > 0 else "cpu"

        attempts = []
        if want == "cuda":
            attempts += [("cuda", "int8_float16")] if prefer_compute == "int8_float16" else [("cuda", "float16"), ("cuda", "int8_float16")]
        attempts += [("cpu", "int8")]
        last_err = None
        for dev, compute in attempts:
            try:
                kwargs = dict(device=dev, compute_type=compute, download_root=cache)
                if dev == "cpu":
                    kwargs["cpu_threads"] = threads or (os.cpu_count() or 4)
                self.model = WhisperModel(repo, **kwargs)
                self.device, self.compute = dev, compute
                break
            except Exception as e:
                last_err = e
                log(f"Loading {repo} on {dev}/{compute} failed: {e}")
        if self.model is None:
            raise RuntimeError(f"Couldn't load the speech model: {last_err}")

        # Batched inference is several times faster on a GPU
        self.batched = None
        self.batch_size = default_batch_size()
        if self.device == "cuda":
            try:
                from faster_whisper import BatchedInferencePipeline
                self.batched = BatchedInferencePipeline(model=self.model)
            except Exception as e:
                log(f"Batched pipeline unavailable: {e}")
        emit({"ev": "loaded", "device": self.device, "compute": self.compute, "batched": self.batched is not None, "batchSize": self.batch_size if self.batched is not None else 1})

    def decode(self, url, headers, start, duration):
        import numpy as np

        cmd = ["ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error"]
        if url.startswith("http"):
            if headers:
                cmd += ["-headers", headers]
            cmd += ["-reconnect", "1", "-reconnect_delay_max", "10"]
        cmd += ["-ss", f"{max(0.0, start):.3f}", "-t", f"{max(0.1, duration):.3f}", "-i", url,
                "-vn", "-ac", "1", "-ar", str(SAMPLE_RATE), "-f", "f32le", "-"]
        proc = subprocess.run(cmd, capture_output=True)
        if proc.returncode != 0:
            msg = proc.stderr.decode("utf-8", "replace").strip().splitlines()
            raise RuntimeError("ffmpeg failed: " + (msg[-1] if msg else f"exit {proc.returncode}"))
        return np.frombuffer(proc.stdout, dtype=np.float32)

    def run_window(self, audio, language, beam):
        """One window, all its segments read (so a failure part-way emits nothing twice).
        Out of GPU memory: free it and try again with a smaller batch, then one segment at a time,
        then the model in 8-bit (about half the memory), then fewer beams. Only gives up after that."""
        tries = 0
        while True:
            opts = dict(language=language, word_timestamps=True, condition_on_previous_text=False, beam_size=beam)
            if self.batched is not None:
                fn = self.batched.transcribe
                opts.update(batch_size=self.batch_size, vad_filter=True)
            else:
                fn = self.model.transcribe
                opts.update(vad_filter=True, vad_parameters=dict(min_silence_duration_ms=300))
            try:
                segments, info = fn(audio, **supported_kwargs(fn, opts))
                return list(segments), info
            except Exception as e:
                if not is_oom(e) or self.device != "cuda":
                    raise
                tries += 1
                segments = None
                free_memory()
                if self.batched is not None and self.batch_size > 1:
                    self.batch_size = max(1, self.batch_size // 2)
                    step = f"batch size {self.batch_size}"
                elif self.batched is not None:
                    self.batched = None
                    step = "one segment at a time"
                elif self.compute != "int8_float16":
                    self.load(self.repo, "cuda", self.threads, prefer_compute="int8_float16")
                    self.batched = None
                    step = "8-bit model"
                elif beam > 1:
                    beam = 1
                    step = "beam size 1"
                else:
                    raise
                log(f"GPU ran out of memory, retrying with {step}")
                emit({"ev": "notice", "kind": "oom", "msg": f"GPU ran out of memory: continuing with {step}", "tries": tries})

    def transcribe(self, req):
        rid = req.get("id")
        url = req["url"]
        headers = req.get("headers") or ""
        start = float(req.get("start") or 0.0)
        end = float(req.get("end") or 0.0)
        language = req.get("language") or None
        beam = 5 if self.device == "cuda" else int(os.environ.get("CPU_BEAM_SIZE", "1"))

        pos = start
        while pos < end - 0.3:
            want = min(WINDOW_SEC, end - pos)
            audio = self.decode(url, headers, pos, want)
            got = len(audio) / SAMPLE_RATE
            if got < 0.3:
                break
            is_last = (pos + want >= end - 0.01) or (got < want - 1.0)
            commit_limit = pos + got - (0.0 if is_last else GUARD_SEC)

            segments, info = self.run_window(audio, language, beam)

            if language is None and getattr(info, "language", None):
                language = info.language
                emit({"ev": "language", "id": rid, "language": language, "probability": float(getattr(info, "language_probability", 0) or 0)})

            last_end = pos
            for seg in segments:
                s = pos + float(seg.start)
                e = pos + float(seg.end)
                if not is_last and e > commit_limit:
                    break  # redone at the start of the next window
                words = [{"w": w.word, "s": round(pos + float(w.start), 6), "e": round(pos + float(w.end), 6)} for w in (seg.words or [])]
                if not words and seg.text.strip():
                    words = [{"w": seg.text, "s": round(s, 6), "e": round(e, 6)}]
                emit({"ev": "segment", "id": rid, "start": round(s, 3), "end": round(e, 3), "words": words})
                last_end = e
                emit({"ev": "progress", "id": rid, "t": round(e, 3)})
            if is_last:
                break
            pos = last_end if last_end > pos + 1.0 else commit_limit
            emit({"ev": "progress", "id": rid, "t": round(pos, 3)})
        emit({"ev": "done", "id": rid})


SHERPA_BASE = "https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models"
SHERPA_MAX_SEG = 25.0  # Parakeet is best with segments up to ~25 s


def words_from_tokens(tokens, times, seg_end):
    """BPE tokens -> words, same rule as the Android app: a token starting with ▁ or a space starts a word."""
    words = []
    cur = ""
    start = 0.0
    for tok, t in zip(tokens, times):
        new_word = tok.startswith("\u2581") or tok.startswith(" ")
        clean = tok.replace("\u2581", " ").strip()
        if not clean and not new_word:
            continue
        if new_word and cur:
            words.append([cur, start])
            cur = ""
        if not cur:
            start = float(t)
        cur += clean
    if cur:
        words.append([cur, start])
    out = []
    for i, (w, st) in enumerate(words):
        en = words[i + 1][1] if i + 1 < len(words) else seg_end
        out.append({"w": " " + w, "s": st, "e": max(st, en)})
    return out


def download(url, dest):
    import urllib.request
    tmp = dest + ".part"
    with urllib.request.urlopen(url, timeout=60) as r, open(tmp, "wb") as f:
        while True:
            b = r.read(1 << 20)
            if not b:
                break
            f.write(b)
    os.replace(tmp, dest)


class SherpaEngine:
    """NVIDIA Parakeet TDT (NeMo) through sherpa-onnx"""

    def __init__(self):
        self.rec = None
        self.vad_model = None
        self.device = "cpu"

    def load(self, archive, device="auto", threads=0):
        import sherpa_onnx
        import tarfile

        root = os.path.join(os.environ.get("MODELS_DIR", "/models"), "sherpa")
        os.makedirs(root, exist_ok=True)
        mdir = os.path.join(root, archive)
        if not os.path.exists(os.path.join(mdir, "tokens.txt")):
            emit({"ev": "downloading"})
            tarball = os.path.join(root, archive + ".tar.bz2")
            download(f"{SHERPA_BASE}/{archive}.tar.bz2", tarball)
            with tarfile.open(tarball, "r:bz2") as t:
                t.extractall(root, filter="data") if hasattr(tarfile, "data_filter") else t.extractall(root)
            os.remove(tarball)
        self.vad_model = os.path.join(root, "silero_vad.onnx")
        if not os.path.exists(self.vad_model):
            download(f"{SHERPA_BASE}/silero_vad.onnx", self.vad_model)

        def f(name):
            p = os.path.join(mdir, name)
            if not os.path.exists(p):
                raise RuntimeError(f"{archive}: {name} missing")
            return p

        n = threads or cpu_count()
        providers = (["cuda", "cpu"] if device in ("auto", "cuda") and cuda_count() > 0 and engines().get("sherpaCuda") else ["cpu"])
        last = None
        for prov in providers:
            try:
                self.rec = sherpa_onnx.OfflineRecognizer.from_transducer(
                    encoder=f("encoder.int8.onnx"), decoder=f("decoder.int8.onnx"), joiner=f("joiner.int8.onnx"),
                    tokens=f("tokens.txt"), num_threads=n, sample_rate=16000, feature_dim=80,
                    decoding_method="greedy_search", model_type="nemo_transducer", provider=prov,
                )
                self.device = prov
                break
            except Exception as e:
                last = e
                log(f"sherpa-onnx on {prov} failed: {e}")
        if self.rec is None:
            raise RuntimeError(f"Couldn't load {archive}: {last}")
        emit({"ev": "loaded", "device": self.device, "compute": "int8", "engine": "sherpa", "threads": n})

    def new_vad(self, seconds):
        import sherpa_onnx
        cfg = sherpa_onnx.VadModelConfig()
        cfg.silero_vad.model = self.vad_model
        cfg.silero_vad.threshold = 0.5
        cfg.silero_vad.min_silence_duration = 0.3
        cfg.silero_vad.min_speech_duration = 0.25
        try:
            cfg.silero_vad.max_speech_duration = SHERPA_MAX_SEG
        except Exception:
            pass
        cfg.sample_rate = 16000
        return sherpa_onnx.VoiceActivityDetector(cfg, buffer_size_in_seconds=seconds + 60)

    def recognize(self, samples):
        s = self.rec.create_stream()
        s.accept_waveform(16000, samples)
        self.rec.decode_stream(s)
        r = s.result
        return list(getattr(r, "tokens", []) or []), list(getattr(r, "timestamps", []) or []), getattr(r, "text", "")

    def transcribe(self, req, decode):
        rid = req.get("id")
        url = req["url"]
        headers = req.get("headers") or ""
        start = float(req.get("start") or 0.0)
        end = float(req.get("end") or 0.0)
        pos = start
        while pos < end - 0.3:
            want = min(WINDOW_SEC, end - pos)
            audio = decode(url, headers, pos, want)
            got = len(audio) / SAMPLE_RATE
            if got < 0.3:
                break
            is_last = (pos + want >= end - 0.01) or (got < want - 1.0)
            commit_limit = pos + got - (0.0 if is_last else GUARD_SEC)
            vad = self.new_vad(got)
            segments = []
            for i in range(0, len(audio), 512):
                vad.accept_waveform(audio[i:i + 512])
                while not vad.empty():
                    segments.append((vad.front.start, vad.front.samples))
                    vad.pop()
            vad.flush()
            while not vad.empty():
                segments.append((vad.front.start, vad.front.samples))
                vad.pop()
            last_end = pos
            stop = False
            for seg_start, seg_samples in segments:
                # long stretches without a pause: split so Parakeet stays accurate
                step = int(SHERPA_MAX_SEG * SAMPLE_RATE)
                for off in range(0, len(seg_samples), step):
                    chunk = seg_samples[off:off + step]
                    if len(chunk) < int(0.3 * SAMPLE_RATE):
                        continue
                    s0 = pos + (seg_start + off) / SAMPLE_RATE
                    s1 = s0 + len(chunk) / SAMPLE_RATE
                    if not is_last and s1 > commit_limit:
                        stop = True
                        break
                    tokens, times, text = self.recognize(chunk)
                    if tokens and len(times) == len(tokens):
                        words = words_from_tokens(tokens, [s0 + float(t) for t in times], s1)
                    elif text.strip():
                        words = [{"w": " " + text.strip(), "s": round(s0, 6), "e": round(s1, 6)}]
                    else:
                        words = []
                    if words:
                        for w in words:
                            w["s"] = round(w["s"], 3)
                            w["e"] = round(w["e"], 3)
                        emit({"ev": "segment", "id": rid, "start": round(s0, 3), "end": round(s1, 3), "words": words})
                    last_end = s1
                    emit({"ev": "progress", "id": rid, "t": round(s1, 3)})
                if stop:
                    break
            if is_last:
                break
            pos = last_end if last_end > pos + 1.0 else commit_limit
            emit({"ev": "progress", "id": rid, "t": round(pos, 3)})
        emit({"ev": "done", "id": rid})


def download_only(kind, name):
    """Fetches a model's files into MODELS_DIR without loading it (Settings → Transcription → Download)."""
    cache = os.environ.get("MODELS_DIR", "/models")
    if kind == "whisper":
        from faster_whisper.utils import download_model
        path = download_model(name, cache_dir=cache)
        emit({"ev": "downloaded", "path": path})
        return
    import tarfile
    root = os.path.join(cache, "sherpa")
    os.makedirs(root, exist_ok=True)
    mdir = os.path.join(root, name)
    if not os.path.exists(os.path.join(mdir, "tokens.txt")):
        tarball = os.path.join(root, name + ".tar.bz2")
        download(f"{SHERPA_BASE}/{name}.tar.bz2", tarball)
        with tarfile.open(tarball, "r:bz2") as t:
            t.extractall(root, filter="data") if hasattr(tarfile, "data_filter") else t.extractall(root)
        os.remove(tarball)
    vad = os.path.join(root, "silero_vad.onnx")
    if not os.path.exists(vad):
        download(f"{SHERPA_BASE}/silero_vad.onnx", vad)
    emit({"ev": "downloaded", "path": mdir})


def main():
    if "--probe" in sys.argv:
        probe()
        return
    if "--download" in sys.argv:
        i = sys.argv.index("--download")
        try:
            download_only(sys.argv[i + 1], sys.argv[i + 2])
        except Exception as e:
            emit({"ev": "error", "msg": str(e)})
            sys.exit(1)
        return
    whisper = Engine()
    sherpa = SherpaEngine()
    engine = whisper
    for raw in sys.stdin:
        raw = raw.strip()
        if not raw:
            continue
        try:
            req = json.loads(raw)
        except Exception:
            continue
        op = req.get("op")
        try:
            if op == "load":
                if req.get("engine") == "sherpa":
                    engine = sherpa
                    sherpa.load(req["archive"], req.get("device", "auto"), int(req.get("threads") or 0))
                else:
                    engine = whisper
                    whisper.load(req["model"], req.get("device", "auto"), int(req.get("threads") or 0))
            elif op == "transcribe":
                if engine is sherpa:
                    if sherpa.rec is None:
                        raise RuntimeError("No model loaded")
                    sherpa.transcribe(req, whisper.decode)
                else:
                    if whisper.model is None:
                        raise RuntimeError("No model loaded")
                    whisper.transcribe(req)
            elif op == "ping":
                emit({"ev": "pong"})
        except Exception as e:
            log(f"{op} failed: {e}")
            emit({"ev": "error", "id": req.get("id"), "op": op, "msg": str(e)})


if __name__ == "__main__":
    main()

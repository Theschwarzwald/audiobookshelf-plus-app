#!/usr/bin/env python3
"""Stand-in for asr_worker.py in tests: same protocol, fake words from a known text."""
import json, sys, time, os
TEXT = open(os.path.join(os.path.dirname(__file__), "book.txt")).read().split()
DELAY = float(os.environ.get("MOCK_DELAY", "0"))
def emit(o):
    sys.stdout.write(json.dumps(o) + "\n"); sys.stdout.flush()
if "--probe" in sys.argv:
    emit({"cuda": 0, "gpu": None, "cpus": 4, "ramMb": 8192, "engines": {"whisper": True, "sherpa": True, "sherpaCuda": False}}); sys.exit(0)
for raw in sys.stdin:
    req = json.loads(raw)
    if req["op"] == "load":
        emit({"ev": "loaded", "device": "cpu", "compute": "int8", "batched": False})
    elif req["op"] == "transcribe":
        rid = req["id"]; t = req["start"]; end = req["end"]
        # file offset hint in URL: .../file/<ino>; ino 1 starts at 0, ino 2 at 100 s of the book
        base = 100.0 if req["url"].endswith("/2") else 0.0
        emit({"ev": "language", "id": rid, "language": "en", "probability": 0.99})
        while t < end - 0.3:
            seg_end = min(end, t + 4.0)
            words = []
            n = 6
            for k in range(n):
                idx = int(round((base + t) / 4.0 * 6)) + k
                w = TEXT[idx % len(TEXT)]
                if idx % len(TEXT) == 37: w = "Zalenka"  # a mishearing for the ebook check to catch
                words.append({"w": " " + w, "s": t + k * (seg_end - t) / n, "e": t + (k + 1) * (seg_end - t) / n})
            emit({"ev": "segment", "id": rid, "start": t, "end": seg_end, "words": words})
            emit({"ev": "progress", "id": rid, "t": seg_end})
            t = seg_end
            if DELAY: time.sleep(DELAY)
        emit({"ev": "done", "id": rid})

# Audiobookshelf transcription add-on
#   - reverse proxy in front of Audiobookshelf (adds /api/transcription and the web player's Transcription view)
#   - speech-to-text with faster-whisper: NVIDIA GPU when one is passed to the container, CPU otherwise
FROM python:3.12-slim-bookworm

ARG CUDA=true

RUN apt-get update \
 && apt-get install -y --no-install-recommends nodejs ffmpeg djvulibre-bin ca-certificates tini \
    ocrmypdf tesseract-ocr tesseract-ocr-eng tesseract-ocr-spa tesseract-ocr-fra tesseract-ocr-deu tesseract-ocr-ita tesseract-ocr-por \
    tesseract-ocr-nld tesseract-ocr-jpn tesseract-ocr-chi-sim tesseract-ocr-rus tesseract-ocr-pol tesseract-ocr-swe ghostscript qpdf \
 && rm -rf /var/lib/apt/lists/*

# faster-whisper (CTranslate2). The CUDA 12 / cuDNN 9 runtime comes from pip so the same image runs on
# GPU hosts and plain CPU hosts; build with --build-arg CUDA=false for a much smaller CPU-only image.
# requests: faster-whisper downloads models with it, and newer huggingface_hub releases no longer pull it in
RUN pip install --no-cache-dir "faster-whisper==1.1.1" "requests>=2.31" "huggingface_hub>=0.23,<1" \
 && if [ "$CUDA" = "true" ]; then pip install --no-cache-dir "nvidia-cublas-cu12>=12.4,<13" "nvidia-cudnn-cu12>=9.1,<10"; fi

# NVIDIA Parakeet TDT (English / 25 European languages) through sherpa-onnx: the most accurate option
# for those languages and fast on a plain CPU. On GPU images, try sherpa-onnx's CUDA 12 build first
# (k2-fsa's wheel index); if there isn't one for this version, the CPU build is used and Parakeet
# still runs, just on the processor. The worker reports which one it got.
ARG SHERPA_ONNX_VERSION=1.12.0
RUN set -e; \
    if [ "$CUDA" = "true" ] && pip install --no-cache-dir "sherpa-onnx==${SHERPA_ONNX_VERSION}+cuda12.cudnn9" -f https://k2-fsa.github.io/sherpa/onnx/cuda.html; then \
      echo "sherpa-onnx with CUDA"; \
    else \
      pip install --no-cache-dir "sherpa-onnx==${SHERPA_ONNX_VERSION}" || pip install --no-cache-dir "sherpa-onnx>=1.10,<2"; \
    fi

# Docling: AI page layout for PDF reflow (CPU build of torch; worker/layout_worker.py)
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu && pip install --no-cache-dir "docling>=2.30,<3"

ENV LD_LIBRARY_PATH=/usr/local/lib/python3.12/site-packages/nvidia/cublas/lib:/usr/local/lib/python3.12/site-packages/nvidia/cudnn/lib \
    NVIDIA_VISIBLE_DEVICES=all \
    NVIDIA_DRIVER_CAPABILITIES=compute,utility \
    HF_HOME=/models \
    MODELS_DIR=/models \
    DATA_DIR=/data \
    DICTIONARY_DIR=/dictionaries \
    CATALOG_DIR=/catalog \
    PORT=13378 \
    NODE_ENV=production

WORKDIR /app
COPY server /app/server
COPY worker /app/worker
RUN rm -rf /app/server/test && mkdir -p /data /models /dictionaries /catalog && chmod 777 /data /models /dictionaries /catalog

EXPOSE 13378
VOLUME ["/data", "/models", "/dictionaries", "/catalog"]
HEALTHCHECK --interval=60s --timeout=5s --start-period=30s CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||13378)+'/api/transcription/info').then(r=>process.exit(r.status===401||r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "/app/server/src/index.js"]

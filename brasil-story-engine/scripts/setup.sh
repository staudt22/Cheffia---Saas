#!/usr/bin/env bash
# Instala tudo que a engine precisa (Node + Python + modelos de voz). Rode uma vez.
set -e
cd "$(dirname "$0")/.."
command -v ffmpeg >/dev/null || { echo "Instale o FFmpeg (macOS: brew install ffmpeg · Ubuntu: sudo apt install ffmpeg · Windows: winget install ffmpeg)"; exit 1; }
npm install
PIP="pip3 install"; python3 -m pip --version >/dev/null 2>&1 && PIP="python3 -m pip install"
$PIP kokoro-onnx soundfile numpy scipy num2words pillow || $PIP --break-system-packages kokoro-onnx soundfile numpy scipy num2words pillow
mkdir -p tts_models
for f in kokoro-v1.0.onnx voices-v1.0.bin; do
  [ -f "tts_models/$f" ] || curl -L -o "tts_models/$f" "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/$f"
done
echo "✔ pronto. Teste: npm run make -- um-milhao"

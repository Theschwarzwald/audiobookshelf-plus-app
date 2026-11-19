# Third-party notices

ABS+ is licensed under GPL-3.0 (see `LICENSE`). It includes or uses the third-party software and models below, each under its own licence. Where a component is shipped inside the APK, the web player or the server image, its licence notice is reproduced or linked here.

## Included in the source or bundled into the builds

### Audiobookshelf app
- Use: base of the ABS+ Android/iOS app (modified)
- Copyright: advplyr and contributors
- Licence: GPL-3.0, https://github.com/advplyr/audiobookshelf-app/blob/master/LICENSE

### sherpa-onnx
- Use: speech recognition engine (native libraries in the APK, Python package in the server image)
- Copyright: Xiaomi Corporation and the k2-fsa contributors
- Licence: Apache License 2.0, https://github.com/k2-fsa/sherpa-onnx/blob/master/LICENSE (full text: https://www.apache.org/licenses/LICENSE-2.0)

### ONNX Runtime
- Use: runs the speech models on the phone (native library in the APK)
- Copyright: Microsoft Corporation
- Licence: MIT, https://github.com/microsoft/onnxruntime/blob/main/LICENSE

### Silero VAD
- Use: voice activity detection (`silero_vad.onnx` in the APK)
- Copyright: Silero Team
- Licence: MIT, https://github.com/snakers4/silero-vad/blob/master/LICENSE

### Readium TypeScript toolkit (@readium/navigator, @readium/shared)
- Use: ebook reader for Read along (bundled into the app and the web player)

```
BSD 3-Clause License

Copyright (c) 2022, Readium Foundation

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its
   contributors may be used to endorse or promote products derived from
   this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

### fflate
- Use: unzipping ebooks (bundled into the app and the web player)

```
MIT License

Copyright (c) 2023 Arjun Barrett

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.```

## Installed into the server image at build time (not in this repository)

| Component | Licence | Link |
|---|---|---|
| faster-whisper (SYSTRAN) | MIT | https://github.com/SYSTRAN/faster-whisper |
| CTranslate2 | MIT | https://github.com/OpenNMT/CTranslate2 |
| Docling | MIT | https://github.com/docling-project/docling |
| PyTorch (CPU) | BSD-3-Clause | https://github.com/pytorch/pytorch |
| huggingface_hub, requests | Apache-2.0 | https://github.com/huggingface/huggingface_hub |
| Node.js, FFmpeg, DjVuLibre, tini (Debian packages) | Various open-source licences | see each package in the image |
| NVIDIA CUDA / cuDNN runtime (GPU builds only) | NVIDIA proprietary licence | https://docs.nvidia.com/cuda/eula/ |

## Speech models (downloaded when first used, not in this repository)

| Model | Publisher | Licence |
|---|---|---|
| Parakeet TDT 0.6B v2 and v3 | NVIDIA | CC-BY-4.0, https://huggingface.co/nvidia/parakeet-tdt-0.6b-v2 |
| Whisper (Base to Large v3, Turbo) | OpenAI | MIT, https://github.com/openai/whisper |
| Distil-Whisper Large v3 | Hugging Face | MIT, https://huggingface.co/distil-whisper/distil-large-v3 |
| Moonshine Base | Useful Sensors | MIT, https://github.com/usefulsensors/moonshine |

Parakeet's CC-BY-4.0 licence requires credit: *Parakeet TDT models by NVIDIA, licensed under CC-BY-4.0.*

## Data sources used online

| Source | Use | Licence |
|---|---|---|
| Wiktionary | Dictionary lookups | CC BY-SA 4.0 (credit shown with each entry) |
| Wikipedia / Wikidata / Wikimedia Commons | Author bios and photos | CC BY-SA (bios) / CC0 (Wikidata) / per-file (photos); credit links shown |
| Open Library | Catalogue, Dewey numbers, metadata | CC0 |
| Audnexus, Apple Books, Google Books, Storytel | Book metadata and covers (fetched per search, not redistributed) | Their own terms |

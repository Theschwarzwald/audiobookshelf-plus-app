#!/usr/bin/env bash
#
# Downloads the sherpa-onnx iOS speech engine for ABS+ on-device transcription (macOS).
#
#   ios/App/Frameworks/SherpaOnnxC.xcframework            the engine (onnxruntime linked in statically)
#   ios/App/App/transcription/sherpa/SherpaOnnx.swift      sherpa-onnx's Swift API, same tag
#
# The version follows Android (SHERPA_ONNX_VERSION in android/app/build.gradle), so both apps use the
# same engine. Override with: SHERPA_ONNX_VERSION=x.y.z ios/App/scripts/fetch-sherpa-onnx.sh
# Safe to run again: does nothing when that version is already there (FORCE=1 downloads again).
#
# Then run: ruby ios/App/scripts/add-sherpa-onnx.rb   (adds it to the Xcode project)
#
# Where the files come from (https://github.com/k2-fsa/sherpa-onnx, Apache-2.0):
#   Since v1.13 the iOS builds are published as zipped xcframeworks under the "xcframework" release tag:
#     sherpa-onnx-v<VERSION>-ios-shared-onnxruntime-static.xcframework.zip  -> SherpaOnnxC.xcframework
#   That one is a dynamic framework with onnxruntime inside, so there is no separate onnxruntime.xcframework.
#   Older versions had sherpa-onnx-v<VERSION>-ios.tar.bz2 in the version's own release (sherpa-onnx.xcframework
#   + onnxruntime.xcframework); that is used as a fallback.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IOS_APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"              # ios/App
REPO_DIR="$(cd "$IOS_APP_DIR/../.." && pwd)"             # project root
GRADLE="$REPO_DIR/android/app/build.gradle"
FRAMEWORKS_DIR="$IOS_APP_DIR/Frameworks"
SWIFT_DIR="$IOS_APP_DIR/App/transcription/sherpa"

VERSION="${SHERPA_ONNX_VERSION:-}"
if [ -z "$VERSION" ] && [ -f "$GRADLE" ]; then
  VERSION="$(sed -n "s/^[[:space:]]*def[[:space:]]*SHERPA_ONNX_VERSION[[:space:]]*=[[:space:]]*['\"]\([^'\"]*\)['\"].*/\1/p" "$GRADLE" | head -n 1)"
fi
if [ -z "$VERSION" ] && [ -f "$REPO_DIR/android/gradle.properties" ]; then
  VERSION="$(sed -n 's/^[[:space:]]*SHERPA_ONNX_VERSION[[:space:]]*=[[:space:]]*\(.*\)$/\1/p' "$REPO_DIR/android/gradle.properties" | head -n 1 | tr -d '[:space:]')"
fi
if [ -z "$VERSION" ]; then
  echo "error: couldn't find SHERPA_ONNX_VERSION in $GRADLE; set SHERPA_ONNX_VERSION=x.y.z" >&2
  exit 1
fi
echo "sherpa-onnx version: $VERSION"

MARKER="$FRAMEWORKS_DIR/.sherpa-onnx-$VERSION"
if [ -f "$MARKER" ] && [ -f "$SWIFT_DIR/SherpaOnnx.swift" ] && [ "${FORCE:-0}" != "1" ]; then
  echo "Already there ($MARKER). FORCE=1 to download again."
  exit 0
fi

WORK="$(mktemp -d "${TMPDIR:-/tmp}/sherpa-onnx-ios.XXXXXX")"
trap 'rm -rf "$WORK"' EXIT

fetch() { # url dest
  echo "Downloading $1"
  curl --fail --location --retry 3 --connect-timeout 30 --progress-bar -o "$2" "$1"
}

mkdir -p "$FRAMEWORKS_DIR" "$SWIFT_DIR"

ZIP_URL="https://github.com/k2-fsa/sherpa-onnx/releases/download/xcframework/sherpa-onnx-v$VERSION-ios-shared-onnxruntime-static.xcframework.zip"
TAR_URL="https://github.com/k2-fsa/sherpa-onnx/releases/download/v$VERSION/sherpa-onnx-v$VERSION-ios.tar.bz2"

# Remove frameworks from an earlier run, so only one version is linked
rm -rf "$FRAMEWORKS_DIR/SherpaOnnxC.xcframework" "$FRAMEWORKS_DIR/sherpa-onnx.xcframework" "$FRAMEWORKS_DIR/onnxruntime.xcframework"
rm -f "$FRAMEWORKS_DIR"/.sherpa-onnx-*

mkdir -p "$WORK/unpacked"
if fetch "$ZIP_URL" "$WORK/sherpa.zip"; then
  unzip -q "$WORK/sherpa.zip" -d "$WORK/unpacked"
  SRC="$(find "$WORK/unpacked" -maxdepth 3 -type d -name '*.xcframework' | head -n 1)"
  if [ -z "$SRC" ]; then echo "error: no .xcframework in $ZIP_URL" >&2; exit 1; fi
  # The zip names it SherpaOnnxC.xcframework (module SherpaOnnxC); keep that name
  cp -R "$SRC" "$FRAMEWORKS_DIR/SherpaOnnxC.xcframework"
  echo "Installed $FRAMEWORKS_DIR/SherpaOnnxC.xcframework"
else
  echo "No zipped xcframework for v$VERSION, trying $TAR_URL"
  fetch "$TAR_URL" "$WORK/sherpa.tar.bz2"
  tar -xjf "$WORK/sherpa.tar.bz2" -C "$WORK/unpacked"
  SHERPA="$(find "$WORK/unpacked" -type d -name 'sherpa-onnx.xcframework' | head -n 1)"
  ORT="$(find "$WORK/unpacked" -type d -name 'onnxruntime.xcframework' | head -n 1)"
  if [ -z "$SHERPA" ] || [ -z "$ORT" ]; then echo "error: sherpa-onnx.xcframework / onnxruntime.xcframework not found in the archive" >&2; exit 1; fi
  cp -R "$SHERPA" "$FRAMEWORKS_DIR/sherpa-onnx.xcframework"
  cp -R "$ORT" "$FRAMEWORKS_DIR/onnxruntime.xcframework"
  echo "Installed $FRAMEWORKS_DIR/sherpa-onnx.xcframework and onnxruntime.xcframework"
fi

# sherpa-onnx's Swift API for the same tag, wrapped in #if ABS_SHERPA so the app still compiles
# if the file is in the project but the engine isn't set up
fetch "https://raw.githubusercontent.com/k2-fsa/sherpa-onnx/v$VERSION/swift-api-examples/SherpaOnnx.swift" "$WORK/SherpaOnnx.swift"
{
  echo "// Downloaded by ios/App/scripts/fetch-sherpa-onnx.sh from sherpa-onnx v$VERSION (Apache-2.0)."
  echo "// https://github.com/k2-fsa/sherpa-onnx/blob/v$VERSION/swift-api-examples/SherpaOnnx.swift"
  echo "// Do not edit: run the script again to update."
  echo "#if ABS_SHERPA"
  cat "$WORK/SherpaOnnx.swift"
  echo ""
  echo "#endif"
} > "$SWIFT_DIR/SherpaOnnx.swift"
echo "Installed $SWIFT_DIR/SherpaOnnx.swift"

echo "$VERSION" > "$MARKER"
echo "Done. Next: ruby ios/App/scripts/add-sherpa-onnx.rb"

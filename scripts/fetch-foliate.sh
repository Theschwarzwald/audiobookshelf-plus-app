#!/usr/bin/env bash
# Vendors the reader engines into static/reader (run by `npm run generate`):
#
#  - foliate-js (https://github.com/johnfactotum/foliate-js, MIT): EPUB, MOBI, AZW3, FB2.
#    No releases; pinned to the last commit before FOLIATE_PIN_DATE, or exactly FOLIATE_COMMIT.
#  - pdf.js (pdfjs-dist, Apache-2.0), legacy build: PDFs in the page reader. The legacy build runs on
#    older Android WebViews (e-ink readers included). Pinned with PDFJS_VERSION.
set -euo pipefail
cd "$(dirname "$0")/.."
FOLIATE_DEST=static/reader/foliate
PDFJS_DEST=static/reader/pdfjs
PIN_DATE="${FOLIATE_PIN_DATE:-2026-10-01}"
PDFJS_VERSION="${PDFJS_VERSION:-4.10.38}"
FORCE="${1:-}"

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

if [ -f "$FOLIATE_DEST/view.js" ] && [ "$FORCE" != "--force" ]; then
  echo "foliate-js already present ($(cat "$FOLIATE_DEST/COMMIT" 2>/dev/null || echo unknown))"
else
  git clone --quiet https://github.com/johnfactotum/foliate-js.git "$tmp/foliate-js"
  (
    cd "$tmp/foliate-js"
    commit="${FOLIATE_COMMIT:-$(git rev-list -n1 --before="$PIN_DATE" HEAD)}"
    git checkout --quiet "$commit"
    echo "$commit" > COMMIT
  )
  rm -rf "$FOLIATE_DEST"
  mkdir -p "$FOLIATE_DEST"
  cp "$tmp"/foliate-js/*.js "$FOLIATE_DEST"/
  cp -r "$tmp"/foliate-js/vendor "$FOLIATE_DEST"/
  cp "$tmp"/foliate-js/LICENSE "$FOLIATE_DEST"/ 2>/dev/null || true
  cp "$tmp"/foliate-js/COMMIT "$FOLIATE_DEST"/
  rm -f "$FOLIATE_DEST"/reader.js
  echo "foliate-js $(cat "$FOLIATE_DEST/COMMIT") -> $FOLIATE_DEST"
fi

if [ -f "$PDFJS_DEST/pdf.mjs" ] && [ "$(cat "$PDFJS_DEST/VERSION" 2>/dev/null)" = "$PDFJS_VERSION" ] && [ "$FORCE" != "--force" ]; then
  echo "pdf.js $PDFJS_VERSION already present"
else
  (cd "$tmp" && npm pack "pdfjs-dist@$PDFJS_VERSION" --silent >/dev/null && tar -xzf pdfjs-dist-*.tgz)
  rm -rf "$PDFJS_DEST"
  mkdir -p "$PDFJS_DEST"
  cp "$tmp/package/legacy/build/pdf.mjs" "$tmp/package/legacy/build/pdf.worker.mjs" "$PDFJS_DEST"/
  cp -r "$tmp/package/cmaps" "$tmp/package/standard_fonts" "$PDFJS_DEST"/
  cp "$tmp/package/LICENSE" "$PDFJS_DEST"/ 2>/dev/null || true
  echo "$PDFJS_VERSION" > "$PDFJS_DEST/VERSION"
  echo "pdf.js $PDFJS_VERSION (legacy build) -> $PDFJS_DEST"
fi

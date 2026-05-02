#!/bin/zsh
set -euo pipefail

ICON_DIR="${1:-$HOME/Downloads/iconset}"
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUILD_ICON="$PROJECT_ROOT/build/icon.icns"

cd "$ICON_DIR"

if ! command -v magick >/dev/null 2>&1; then
  echo "ImageMagick is required."
  echo "Install it with: brew install imagemagick"
  exit 1
fi

SRC=""

for candidate in \
  "1024-mac.png" \
  "1024.png" \
  "icon_512x512@2x.png" \
  "icon_1024x1024.png"
do
  if [[ -f "$candidate" ]]; then
    SRC="$candidate"
    break
  fi
done

if [[ -z "$SRC" ]]; then
  SRC="$(find . -maxdepth 1 -type f \( -iname '*.png' -o -iname '*.webp' -o -iname '*.jpg' -o -iname '*.jpeg' \) | head -n 1 | sed 's#^\./##')"
fi

if [[ -z "$SRC" || ! -f "$SRC" ]]; then
  echo "No usable source image found in: $ICON_DIR"
  echo "Expected something like 1024-mac.png, 1024.png, .webp, .jpg, or .png"
  exit 1
fi

echo "Using source image: $ICON_DIR/$SRC"

rm -rf real.png samo.iconset samo.icns
mkdir samo.iconset

magick "$SRC" -resize 1024x1024 real.png

sips -z 16 16     real.png --out samo.iconset/icon_16x16.png >/dev/null
sips -z 32 32     real.png --out samo.iconset/icon_16x16@2x.png >/dev/null

sips -z 32 32     real.png --out samo.iconset/icon_32x32.png >/dev/null
sips -z 64 64     real.png --out samo.iconset/icon_32x32@2x.png >/dev/null

sips -z 128 128   real.png --out samo.iconset/icon_128x128.png >/dev/null
sips -z 256 256   real.png --out samo.iconset/icon_128x128@2x.png >/dev/null

sips -z 256 256   real.png --out samo.iconset/icon_256x256.png >/dev/null
sips -z 512 512   real.png --out samo.iconset/icon_256x256@2x.png >/dev/null

sips -z 512 512   real.png --out samo.iconset/icon_512x512.png >/dev/null
sips -z 1024 1024 real.png --out samo.iconset/icon_512x512@2x.png >/dev/null

iconutil -c icns samo.iconset -o samo.icns

mkdir -p "$PROJECT_ROOT/build"

if [[ -f "$BUILD_ICON" ]]; then
  cp "$BUILD_ICON" "$BUILD_ICON.bak"
  echo "Backed up old icon to: $BUILD_ICON.bak"
fi

cp samo.icns "$BUILD_ICON"

echo "Done. Updated SAMO icon:"
echo "$BUILD_ICON"

#!/usr/bin/env bash
# Generate placeholder app icons (mauve rounded square with "w") into src-tauri/icons.
set -euo pipefail
cd "$(dirname "$0")/../src-tauri/icons"
magick -size 512x512 xc:none -fill '#cba6f7' -draw 'roundrectangle 32,32 480,480 96,96' \
  -fill '#11111b' -font DejaVu-Sans-Bold -pointsize 300 -gravity center -annotate +0-20 'w' \
  PNG32:icon.png
for s in 32 128; do magick icon.png -resize ${s}x${s} PNG32:${s}x${s}.png; done
magick icon.png -resize 256x256 PNG32:128x128@2x.png

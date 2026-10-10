#!/usr/bin/env bash
# Rasterize the Transformer mark into src-tauri/icons: simple mark at 16/32 px, full mark from 48 px up.
set -euo pipefail
cd "$(dirname "$0")/../src-tauri/icons"
r() { rsvg-convert -w "$2" -h "$2" "$1" -o "$3"; }
for s in 16 32; do r icon-small.svg $s ${s}x${s}.png; done
for s in 48 64 128 256 512; do r icon.svg $s ${s}x${s}.png; done
cp 256x256.png 128x128@2x.png
cp 512x512.png icon.png

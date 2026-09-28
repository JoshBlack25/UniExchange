#!/bin/sh
# Renders the brand PNGs in public/ from their SVG sources. Run from Frontend/:
#   npm run icons
# Uses resvg (fetched by npx on first run, no project dependency) with the
# system fonts, so it works offline once cached.
set -e
RESVG="npx --yes @resvg/resvg-js-cli"

$RESVG --fit-width 1200 public/og-image.svg public/og-image.png
$RESVG --fit-width 512 scripts/brand/icon.svg public/icon-512.png
$RESVG --fit-width 192 scripts/brand/icon.svg public/icon-192.png
$RESVG --fit-width 180 scripts/brand/icon.svg public/apple-touch-icon.png

for f in public/og-image.png public/icon-512.png public/icon-192.png public/apple-touch-icon.png; do
  echo "$f"
done

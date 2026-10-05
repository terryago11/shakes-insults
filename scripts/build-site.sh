#!/bin/sh
# Copies only the files the game needs to run into the folder given as $1 (default: _site),
# which is what the Pages workflow publishes: index.html, style.css, LICENSE, the social preview
# image, the icons, the fonts, and
# every script that index.html loads (so the word packs published are exactly the ones the game
# uses). Anything else (tests, docs, the reference spreadsheet, scripts, unused packs) stays out
# of the website. test/logic.test.js checks the result covers everything index.html and
# style.css load.
set -eu
dest="${1:-_site}"
rm -rf "$dest"
mkdir -p "$dest"
cp index.html style.css LICENSE social-preview.png favicon.svg favicon-32.png apple-touch-icon.png "$dest"/
cp -R fonts "$dest"/
grep -o 'src="[^"]*"' index.html | cut -d'"' -f2 | while read -r file; do
  mkdir -p "$dest/$(dirname "$file")"
  cp "$file" "$dest/$file"
done

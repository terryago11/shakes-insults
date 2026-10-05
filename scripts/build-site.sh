#!/bin/sh
# Copies only the files the game needs to run into the folder given as $1 (default: _site),
# which is what the Pages workflow publishes. Anything not listed here (tests, docs, the
# reference spreadsheet, scripts) stays out of the website. test/logic.test.js checks that
# this list covers everything index.html and style.css load.
set -eu
dest="${1:-_site}"
rm -rf "$dest"
mkdir -p "$dest"
cp index.html style.css LICENSE "$dest"/
cp -R src config packs fonts "$dest"/

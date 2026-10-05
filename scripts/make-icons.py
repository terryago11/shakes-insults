#!/usr/bin/env python3
"""Regenerates favicon-32.png and apple-touch-icon.png (180x180) from favicon.svg.

favicon.svg is the source (edit it, then run this). Needs:  pip install playwright   (set
CHROMIUM=/path/to/chromium if Playwright's own download is unavailable).
Usage:  python3 scripts/make-icons.py
The Apple icon is square (no rounded corners): iPhones round it themselves.
"""
import os
import pathlib
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
SVG = (ROOT / "favicon.svg").read_text()


def render(page, svg, size, path):
    page.set_viewport_size({"width": size, "height": size})
    sized = svg.replace("<svg ", '<svg width="%d" height="%d" ' % (size, size), 1)
    page.set_content('<body style="margin:0;background:transparent">' + sized + "</body>")
    page.screenshot(path=str(path), omit_background=True)
    print("wrote", path.name)


with sync_playwright() as p:
    launch = {"executable_path": os.environ["CHROMIUM"]} if os.environ.get("CHROMIUM") else {}
    browser = p.chromium.launch(**launch)
    page = browser.new_page()
    render(page, SVG, 32, ROOT / "favicon-32.png")
    render(page, SVG.replace(' rx="8"', ' rx="0"', 1), 180, ROOT / "apple-touch-icon.png")
    browser.close()

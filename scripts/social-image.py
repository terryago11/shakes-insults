#!/usr/bin/env python3
"""Regenerates social-preview.png, the 1200x630 image shown when the site is shared on social media.

It is a screenshot of the game's title page, so run it again whenever the setup screen's look or
wording changes. Needs:  pip install playwright   (set CHROMIUM=/path/to/chromium if Playwright's
own download is unavailable).  Usage:  python3 scripts/social-image.py
"""
import os
import pathlib
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]

with sync_playwright() as p:
    launch = {"executable_path": os.environ["CHROMIUM"]} if os.environ.get("CHROMIUM") else {}
    browser = p.chromium.launch(**launch)
    page = browser.new_context(viewport={"width": 1200, "height": 630}).new_page()
    page.goto((ROOT / "index.html").as_uri())
    page.evaluate("document.fonts.ready")
    page.screenshot(path=str(ROOT / "social-preview.png"))
    browser.close()
print("wrote social-preview.png")

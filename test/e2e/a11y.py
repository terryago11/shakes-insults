#!/usr/bin/env python3
"""Optional accessibility audit: runs axe-core on every screen of a game and lists what it finds.

Needs:  pip install playwright axe-playwright-python   (set CHROMIUM=/path/to/chromium if
        Playwright's own download is unavailable)
Usage:  python3 test/e2e/a11y.py        # exits 1 if axe reports any violation

axe cannot judge everything (real screen readers, text zoom, touch use), but it catches contrast,
missing labels, heading structure and similar. The browser test (smoke.py) separately asserts focus
moves to each screen's heading, the picked-word contrast and keyboard use.
"""
import os
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from smoke import URL, go, pick  # noqa: E402
from axe_playwright_python.sync_playwright import Axe  # noqa: E402
from playwright.sync_api import sync_playwright  # noqa: E402

TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"]
axe = Axe()
found = {}


def scan(page, label):
    result = axe.run(page, options={"runOnly": {"type": "tag", "values": TAGS}})
    for rule in result.response["violations"]:
        for node in rule["nodes"]:
            key = (rule["id"], node["target"][0] if node["target"] else "")
            found.setdefault(key, {"impact": rule["impact"], "help": rule["help"], "screens": set()})["screens"].add(label)
    print(f"scanned {label}")


with sync_playwright() as p:
    launch = {"executable_path": os.environ["CHROMIUM"]} if os.environ.get("CHROMIUM") else {}
    browser = p.chromium.launch(**launch)
    page = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True).new_page()
    page.goto(URL)
    page.evaluate("document.fonts.ready")
    scan(page, "setup")
    page.locator(".fields + .btn").tap()
    scan(page, "setup with four players")
    go(page); scan(page, "handoff")
    go(page); scan(page, "pick, nothing chosen")
    pick(page, (0, 1, 2)); scan(page, "pick, words chosen")
    page.locator(".bar .btn").tap(); scan(page, "handoff, second duelist")
    go(page); pick(page, (5, 4, 3)); page.locator(".bar .btn").tap(); scan(page, "ready")
    go(page); page.wait_for_selector(".countdown", state="attached"); scan(page, "countdown")
    page.wait_for_selector(".insult", timeout=8000); scan(page, "reveal")
    page.locator(".btns .btn").nth(0).tap(); scan(page, "scores")
    browser.close()

for (rule, target), info in sorted(found.items()):
    print(f"[{info['impact']}] {rule}: {info['help']}\n    {target}\n    screens: {sorted(info['screens'])}")
print(f"{len(found)} violation(s)")
sys.exit(1 if found else 0)

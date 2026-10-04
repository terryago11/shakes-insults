#!/usr/bin/env python3
"""Optional browser smoke test: plays a full 3-round game on a phone-sized screen from file://.

Needs:  pip install playwright   (and a Chromium; set CHROMIUM=/path/to/chromium if Playwright's
        own download is not available)
Usage:  python3 test/e2e/smoke.py            # asserts only
        SHOTS=/tmp/shots python3 test/e2e/smoke.py   # also saves screenshots

It finds buttons structurally (not by their text), so editing config/text.js cannot break it.
It checks what the Node tests cannot: that screens render, insult text is real text (not
"[object ...]"), picks are secret until the reveal, nothing overflows sideways, every tap target
is at least 44px tall, the bundled fonts load, no request leaves the local files, and the first pick
scrolls the next column up.
"""
import os
import pathlib
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[2]
URL = (ROOT / "index.html").as_uri()
SHOTS = os.environ.get("SHOTS")


def shot(page, name, **kw):
    if SHOTS:
        pathlib.Path(SHOTS).mkdir(parents=True, exist_ok=True)
        page.screenshot(path=f"{SHOTS}/{name}.png", **kw)


def audit(page, label):
    r = page.evaluate("""() => ({
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      small: [...document.querySelectorAll('button, input, select')]
        .filter(el => el.offsetParent !== null && el.getBoundingClientRect().height < 43.5)
        .map(el => (el.textContent || el.tagName).trim().slice(0, 20)),
      broken: document.body.innerText.includes('[object')
    })""")
    assert r["overflow"] <= 0, f"{label}: horizontal overflow {r['overflow']}px"
    assert not r["small"], f"{label}: tap targets under 44px: {r['small']}"
    assert not r["broken"], f"{label}: page text contains '[object'"


def word(page, c, k):
    """The k-th word button of column c."""
    return page.locator(".col").nth(c).locator(".word").nth(k)


def go(page):
    """Tap the screen's main button (begin, hand over, next, ...); found by position, not text."""
    page.locator("main .btn").tap()


def pick(page, picks):
    """Tap one word in each column; return the chosen words."""
    words = []
    for c, k in enumerate(picks):
        words.append(word(page, c, k).locator(".txt").inner_text())
        word(page, c, k).tap()
    return words


def main():
    with sync_playwright() as p:
        launch = {"executable_path": os.environ["CHROMIUM"]} if os.environ.get("CHROMIUM") else {}
        browser = p.chromium.launch(**launch)
        ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
        page = ctx.new_page()
        problems = []
        page.on("pageerror", lambda e: problems.append(str(e)))
        page.on("console", lambda m: problems.append(m.text) if m.type in ("error", "warning") else None)
        page.on("requestfailed", lambda r: problems.append("FAILED " + r.url))
        # The page must be fully self-contained: anything not served from disk is a problem.
        page.on("request", lambda r: problems.append("NON-LOCAL REQUEST " + r.url) if not r.url.startswith("file:") else None)

        page.goto(URL)
        assert page.title(), "document title should be filled from config/text.js"
        fonts = page.evaluate("document.fonts.ready.then(() => Promise.all([...document.fonts].map(f => f.load().then(() => f.status))))")
        assert fonts and all(s == "loaded" for s in fonts), f"bundled fonts failed to load: {fonts}"
        shot(page, "1-setup", full_page=True)
        audit(page, "setup")

        names = page.locator("label input")
        names.nth(0).fill("Ada"); names.nth(1).fill("Ben"); names.nth(2).fill("Cy<b>x")
        page.select_option("select >> nth=0", index=1)  # five rounds
        rounds = int(page.locator("select").first.input_value())
        go(page)  # begin
        audit(page, "handoff")

        winners = ["Ada", "Ben", None, "Ada", "Ada"][:rounds]  # None = the judge calls a draw (round 3)
        assert rounds == 5, "this script expects the second round option to be five rounds"
        for rnd, winner in enumerate(winners, 1):
            insults = {}
            for who, picks in (("Ada", (0, 1, 2)), ("Ben", (5, 4, 3))):
                go(page)  # hand over to this duelist
                if rnd == 1 and who == "Ada":
                    audit(page, "pick")
                    shot(page, "2-pick-top")
                    word(page, 0, 2).tap(); page.wait_for_timeout(900)
                    top2 = page.evaluate("document.querySelectorAll('.col')[1].getBoundingClientRect().top")
                    assert top2 < 60, f"first pick should scroll column II into view (top at {top2}px)"
                    assert page.locator(".bar .btn").is_disabled(), "imprint must stay disabled until every column is chosen"
                    words = pick(page, (0, 3, 3))  # re-picks column I (changing mind), then II and III
                    shot(page, "3-pick-mid")
                    page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                    gap = page.evaluate("""() => document.querySelector('.bar').getBoundingClientRect().top -
                      [...document.querySelectorAll('.col')[2].querySelectorAll('.word')].pop().getBoundingClientRect().bottom""")
                    assert gap >= 0, f"bottom bar covers the last word by {-gap}px"
                else:
                    words = pick(page, picks)
                expected = "Thou " + " ".join(words) + "!"
                assert page.locator(".preview").inner_text().replace("\n", " ") == expected, "preview text mismatch"
                colours = page.evaluate("[...document.querySelectorAll('.preview .w')].map(e => getComputedStyle(e).color)")
                assert len(colours) == 3 and len(set(colours)) == 3, f"each column's word should have its own colour: {colours}"
                insults[who] = expected
                page.locator(".bar .btn").tap()
            go(page)  # begin the count
            page.wait_for_selector(".insult", timeout=8000)
            assert page.locator(".insult").all_inner_texts() == [insults["Ada"], insults["Ben"]], "revealed insults differ from locked-in picks"
            audit(page, "reveal")
            if rnd == 1:
                shot(page, "4-reveal", full_page=True)
            assert page.locator(".btns .btn").count() == 3, "reveal offers two winners and a draw"
            page.locator(".btns .btn").nth({"Ada": 0, "Ben": 1, None: 2}[winner]).tap()  # judge's verdict
            if rnd < len(winners):
                audit(page, "scores")
                if winner is None:
                    assert page.locator(".score strong").all_inner_texts() == ["1", "1"], "a draw must not change the scores"
                go(page)  # next round

        assert page.locator(".score strong").all_inner_texts() == [str(winners.count("Ada")), str(winners.count("Ben"))]  # draws score nothing
        shot(page, "5-final")
        audit(page, "final")
        page.locator("main .btn.alt").tap()  # change setup
        assert page.locator("#app b").count() == 0, "player names must never be parsed as HTML"
        assert page.locator("label input").nth(2).input_value() == "Cy<b>x"

        # Names are remembered on this device: a fresh load of the page offers them again.
        page.reload()
        assert [page.locator("label input").nth(i).input_value() for i in range(3)] == ["Ada", "Ben", "Cy<b>x"], "names should be remembered"

        wide = browser.new_context(viewport={"width": 1100, "height": 900}).new_page()
        wide.goto(URL)
        wide.locator("main .btn").click()
        wide.locator("main .btn").click()
        word(wide, 0, 1).click()
        shot(wide, "6-wide-pick")
        assert wide.locator(".tab").first.is_hidden(), "column tabs are phone-only"

        assert not problems, f"console/page/network problems: {problems}"
        browser.close()
        print("smoke test passed")


if __name__ == "__main__":
    main()

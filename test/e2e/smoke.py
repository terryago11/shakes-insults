#!/usr/bin/env python3
"""Optional browser smoke test: plays a full game on a phone-sized screen from file://.

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
import re
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
      broken: document.body.innerText.includes('[object') || /(^|\\n)\\s*(null|undefined|NaN)\\s*(\\n|$)/.test(document.body.innerText)
    })""")
    assert r["overflow"] <= 0, f"{label}: horizontal overflow {r['overflow']}px"
    assert not r["small"], f"{label}: tap targets under 44px: {r['small']}"
    assert not r["broken"], f"{label}: page text contains '[object', null, undefined or NaN"


def word(page, c, k):
    """The k-th word button of column c."""
    return page.locator(".col").nth(c).locator(".word").nth(k)


def go(page):
    """Tap the screen's main button (begin, hand over, next, ...); found by position, not text."""
    page.locator("main .btn").last.tap()


def pick(page, picks):
    """Tap one word in each column; return the chosen words."""
    words = []
    for c, k in enumerate(picks):
        words.append(word(page, c, k).locator(".txt").inner_text())
        word(page, c, k).tap()
    return words


# Names are compared via text_content(): the page upper-cases them with CSS, which inner_text() would return.
def who_is_in(text, players):
    """The one player whose name appears in `text` (names in this script never contain each other)."""
    found = [p for p in players if p in text]
    assert len(found) == 1, f"expected exactly one player name in {text!r}, found {found}"
    return found[0]


def read_scoreboard(page):
    return [(el.locator("span").text_content(), el.locator(".tally").get_attribute("data-points")) for el in page.locator(".score").all()]


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

        assert page.locator("select").count() == 0, "one word list only, so the setup screen has no word-bank picker"

        # Seats: three to start with, nobody can be struck out at three, up to six can be added.
        seats = page.locator(".seat input")
        add = page.locator(".fields + .btn")
        assert seats.count() == 3, "three seats to start"
        assert page.locator(".seat .btn").count() == 0, "nobody can be removed at the minimum of three players"
        for _ in range(3):
            add.tap()
        assert seats.count() == 6 and add.is_disabled(), "six players is the maximum"
        assert len({seats.nth(i).input_value() for i in range(6)}) == 6, "added seats get distinct default names"
        audit(page, "setup with six players")
        shot(page, "1b-setup-six", full_page=True)
        for _ in range(2):
            page.locator(".seat .btn").last.tap()
        assert seats.count() == 4 and not add.is_disabled()
        assert page.locator("input[type=number]").count() == 0, "the number of rounds is fixed: there is no rounds field"

        names = ["Ada", "Ben", "Cy<b>x", "Dee"]
        for i, n in enumerate(names):
            seats.nth(i).fill(n)
        page.locator(".seat .btn").nth(1).tap()  # strike out Ben (a middle seat): the others keep their names
        assert [seats.nth(i).input_value() for i in range(3)] == ["Ada", "Cy<b>x", "Dee"]
        add.tap()
        seats.nth(3).fill("Ben")
        players = ["Ada", "Cy<b>x", "Dee", "Ben"]  # seat order
        assert [seats.nth(i).input_value() for i in range(4)] == players

        go(page)  # begin
        audit(page, "handoff")

        scores = {n: 0 for n in players}
        duel_counts = {n: 0 for n in players}
        judge_counts = {n: 0 for n in players}
        pairs = set()
        rnd = 0
        while True:
            rnd += 1
            assert rnd <= 12, "the game should have ended after six rounds"
            duelists, insults = [], {}
            for slot, picks in enumerate(((0, 1, 2), (5, 4, 3))):
                who = who_is_in(page.locator("main h2").text_content(), players)
                versus = page.locator(".versus").text_content()
                assert sum(n in versus for n in players) == 3, f"the matchup line should name three players: {versus!r}"
                duelists.append(who)
                go(page)  # hand over to this duelist
                if rnd == 1 and slot == 0:
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
            assert duelists[0] != duelists[1], "a player cannot duel themselves"
            go(page)  # begin the count
            page.wait_for_selector(".insult", timeout=8000)
            assert page.locator(".card h3").all_text_contents() == duelists, "reveal should show the two duelists"
            assert page.locator(".insult").all_inner_texts() == [insults[d] for d in duelists], "revealed insults differ from locked-in picks"
            others = [n for n in players if n not in duelists]
            ask = page.locator(".ask").text_content()
            assert sum(n in ask for n in others) == 1 and not any(d in ask for d in duelists), f"the judge must be one of the other players: {ask!r}"
            judge_counts[who_is_in(ask, others)] += 1
            audit(page, "reveal")
            if rnd == 1:
                shot(page, "4-reveal", full_page=True)
            assert page.locator(".btns .btn").count() == 3, "reveal offers two winners and a draw"
            verdict = rnd % 3  # first duelist wins, then a draw, then the second duelist wins, and so on
            page.locator(".btns .btn").nth({1: 0, 2: 2, 0: 1}[verdict]).tap()
            for d in duelists:
                duel_counts[d] += 1
            pairs.add(frozenset(duelists))
            if verdict == 1:
                scores[duelists[0]] += 2  # a win is two points
            elif verdict == 0:
                scores[duelists[1]] += 2
            else:
                for d in duelists:
                    scores[d] += 1  # a draw is one point each (the judge scores nothing)
            if page.locator("main .btns .btn.alt").count():  # the final screen offers "change setup"
                break
            audit(page, "scores")
            assert read_scoreboard(page) == [(n, str(scores[n])) for n in players], "between rounds the board lists every player in seat order"
            go(page)  # next round

        assert rnd == 6, f"four players means every pair duels once, which is six rounds, but {rnd} were played"
        assert set(duel_counts.values()) == {3}, f"everyone should duel everyone else once: {duel_counts}"
        assert len(pairs) == 6, "no pairing repeats"
        assert max(judge_counts.values()) - min(judge_counts.values()) <= 1, f"judging should be spread evenly: {judge_counts}"
        ranked = sorted(players, key=lambda n: -scores[n])  # stable: ties keep seat order
        assert read_scoreboard(page) == [(n, str(scores[n])) for n in ranked], "final board is ranked, ties in seat order"
        top = [n for n in players if scores[n] == max(scores.values())]
        heading = page.locator("main h2").text_content()
        assert all(n in heading for n in top) and not any(n in heading for n in players if n not in top), f"final heading should name exactly {top}: {heading!r}"
        shot(page, "5-final")
        audit(page, "final")
        page.locator("main .btn.alt").tap()  # change setup
        assert page.locator("#app b").count() == 0, "player names must never be parsed as HTML"
        assert [seats.nth(i).input_value() for i in range(4)] == players

        # Names are remembered on this device: a fresh load of the page offers them again.
        page.reload()
        assert [page.locator(".seat input").nth(i).input_value() for i in range(4)] == players, "names should be remembered"
        assert page.locator(".seat input").count() == 4

        # Players who type the same name get Roman numerals ("Ada I", "Ada II"); a unique name is left alone.
        page.locator(".seat .btn").last.tap()
        for i, n in enumerate(["Ada", "ada", "Ben"]):
            page.locator(".seat input").nth(i).fill(n)
        go(page)  # begin (three players: round one names all three)
        versus = page.locator(".versus").text_content()
        assert re.search(r"\bAda I\b", versus) and re.search(r"\bada II\b", versus) and "Ben" in versus, f"shared names should be numbered: {versus!r}"

        wide = browser.new_context(viewport={"width": 1100, "height": 900}).new_page()
        wide.goto(URL)
        wide.locator("main .btn").last.click()
        wide.locator("main .btn").last.click()
        word(wide, 0, 1).click()
        tops = wide.evaluate("[...document.querySelectorAll('.col')].map(c => Math.round(c.querySelector('.word').getBoundingClientRect().top))")
        assert len(set(tops)) == 1, f"the three word lists should start at the same height even when a heading wraps: {tops}"
        shot(wide, "6-wide-pick")
        assert wide.locator(".tab").first.is_hidden(), "column tabs are phone-only"

        assert not problems, f"console/page/network problems: {problems}"
        browser.close()
        print("smoke test passed")


if __name__ == "__main__":
    main()

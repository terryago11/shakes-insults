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


def audit(page, label, focus=True):
    r = page.evaluate("""() => ({
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      small: [...document.querySelectorAll('button, input, select')]
        .filter(el => el.offsetParent !== null && el.getBoundingClientRect().height < 43.5)
        .map(el => (el.textContent || el.tagName).trim().slice(0, 20)),
      h1s: document.querySelectorAll('main h1').length,
      onHeading: !!document.activeElement && document.activeElement.tagName === 'H1',
      broken: document.body.innerText.includes('[object') || /(^|\\n)\\s*(null|undefined|NaN)\\s*(\\n|$)/.test(document.body.innerText)
    })""")
    assert r["overflow"] <= 0, f"{label}: horizontal overflow {r['overflow']}px"
    assert not r["small"], f"{label}: tap targets under 44px: {r['small']}"
    assert r["h1s"] == 1, f"{label}: a screen should have exactly one level-one heading, found {r['h1s']}"
    if focus:
        assert r["onHeading"], f"{label}: focus should move to the screen's heading when the screen changes"
    assert not r["broken"], f"{label}: page text contains '[object', null, undefined or NaN"


CONTRAST_JS = """() => {
  const parse = (c) => { const m = c.match(/[\\d.]+/g).map(Number); const k = c.startsWith('color(') ? 255 : 1;
    return { r: m[0] * k, g: m[1] * k, b: m[2] * k, a: m.length > 3 ? m[3] : 1 }; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const over = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a) });
  const paper = parse(getComputedStyle(document.body).backgroundColor);
  return [...document.querySelectorAll('.word[aria-pressed="true"]')].map((el) => {
    const text = parse(getComputedStyle(el.querySelector('.txt')).color);
    const bg = over(parse(getComputedStyle(el).backgroundColor), paper);
    const a = lum(text), b = lum(bg);
    return Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100) / 100;
  });
}"""


def focused_word(page):
    """[column index, text] of the focused word button, or [-1, ''] if focus is elsewhere."""
    return page.evaluate("""() => { const a = document.activeElement, col = a && a.closest('.col');
      return [col ? [...document.querySelectorAll('.col')].indexOf(col) : -1, col && a.querySelector('.txt') ? a.querySelector('.txt').textContent : ''] }""")


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


# A stand-in for the Web Audio API and navigator.vibrate that records what the game asks for (a headless
# browser cannot be listened to). `started` counts every tone or noise burst begun.
AUDIO_STUB = """
window.__cues = { contexts: 0, started: 0, vibrations: [] };
const part = () => ({ connect() {}, start() { window.__cues.started++; }, stop() {}, type: '', buffer: null, detune: { value: 0 },
  frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {}, value: 0 }, Q: { value: 0 } });
window.AudioContext = class {
  constructor() { window.__cues.contexts++; this.state = 'running'; this.currentTime = 0; this.sampleRate = 8000; this.destination = {}; }
  resume() { this.state = 'running'; return Promise.resolve(); }
  createGain() { return { connect() {}, gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} } }; }
  createOscillator() { return part(); }
  createBufferSource() { return part(); }
  createBiquadFilter() { return part(); }
  createBuffer() { return { getChannelData() { return new Float32Array(8); } }; }
};
"""
WITH_VIBRATION = AUDIO_STUB + "navigator.vibrate = (pattern) => { window.__cues.vibrations.push(pattern); return true; };"
WITHOUT_VIBRATION = AUDIO_STUB + "Object.defineProperty(navigator, 'vibrate', { value: undefined, configurable: true });"


def cues(page):
    return page.evaluate("window.__cues")


def play_to_reveal(page):
    """Three default players: begin, both duelists pick and lock in, run the countdown, reach the reveal."""
    page.locator("main .btn").last.click()  # begin
    for picks in ((0, 1, 2), (5, 4, 3)):
        page.locator("main .btn").last.click()  # hand over
        for c, k in enumerate(picks):
            word(page, c, k).click()
        page.locator(".bar .btn").click()  # lock in
    page.locator("main .btn").last.click()  # begin the count
    page.wait_for_selector(".insult", timeout=8000)


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
        audit(page, "setup", focus=False)

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
        audit(page, "setup with six players", focus=False)
        shot(page, "1b-setup-six", full_page=True)
        for _ in range(2):
            page.locator(".seat .btn").last.tap()
        assert seats.count() == 4 and not add.is_disabled()
        assert page.locator("input[type=number]").count() == 0, "the number of rounds is fixed: there is no rounds field"

        names = ["Ada", "Ben", "Cy<b>x", "Dee"]
        for i, n in enumerate(names):
            seats.nth(i).fill(n)
        page.locator(".seat .btn").nth(1).tap()  # strike out Ben (a middle seat): the others keep their names
        assert page.evaluate("document.activeElement.tagName") == "INPUT", "after striking a player out, focus should stay in the list of names"
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
                who = who_is_in(page.locator("main h1").text_content(), players)
                versus = page.locator(".versus").text_content()
                assert sum(n in versus for n in players) == 3, f"the matchup line should name three players: {versus!r}"
                duelists.append(who)
                go(page)  # hand over to this duelist
                if rnd == 1 and slot == 0:
                    audit(page, "pick")
                    # Keyboard on the phone layout (words in two columns): one tab stop per column, and
                    # ArrowDown moves a row (two words).
                    assert page.locator(".col").nth(0).locator('.word[tabindex="0"]').count() == 1, "one tab stop per word list"
                    word(page, 0, 0).focus()
                    page.keyboard.press("ArrowDown")
                    assert page.evaluate("[...document.querySelectorAll('.col')[0].querySelectorAll('.word')].indexOf(document.activeElement)") == 2, "ArrowDown should move a row down in the two-column layout"
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
            assert page.locator(".card h2").all_text_contents() == duelists, "reveal should show the two duelists"
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
        heading = page.locator("main h1").text_content()
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
        for c in (1, 2):
            word(wide, c, 1).click()
        ratios = wide.evaluate(CONTRAST_JS)
        assert len(ratios) == 3 and min(ratios) >= 4.5, f"picked words must keep 4.5:1 contrast on their tint: {ratios}"
        word(wide, 0, 1).hover()
        assert min(wide.evaluate(CONTRAST_JS)) >= 4.5, "a picked word must keep 4.5:1 contrast while hovered"

        # Keyboard: Tab reaches one stop per list, arrows and letters move within it, Enter picks.
        kb = browser.new_context(viewport={"width": 1100, "height": 900}).new_page()
        kb.goto(URL)
        kb.locator("main .btn").last.click(); kb.locator("main .btn").last.click()
        assert kb.evaluate("document.activeElement.tagName") == "H1", "focus starts on the heading of the pick screen"
        for c in range(3):
            assert kb.locator(".col").nth(c).locator('.word[tabindex="0"]').count() == 1
        kb.keyboard.press("Tab")
        assert focused_word(kb)[0] == 0, "first Tab should land in the first word list"
        kb.keyboard.press("ArrowDown")
        assert kb.evaluate("[...document.querySelectorAll('.col')[0].querySelectorAll('.word')].indexOf(document.activeElement)") == 1
        kb.keyboard.press("b")
        col, text = focused_word(kb)
        assert col == 0 and text.lower().startswith("b"), f"typing a letter should jump to the next word starting with it: {text!r}"
        kb.keyboard.press("Enter")
        assert kb.evaluate("document.activeElement.getAttribute('aria-pressed')") == "true", "Enter should pick the focused word"
        kb.keyboard.press("Tab")
        assert focused_word(kb)[0] == 1, "Tab from a list should move to the next list, not the next word"
        kb.keyboard.press("End")
        assert kb.evaluate("document.activeElement === [...document.querySelectorAll('.col')[1].querySelectorAll('.word')].pop()"), "End should go to the last word"
        kb.close()

        # Sound and vibration. Nothing plays before a tap; the cues fire at the right moments; the
        # switches turn them off, are remembered, and vibration's switch is absent where it cannot work.
        snd = browser.new_context(viewport={"width": 1100, "height": 900})
        snd.add_init_script(WITH_VIBRATION)
        page_snd = snd.new_page()
        page_snd.goto(URL)
        assert cues(page_snd)["contexts"] == 0, "no audio context may be created before the first tap"
        switches = page_snd.locator("[role=switch]")
        assert switches.count() == 2 and all(switches.nth(i).get_attribute("aria-checked") == "true" for i in range(2)), "sound and vibration start on"
        audit(page_snd, "setup with switches", focus=False)
        play_to_reveal(page_snd)
        got = cues(page_snd)
        assert got["contexts"] == 1 and got["started"] == 15, f"2 lock-ins (2 sounds) + 3 ticks (1) + the go (3 trumpet notes x 2 voices + 2 for the snare) = 15 sounds: {got}"
        assert got["vibrations"] == [[25], [25], [35], [35], [35], [160]], f"vibration cues out of order: {got['vibrations']}"
        page_snd.locator(".btns .btn").nth(0).click()  # a winner: a point is scratched
        got = cues(page_snd)
        assert got["started"] == 19 and got["vibrations"][-1] == [30, 40, 30], f"a point should scrape twice (two layers each) and buzz: {got}"
        snd.close()

        mute = browser.new_context(viewport={"width": 1100, "height": 900})
        mute.add_init_script(WITH_VIBRATION)
        page_mute = mute.new_page()
        page_mute.goto(URL)
        for i in range(2):
            page_mute.locator("[role=switch]").nth(i).click()
        assert [page_mute.locator("[role=switch]").nth(i).get_attribute("aria-checked") for i in range(2)] == ["false", "false"]
        page_mute.reload()
        assert [page_mute.locator("[role=switch]").nth(i).get_attribute("aria-checked") for i in range(2)] == ["false", "false"], "the switches should be remembered"
        play_to_reveal(page_mute)
        got = cues(page_mute)
        assert got["started"] == 0 and got["vibrations"] == [], f"with both switched off nothing may play or buzz: {got}"
        page_mute.locator("[role=switch]").count()
        mute.close()

        quiet = browser.new_context(viewport={"width": 1100, "height": 900})
        quiet.add_init_script(WITHOUT_VIBRATION)
        page_quiet = quiet.new_page()
        page_quiet.goto(URL)
        assert page_quiet.locator("[role=switch]").count() == 1, "without vibration support only the sound switch is shown"
        quiet.close()

        shot(wide, "6-wide-pick")
        assert wide.locator(".tab").first.is_hidden(), "column tabs are phone-only"

        assert not problems, f"console/page/network problems: {problems}"
        browser.close()
        print("smoke test passed")


if __name__ == "__main__":
    main()

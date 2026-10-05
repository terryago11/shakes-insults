# shakes-insults

A Shakespearean insult game for 3 to 6 players on one shared phone (or any device). Each round two duelists build an insult ("Thou ___ ___ ___!") by hand from the same word bank (shown to each in a different random order), say them aloud on a countdown, and a third player, the judge, picks the winner (or calls a draw). The duelists and judge rotate according to a plan made at the start of the game; a win is 2 points, a draw 1 point for each duelist, the judge scores nothing, and scores run over the whole game. Primarily a fun toy; classroom use is a secondary goal. Built by Natan Skop (Theater in the Rough), MIT-licensed.

## Dev Commands

```bash
npm start            # serve the folder at http://localhost:8000 (python3 http.server)
npm test             # node --test: logic, round planner, pack lint, text-config, site-build and link-preview checks (Node 20+, no dependencies; CI runs 20 and 22)
npm run test:a11y    # optional axe-core audit of every screen: pip install playwright axe-playwright-python
npm run test:e2e     # optional phone-sized browser run: pip install playwright
                     # (set CHROMIUM=/path/to/chromium if Playwright's own download is unavailable;
                     #  SHOTS=/some/dir also saves screenshots)
```

`index.html` also works by double-clicking it (`file://`). Keep it that way (see conventions).

Regenerate the packs from the curated spreadsheet: `pip install openpyxl && python3 scripts/xlsx-to-pack.py reference/Insults.xlsx` (overwrites `packs/short.js` and `packs/full.js`).

## Stack

Plain HTML, CSS and vanilla JavaScript. No framework, no bundler, no runtime dependencies, no backend, no network requests. The only storage is in `localStorage`: the player names and the sound/vibration switches (each wrapped in try/catch and validated by `parseSavedNames` / `parsePrefs`; `namesStorageKey` and `prefsStorageKey` set to `""` in `config/settings.js` turn them off). Local play on one device only; remote play is deliberately out of scope for now.

## Key Files

| Path | Purpose |
|------|---------|
| `index.html` | Loads scripts in order: `src/logic.js`, `config/*.js`, `packs/full.js`, then `src/app.js`. Contains no player-facing text |
| `config/text.js` | **All player-facing text** (titles, buttons, flavour copy, countdown, ordinals, footer). Edited to re-skin or translate |
| `config/settings.js` | Player limits, duels per player, points for a win and a draw, countdown timing, name length, sound/vibration defaults, storage keys |
| `config/sound.js` | The cues (sound notes and vibration patterns), synthesized by `src/sound.js`; no audio files |
| `packs/*.js` | **The word banks.** One file per pack, each calls `InsultGame.registerPack({...})`. The game loads only `full.js` (a test enforces it); `short.js` is a smaller list kept for tinkering. The setup screen shows a word-bank picker only if more than one pack is loaded |
| `src/logic.js` | Pure game logic (`shuffle`, `wordText`, `registerPack`, the `packs` registry, `resolveColumns`, `buildInsult`, `validatePicks`, `scoreRound` (winner index, or null = draw), `parseSavedNames`, `parsePrefs`, `disambiguate`, `leaders`/`leader`, `duelsEach`, `planRounds`) and text helpers (`makeT`, `nth`). No DOM. Exposed as `window.InsultGame` and `module.exports` |
| `src/sound.js` | Sound and vibration engine (Web Audio, `navigator.vibrate`): `InsultGame.audio.cue(name)`. Not pure; everything in it is optional and fails silently |
| `src/app.js` | UI: screen-by-screen state machine (setup → handoff → pick → ready → countdown → reveal → scores/final) |
| `style.css` | All styling, mobile-first; no `content:` strings |
| `fonts/` | Bundled IM Fell woff2 files + `OFL.txt` (SIL OFL) + provenance note |
| `reference/Insults.xlsx` | The curated word list (sheets `full` and `short`); the packs are generated from it |
| `scripts/xlsx-to-pack.py` | Regenerates `short.js` and `full.js` from the spreadsheet |
| `favicon.svg`, `favicon-32.png`, `apple-touch-icon.png`, `scripts/make-icons.py` | The icons (a red slab T in the title page's drop-cap box). Edit `favicon.svg`, then run the script to regenerate the PNGs |
| `social-preview.png`, `scripts/social-image.py` | The 1200x630 image shown when the site is shared (a screenshot of the title page); regenerate it with the script when the setup screen changes |
| `test/logic.test.js` | Node tests: logic, pack lint, text-config checks, "no text in html/css" |
| `test/e2e/smoke.py` | Phone-sized browser run of a full game (see Dev Commands); also asserts the accessibility behaviour below |
| `test/e2e/a11y.py` | Optional axe-core audit of every screen (exits 1 on any violation) |
| `docs/design.md` | Visual design principles and their sources |
| `docs/maintaining.md` | Maintainer checklist: GitHub settings and what was verified, hosting, link previews, CI, how to cut a release |
| `scripts/build-site.sh` | Copies only the runtime files into a folder for publishing (every script `index.html` loads, the fonts, `style.css`, `LICENSE`); the Pages workflow uses it, and a test checks it covers everything `index.html` and `style.css` load |
| `.github/workflows/pages.yml` | Publishes that copy to GitHub Pages on pushes to `main` (live at https://terryago11.github.io/shakes-insults/; Settings, Pages, Source = GitHub Actions) |
| `.github/workflows/test.yml` | CI: `npm test` on Node 20 and 22 for pushes to `main` and pull requests (the e2e test is not in CI) |

## Word Pack Format

```js
InsultGame.registerPack({
  id: "mine",
  meta: { name: "My pack", credit: "", license: "" },
  prefix: "Thou",
  pools: { adjectives: ["artless", ...], nouns: ["apple-john", ...] },
  columns: ["adjectives", "adjectives", "nouns"],   // pool name per column (2+ columns)
});
```

- A pool entry is a string or `{ w, tags?, src? }`. Only `w` is used today; `tags`/`src` are reserved for the v2 scoring/citation features.
- Using the same pool for two columns is intended: each column is shuffled independently.
- To add a pack: create `packs/<id>.js` and add its `<script>` tag to `index.html`. Nothing else should need to change (the published site copies whatever `index.html` loads); if it does, that is a bug in the config design.

## Critical Conventions

- **No hard-coded text.** Every string a player can see lives in `config/text.js` and is read with a literal key, `t("setup.start")`. Words live in `packs/`. The one exception is the link-preview `<meta>` tags in `index.html` (crawlers do not run scripts): they repeat `documentTitle`, `documentDescription` and `documentImageAlt`, and `npm test` fails if the copies differ. `npm test` fails if `app.js` uses a missing key, if a config key is unused (so always use literal keys, never built-up ones), or if `index.html` or `style.css` contain text. Do not add text to code, HTML, or CSS `content:`.
- **Mobile first.** Base CSS is the phone layout; `min-width` media queries add the wide layout. Every tap target is at least 44px tall (the smoke test enforces this), no horizontal scroll, columns stack on a phone and the page scrolls (no nested scroll areas on a phone), key actions sit in the fixed bottom bar within thumb reach. The "dense, cramped" print look comes from type and rules, never from shrinking tap targets.
- **Early-printing look, not modern graphic design.** Dense type, tight leading, narrow margins, heavy and light rules, unequal columns, red as a hand-applied accent slightly off-register, repeated printers' ornaments, a title-page structure. Do not "clean it up" toward even spacing, centred symmetry or generous whitespace. See `docs/design.md`.
- **Column colours.** `.c1/.c2/.c3` set `--c` from `--c1/--c2/--c3` (red, blue, green in `style.css`); `hue(i)` in `app.js` applies the class (cycling for more than three columns). Colours must stay readable on the paper (4.5:1), and a picked word's text on its tint (it is darkened toward ink for that); they are not colour-blind-safe by owner's choice.
- **Accessibility.** One `h1` per screen (`.heading`), with `h2`s (`.subheading`) beneath; `show()` moves focus to the new screen's heading (not on the very first screen). Word lists have one tab stop each (roving tabindex): arrows, Home/End and typing a letter move within a list. The countdown is spoken from `countdownSpoken` (the big numerals are `aria-hidden`). Tally marks have a label. Picked-word text is darkened toward ink so it keeps 4.5:1 on its tint. Decorative ornaments are `aria-hidden`. `smoke.py` asserts the h1, the focus move, the contrast and the keyboard behaviour; run `npm run test:a11y` after UI changes.
- **Sound and vibration.** Cues live in `config/sound.js` and are played with `G.audio.cue("name")` (literal names: a test checks every cue is defined and used, well formed, has something above 300 Hz because small speakers cannot play bass, and that the count beat fits in one countdown step). Every button press makes the default `click` tap through one delegated listener in `app.js`; a button can name its own cue with `data-cue` (`pick` for words, `imprint` for locking in) or `"none"` when the screen it leads to plays its own cue (a second sound, and on Android a second `vibrate()` call, would cut the first off). Audio starts only after a tap or key press (browser rule), so the context is created on the first one. Cues mark moments, never choices: nothing may reveal what a player picked (every word makes the same tap). Vibration does not exist on iPhones, so its switch is hidden where `navigator.vibrate` is missing. The browser test stubs the audio and vibrate APIs to assert which cues fire and in what order, that nothing plays before a tap or when switched off, and the switches' memory.
- **Awkward is allowed.** Do not tidy rough edges that are part of the printed look. Fix real defects only (overlap, unreadable text, tap targets under 44px, broken behaviour).
- **Classic `<script>` tags, not ES modules.** Modules (and `fetch` of JSON) are blocked on `file://`, which would break double-click-to-run. Do not convert to modules or JSON packs without deciding to drop that.
- **Fonts are bundled** in `fonts/` (no CDN, no network requests). Keep `OFL.txt` with them.
- **Pure logic in `logic.js`, DOM in `app.js`.** New rules go in `logic.js` with a test.
- **Render with `textContent` via `h()`.** Player names and pack words are never interpreted as HTML. Do not use `innerHTML`. `h()` flattens nested arrays fully; keep it that way.
- **Who duels and who judges comes from `planRounds` in `logic.js`.** It is a pure function with property tests: every player duels exactly `duelsEach(players, settings.duelsPerPlayer)` times (3 players 2, 4 players 3, 5 players 2, 6 players 3), no pair meets twice, duel counts stay level during the game, the judge is never a duelist, and judge counts differ by at most one. The number of rounds is therefore fixed by the player count; there is no rounds setting. The UI only reads `state.plan`; do not pick duelists or judges in `app.js`.
- **Shared names are numbered, not rejected.** `disambiguate` turns "Ada", "ada" into "Ada I", "ada II" (numerals from `text.romans`); the names as typed are what is remembered.
- **Picks are secret until the countdown ends.** Each duelist's columns get an independent fresh shuffle every round, and there is no random-insult button. These are core rules, not defaults to tweak casually.
- **`window.InsultGame`'s API in `logic.js` is what packs, config and tests rely on.** Keep it stable.
- **Config and pack files are executable JS.** Treat them as trusted deployer-supplied code (see `SECURITY.md`).

## Docs Rules

- **`gotchas.md`**: persistent, append-only error log. Any time a mistake is made (wrong assumption, broken convention, silent failure), add a one-line summary. Never delete entries. Review at the start of every session, when auditing, and when troubleshooting.
- **`CHANGELOG.md`**: add an entry for every user-visible change, newest first.
- **`ROADMAP.md`**: planned work; move items to the changelog when shipped.

## Git

Default branch is `main`. Author commits with the GitHub noreply address (`git config user.email 17257990+terryago11@users.noreply.github.com`), never a personal email. The curated spreadsheet is committed at `reference/Insults.xlsx`. It is the reference copy of the word list; the pack files in `packs/` are what the game actually reads. Words come from various sources and are in the public domain (per the owner), so the MIT license covers the code only. The `short` sheet's 66 rows are canonical (the owner's decision); an older printed PDF had 64.

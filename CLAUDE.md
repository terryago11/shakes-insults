# shakes-insults

A three-player Shakespearean insult game for one shared phone (or any device). Two duelists each build an insult ("Thou ___ ___ ___!") by hand from the same word bank (shown to each in a different random order), say them aloud on a countdown, and the third player, the judge, picks the winner. Winner of each round gets a point. Primarily a fun toy; classroom use is a secondary goal. Built by Natan Skop (Theater in the Rough), MIT-licensed.

## Dev Commands

```bash
npm start            # serve the folder at http://localhost:8000 (python3 http.server)
npm test             # node --test: logic, pack lint, text-config checks (Node 20+, no dependencies; CI runs 20 and 22)
npm run test:e2e     # optional phone-sized browser run: pip install playwright
                     # (set CHROMIUM=/path/to/chromium if Playwright's own download is unavailable;
                     #  SHOTS=/some/dir also saves screenshots)
```

`index.html` also works by double-clicking it (`file://`). Keep it that way (see conventions).

Regenerate the packs from the curated spreadsheet: `pip install openpyxl && python3 scripts/xlsx-to-pack.py reference/Insults.xlsx` (overwrites `packs/short.js` and `packs/full.js`).

## Stack

Plain HTML, CSS and vanilla JavaScript. No framework, no bundler, no runtime dependencies, no backend, no network requests. The only storage is the three player names in `localStorage` (wrapped in try/catch, validated by `parseSavedNames`; `namesStorageKey: ""` in `config/settings.js` turns it off). Local play on one device only; remote play is deliberately out of scope for now.

## Key Files

| Path | Purpose |
|------|---------|
| `index.html` | Loads scripts in order: `src/logic.js`, `config/*.js`, `packs/*.js`, then `src/app.js`. Contains no player-facing text |
| `config/text.js` | **All player-facing text** (titles, buttons, flavour copy, countdown, ordinals, footer). Edited to re-skin or translate |
| `config/settings.js` | Round choices, default rounds, countdown timing, name length, names storage key |
| `packs/*.js` | **The word banks.** One file per pack, each calls `InsultGame.registerPack({...})` |
| `src/logic.js` | Pure game logic (`shuffle`, `registerPack`, `resolveColumns`, `buildInsult`, `validatePicks`, `awardPoint` (null = draw), `parseSavedNames`, `leader`) and text helpers (`makeT`, `nth`). No DOM. Exposed as `window.InsultGame` and `module.exports` |
| `src/app.js` | UI: screen-by-screen state machine (setup → handoff → pick → ready → countdown → reveal → scores/final) |
| `style.css` | All styling, mobile-first; no `content:` strings |
| `fonts/` | Bundled IM Fell woff2 files + `OFL.txt` (SIL OFL) + provenance note |
| `reference/Insults.xlsx` | The curated word list (sheets `full` and `short`); the packs are generated from it |
| `scripts/xlsx-to-pack.py` | Regenerates `short.js` and `full.js` from the spreadsheet |
| `test/logic.test.js` | Node tests: logic, pack lint, text-config checks, "no text in html/css" |
| `test/e2e/smoke.py` | Phone-sized browser run of a full game (see Dev Commands) |
| `docs/design.md` | Visual design principles and their sources |
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
- To add a pack: create `packs/<id>.js` and add its `<script>` tag to `index.html`. Nothing else should need to change; if it does, that is a bug in the config design.

## Critical Conventions

- **No hard-coded text.** Every string a player can see lives in `config/text.js` and is read with a literal key, `t("setup.start")`. Words live in `packs/`. `npm test` fails if `app.js` uses a missing key, if a config key is unused (so always use literal keys, never built-up ones), or if `index.html` or `style.css` contain text. Do not add text to code, HTML, or CSS `content:`.
- **Mobile first.** Base CSS is the phone layout; `min-width` media queries add the wide layout. Every tap target is at least 44px tall (the smoke test enforces this), no horizontal scroll, columns stack on a phone and the page scrolls (no nested scroll areas on a phone), key actions sit in the fixed bottom bar within thumb reach. The "dense, cramped" print look comes from type and rules, never from shrinking tap targets.
- **Early-printing look, not modern graphic design.** Dense type, tight leading, narrow margins, heavy and light rules, unequal columns, red as a hand-applied accent slightly off-register, repeated printers' ornaments, a title-page structure. Do not "clean it up" toward even spacing, centred symmetry or generous whitespace. See `docs/design.md`.
- **Column colours.** `.c1/.c2/.c3` set `--c` from `--c1/--c2/--c3` (red, blue, green in `style.css`); `hue(i)` in `app.js` applies the class (cycling for more than three columns). Colours must stay readable on the paper (4.5:1); they are not colour-blind-safe by owner's choice.
- **Awkward is allowed.** Do not tidy rough edges that are part of the printed look. Fix real defects only (overlap, unreadable text, tap targets under 44px, broken behaviour).
- **Classic `<script>` tags, not ES modules.** Modules (and `fetch` of JSON) are blocked on `file://`, which would break double-click-to-run. Do not convert to modules or JSON packs without deciding to drop that.
- **Fonts are bundled** in `fonts/` (no CDN, no network requests). Keep `OFL.txt` with them.
- **Pure logic in `logic.js`, DOM in `app.js`.** New rules go in `logic.js` with a test.
- **Render with `textContent` via `h()`.** Player names and pack words are never interpreted as HTML. Do not use `innerHTML`. `h()` flattens nested arrays fully; keep it that way.
- **Picks are secret until the countdown ends.** Each duelist's columns get an independent fresh shuffle every round, and there is no random-insult button. These are core rules, not defaults to tweak casually.
- **`window.InsultGame`'s API in `logic.js` is what packs, config and tests rely on.** Keep it stable.
- **Config and pack files are executable JS.** Treat them as trusted deployer-supplied code (see `SECURITY.md`).

## Docs Rules

- **`gotchas.md`**: persistent, append-only error log. Any time a mistake is made (wrong assumption, broken convention, silent failure), add a one-line summary. Never delete entries. Review at the start of every session, when auditing, and when troubleshooting.
- **`CHANGELOG.md`**: add an entry for every user-visible change, newest first.
- **`ROADMAP.md`**: planned work; move items to the changelog when shipped.

## Git

Default branch is `main`. Author commits with the GitHub noreply address (`git config user.email 17257990+terryago11@users.noreply.github.com`), never a personal email; the history was rewritten once to remove one. The curated spreadsheet is committed at `reference/Insults.xlsx`. It is the reference copy of the word list; the pack files in `packs/` are what the game actually reads. Words come from various sources and are in the public domain (per the owner), so the MIT license covers the code only. The `short` sheet's 66 rows are canonical (the owner's decision); an older printed PDF had 64.

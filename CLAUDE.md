# shakes-insults

A three-player Shakespearean insult game for one shared device. Two duelists each build an insult ("Thou ___ ___ ___!") by hand from the same word bank (shown to each in a different random order), say them aloud on a countdown, and the third player, the judge, picks the winner. Winner of each round gets a point. Primarily a fun toy; classroom use is a secondary goal.

## Dev Commands

```bash
npm start        # serve the folder at http://localhost:8000 (python3 http.server)
npm test         # node --test: logic + word-pack lint (Node 18+, no dependencies)
```

`index.html` also works by double-clicking it (`file://`). Keep it that way (see conventions).

Regenerate the packs from the curated spreadsheet: `pip install openpyxl && python3 scripts/xlsx-to-pack.py reference/Insults.xlsx` (overwrites `packs/short.js` and `packs/full.js`).

## Stack

Plain HTML, CSS and vanilla JavaScript. No framework, no bundler, no runtime dependencies, no backend, no storage. Local play on one device only; remote play is deliberately out of scope for now.

## Key Files

| Path | Purpose |
|------|---------|
| `index.html` | Loads scripts in order: `src/logic.js`, then `packs/*.js`, then `src/app.js` |
| `src/logic.js` | Pure game logic (`shuffle`, `registerPack`, `resolveColumns`, `buildInsult`, `validatePicks`, `awardPoint`, `leader`). No DOM. Exposed as `window.InsultGame` and `module.exports` |
| `src/app.js` | UI: screen-by-screen state machine (setup → handoff → pick → ready → countdown → reveal → scores/final) |
| `packs/*.js` | **The word banks.** One file per pack, each calls `InsultGame.registerPack({...})` |
| `scripts/xlsx-to-pack.py` | Regenerates `short.js` and `full.js` from `Insults.xlsx` |
| `test/logic.test.js` | Unit tests plus a lint over every shipped pack |
| `style.css` | All styling; light/dark via `prefers-color-scheme` |

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

- **Classic `<script>` tags, not ES modules.** Modules (and `fetch` of JSON) are blocked on `file://`, which would break double-click-to-run. Do not convert to modules or JSON packs without deciding to drop that.
- **Word bank config stays in `packs/`.** Never hard-code words, the prefix, or pack lists in `app.js` or `logic.js`. Easy adaptation by non-developers is a core goal.
- **Pure logic in `logic.js`, DOM in `app.js`.** New rules go in `logic.js` with a test.
- **Render with `textContent` via `h()`.** Player names and pack words are never interpreted as HTML. Do not use `innerHTML`.
- **Picks are secret until the countdown ends.** Each duelist's columns get an independent fresh shuffle every round, and there is no random-insult button. These are core rules, not defaults to tweak casually.
- **`window.InsultGame`'s API in `logic.js` is what packs and tests rely on.** Keep it stable.

## Docs Rules

- **`gotchas.md`**: persistent, append-only error log. Any time a mistake is made (wrong assumption, broken convention, silent failure), add a one-line summary. Never delete entries. Review at the start of every session, when auditing, and when troubleshooting.
- **`CHANGELOG.md`**: add an entry for every user-visible change, newest first.
- **`ROADMAP.md`**: planned work; move items to the changelog when shipped.

## Git

Default branch is `main`. The curated spreadsheet is committed at `reference/Insults.xlsx` (sheets `full` and `short`). It is the reference copy of the word list; the pack files in `packs/` are what the game actually reads.

# Changelog

Newest first.

## Unreleased

- **Tie option**: the judge can call a round a draw ("A Draw. No Point"); nobody scores. `awardPoint(scores, null)` leaves the scores unchanged.
- **Remembered names**: the three player names are kept in `localStorage` on the device and offered again on the next visit. Storage failures (blocked, private window) are ignored; saved data is validated by `parseSavedNames`. Turn off with `namesStorageKey: ""` in `config/settings.js`. SECURITY.md updated: the game no longer claims "no storage".
- **CI**: `.github/workflows/test.yml` runs `npm test` on Node 20 and 22 for pushes to `main` and pull requests.
- Browser smoke test now plays five rounds including a draw, and checks that names survive a reload.

## 0.2.1 — 2026-10-04

- Word lists declared public domain (per the owner); `meta.license` set in both packs, README and SECURITY.md updated.
- The `short` list's 66 rows confirmed canonical (the older PDF with 64 rows is stale).
- Security docs prepared for a public repository: SECURITY.md wording, and a new `docs/publishing.md` checklist (private vulnerability reporting, secret scanning, branch protection, git-history check).

## 0.2.0 — 2026-10-04

Phone-first rebuild in an early-printing broadside style.

- **Look**: dense, deliberately untidy broadside layout (tight leading, narrow margins, heavy/light rules, unequal columns, a red hand-coloured drop cap off-register from its printed box, a strip of printers' marks, a title-page structure). IM Fell fonts bundled locally in `fonts/` (SIL OFL), so the game stays offline and makes no network requests.
- **Mobile first**: columns stack on a phone and the page scrolls; sticky column headings; every tap target at least 44px tall; a fixed bottom bar with the live insult, column tabs (I, II, III) and the imprint button; picking in a column brings the next empty column up. Wide screens get three unequal columns.
- **Three column colours** (red, blue, green): column headings, tabs, picked words and the insult on the reveal screen are coloured by column.
- **Old-style copy**: explanatory text uses capitalised Nouns and period spellings ("Slaunder", "Columne", "Chuse", "Shew", "Iudge"); it lives entirely in `config/text.js`, so modern wording is a config edit. The browser test finds buttons structurally so re-texting cannot break it.
- **All text is configurable**: every player-facing string moved to `config/text.js` (countdown, ordinals, buttons, flavour copy, footer, page title and language); game settings to `config/settings.js`. Tests fail on missing, unused, or hard-coded text.
- **Credits and licensing**: MIT `LICENSE` (Natan Skop, Theater in the Rough), `SECURITY.md`, built-by line and "words drawn from various sources" shown in the footer, README credits section. Added the curated word-list spreadsheet as `reference/Insults.xlsx`.
- **Tests**: validatePicks now returns codes (wording lives in the text config); new optional browser smoke test (`npm run test:e2e`) plays a full game on a phone-sized screen and checks text, secrecy of picks, overflow, tap-target size, fonts, colours and that no request leaves the local files.
- **Fixed** before release: insults rendered as `[object HTMLSpanElement]` because `h()` only flattened one array level.

## 0.1.0 — 2026-10-04

Initial version.

- Three-player game on one device: two duelists, one fixed judge, a configurable number of rounds (3, 5, 7 or 9).
- Pre-game setup: names for all three players, round count, word pack.
- Duelists build "Thou ___ ___ ___!" by hand from three columns; no random-insult button; the same word cannot fill two columns.
- Each duelist's columns are shuffled independently, every round. Picks stay hidden behind a "pass the device" screen until the countdown ends.
- "3 · 2 · 1 · GO!" countdown, then both insults are revealed and the judge picks the round winner (1 point per round).
- Between-round scoreboard and a final screen with "Play again" / "Change setup".
- Word banks live in `packs/*.js` (one file per pack): `short` (66 words per column) and `full` (145 adjectives, 82 nouns), generated from the curated spreadsheet with `scripts/xlsx-to-pack.py`.
- Works from `file://` (double-click `index.html`) or any static host; responsive layout.
- Unit tests for the game logic and a lint over every shipped pack (`npm test`).

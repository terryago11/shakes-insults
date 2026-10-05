# Changelog

Newest first.

## 0.3.0 — 2026-10-05

- **Live on GitHub Pages**: https://terryago11.github.io/shakes-insults/ (the repository is now public).
- **One word bank**: the game loads only the full list (`packs/full.js`), so there is no word-bank picker on the setup screen; `packs/short.js` stays in the repo as a smaller list for tinkering. The published site copies the scripts `index.html` loads, so unused packs are not published. A test keeps `index.html` to the full list.
- **Docs and CI**: README links the live game; `actions/checkout` and `actions/setup-node` in the test workflow moved from v4 to v7.
- **GitHub Pages workflow**: `.github/workflows/pages.yml` runs `npm test` and publishes only the files the game needs (`scripts/build-site.sh`) on pushes to `main`; a unit test checks the published copy has everything the page loads and none of the repo-only files. Needs Settings, Pages, Source = GitHub Actions.
- **Docs**: `docs/publishing.md` became `docs/maintaining.md`, a plain maintainer checklist (the one-off history and email notes were removed); the 0.2.1 entry below still uses the old name.
- **Rotating players (3 to 6)**: setup takes a list of players (add and "strike out" seats, 3 to 6) instead of two duelists and a fixed judge, and the rounds menu is gone. The game is planned up front: every player duels the same number of times (`duelsPerPlayer`, 3, or 2 when players x 3 is odd or there are too few opponents), so 3 players = 3 rounds, 4 = 6, 5 = 5, 6 = 9. Each round two players duel and another judges; the matchup is shown when the device is handed over. Scores run over the whole game.
- **Scoring**: a win is 2 points, a draw is 1 point for each duelist (the judge scores nothing); both are settings (`pointsForWin`, `pointsForDraw`). The final board is ranked and several players on the top score are reported as a tie naming them all.
- **Shared names**: players who type the same name (ignoring case) become "Ada I", "Ada II".
- **Planner**: `planRounds(players, duels)` in `src/logic.js` picks distinct pairs with level duel counts at every step and judges spread as evenly as possible (floor or ceiling). Property-tested for 3 to 10 players and every valid number of duels each. An earlier greedy version repeated pairings and was replaced before release.
- **Spelling**: "Iudge", "vntil", "Vse" and "giue" are now "Judge", "until", "Use" and "give"; the other period spellings stay.
- **Settings and text config**: `roundOptions` and the rounds field were removed; new `minPlayers`, `maxPlayers`, `duelsPerPlayer`, `pointsForWin`, `pointsForDraw`. `defaultNames` became `defaultName`; `setup.duelist1/2`, `setup.judge`, `setup.roundsOption` and `final.draw` were replaced by new keys. `parseSavedNames` takes a minimum and maximum count; `awardPoint` became `scoreRound`.
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

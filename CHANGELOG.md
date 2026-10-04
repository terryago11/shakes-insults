# Changelog

Newest first.

## Unreleased

- Added the curated word-list spreadsheet as `reference/Insults.xlsx`.

## 0.1.0 — 2026-10-04

Initial version.

- Three-player game on one device: two duelists, one fixed judge, a configurable number of rounds (3, 5, 7 or 9).
- Pre-game setup: names for all three players, round count, word pack.
- Duelists build "Thou ___ ___ ___!" by hand from three columns; no random-insult button; the same word cannot fill two columns.
- Each duelist's columns are shuffled independently, every round. Picks stay hidden behind a "pass the device" screen until the countdown ends.
- "3 · 2 · 1 · GO!" countdown, then both insults are revealed and the judge picks the round winner (1 point per round).
- Between-round scoreboard and a final screen with "Play again" / "Change setup".
- Word banks live in `packs/*.js` (one file per pack): `short` (66 words per column) and `full` (145 adjectives, 82 nouns), generated from the curated spreadsheet with `scripts/xlsx-to-pack.py`.
- Works from `file://` (double-click `index.html`) or any static host; light and dark themes; responsive layout.
- Unit tests for the game logic and a lint over every shipped pack (`npm test`).

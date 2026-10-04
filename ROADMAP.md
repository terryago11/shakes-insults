# Roadmap

Shipped work lives in [CHANGELOG.md](./CHANGELOG.md). Nothing below is committed to; it is a parking lot ordered roughly by how cheap it is.

## Small

- **Rotating judge** — each round a different player judges, so all three play (a change to `judge()`, `award` and the handoff flow in `src/app.js`).
- **Tie option** — let the judge declare a round a draw (no point).
- **Remember names and settings** — `localStorage`, wrapped in try/catch so the game still works when storage is blocked.
- **Pack credit/license in the footer** — fill in `meta.credit` / `meta.license` for the shipped packs (needs the right wording from the curator) and show both.
- **Spreadsheet vs PDF row mismatch** — the `short` sheet has 66 rows; the printed PDF has 64. Decide which is canonical.
- **Static hosting** — publish via GitHub Pages (needs no build step).

## Medium

- **"Where's it from?" reveal** — use the optional `src` field on words to show a play/act/scene citation after each round. Needs curated citations; no complete open dataset with line references was found when this was researched.
- **Scoring options beyond judge-only** — per-word `tags` with a counter table (e.g. beast vs. body), or derived stats (hyphenated-compound bonus, alliteration). Playtest first; these are untested ideas.
- **Word-pack switcher in the UI** for more than the two shipped packs (the dropdown already supports any registered pack).
- **Accessibility pass** — screen-reader announcements for the countdown and reveal, larger tap targets, keyboard shortcuts for picking.
- **Sound / haptics** for the countdown.

## Large / probably not

- **Remote two-player play** — needs a realtime backend; explicitly out of scope for now.
- **LLM judge** — needs a backend or API key, costs per round, and gives inconsistent verdicts; conflicts with the "easy to adapt, runs offline" goal.
- **Hands/deck mechanic** (as in physical card games) — deliberately rejected for v1: shared words between players is part of the fun.

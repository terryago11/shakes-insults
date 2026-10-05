# Roadmap

Shipped work lives in [CHANGELOG.md](./CHANGELOG.md). Nothing below is committed to; it is a parking lot ordered roughly by how cheap it is.

## Small

- **Remember the word pack too** — names are already remembered; the same storage code could cover it.
- **Publish the repo** — turn on the settings in `docs/maintaining.md` first.
- **Browser test in CI** — add `npm run test:e2e` to the workflow (needs a browser install step).

## Medium


- **"Where's it from?" reveal** — use the optional `src` field on words to show a play/act/scene citation after each round. Needs curated citations; no complete open dataset with line references was found when this was researched.
- **Scoring options beyond judge-only** — per-word `tags` with a counter table (e.g. beast vs. body), or derived stats (hyphenated-compound bonus, alliteration). Playtest first; these are untested ideas.
- **Word-pack switcher in the UI** — the game uses the full list only for now; the setup screen already shows a picker automatically when more than one pack is loaded, so this is mostly about having a second list worth offering.
- **Accessibility pass** — screen-reader announcements for the countdown and reveal, larger tap targets, keyboard shortcuts for picking.
- **Sound / haptics** for the countdown.
- **Playable on real phones** — so far only tested in an emulated phone viewport; try real devices (notably iOS Safari: sticky headings, `color-mix`, the fixed bar and the on-screen keyboard).
- **Per-pack column colours** — let a pack choose its own three (or more) hand colours instead of the CSS defaults.

## Large / probably not

- **Remote two-player play** — needs a realtime backend; explicitly out of scope for now.
- **LLM judge** — needs a backend or API key, costs per round, and gives inconsistent verdicts; conflicts with the "easy to adapt, runs offline" goal.
- **Hands/deck mechanic** (as in physical card games) — deliberately rejected for v1: shared words between players is part of the fun.

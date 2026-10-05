# Roadmap

Shipped work lives in [CHANGELOG.md](./CHANGELOG.md). Nothing below is committed to; it is a parking lot ordered roughly by how cheap it is.

## Small

- **Browser test in CI** — add `npm run test:e2e` to the workflow (needs a browser install step).

## Medium

- **"Where's it from?" reveal** — use the optional `src` field on words to show a play/act/scene citation after each round. Needs curated citations; no complete open dataset with line references was found when this was researched.
- **Scoring options beyond the judge's verdict** — per-word `tags` with a counter table (e.g. beast vs. body), or derived stats (hyphenated-compound bonus, alliteration). Playtest first; these are untested ideas.
- **Word-pack switcher in the UI** — the game uses the full list only for now; the setup screen already shows a picker automatically when more than one pack is loaded, so this is mostly about having a second list worth offering.
- **Test with real assistive technology** — the accessibility pass was checked with axe-core and keyboard tests only. Still to try: VoiceOver on iOS and TalkBack on Android (does the countdown read well, is the tally label clear?), 200% text zoom, and Windows high-contrast mode.
- **Tune the sounds on real phones** — the cues were checked offline (no clipping, balanced levels) but only by measurement and by the owner listening on a laptop. Still to check on devices: the loudness through phone speakers, whether an iPhone's ring/silent switch mutes them (not verified), and whether vibration feels right on Android.
- **More real devices** — the owner has played it on their own phone and it looks right (model and browser not recorded). Other phones and browsers are untested, notably the other of iOS Safari / Android Chrome (sticky headings, `color-mix`, the fixed bar, the on-screen keyboard).
- **Per-pack column colours** — let a pack choose its own three (or more) hand colours instead of the CSS defaults.

## Large / probably not

- **Remote two-player play** — needs a realtime backend; explicitly out of scope for now.
- **LLM judge** — needs a backend or API key, costs per round, and gives inconsistent verdicts; conflicts with the "easy to adapt, runs offline" goal.
- **Hands/deck mechanic** (as in physical card games) — deliberately rejected for v1: shared words between players is part of the fun.

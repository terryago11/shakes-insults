# Insult Duel

A three-player Shakespearean insult game for one shared phone (or any device). Two duelists
each build an insult ("Thou ___ ___ ___!") by hand from the same word bank, shown to each in a
different random order. They say them aloud on "III, II, I, SPEAK!", and the third player, the
judge, picks the winner. Winner of each round gets a point.

Built to be played on phones first. The look borrows from early printed broadsheets: dense type,
heavy and light rules, a hand-coloured red drop cap, deliberately not tidy.

## Run it

No build step and no dependencies. Open `index.html` in a browser, or serve the folder:

```bash
npm start          # http://localhost:8000
npm test           # logic, word packs and text-config checks (Node 18+)
npm run test:e2e   # optional phone-sized browser run (pip install playwright)
```

## Make it yours

Everything someone would want to swap is in plain files, not in the code:

| What | Where |
|------|-------|
| Every word of text players see (titles, buttons, countdown, flavour copy) | `config/text.js` |
| Game settings (round choices, countdown timing) | `config/settings.js` |
| The word banks | `packs/*.js` |
| Colours, fonts, spacing | `style.css` (variables at the top) |

`npm test` fails if the code uses a text key missing from `config/text.js`, if a key there is
never used, or if text creeps into `index.html` or `style.css`.

### Word packs

```js
InsultGame.registerPack({
  id: "mine",
  meta: { name: "My pack", credit: "Your name", license: "CC-BY" },
  prefix: "Thou",
  pools: { adjectives: ["artless", "bawdy"], nouns: ["apple-john", "baggage"] },
  columns: ["adjectives", "adjectives", "nouns"],   // which pool fills each column
});
```

Then add `<script src="packs/mine.js"></script>` in `index.html`. A pool word may also be
`{ w: "artless", tags: [], src: "play, act.scene" }`; only `w` is used for now.
`npm test` fails if a pack has blank or duplicate words.

`scripts/xlsx-to-pack.py reference/Insults.xlsx` regenerates `short.js` and `full.js` from the
curated spreadsheet in `reference/` (needs `pip install openpyxl`).

## Rules as implemented

- Duelists never see each other's picks until the countdown ends.
- No random-insult button: every word is chosen by hand, and the same word cannot fill two columns.
- Each duelist's columns are shuffled independently, every round.
- The judge (player 3) is fixed for the whole game.

## Credits and licenses

- **Built by Natan Skop (Theater in the Rough).**
  The code is released under the [MIT License](./LICENSE).
- **The words** come from various sources. The curated spreadsheet and PDF this game was built
  from credit "Theater in the Rough | Insults Game" for the game sheet but name no sources for the
  individual words. The MIT license covers the code, not the word lists.
- **Fonts**: IM Fell English, IM Fell English SC and IM Fell Double Pica, bundled under the SIL
  Open Font License (`fonts/OFL.txt`, `fonts/README.md`).

See [SECURITY.md](./SECURITY.md) for the security policy.

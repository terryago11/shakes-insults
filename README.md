# Insult Duel

A three-player Shakespearean insult game for one shared device. Two duelists each build an
insult ("Thou ___ ___ ___!") from the same word bank, shown to each in a different random
order. They say them aloud on "3, 2, 1, GO", and the third player, the judge, picks the winner.
Winner of each round gets a point.

## Run it

No build step and no dependencies. Open `index.html` in a browser, or serve the folder:

```bash
npm start        # http://localhost:8000
npm test         # logic + word-pack checks (Node 18+)
```

## Change the word bank

The word bank lives in `packs/*.js`, one file per pack, and nowhere else:

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

`scripts/xlsx-to-pack.py` regenerates `short.js` and `full.js` from the curated spreadsheet.

## Rules as implemented

- Duelists never see each other's picks until the countdown ends.
- No random-insult button: every word is chosen by hand, and the same word cannot fill two columns.
- Each duelist's columns are shuffled independently, every round.
- The judge (player 3) is fixed for the whole game.

# Insult Duel

A Shakespearean insult game for three to six people and one phone. Two players trade insults
built from Shakespeare-style words ("Thou artless, reeling-ripe hedge-pig!"). Another player
judges who won. Everyone takes turns.

## How to play

1. Gather three to six people. Hand the phone around when asked.
2. Type everyone's name. If two people share a name they become "Ada I" and "Ada II".
3. Each round the game names two duelists and a judge; the roles rotate. Everyone duels the
   same number of times (2 or 3), so a game is 3, 6, 5 or 9 rounds for three, four, five or
   six players.
4. Each duelist, in turn, builds an insult in secret by tapping one word from each of the three
   columns. The columns are shuffled differently for each player, and there is no random button.
5. When both are ready, a countdown runs: **III, II, I, SPEAK!** Both duelists say their insult
   aloud at the same time.
6. The judge picks the winner of the round, or calls it a draw. A win is two points. A draw is
   one point for each duelist. The judge scores nothing that round.
7. Scores add up over the whole game. After the last round the highest score wins. Equal top
   scores are a tie.

## Try it

**Play it now: https://terryago11.github.io/shakes-insults/**

Or run it yourself, with no install and no internet: download or clone this folder and open
`index.html` in a browser. It is only plain files, so any static web host works too.

It was built for phones. If something looks wrong on yours, please say so.

The game remembers the names, and your sound and vibration choices, on your device so you don't
set them again. It sends nothing anywhere and uses no cookies or tracking.

There are sounds in the manner of the old stage: a light tap for every button, a hand-drum beat for
each count, a long trumpet flourish on "SPEAKE!", a tap of the side drum when an insult is locked in,
a rising trumpet when a duel is won (two level notes for a draw), and a fanfare with a drum roll at
the end. Both sound and vibration can be switched off on the first screen. Vibration only works on
Android phones; iPhones do not let web pages vibrate, so that switch is not shown there.

## Change it

Words, text and settings are plain files, so you can re-skin it without touching the code.

| To change | Edit |
|-----------|------|
| Any text players see (titles, buttons, the countdown) | `config/text.js` |
| Player limits, duels per player, points, countdown speed, name memory | `config/settings.js` |
| The sounds and vibration patterns (all synthesized, no audio files) | `config/sound.js` |
| The words | `packs/*.js` (see below) |
| Colours and fonts | the variables at the top of `style.css` |

A word pack lists the words for each column:

```js
InsultGame.registerPack({
  id: "mine",
  meta: { name: "My pack", credit: "Your name", license: "CC-BY" },
  prefix: "Thou",
  pools: { adjectives: ["artless", "bawdy"], nouns: ["apple-john", "baggage"] },
  columns: ["adjectives", "adjectives", "nouns"],   // which pool fills each column
});
```

Save it as `packs/mine.js` and swap its `<script src="packs/mine.js"></script>` line in for the
`packs/full.js` one in `index.html`. The game uses one word list, the full one. `packs/short.js`
is a smaller list for tinkering: load it instead, or load two packs to get a picker on the setup
screen. Both shipped packs are generated from `reference/Insults.xlsx` by
`scripts/xlsx-to-pack.py` (needs `pip install openpyxl`).

## For developers

```bash
npm start          # serve the folder at http://localhost:8000
npm test           # unit tests, word-pack and text checks (Node 20 or newer)
npm run test:a11y  # optional accessibility audit (pip install playwright axe-playwright-python)
npm run test:e2e   # optional full game in a phone-sized browser (pip install playwright)
```

Plain HTML, CSS and JavaScript, with no framework, build step or dependencies. Read
[CLAUDE.md](./CLAUDE.md) for the code layout and conventions, [ROADMAP.md](./ROADMAP.md) for
ideas, [CHANGELOG.md](./CHANGELOG.md) for history, and [docs/design.md](./docs/design.md) for why
it looks the way it does.

## Credits and licenses

- Built by Natan Skop (Theater in the Rough). The code is under the [MIT License](./LICENSE).
- The words are curated from various sources and are in the public domain.
- Fonts: IM Fell, bundled under the SIL Open Font License (`fonts/OFL.txt`).

Security policy: [SECURITY.md](./SECURITY.md).

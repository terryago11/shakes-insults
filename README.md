# Insult Duel

A Shakespearean insult game for three to six people and one phone. Two players trade insults
built from Shakespeare-style words ("Thou artless, reeling-ripe hedge-pig!"). Another player
judges who won. Everyone takes turns.

## How to play

1. Gather three to six people. Hand the phone around when asked.
2. Type everyone's name. If two people share a name they become "Ada I" and "Ada II".
3. The game plans the whole contest. Each round it names two duelists and a judge, and the roles
   rotate. Everyone duels the same number of times (twice with three players, three times with
   four or six, twice with five), so a game is 3, 6, 5 or 9 rounds for three, four, five or six
   players.
4. Each duelist, in turn, builds an insult in secret by tapping one word from each of the three
   columns. The columns are shuffled differently for each player, and there is no random button.
5. When both are ready, a countdown runs: **III, II, I, SPEAK!** Both duelists say their insult
   aloud at the same time.
6. The judge picks the winner of the round, or calls it a draw. A win is two points. A draw is
   one point for each duelist. The judge scores nothing that round.
7. Scores add up over the whole game. After the last round the highest score wins. Equal top
   scores are a tie.

## Try it

No install, no internet needed. Download or clone this folder and open `index.html` in a
browser. To play on a phone, put the folder on any web host (the game is only static files), or
run `npm start` on a computer and open `http://<your computer's address>:8000` on a phone on the
same network.

It has been tested only in a desktop browser pretending to be a phone, not yet on a real iPhone
or Android. If something looks wrong on your phone, please say so.

The game remembers the names on your device so you don't retype them. It sends nothing
anywhere and uses no cookies or tracking.

## Change it

Words, text and settings are plain files, so you can re-skin it without touching the code.

| To change | Edit |
|-----------|------|
| Any text players see (titles, buttons, the countdown) | `config/text.js` |
| Player limits, duels per player, points, countdown speed, name memory | `config/settings.js` |
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

Save it as `packs/mine.js` and add `<script src="packs/mine.js"></script>` to `index.html`.
The two shipped packs are generated from `reference/Insults.xlsx` by `scripts/xlsx-to-pack.py`
(needs `pip install openpyxl`).

## For developers

```bash
npm test           # unit tests, word-pack and text checks (Node 20 or newer)
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

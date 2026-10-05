// Sound and vibration cues, tuned by ear: the sounds of a Shakespearean stage, with drums for the
// count and trumpets for the flourishes. Everything is synthesized in the browser (Web Audio), so
// there are no audio files. Each cue is a list of notes plus a vibration pattern (milliseconds,
// alternating buzz and pause; used where the device supports vibration, which iPhones do not).
//
// A note is { wave, freq, at, dur } plus optional { to, gain, attack, detune, filter }:
//   - a tone (sine, triangle, square or sawtooth) at `freq` Hz, gliding to `to` Hz if given,
//     starting `at` seconds after the cue and lasting `dur` seconds; `attack` is the fade-in in
//     seconds, `release` makes the note hold its level and fade only over its last `release`
//     seconds (without it a note fades from the start, like a struck drum), `detune` shifts the
//     pitch in cents, and `filter` { freq, to?, q? } runs it through a low-pass filter that opens
//     from `freq` to `to` Hz (what makes a sawtooth sound like brass);
//   - or { noise: true, freq, q?, at, dur, gain? }: a burst of noise filtered around `freq`.
// `npm test` checks the shape, that every cue is used, and that the countdown beat fits inside one
// countdown step.
//
// Cues must never reveal what a player picked: they mark moments (the count, locking in, a point,
// the end), not choices.

// --- Instruments ------------------------------------------------------------------------------

// A trumpet note: two slightly detuned sawtooth voices through an opening low-pass filter, held at
// full level and released at the end so long notes sustain like brass.
const trumpet = (freq, at, dur) => {
  const release = Math.min(0.18, dur * 0.4);
  return [
    { wave: "sawtooth", freq, at, dur, attack: 0.02, release, gain: 0.5, filter: { freq: 700, to: 2800, q: 2 } },
    { wave: "sawtooth", freq, at, dur, attack: 0.02, release, gain: 0.35, detune: 9, filter: { freq: 700, to: 2800, q: 2 } },
  ];
};
// A low kettle-drum boom. Phone and laptop speakers barely reproduce this low, so it is only ever
// used underneath other sounds (see the fanfare), never alone.
const kettle = (at, dur = 0.2, from = 170, to = 60) => [{ wave: "sine", freq: from, to, at, dur, gain: 1 }];
// A hand drum (tom) that carries on small speakers: a triangle body with a stick click of noise.
const tom = (at, dur = 0.14, from = 400, to = 240) => [
  { wave: "triangle", freq: from, to, at, dur, gain: 1 },
  { noise: true, freq: 1300, q: 0.8, at, dur: 0.05, gain: 0.8 },
];
// A side drum (tabor): a snap of noise over a short tone.
const snare = (at, gain = 1) => [
  { noise: true, freq: 2400, q: 0.7, at, dur: 0.09, gain: 0.8 * gain },
  { wave: "triangle", freq: 190, to: 120, at, dur: 0.08, gain: 0.5 * gain },
];
// A drum roll: `n` quick taps spaced `gap` seconds apart.
const roll = (at, n, gap) => Array.from({ length: n }, (_, i) => snare(at + i * gap, 0.6)).flat();

// NOTE frequencies in Hz: G4 392, C5 523.25, E5 659.25, G5 784, C6 1046.5.
// Every duel ends with a trumpet (win: a rising flourish, draw: two level notes), the game ends
// with the big fanfare, the count is drums and the go word is the trumpet that follows them.

InsultGame.sounds = {
  volume: 0.3, // overall loudness, 0 to 1

  cues: {
    // Every button press: a light tap of the quill on the page. Word buttons get a softer, lower
    // tap (the same for every word, so it cannot give away which one was chosen).
    click: {
      notes: [
        { wave: "triangle", freq: 720, to: 460, at: 0, dur: 0.05, gain: 0.8 },
        { noise: true, freq: 3600, q: 1, at: 0, dur: 0.02, gain: 0.4 },
      ],
      vibrate: [10],
    },
    pick: {
      notes: [
        { wave: "sine", freq: 520, to: 380, at: 0, dur: 0.07, gain: 0.8 },
        { noise: true, freq: 2200, q: 1, at: 0, dur: 0.025, gain: 0.3 },
      ],
      vibrate: [8],
    },
    // The countdown: a hand-drum beat for each count, then a long trumpet flourish on the go word
    // (it rings on into the reveal).
    tick: { notes: tom(0), vibrate: [35] },
    go: {
      notes: [...trumpet(392, 0, 0.14), ...trumpet(392, 0.16, 0.14), ...trumpet(523.25, 0.32, 0.9), ...snare(0.32)],
      vibrate: [160],
    },
    // A duelist locks in their insult: a tap on the tabor.
    imprint: {
      notes: [
        { wave: "triangle", freq: 330, to: 200, at: 0, dur: 0.1 },
        { noise: true, freq: 3000, q: 1, at: 0, dur: 0.03, gain: 0.5 },
      ],
      vibrate: [25],
    },
    // A duel is won: a short rising trumpet flourish (C, E, G) for the winner.
    win: {
      notes: [...trumpet(523.25, 0, 0.12), ...trumpet(659.25, 0.14, 0.12), ...trumpet(784, 0.28, 0.6)],
      vibrate: [30, 40, 30],
    },
    // The judge calls a draw: two level trumpet notes.
    draw: { notes: [...trumpet(392, 0, 0.22), ...trumpet(392, 0.28, 0.4)], vibrate: [50] },
    // The end of the contention: a rising flourish over a drum roll, ending on a held chord.
    fanfare: {
      notes: [
        ...trumpet(392, 0, 0.14),
        ...trumpet(523.25, 0.16, 0.14),
        ...trumpet(659.25, 0.32, 0.14),
        ...roll(0.1, 6, 0.08),
        ...trumpet(523.25, 0.55, 1.1),
        ...trumpet(659.25, 0.55, 1.1),
        ...trumpet(784, 0.55, 1.1),
        ...kettle(0.55, 0.4, 150, 55),
        ...snare(0.55),
      ],
      vibrate: [60, 40, 60, 40, 200],
    },
  },
};

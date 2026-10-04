// ALL player-facing text lives in this file. Edit it (or copy it for another language or tone). The explanatory text is written in an early-modern
// style (capitalised Nouns, period spellings); modern text works just as well.
// {braces} are placeholders the game fills in. Words in the word bank itself live in packs/*.js.
// `npm test` fails if the game uses a key missing here, or if a key here is never used.
InsultGame.text = {
  lang: "en",
  documentTitle: "A Most Notable Contention of Insults",

  // Decorative characters, repeated to make the printer's ornament strip.
  ornaments: "¶ § † ‡ ",
  // Hand that points at the word you picked.
  marker: "☞",
  // Shown in the insult preview for a column you have not chosen from yet.
  blank: "____",

  // Lists are indexed by number: ordinals[0] is "First".
  romans: ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"], // one per word column
  ordinals: ["First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth", "Ninth", "Tenth"],
  cardinals: ["One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"],

  // Name offered for a seat that has been left blank ({n} is the seat number).
  defaultName: "Player {n}",

  footer: {
    imprint: "Imprinted at the Signe of the Three Columnes. Sold without Warrantie against wounded Feelings.",
    builtBy: "Built by Natan Skop (Theater in the Rough).",
  },

  setup: {
    kicker: "A Broadside for three Players or more",
    titleSmall: "A most Notable & Villanous",
    titleLarge: "Contention of Insults",
    lede: "Three Players or more shall take Turns. Two Duel, trading Slaunders built by Hand from the Three Columnes; another sits as Iudge, and saith whose Tongue hath the sharper Edge. The Seats change every Round, and the Points are kept to the End.",
    player: "The {ordinal} Player",
    addPlayer: "Adde a Player",
    remove: "Strike out",
    removeLabel: "Strike out {name}",
    rounds: "Length of the Contention (Rounds, at least {min})",
    pack: "The Word Banke",
    start: "Begin the Contention",
  },

  round: "Round the {ordinal} of {total}",

  handoff: {
    title: "Passe the Device to {name}",
    versus: "{a} against {b}, with {judge} as Iudge.",
    lede: "Let no Man peepe. Thy Chusing is secret vntil the Count be done.",
    button: "I am {name}. Shew my Columnes",
  },

  pick: {
    title: "{name}, build thy Slaunder",
    lede: "Chuse by thine owne Hand, one Word from each Columne, and not by Chance.",
    column: "¶ {roman}. The {ordinal} Columne",
    tabLabel: "Go to Columne {roman}",
    imprint: "Imprint it!",
    duplicate: "Vse a different Word in each Columne.",
  },

  ready: {
    title: "Both Slaunders are imprinted",
    lede: "Duellists, face one another. Iudge {judge}, giue eare.",
    button: "Begin the Count",
  },

  // Shown one after another; the last one is the "go" word.
  countdown: ["III", "II", "I", "SPEAKE!"],

  reveal: {
    title: "Speake it aloud!",
    ask: "{judge}, whose Tongue hath the sharper Edge?",
    wins: "{name} wins",
    draw: "A Draw. No Point",
  },

  scores: {
    title: "A Point to {name}",
    draw: "A Draw. No Point is given",
    next: "The next Round",
  },

  final: {
    winner: "{name} winneth the Contention!",
    tie: "A Tie between {names}. Their Tongues are equally vile.",
    nameSeparator: ", ",
    again: "Play againe",
    change: "Alter the Setup",
  },
};

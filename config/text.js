// ALL player-facing text lives in this file. Edit it (or copy it for another language or tone). The explanatory text is written in an early-modern
// style (capitalised Nouns, period spellings); modern text works just as well.
// {braces} are placeholders the game fills in. Words in the word bank itself live in packs/*.js.
// `npm test` fails if the game uses a key missing here, or if a key here is never used.
InsultGame.text = {
  lang: "en",
  documentTitle: "A Most Notable Contention of Insults",
  // Shown in link previews and search results. index.html repeats these in its <meta> tags
  // (crawlers do not run scripts), and `npm test` fails if the two copies differ.
  documentDescription: "A Shakespearean insult game for three to six players and one phone. Build thine insult by hand, speake it aloud on the count, and let the Judge decide.",
  documentImageAlt: "The title page of the game: a printed broadside headed Contention of Insults.",

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
    kicker: "A Broadside for three to six Players",
    titleSmall: "A most Notable & Villanous",
    titleLarge: "Contention of Insults",
    lede: "Three to six Players shall take Turns. Two Duel, trading Slaunders built by Hand from the Three Columnes; another sits as Judge, and saith whose Tongue hath the sharper Edge. Every Player duelleth every other once, the Seats change every Round, and the Points are kept to the End.",
    player: "The {ordinal} Player",
    addPlayer: "Adde a Player",
    remove: "Strike out",
    removeLabel: "Strike out {name}",
    // Two players who typed the same name become "Ada I" and "Ada II" ({roman} is the numeral).
    duplicate: "{name} {roman}",
    pack: "The Word Banke",
    start: "Begin the Contention",
  },

  round: "Round the {ordinal} of {total}",

  handoff: {
    title: "Passe the Device to {name}",
    versus: "{a} against {b}, with {judge} as Judge.",
    lede: "Let no Man peepe. Thy Chusing is secret until the Count be done.",
    button: "I am {name}. Shew my Columnes",
  },

  pick: {
    title: "{name}, build thy Slaunder",
    lede: "Chuse by thine owne Hand, one Word from each Columne, and not by Chance.",
    column: "¶ {roman}. The {ordinal} Columne",
    tabLabel: "Go to Columne {roman}",
    imprint: "Imprint it!",
    duplicate: "Use a different Word in each Columne.",
  },

  ready: {
    title: "Both Slaunders are imprinted",
    lede: "Duellists, face one another. Judge {judge}, give eare.",
    button: "Begin the Count",
  },

  // Shown one after another; the last one is the "go" word.
  countdown: ["III", "II", "I", "SPEAKE!"],

  reveal: {
    title: "Speake it aloud!",
    ask: "{judge}, whose Tongue hath the sharper Edge?",
    wins: "{name} wins",
    draw: "A Draw",
  },

  scores: {
    // Read aloud for a player's tally marks ({points} is a digit).
    tallyLabel: "{name}: {points} points",
    // {points} is a number word from `cardinals` ("Two"); the plural "Points" does not adapt if you change the scoring.
    title: "{points} Points to {name}",
    draw: "A Draw. {points} Point to each Duellist",
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

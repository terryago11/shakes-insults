// Game settings you may want to change. Text lives in config/text.js, words in packs/*.js.
InsultGame.settings = {
  roundOptions: [3, 5, 7, 9], // choices in the setup screen (text.js lists ordinals up to nine)
  defaultRounds: 5,
  countdownStepMs: 800, // time each countdown word is shown
  countdownLastMs: 500, // time the final "go" word is shown
  nameMaxLength: 24, // longest player name (also the limit on the setup inputs)
  namesStorageKey: "shakes-insults.names", // where the three names are remembered on this device; set to "" to turn remembering off
};

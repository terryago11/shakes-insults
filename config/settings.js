// Game settings you may want to change. Text lives in config/text.js, words in packs/*.js.
InsultGame.settings = {
  minPlayers: 3, // two duelists and a judge
  maxPlayers: 10, // text.js lists ordinals up to this many
  minRounds: 3,
  maxRounds: 30,
  defaultRounds: 5,
  countdownStepMs: 800, // time each countdown word is shown
  countdownLastMs: 500, // time the final "go" word is shown
  nameMaxLength: 24, // longest player name (also the limit on the setup inputs)
  namesStorageKey: "shakes-insults.names", // where the player names are remembered on this device; set to "" to turn remembering off
};

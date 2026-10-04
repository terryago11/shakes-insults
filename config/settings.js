// Game settings you may want to change. Text lives in config/text.js, words in packs/*.js.
InsultGame.settings = {
  minPlayers: 3, // two duelists and a judge
  maxPlayers: 6,
  duelsPerPlayer: 3, // each player duels this many times (fewer if there are not enough opponents, one fewer if players x this is odd); the number of rounds follows: 3 players = 3 rounds, 4 = 6, 5 = 5, 6 = 9
  pointsForWin: 2, // to the winning duelist
  pointsForDraw: 1, // to each duelist when the judge calls a draw
  countdownStepMs: 800, // time each countdown word is shown
  countdownLastMs: 500, // time the final "go" word is shown
  nameMaxLength: 24, // longest player name (also the limit on the setup inputs)
  namesStorageKey: "shakes-insults.names", // where the player names are remembered on this device; set to "" to turn remembering off
};

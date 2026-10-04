// Pure game logic: no DOM access, so it can be unit-tested in Node and reused by the UI.
(function (root) {
  "use strict";

  const packs = {};

  // Fisher-Yates. `rng` is injectable so tests can be deterministic.
  function shuffle(list, rng = Math.random) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // A pool entry is either a plain string or { w, tags?, src? } (extras are reserved for later).
  function wordText(entry) {
    return typeof entry === "string" ? entry : entry.w;
  }

  function registerPack(pack) {
    if (!pack || !pack.id) throw new Error("Pack needs an id");
    packs[pack.id] = pack;
  }

  // Turns a pack's `columns` (pool names) into arrays of word strings, one per column.
  function resolveColumns(pack) {
    if (!Array.isArray(pack.columns) || pack.columns.length < 2) {
      throw new Error(`Pack "${pack.id}": columns must list at least two pool names`);
    }
    return pack.columns.map((poolName) => {
      const pool = pack.pools && pack.pools[poolName];
      if (!Array.isArray(pool) || pool.length === 0) {
        throw new Error(`Pack "${pack.id}": pool "${poolName}" is missing or empty`);
      }
      return pool.map(wordText);
    });
  }

  function buildInsult(prefix, words) {
    return `${prefix} ${words.join(" ")}!`;
  }

  // Returns an error message, or null if the picks form a valid insult.
  function validatePicks(words) {
    if (words.some((w) => !w)) return "Pick a word from every column.";
    if (new Set(words).size !== words.length) return "Use a different word in each column.";
    return null;
  }

  // Judge picks the winning duelist (0 or 1). Returns a new scores array.
  function awardPoint(scores, winnerIdx) {
    const next = scores.slice();
    next[winnerIdx] += 1;
    return next;
  }

  // Index of the leader, or null on a tie.
  function leader(scores) {
    const max = Math.max(...scores);
    const leaders = scores.map((s, i) => (s === max ? i : -1)).filter((i) => i >= 0);
    return leaders.length === 1 ? leaders[0] : null;
  }

  const api = { packs, shuffle, wordText, registerPack, resolveColumns, buildInsult, validatePicks, awardPoint, leader };
  root.InsultGame = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);

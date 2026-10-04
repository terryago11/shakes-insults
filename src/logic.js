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

  // Plain-text form of an insult. The UI (insultNodes in app.js) builds the same shape with one
  // coloured span per word, so keep the two in step; tests use this as the reference.
  function buildInsult(prefix, words) {
    return `${prefix} ${words.join(" ")}!`;
  }

  // Returns "incomplete", "duplicate", or null when the picks form a valid insult.
  // (Codes, not sentences: the wording lives in config/text.js.)
  function validatePicks(words) {
    if (words.some((w) => !w)) return "incomplete";
    if (new Set(words).size !== words.length) return "duplicate";
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

  // --- text config helpers -------------------------------------------------

  // Fills {placeholders}; unknown placeholders are left visible so mistakes are noticed.
  function format(template, vars = {}) {
    return template.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
  }

  // Looks up "setup.title" style keys. A missing key throws, so typos fail loudly.
  function makeT(text) {
    return function t(key, vars) {
      const value = key.split(".").reduce((o, k) => (o == null ? undefined : o[k]), text);
      if (value === undefined) throw new Error(`Missing text key: ${key}`);
      return typeof value === "string" ? format(value, vars) : value;
    };
  }

  // 1-based pick from a list, falling back to the number itself (e.g. a 10th round).
  function nth(list, n) {
    return list[n - 1] !== undefined ? list[n - 1] : String(n);
  }

  const api = { packs, shuffle, wordText, registerPack, resolveColumns, buildInsult, validatePicks, awardPoint, leader, makeT, nth };
  root.InsultGame = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);

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

  // Judge picks the winning player (an index into `scores`), or null for a draw (no point).
  // Returns a new scores array.
  function awardPoint(scores, winnerIdx) {
    const next = scores.slice();
    if (winnerIdx !== null) next[winnerIdx] += 1;
    return next;
  }

  // Reads the saved-names string from storage. Storage is untrusted (anyone can edit it, and it
  // may be stale or corrupt), so anything that is not between `min` and `max` non-empty strings
  // is ignored (null). Names are trimmed and cut to `maxLen`.
  function parseSavedNames(raw, min, max, maxLen) {
    let list;
    try {
      list = JSON.parse(raw);
    } catch (e) {
      return null;
    }
    if (!Array.isArray(list) || list.length < min || list.length > max) return null;
    if (!list.every((n) => typeof n === "string" && n.trim() !== "")) return null;
    return list.map((n) => n.trim().slice(0, maxLen));
  }

  // Indexes of everyone on the top score (one entry for a clear winner, several for a tie).
  function leaders(scores) {
    const max = Math.max(...scores);
    return scores.map((s, i) => (s === max ? i : -1)).filter((i) => i >= 0);
  }

  // Index of the leader, or null on a tie.
  function leader(scores) {
    const top = leaders(scores);
    return top.length === 1 ? top[0] : null;
  }

  // The rounds field is typed by hand: anything unreadable becomes `fallback`, and the result is
  // kept within [min, max] and whole.
  function clampRounds(value, min, max, fallback) {
    const n = Math.round(Number(value));
    return Number.isFinite(n) && String(value).trim() !== "" ? Math.min(max, Math.max(min, n)) : fallback;
  }

  // Plans who duels whom and who judges, for every round of a game with `players` players.
  // Returns [{ duelists: [a, b], judge }, ...] with player indexes. The judge is never a duelist.
  //
  // The duels come from "cycles": one cycle is every pair of players meeting exactly once, in an
  // order where duel counts never differ by more than one (so stopping after any round is fair).
  // A longer game starts another cycle. `rng` decides who starts and breaks ties; pass a seeded
  // one for a repeatable plan. The judge of each round is, among the other players, whoever has
  // judged least so far, then whoever has duelled most.
  function planRounds(players, rounds, rng = Math.random) {
    if (!Number.isInteger(players) || players < 3) throw new Error("planRounds needs at least 3 players");
    const pairs = [];
    while (pairs.length < rounds) pairs.push(...duelCycle(players, rng));
    pairs.length = rounds;

    const duels = Array(players).fill(0);
    const judged = Array(players).fill(0);
    return pairs.map(([a, b]) => {
      let judge = null;
      let judgeKey = null;
      for (let p = 0; p < players; p++) {
        if (p === a || p === b) continue;
        const key = [judged[p], -duels[p]];
        if (judgeKey === null || cmp(key, judgeKey) < 0) {
          judge = p;
          judgeKey = key;
        }
      }
      duels[a]++; duels[b]++; judged[judge]++;
      return { duelists: [a, b], judge };
    });
  }

  // One cycle of duels: all players*(players-1)/2 pairs, each once, found by depth-first search so
  // that no choice leaves a forced repeat later. Order of preference at each step: keep duel
  // counts level, avoid anyone duelling two rounds running, then the random rank. If the search
  // runs out of its step budget (not seen for 3 to 10 players), it falls back to allowing repeats.
  function duelCycle(n, rng) {
    const rank = [];
    shuffle([...Array(n).keys()], rng).forEach((p, pos) => (rank[p] = pos));
    const total = (n * (n - 1)) / 2;

    for (const allowRepeats of [false, true]) {
      const used = new Set();
      const duels = Array(n).fill(0);
      const chosen = [];
      let budget = 20000;

      const extend = () => {
        if (chosen.length === total) return true;
        if (--budget < 0) return false;
        const last = chosen.length ? chosen[chosen.length - 1] : [];
        const options = [];
        for (let i = 0; i < n; i++) {
          for (let j = i + 1; j < n; j++) {
            if (!allowRepeats && used.has(i * n + j)) continue;
            duels[i]++; duels[j]++;
            const level = Math.max(...duels) - Math.min(...duels) <= 1;
            duels[i]--; duels[j]--;
            if (!level) continue;
            options.push({
              pair: rank[i] < rank[j] ? [i, j] : [j, i],
              key: [duels[i] + duels[j], last.includes(i) + last.includes(j), Math.min(rank[i], rank[j]), Math.max(rank[i], rank[j])],
            });
          }
        }
        options.sort((x, y) => cmp(x.key, y.key));
        for (const { pair } of options) {
          const [a, b] = pair;
          const id = Math.min(a, b) * n + Math.max(a, b);
          const wasUsed = used.has(id);
          used.add(id); duels[a]++; duels[b]++; chosen.push(pair);
          if (extend()) return true;
          chosen.pop(); duels[a]--; duels[b]--;
          if (!wasUsed) used.delete(id);
        }
        return false;
      };

      if (extend()) return chosen;
    }
    throw new Error("duelCycle: no ordering found"); // cannot happen: repeats are allowed on the second pass
  }

  // Lexicographic comparison of two number lists.
  function cmp(x, y) {
    for (let k = 0; k < x.length; k++) if (x[k] !== y[k]) return x[k] - y[k];
    return 0;
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

  const api = { packs, shuffle, wordText, registerPack, resolveColumns, buildInsult, validatePicks, awardPoint, parseSavedNames, leaders, leader, clampRounds, planRounds, makeT, nth };
  root.InsultGame = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);

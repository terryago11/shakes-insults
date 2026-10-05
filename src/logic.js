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

  // Scores one duel. `winnerIdx` is the winning player's index (it must be one of `duelists`), or
  // null for a draw, which gives each duelist `points.draw`. The judge never scores.
  // Returns a new scores array.
  function scoreRound(scores, duelists, winnerIdx, points) {
    const next = scores.slice();
    if (winnerIdx === null) duelists.forEach((p) => (next[p] += points.draw));
    else next[winnerIdx] += points.win;
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

  // Players typed into the setup screen may share a name. Every name that appears more than once
  // (ignoring case) is replaced by label(name, k), k = 1, 2, ... in seat order ("Ada" twice
  // becomes "Ada I", "Ada II"); names that are already unique are left alone.
  function disambiguate(names, label) {
    let out = names.slice();
    for (let pass = 0; pass < names.length; pass++) {
      const count = {};
      out.forEach((n) => (count[n.toLowerCase()] = (count[n.toLowerCase()] || 0) + 1));
      if (Object.values(count).every((c) => c === 1)) break;
      const seen = {};
      out = out.map((n) => {
        const key = n.toLowerCase();
        if (count[key] === 1) return n;
        seen[key] = (seen[key] || 0) + 1;
        return label(n, seen[key]);
      });
    }
    return out;
  }

  // How many duels each player has in a game. Aim for `target` (3 in config/settings.js), but never
  // more than there are opponents (players - 1), and keep players * duels even, since every duel
  // has two duelists (so an odd number of players with an odd target gets one fewer).
  function duelsEach(players, target) {
    const wanted = (players * target) % 2 === 0 ? target : target - 1;
    return Math.min(players - 1, wanted);
  }

  // The sound and vibration switches, read back from storage. Storage is untrusted, so each
  // switch must be a real true/false, otherwise it takes its default.
  function parsePrefs(raw, defaults) {
    let data = null;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      /* unreadable: use the defaults */
    }
    const pick = (key) => (data && typeof data === "object" && typeof data[key] === "boolean" ? data[key] : defaults[key]);
    return { sound: pick("sound"), vibration: pick("vibration") };
  }

  // Plans a whole game: `players` players (3 or more) who each duel exactly `duels` times, no pair
  // meeting twice. Returns [{ duelists: [a, b], judge }, ...] with player indexes (one entry per
  // round); the judge is never a duelist. Duel counts stay level while the game goes on and
  // back-to-back duels are avoided where possible; each player judges either the floor or the
  // ceiling of (rounds / players) times. `rng` decides who starts and breaks ties; pass a seeded
  // one for a repeatable plan.
  function planRounds(players, duels, rng = Math.random) {
    if (!Number.isInteger(players) || players < 3) throw new Error("planRounds needs at least 3 players");
    if (!Number.isInteger(duels) || duels < 1 || duels > players - 1 || (players * duels) % 2 !== 0) {
      throw new Error(`planRounds: ${players} players cannot each duel ${duels} times`);
    }
    const pairs = orderDuels(players, duels, rng);
    const judges = assignJudges(players, pairs, rng);
    return pairs.map((duelists, i) => ({ duelists, judge: judges[i] }));
  }

  // Distinct pairs, `each` duels per player, found by depth-first search so that no choice leaves a
  // stuck position later. Preference at each step: keep duel counts level, avoid anyone duelling two
  // rounds running, then the random rank. (A step budget guards against a runaway search; the
  // supported sizes never need it.)
  function orderDuels(n, each, rng) {
    const rank = [];
    shuffle([...Array(n).keys()], rng).forEach((p, pos) => (rank[p] = pos));
    const total = (n * each) / 2;
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
          if (used.has(i * n + j) || duels[i] >= each || duels[j] >= each) continue;
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
        used.add(id); duels[a]++; duels[b]++; chosen.push(pair);
        if (extend()) return true;
        chosen.pop(); duels[a]--; duels[b]--; used.delete(id);
      }
      return false;
    };

    if (!extend()) throw new Error(`orderDuels: no ordering found for ${n} players with ${each} duels each`);
    return chosen;
  }

  // A judge for every duel, never one of its duelists, so that every player judges either
  // floor(duels / players) or ceil(duels / players) times. Depth-first search, preferring whoever
  // has judged least; candidates are tried in a random order so games differ.
  function assignJudges(n, duels, rng) {
    const rank = [];
    shuffle([...Array(n).keys()], rng).forEach((p, pos) => (rank[p] = pos));
    const floor = Math.floor(duels.length / n);
    const cap = Math.ceil(duels.length / n);
    const judged = Array(n).fill(0);
    const chosen = [];
    let budget = 50000;

    const extend = () => {
      const i = chosen.length;
      if (i === duels.length) return true;
      if (--budget < 0) return false;
      // Prune: the remaining duels must be enough to bring everyone up to the floor.
      const missing = judged.reduce((sum, c) => sum + Math.max(0, floor - c), 0);
      if (missing > duels.length - i) return false;
      const options = [...Array(n).keys()]
        .filter((p) => !duels[i].includes(p) && judged[p] < cap)
        .sort((x, y) => judged[x] - judged[y] || rank[x] - rank[y]);
      for (const p of options) {
        judged[p]++; chosen.push(p);
        if (extend()) return true;
        chosen.pop(); judged[p]--;
      }
      return false;
    };

    if (!extend()) throw new Error(`assignJudges: no fair assignment found for ${n} players`);
    return chosen;
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

  const api = { packs, shuffle, wordText, registerPack, resolveColumns, buildInsult, validatePicks, scoreRound, parseSavedNames, parsePrefs, disambiguate, leaders, leader, duelsEach, planRounds, makeT, nth };
  root.InsultGame = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);

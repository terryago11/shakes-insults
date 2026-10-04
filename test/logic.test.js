const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const G = require("../src/logic.js");
const root = path.join(__dirname, "..");

// Load config and pack files the same way the browser does (they attach to InsultGame).
function loadScript(file) {
  new Function("InsultGame", fs.readFileSync(path.join(root, file), "utf8"))(G);
}
loadScript("config/text.js");
loadScript("config/settings.js");
for (const f of fs.readdirSync(path.join(root, "packs")).filter((n) => n.endsWith(".js"))) {
  loadScript(path.join("packs", f));
}

const t = G.makeT(G.text);

// Deterministic rng so shuffle tests are repeatable.
function seeded(seed) {
  let s = seed;
  return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
}

test("shuffle keeps every word, does not mutate, and differs by seed", () => {
  const input = Array.from({ length: 50 }, (_, i) => `w${i}`);
  const a = G.shuffle(input, seeded(1));
  const b = G.shuffle(input, seeded(2));
  assert.deepStrictEqual([...a].sort(), [...input].sort());
  assert.strictEqual(input[0], "w0");
  assert.notDeepStrictEqual(a, b);
});

test("every shipped pack resolves, has no blank or duplicate-in-pool words", () => {
  const ids = Object.keys(G.packs);
  assert.ok(ids.length >= 1);
  for (const id of ids) {
    const pack = G.packs[id];
    assert.ok(pack.prefix, `${id}: prefix`);
    assert.ok(pack.meta && pack.meta.name, `${id}: meta.name`);
    for (const [name, pool] of Object.entries(pack.pools)) {
      const words = pool.map(G.wordText);
      assert.ok(words.every((w) => w && w === w.trim()), `${id}.${name}: blank/untrimmed word`);
      assert.strictEqual(new Set(words).size, words.length, `${id}.${name}: duplicate word`);
    }
    assert.strictEqual(G.resolveColumns(pack).length, pack.columns.length);
  }
});

test("resolveColumns reports a clear error for a bad pack", () => {
  assert.throws(() => G.resolveColumns({ id: "x", pools: {}, columns: ["a", "b", "c"] }), /pool "a"/);
  assert.throws(() => G.resolveColumns({ id: "x", pools: {}, columns: ["a"] }), /at least two/);
});

test("resolveColumns accepts object entries", () => {
  const cols = G.resolveColumns({ id: "x", pools: { a: [{ w: "foo", tags: ["t"] }], b: ["bar"] }, columns: ["a", "b"] });
  assert.deepStrictEqual(cols, [["foo"], ["bar"]]);
});

test("buildInsult and validatePicks", () => {
  assert.strictEqual(G.buildInsult("Thou", ["mewling", "milk-livered", "maggot-pie"]), "Thou mewling milk-livered maggot-pie!");
  assert.strictEqual(G.validatePicks(["a", "b", "c"]), null);
  assert.strictEqual(G.validatePicks(["a", null, "c"]), "incomplete");
  assert.strictEqual(G.validatePicks(["a", "a", "c"]), "duplicate");
});

test("scoring: awardPoint is pure, leader handles ties", () => {
  const s = [0, 0];
  const s2 = G.awardPoint(s, 1);
  assert.deepStrictEqual(s, [0, 0]);
  assert.deepStrictEqual(s2, [0, 1]);
  assert.strictEqual(G.leader(s2), 1);
  assert.strictEqual(G.leader([2, 2]), null);
});

test("scoring: a draw (null) awards no point and does not mutate", () => {
  const s = [1, 0];
  assert.deepStrictEqual(G.awardPoint(s, null), [1, 0]);
  assert.notStrictEqual(G.awardPoint(s, null), s);
  assert.deepStrictEqual(s, [1, 0]);
  assert.deepStrictEqual(G.awardPoint(s, 0), [2, 0], "0 is a winner, not a draw");
});

test("parseSavedNames accepts exactly the right shape and rejects the rest", () => {
  assert.deepStrictEqual(G.parseSavedNames('["Ada"," Ben ","Cy"]', 3, 5, 24), ["Ada", "Ben", "Cy"]);
  assert.deepStrictEqual(G.parseSavedNames('["a","b","c","d","e"]', 3, 5, 24), ["a", "b", "c", "d", "e"]);
  assert.deepStrictEqual(G.parseSavedNames('["abcdef","b","c"]', 3, 5, 4), ["abcd", "b", "c"]);
  for (const bad of [null, "", "not json", "{}", '["a","b"]', '["a","b","c","d","e","f"]', '["a","b",3]', '["a","b",""]', '["a","b","  "]', '["a","b",null]']) {
    assert.strictEqual(G.parseSavedNames(bad, 3, 5, 24), null, `should reject ${bad}`);
  }
});

test("leaders lists everyone on the top score; leader is null on any tie", () => {
  assert.deepStrictEqual(G.leaders([1, 3, 2]), [1]);
  assert.deepStrictEqual(G.leaders([3, 1, 3]), [0, 2]);
  assert.deepStrictEqual(G.leaders([0, 0, 0]), [0, 1, 2]);
  assert.strictEqual(G.leader([3, 1, 3]), null);
});

test("awardPoint works for any number of players", () => {
  assert.deepStrictEqual(G.awardPoint([0, 0, 0, 0, 0], 3), [0, 0, 0, 1, 0]);
});

test("clampRounds keeps the typed value whole and within range, else uses the fallback", () => {
  assert.strictEqual(G.clampRounds("5", 3, 30, 5), 5);
  assert.strictEqual(G.clampRounds("1", 3, 30, 5), 3);
  assert.strictEqual(G.clampRounds("0", 3, 30, 5), 3);
  assert.strictEqual(G.clampRounds("-4", 3, 30, 5), 3);
  assert.strictEqual(G.clampRounds("99", 3, 30, 5), 30);
  assert.strictEqual(G.clampRounds("6.6", 3, 30, 5), 7);
  for (const bad of ["", "  ", "abc", "NaN", "Infinity"]) assert.strictEqual(G.clampRounds(bad, 3, 30, 5), 5, `"${bad}"`);
});

// A seeded random source, so plans are repeatable in tests.
function seeded(seed) {
  let s = seed;
  return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
}

const spread = (counts) => Math.max(...counts) - Math.min(...counts);

test("planRounds: valid rounds, judge never duels, duel counts differ by at most one (3 to 10 players)", () => {
  for (let n = 3; n <= 10; n++) {
    for (const rounds of [3, 4, 5, 7, 10, 15, 30]) {
      for (const seed of [1, 2, 3]) {
        const plan = G.planRounds(n, rounds, seeded(seed));
        assert.strictEqual(plan.length, rounds);
        const duels = Array(n).fill(0);
        for (const { duelists: [a, b], judge } of plan) {
          for (const p of [a, b, judge]) assert.ok(Number.isInteger(p) && p >= 0 && p < n, `bad player ${p}`);
          assert.strictEqual(new Set([a, b, judge]).size, 3, `n=${n}: duelists and judge must be three different players`);
          duels[a]++; duels[b]++;
        }
        assert.ok(spread(duels) <= 1, `n=${n} rounds=${rounds} seed=${seed}: duels ${duels}`);
      }
    }
  }
});

test("planRounds: judging is spread out too, and pairs repeat only after every pair has met", () => {
  for (let n = 3; n <= 10; n++) {
    for (const rounds of [3, 5, 8, 12, 30]) {
      const plan = G.planRounds(n, rounds, seeded(7));
      const judged = Array(n).fill(0);
      plan.forEach(({ judge }) => judged[judge]++);
      assert.ok(spread(judged) <= 2, `n=${n} rounds=${rounds}: judged ${judged}`);
      const seen = new Set();
      const allPairs = (n * (n - 1)) / 2;
      plan.forEach(({ duelists }, r) => {
        const key = [...duelists].sort().join("-");
        if (r < allPairs) assert.ok(!seen.has(key), `n=${n}: pair ${key} repeated in round ${r + 1} before every pair had met`);
        seen.add(key);
      });
    }
  }
});

test("planRounds: after whole cycles every pair has met the same number of times", () => {
  for (let n = 3; n <= 8; n++) {
    const all = (n * (n - 1)) / 2;
    for (const cycles of [1, 2]) {
      const count = {};
      G.planRounds(n, all * cycles, seeded(11)).forEach(({ duelists }) => {
        const k = [...duelists].sort().join("-");
        count[k] = (count[k] || 0) + 1;
      });
      assert.strictEqual(Object.keys(count).length, all);
      assert.ok(Object.values(count).every((c) => c === cycles), `n=${n}, ${cycles} cycle(s): ${JSON.stringify(count)}`);
    }
  }
});

test("planRounds: with three players, three rounds is every pair once and everyone judges once", () => {
  const plan = G.planRounds(3, 3, seeded(5));
  assert.deepStrictEqual(plan.map((m) => [...m.duelists].sort().join("-")).sort(), ["0-1", "0-2", "1-2"]);
  assert.deepStrictEqual(plan.map((m) => m.judge).sort(), [0, 1, 2]);
});

test("planRounds: repeatable for a seed, varies between seeds, and rejects fewer than three players", () => {
  assert.deepStrictEqual(G.planRounds(5, 6, seeded(9)), G.planRounds(5, 6, seeded(9)));
  const firsts = new Set([1, 2, 3, 4, 5, 6, 7, 8].map((s) => JSON.stringify(G.planRounds(5, 1, seeded(s)))));
  assert.ok(firsts.size > 1, "different seeds should start differently");
  assert.throws(() => G.planRounds(2, 3), /at least 3/);
  assert.throws(() => G.planRounds(3.5, 3), /at least 3/);
});

test("text helpers: makeT fills placeholders, throws on a missing key; nth falls back", () => {
  const tt = G.makeT({ a: { b: "Round {n} for {who}" }, list: ["x"] });
  assert.strictEqual(tt("a.b", { n: 2 }), "Round 2 for {who}"); // unknown placeholders stay visible
  assert.deepStrictEqual(tt("list"), ["x"]);
  assert.throws(() => tt("a.missing"), /Missing text key: a\.missing/);
  assert.strictEqual(G.nth(["First"], 1), "First");
  assert.strictEqual(G.nth(["First"], 10), "10");
});

// Collect "setup.title" style keys for every string/array leaf of the text config.
function leafKeys(obj, prefix = "") {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" && !Array.isArray(v) ? leafKeys(v, `${prefix}${k}.`) : [`${prefix}${k}`]
  );
}

test("text config: every t(\"key\") in src/app.js exists, and no config key is unused", () => {
  // Ignore comments so examples in them are not mistaken for real keys.
  const app = fs
    .readFileSync(path.join(root, "src", "app.js"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
  assert.doesNotMatch(app, /(?<![\w.])t\(\s*[^"\s)]/, 't() must be called with a literal "key" so this check can see it');
  const used = new Set([...app.matchAll(/\bt\(\s*"([\w.]+)"/g)].map((m) => m[1]));
  const defined = new Set(leafKeys(G.text));
  for (const key of used) assert.doesNotThrow(() => t(key), `app.js uses missing text key "${key}"`);
  const unused = [...defined].filter((k) => !used.has(k));
  assert.deepStrictEqual(unused, [], `config/text.js has keys the game never uses: ${unused.join(", ")}`);
});

// Every string in the text config, including list entries.
const strings = (v) => (typeof v === "string" ? [v] : Array.isArray(v) ? v.flatMap(strings) : Object.values(v).flatMap(strings));

test("text config: only placeholders the game actually supplies appear in the text", () => {
  // Keep in step with the variables src/app.js passes to t(). Catches typos like {nmae}.
  const supplied = new Set(["name", "names", "judge", "n", "ordinal", "total", "roman", "a", "b", "min"]);
  for (const s of strings(G.text)) {
    for (const [, p] of s.matchAll(/\{(\w+)\}/g)) assert.ok(supplied.has(p), `unknown placeholder {${p}} in "${s}"`);
  }
});

test("settings: player and round limits are sane, and the default round count is allowed", () => {
  const s = G.settings;
  assert.ok(s.minPlayers >= 3, "a game needs two duelists and a judge");
  assert.ok(s.maxPlayers >= s.minPlayers);
  assert.ok(s.minRounds >= 1 && s.maxRounds >= s.minRounds);
  assert.ok(s.defaultRounds >= s.minRounds && s.defaultRounds <= s.maxRounds);
  assert.ok(G.text.ordinals.length >= s.maxPlayers, "text.ordinals is shorter than the largest player count");
});

test("no player-facing text is hard-coded in index.html or style.css", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const bodyText = html
    .replace(/<script[\s\S]*?<\/script>|<!--[\s\S]*?-->|<style[\s\S]*?<\/style>/g, "")
    .replace(/<[^>]+>/g, "")
    .trim();
  assert.strictEqual(bodyText, "", `index.html contains text: "${bodyText}"`);
  assert.doesNotMatch(html, /\s(title|alt|aria-label|placeholder)\s*=/i, "index.html has a text attribute (put it in config/text.js)");
  const css = fs.readFileSync(path.join(root, "style.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  assert.ok(!/(^|[^-\w])content\s*:/.test(css), "style.css uses content: (text belongs in config/text.js)");
});

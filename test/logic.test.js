const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const G = require("../src/logic.js");

// Load every pack file the same way the browser does (they call InsultGame.registerPack).
const packDir = path.join(__dirname, "..", "packs");
for (const f of fs.readdirSync(packDir).filter((n) => n.endsWith(".js"))) {
  new Function("InsultGame", fs.readFileSync(path.join(packDir, f), "utf8"))(G);
}

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
  assert.match(G.validatePicks(["a", null, "c"]), /every column/);
  assert.match(G.validatePicks(["a", "a", "c"]), /different/);
});

test("scoring: awardPoint is pure, leader handles ties", () => {
  const s = [0, 0];
  const s2 = G.awardPoint(s, 1);
  assert.deepStrictEqual(s, [0, 0]);
  assert.deepStrictEqual(s2, [0, 1]);
  assert.strictEqual(G.leader(s2), 1);
  assert.strictEqual(G.leader([2, 2]), null);
});

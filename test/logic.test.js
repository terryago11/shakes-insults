const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { execFileSync } = require("node:child_process");

const G = require("../src/logic.js");
const root = path.join(__dirname, "..");

// Load config and pack files the same way the browser does (they attach to InsultGame).
function loadScript(file) {
  new Function("InsultGame", fs.readFileSync(path.join(root, file), "utf8"))(G);
}
loadScript("config/text.js");
loadScript("config/settings.js");
loadScript("config/sound.js");
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

const POINTS = { win: 2, draw: 1 };

test("scoring: a win gives the winner the win points, and nothing else changes", () => {
  const before = [0, 1, 0, 3];
  const after = G.scoreRound(before, [1, 3], 3, POINTS);
  assert.deepStrictEqual(after, [0, 1, 0, 5]);
  assert.deepStrictEqual(before, [0, 1, 0, 3], "must not mutate");
  assert.deepStrictEqual(G.scoreRound(before, [0, 2], 0, POINTS), [2, 1, 0, 3], "player 0 is a winner, not a draw");
});

test("scoring: a draw (null) gives each duelist the draw points, never the judge", () => {
  assert.deepStrictEqual(G.scoreRound([0, 0, 0, 0], [1, 3], null, POINTS), [0, 1, 0, 1]);
});

test("leaders lists everyone on the top score; leader is null on any tie", () => {
  assert.deepStrictEqual(G.leaders([1, 3, 2]), [1]);
  assert.deepStrictEqual(G.leaders([3, 1, 3]), [0, 2]);
  assert.deepStrictEqual(G.leaders([0, 0, 0]), [0, 1, 2]);
  assert.strictEqual(G.leader([2, 1]), 0);
  assert.strictEqual(G.leader([3, 1, 3]), null);
});

test("disambiguate numbers only the names that are shared, ignoring case", () => {
  const label = (n, k) => `${n} ${"I".repeat(k)}`;
  assert.deepStrictEqual(G.disambiguate(["Ada", "Ben", "Cy"], label), ["Ada", "Ben", "Cy"]);
  assert.deepStrictEqual(G.disambiguate(["Ada", "Ben", "ada", "Ada"], label), ["Ada I", "Ben", "ada II", "Ada III"]);
  assert.deepStrictEqual(G.disambiguate(["Ann", "Ann", "Bo", "Bo"], label), ["Ann I", "Ann II", "Bo I", "Bo II"]);
  // A typed name that collides with a generated one still ends up unique.
  const out = G.disambiguate(["Ada", "Ada", "Ada I"], label);
  assert.strictEqual(new Set(out.map((n) => n.toLowerCase())).size, 3, `still shared: ${out}`);
});

test("parseSavedNames accepts exactly the right shape and rejects the rest", () => {
  assert.deepStrictEqual(G.parseSavedNames('["Ada"," Ben ","Cy"]', 3, 5, 24), ["Ada", "Ben", "Cy"]);
  assert.deepStrictEqual(G.parseSavedNames('["a","b","c","d","e"]', 3, 5, 24), ["a", "b", "c", "d", "e"]);
  assert.deepStrictEqual(G.parseSavedNames('["abcdef","b","c"]', 3, 5, 4), ["abcd", "b", "c"]);
  for (const bad of [null, "", "not json", "{}", '["a","b"]', '["a","b","c","d","e","f"]', '["a","b",3]', '["a","b",""]', '["a","b","  "]', '["a","b",null]']) {
    assert.strictEqual(G.parseSavedNames(bad, 3, 5, 24), null, `should reject ${bad}`);
  }
});

// A seeded random source, so plans are repeatable in tests.
function seeded(seed) {
  let s = seed;
  return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
}

const spread = (counts) => Math.max(...counts) - Math.min(...counts);
const pairKey = (duelists) => [...duelists].sort((x, y) => x - y).join("-");

// Every (players, duels each) the planner accepts: 3 to 10 players, duels from 1 up to everyone else,
// with players * duels even (each duel has two duelists).
const sizes = [];
for (let n = 3; n <= 10; n++) for (let k = 1; k <= n - 1; k++) if ((n * k) % 2 === 0) sizes.push([n, k]);

test("duelsEach: aims for the target, never exceeds the opponents, keeps the count even", () => {
  const got = [3, 4, 5, 6, 7, 8, 9, 10].map((n) => G.duelsEach(n, 3));
  assert.deepStrictEqual(got, [2, 3, 2, 3, 2, 3, 2, 3]);
  for (let n = 3; n <= 10; n++) assert.ok((n * G.duelsEach(n, 3)) % 2 === 0);
});

test("planRounds: everyone duels exactly the same number of times and no pair repeats", () => {
  for (const [n, k] of sizes) {
    for (const seed of [1, 2, 3]) {
      const plan = G.planRounds(n, k, seeded(seed));
      assert.strictEqual(plan.length, (n * k) / 2, `n=${n} k=${k}`);
      assert.strictEqual(new Set(plan.map((m) => pairKey(m.duelists))).size, plan.length, `n=${n} k=${k} seed=${seed}: a pair repeats`);
      const duels = Array(n).fill(0);
      plan.forEach(({ duelists }) => duelists.forEach((p) => duels[p]++));
      assert.deepStrictEqual(duels, Array(n).fill(k), `n=${n} k=${k}: duel counts ${duels}`);
    }
  }
});

test("planRounds: the judge is never a duelist and judging is as even as possible", () => {
  for (const [n, k] of sizes) {
    for (const seed of [1, 2, 3]) {
      const plan = G.planRounds(n, k, seeded(seed));
      const judged = Array(n).fill(0);
      for (const { duelists, judge } of plan) {
        assert.strictEqual(new Set([...duelists, judge]).size, 3, `n=${n}: two duelists and a judge must be three different players`);
        judged[judge]++;
      }
      assert.ok(judged.every((c) => c === Math.floor(plan.length / n) || c === Math.ceil(plan.length / n)), `n=${n} k=${k}: judged ${judged}`);
    }
  }
});

test("planRounds: duel counts stay level while the game goes on", () => {
  for (const [n, k] of sizes) {
    const duels = Array(n).fill(0);
    G.planRounds(n, k, seeded(3)).forEach(({ duelists }, r) => {
      duelists.forEach((p) => duels[p]++);
      assert.ok(spread(duels) <= 1, `n=${n} k=${k}: after round ${r + 1} duel counts are ${duels}`);
    });
  }
});

test("planRounds: with three players it is three rounds and everyone judges once", () => {
  const plan = G.planRounds(3, 2, seeded(5));
  assert.deepStrictEqual(plan.map((m) => pairKey(m.duelists)).sort(), ["0-1", "0-2", "1-2"]);
  assert.deepStrictEqual(plan.map((m) => m.judge).sort(), [0, 1, 2]);
});

test("planRounds: repeatable for a seed, varies between seeds, and rejects fewer than three players", () => {
  assert.deepStrictEqual(G.planRounds(5, 4, seeded(9)), G.planRounds(5, 4, seeded(9)));
  const plans = new Set([1, 2, 3, 4, 5, 6, 7, 8].map((s) => JSON.stringify(G.planRounds(6, 3, seeded(s)))));
  assert.ok(plans.size > 1, "different seeds should give different plans");
  assert.throws(() => G.planRounds(2, 1), /at least 3/);
  assert.throws(() => G.planRounds(3.5, 2), /at least 3/);
  assert.throws(() => G.planRounds(5, 3), /cannot each duel/, "15 duel slots cannot be shared into duels");
  assert.throws(() => G.planRounds(4, 4), /cannot each duel/, "nobody can duel more opponents than exist");
  assert.throws(() => G.planRounds(4, 0), /cannot each duel/);
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
  const supplied = new Set(["name", "names", "judge", "n", "ordinal", "total", "roman", "a", "b", "points"]);
  for (const s of strings(G.text)) {
    for (const [, p] of s.matchAll(/\{(\w+)\}/g)) assert.ok(supplied.has(p), `unknown placeholder {${p}} in "${s}"`);
  }
});

test("settings: limits and points are sane, and the text config has words for every round", () => {
  const st = G.settings;
  assert.ok(st.minPlayers >= 3, "a game needs two duelists and a judge");
  assert.ok(st.maxPlayers >= st.minPlayers);
  assert.ok(st.pointsForWin > st.pointsForDraw && st.pointsForDraw > 0, "a win should beat a draw, and a draw should score");
  assert.ok(Number.isInteger(st.duelsPerPlayer) && st.duelsPerPlayer >= 1);
  let mostRounds = 0;
  for (let n = st.minPlayers; n <= st.maxPlayers; n++) {
    const k = G.duelsEach(n, st.duelsPerPlayer);
    assert.doesNotThrow(() => G.planRounds(n, k), `${n} players x ${k} duels each must be plannable`);
    mostRounds = Math.max(mostRounds, (n * k) / 2);
  }
  assert.ok(G.text.ordinals.length >= mostRounds && G.text.cardinals.length >= mostRounds, `text.ordinals/cardinals should reach ${mostRounds} (the most rounds a game can have)`);
  assert.ok(G.text.ordinals.length >= st.maxPlayers, "text.ordinals is shorter than the largest player count");
  assert.ok(G.text.cardinals.length >= Math.max(st.pointsForWin, st.pointsForDraw));
  assert.ok(G.text.romans.length >= st.maxPlayers, "text.romans must cover duplicate-name numbering");
});

// Small scanners for our own index.html (trusted, repo-controlled). They walk the string instead of
// using regex replaces, which static analysis rightly distrusts for "sanitising" markup.
function htmlWithoutComments(html) {
  let out = "";
  let i = 0;
  while (i < html.length) {
    if (html.startsWith("<!--", i)) {
      const end = html.indexOf("-->", i + 4);
      i = end === -1 ? html.length : end + 3;
    } else {
      out += html[i++];
    }
  }
  return out;
}

// The text of `html` that is outside tags, comments, <script> and <style>.
function htmlTextOutsideTags(html) {
  const source = htmlWithoutComments(html);
  let out = "";
  let i = 0;
  while (i < source.length) {
    if (source[i] !== "<") {
      out += source[i++];
      continue;
    }
    const close = source.indexOf(">", i);
    if (close === -1) break;
    const name = source.slice(i + 1, close).trim().split(/\s/)[0].toLowerCase();
    i = close + 1;
    if (name === "script" || name === "style") {
      const end = source.toLowerCase().indexOf(`</${name}`, i);
      i = end === -1 ? source.length : end; // the closing tag itself is skipped by the next pass
    }
  }
  return out;
}

test("the html scanners skip comments, tags, scripts and styles but keep real text", () => {
  assert.strictEqual(htmlWithoutComments("a<!-- x -->b<!-<!-- y -->- c"), "ab<!-- c", "one pass only: a marker formed by removing a comment is left as text");
  assert.strictEqual(htmlTextOutsideTags("<p class=a>hi <b>there</b></p><!-- no --><script>var t='nope'</script><style>p{}</style>x"), "hi therex");
  assert.strictEqual(htmlTextOutsideTags("<head><meta content=\"not text\"><title></title></head>"), "");
});

test("no player-facing text is hard-coded in index.html or style.css", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const bodyText = htmlTextOutsideTags(html).trim();
  assert.strictEqual(bodyText, "", `index.html contains text: "${bodyText}"`);
  assert.doesNotMatch(html, /\s(title|alt|aria-label|placeholder)\s*=/i, "index.html has a text attribute (put it in config/text.js)");
  const css = fs.readFileSync(path.join(root, "style.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  assert.ok(!/(^|[^-\w])content\s*:/.test(css), "style.css uses content: (text belongs in config/text.js)");
});

test("site build: the published copy has everything the page loads, and none of the repo-only files", () => {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), "insult-site-"));
  try {
    execFileSync("sh", [path.join(root, "scripts", "build-site.sh"), dest], { cwd: root });
    const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
    const css = fs.readFileSync(path.join(root, "style.css"), "utf8");
    const needed = [
      ...[...html.matchAll(/\b(?:src|href)="([^"#]+)"/g)].map((m) => m[1]),
      ...[...css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)].map((m) => m[1]),
    ].filter((ref) => !/^(https?:|data:)/.test(ref));
    assert.ok(needed.length > 8, "expected scripts, a stylesheet and fonts to be referenced");
    for (const ref of needed) assert.ok(fs.existsSync(path.join(dest, ref)), `the published site is missing ${ref}`);
    for (const f of ["index.html", "LICENSE", "fonts/OFL.txt", "social-preview.png", "favicon.svg", "favicon-32.png", "apple-touch-icon.png"]) assert.ok(fs.existsSync(path.join(dest, f)), `missing ${f}`);
    for (const f of ["reference", "test", "docs", "scripts", "package.json", "CLAUDE.md", ".github", ".git"]) {
      assert.ok(!fs.existsSync(path.join(dest, f)), `${f} must not be published`);
    }
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
  }
});

test("the game loads the full word list only (short.js is kept for tinkering, not loaded)", () => {
  const html = htmlWithoutComments(fs.readFileSync(path.join(root, "index.html"), "utf8"));
  const packs = [...html.matchAll(/<script src="(packs\/[^"]+)"/g)].map((m) => m[1]);
  assert.deepStrictEqual(packs, ["packs/full.js"]);
});

test("link preview: the static <meta> tags match the text config, and the image is the declared size", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const meta = (attr, key) => {
    const m = html.match(new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`));
    assert.ok(m, `index.html has no <meta ${attr}="${key}">`);
    return m[1];
  };
  const text = G.text;
  assert.strictEqual(meta("property", "og:title"), text.documentTitle);
  assert.strictEqual(meta("name", "description"), text.documentDescription);
  assert.strictEqual(meta("property", "og:description"), text.documentDescription);
  assert.strictEqual(meta("property", "og:image:alt"), text.documentImageAlt);
  assert.strictEqual(meta("name", "twitter:card"), "summary_large_image");
  // Previews need absolute addresses, and the image must be one of the published files.
  const image = meta("property", "og:image");
  assert.match(image, /^https:\/\/.+\/social-preview\.png$/);
  assert.strictEqual(meta("property", "og:url") + "social-preview.png", image);
  const png = fs.readFileSync(path.join(root, "social-preview.png"));
  assert.strictEqual(png.subarray(1, 4).toString(), "PNG");
  assert.deepStrictEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [Number(meta("property", "og:image:width")), Number(meta("property", "og:image:height"))]);
  assert.ok(png.length < 600 * 1024, "keep the preview image small (some platforms reject big ones)");
});

test("the spoken countdown has a word for every step of the visual one", () => {
  assert.strictEqual(G.text.countdownSpoken.length, G.text.countdown.length);
  assert.ok(G.text.countdownSpoken.every((w) => typeof w === "string" && w.trim() !== ""));
});

test("parsePrefs takes real booleans from storage and defaults everything else", () => {
  const defaults = { sound: true, vibration: false };
  assert.deepStrictEqual(G.parsePrefs('{"sound":false,"vibration":true}', defaults), { sound: false, vibration: true });
  assert.deepStrictEqual(G.parsePrefs('{"sound":false}', defaults), { sound: false, vibration: false }, "a missing switch takes its default");
  for (const bad of [null, "", "nope", "[]", "42", '{"sound":"yes","vibration":1}', '{"sound":null}']) {
    assert.deepStrictEqual(G.parsePrefs(bad, defaults), defaults, `should ignore ${bad}`);
  }
});

test("sound cues: every cue is well formed, used by the game, and the countdown ones fit in a step", () => {
  const { cues, volume } = G.sounds;
  assert.ok(volume > 0 && volume <= 1);
  const waves = ["sine", "triangle", "square", "sawtooth"];
  for (const [name, cue] of Object.entries(cues)) {
    assert.ok(Array.isArray(cue.notes) && cue.notes.length > 0, `${name}: needs notes`);
    for (const n of cue.notes) {
      assert.ok(n.freq >= 40 && n.freq <= 8000, `${name}: freq ${n.freq}`);
      assert.ok(n.at >= 0 && n.dur > 0 && n.at + n.dur <= 2, `${name}: timing ${n.at}+${n.dur}`);
      if (n.to !== undefined) assert.ok(n.to >= 40 && n.to <= 8000, `${name}: glide target ${n.to}`);
      if (n.gain !== undefined) assert.ok(n.gain > 0 && n.gain <= 1, `${name}: gain ${n.gain}`);
      if (n.attack !== undefined) assert.ok(n.attack > 0 && n.attack < n.dur, `${name}: attack ${n.attack}`);
      if (n.detune !== undefined) assert.ok(Math.abs(n.detune) <= 100, `${name}: detune ${n.detune}`);
      if (n.release !== undefined) assert.ok(n.release > 0 && n.release <= n.dur, `${name}: release ${n.release}`);
      if (n.filter) assert.ok(n.filter.freq >= 100 && n.filter.freq <= 12000 && (n.filter.to === undefined || (n.filter.to >= 100 && n.filter.to <= 12000)), `${name}: filter ${JSON.stringify(n.filter)}`);
      if (!n.noise) assert.ok(waves.includes(n.wave || "sine"), `${name}: wave ${n.wave}`);
    }
    // Phone and laptop speakers barely reproduce bass, so every cue needs something above 300 Hz.
    assert.ok(cue.notes.some((n) => n.noise || Math.max(n.freq, n.to || 0) >= 300 && (n.freq >= 300 || n.to >= 300)), `${name}: bass only, would be inaudible on small speakers`);
    assert.ok(Array.isArray(cue.vibrate) && cue.vibrate.length > 0 && cue.vibrate.every((ms) => Number.isInteger(ms) && ms > 0 && ms <= 500), `${name}: vibration pattern`);
  }
  // The cues app.js plays are exactly the ones defined (every string literal on a `.cue(` line).
  const app = fs.readFileSync(path.join(root, "src", "app.js"), "utf8");
  const used = new Set([
    ...app.split("\n").filter((line) => line.includes("audio.cue(")).flatMap((line) => [...line.matchAll(/"(\w+)"/g)].map((m) => m[1])),
    ...[...app.matchAll(/"data-cue":\s*"(\w+)"/g)].map((m) => m[1]),
    ...[...app.matchAll(/dataset\.cue\s*=\s*"(\w+)"/g)].map((m) => m[1]),
    ...[...app.matchAll(/dataset\.cue\s*\|\|\s*"(\w+)"/g)].map((m) => m[1]), // the default tap
  ]);
  used.delete("none"); // a button can opt out of the default tap
  assert.deepStrictEqual([...used].sort(), Object.keys(cues).sort());
  // The tick must be over before the next count; the go trumpet may ring on into the reveal.
  const endMs = (name) => Math.max(...cues[name].notes.map((n) => n.at + n.dur)) * 1000;
  assert.ok(endMs("tick") < G.settings.countdownStepMs, `tick lasts ${endMs("tick")}ms, longer than a countdown step`);
  assert.ok(endMs("go") <= 1500, "the go trumpet should not drag on past 1.5s");
});

test("icons: the page links an SVG favicon, a 32px PNG and an Apple touch icon, and the files are what they claim", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  for (const href of ["favicon.svg", "favicon-32.png", "apple-touch-icon.png"]) {
    assert.ok(html.includes(`href="${href}"`), `index.html does not link ${href}`);
    assert.ok(fs.existsSync(path.join(root, href)), `${href} is missing`);
  }
  assert.match(fs.readFileSync(path.join(root, "favicon.svg"), "utf8"), /<svg[^>]+viewBox=/);
  const size = (file) => {
    const png = fs.readFileSync(path.join(root, file));
    assert.strictEqual(png.subarray(1, 4).toString(), "PNG", `${file} is not a PNG`);
    return [png.readUInt32BE(16), png.readUInt32BE(20)];
  };
  assert.deepStrictEqual(size("favicon-32.png"), [32, 32]);
  assert.deepStrictEqual(size("apple-touch-icon.png"), [180, 180]);
});

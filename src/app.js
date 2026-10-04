// UI: a small screen-by-screen state machine. Every player-facing string comes from
// config/text.js via t("some.key") (use literal keys: a test checks them against the config).
// All text goes through textContent (via h()) so names and words are never read as HTML.
(function () {
  "use strict";

  const G = window.InsultGame;
  const t = G.makeT(G.text);
  const S = G.settings;
  const app = document.getElementById("app");
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const calm = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (k === "class") el.className = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else if (v === true) el.setAttribute(k, "");
      else if (v !== false && v != null) el.setAttribute(k, v);
    }
    for (const kid of kids.flat(Infinity)) if (kid != null && kid !== false) el.append(kid);
    return el;
  }

  function show(...nodes) {
    app.replaceChildren(...nodes);
    window.scrollTo(0, 0);
  }

  // Names are remembered on this device only (localStorage). Storage can be blocked or throw
  // (private windows, file:// in some browsers), so every access is wrapped and the game just
  // works without it.
  function loadNames() {
    try {
      return S.namesStorageKey ? G.parseSavedNames(localStorage.getItem(S.namesStorageKey), 3, S.nameMaxLength) : null;
    } catch (e) {
      return null;
    }
  }

  function saveNames(names) {
    try {
      if (S.namesStorageKey) localStorage.setItem(S.namesStorageKey, JSON.stringify(names));
    } catch (e) {
      /* remembering is a convenience; ignore */
    }
  }

  // state.names = [duelist 1, duelist 2, judge]
  let state = null;
  const duelist = (i) => state.names[i];
  const judge = () => state.names[2];
  const rule = () => h("hr", { class: "rule" });
  const lede = (text) => h("p", { class: "lede" }, text);
  const btn = (label, onclick, cls) => h("button", { type: "button", class: "btn" + (cls ? " " + cls : ""), onclick }, label);

  function roundKicker() {
    return h(
      "p",
      { class: "kicker" },
      t("round", { ordinal: G.nth(t("ordinals"), state.round), total: G.nth(t("cardinals"), state.rounds) })
    );
  }

  // Each column has its own hand colour (c1, c2, c3 = --c1..--c3 in style.css; cycles if a pack
  // has more than three columns).
  const hue = (i) => `c${(i % 3) + 1}`;

  // "Thou" + chosen words (hand-coloured red) + "!". Unchosen columns show the blank marker.
  function insultNodes(prefix, words) {
    const spans = words.flatMap((w, i) => [i ? " " : "", h("span", { class: w ? `w ${hue(i)}` : "blank" }, w || t("blank"))]);
    return [`${prefix} `, ...spans, "!"];
  }

  function screenSetup(prev) {
    const packIds = Object.keys(G.packs);
    const defaults = prev ? prev.names : loadNames() || t("defaultNames");
    const nameInputs = defaults.map((n) => h("input", { type: "text", value: n, maxlength: S.nameMaxLength, autocomplete: "off" }));
    const roundsSel = h(
      "select",
      {},
      S.roundOptions.map((n) =>
        h("option", { value: n, selected: n === (prev ? prev.rounds : S.defaultRounds) }, t("setup.roundsOption", { n }))
      )
    );
    const packSel = h(
      "select",
      {},
      packIds.map((id) => h("option", { value: id, selected: prev && prev.packId === id }, G.packs[id].meta.name))
    );

    show(
      h("p", { class: "kicker" }, t("setup.kicker")),
      h("h1", { class: "title" }, h("span", { class: "t-sm" }, t("setup.titleSmall")), h("span", { class: "t-lg" }, t("setup.titleLarge"))),
      rule(),
      lede(t("setup.lede")),
      h(
        "div",
        { class: "fields" },
        h("label", {}, t("setup.duelist1"), nameInputs[0]),
        h("label", {}, t("setup.duelist2"), nameInputs[1]),
        h("label", {}, t("setup.judge"), nameInputs[2])
      ),
      h("label", {}, t("setup.rounds"), roundsSel),
      packIds.length > 1 ? h("label", {}, t("setup.pack"), packSel) : null,
      btn(t("setup.start"), () => {
        state = {
          names: nameInputs.map((el, i) => el.value.trim() || defaults[i]),
          rounds: Number(roundsSel.value),
          packId: packSel.value || packIds[0],
          round: 1,
          scores: [0, 0],
          picks: [null, null],
        };
        saveNames(state.names);
        screenHandoff(0);
      })
    );
  }

  function screenHandoff(i) {
    show(
      roundKicker(),
      h("h2", {}, t("handoff.title", { name: duelist(i) })),
      rule(),
      lede(t("handoff.lede")),
      btn(t("handoff.button", { name: duelist(i) }), () => screenPick(i), "block")
    );
  }

  function screenPick(i) {
    const pack = G.packs[state.packId];
    // Fresh independent shuffle per player, per column, per round.
    const columns = G.resolveColumns(pack).map((words) => G.shuffle(words));
    const chosen = columns.map(() => null);
    const buttons = columns.map(() => []);
    const sections = [];
    const tabs = [];

    const preview = h("p", { class: "preview", "aria-live": "polite" });
    const problem = h("p", { class: "problem", "aria-live": "polite" });
    const lock = btn(t("pick.imprint"), onLock); // refresh() disables it until every column is chosen

    function jump(c) {
      sections[c].scrollIntoView({ behavior: calm() ? "auto" : "smooth", block: "start" });
    }

    function choose(c, word) {
      const firstPick = chosen[c] === null;
      chosen[c] = word;
      refresh();
      // Columns are stacked on a phone, where the column tabs are visible (the CSS hides them on
      // wide screens): after a first pick, bring the next empty column up.
      const next = chosen.findIndex((w, k) => k > c && w === null);
      if (firstPick && next !== -1 && tabs[0].offsetParent !== null) jump(next);
    }

    function refresh() {
      columns.forEach((words, c) => {
        words.forEach((w, k) => buttons[c][k].setAttribute("aria-pressed", String(chosen[c] === w)));
        tabs[c].classList.toggle("done", chosen[c] !== null);
      });
      preview.replaceChildren(...insultNodes(pack.prefix, chosen));
      const issue = G.validatePicks(chosen);
      problem.textContent = issue === "duplicate" ? t("pick.duplicate") : "";
      lock.disabled = issue !== null;
    }

    function onLock() {
      state.picks[i] = chosen.slice();
      if (i === 0) screenHandoff(1);
      else screenReady();
    }

    const colEls = columns.map((words, c) => {
      const list = h(
        "div",
        { class: "words" },
        words.map((w, k) => {
          const b = h(
            "button",
            { type: "button", class: "word", "aria-pressed": "false", onclick: () => choose(c, w) },
            h("span", { class: "mark", "aria-hidden": "true" }, t("marker")),
            h("span", { class: "txt" }, w)
          );
          buttons[c][k] = b;
          return b;
        })
      );
      const roman = G.nth(t("romans"), c + 1);
      const heading = h("h3", {}, t("pick.column", { roman, ordinal: G.nth(t("ordinals"), c + 1) }));
      sections[c] = h("section", { class: `col ${hue(c)}` }, heading, list);
      tabs[c] = h(
        "button",
        { type: "button", class: `tab ${hue(c)}`, "aria-label": t("pick.tabLabel", { roman }), onclick: () => jump(c) },
        roman
      );
      return sections[c];
    });

    show(
      roundKicker(),
      h("h2", {}, t("pick.title", { name: duelist(i) })),
      lede(t("pick.lede")),
      h("div", { class: "picker" }, colEls),
      h("div", { class: "bar-space", "aria-hidden": "true" }), // keeps the last row clear of the fixed bar
      h("div", { class: "bar" }, preview, problem, h("div", { class: "controls", style: `--n:${columns.length}` }, tabs, lock))
    );
    refresh();
  }

  function screenReady() {
    show(
      roundKicker(),
      h("h2", {}, t("ready.title")),
      rule(),
      lede(t("ready.lede", { judge: judge() })),
      btn(t("ready.button"), runCountdown, "block")
    );
  }

  async function runCountdown() {
    const labels = t("countdown");
    const big = h("div", { class: "countdown", "aria-live": "assertive" });
    show(big);
    for (let n = 0; n < labels.length; n++) {
      const last = n === labels.length - 1;
      big.textContent = labels[n];
      big.classList.toggle("go", last);
      await sleep(last ? S.countdownLastMs : S.countdownStepMs);
    }
    screenReveal();
  }

  function screenReveal() {
    const pack = G.packs[state.packId];
    const card = (i) =>
      h("div", { class: "card" }, h("h3", {}, duelist(i)), h("p", { class: "insult" }, insultNodes(pack.prefix, state.picks[i])));
    show(
      roundKicker(),
      h("h2", {}, t("reveal.title")),
      h("div", { class: "cards" }, card(0), card(1)),
      h("p", { class: "ask" }, t("reveal.ask", { judge: judge() })),
      h("div", { class: "btns" }, [
        [0, 1].map((i) => btn(t("reveal.wins", { name: duelist(i) }), () => award(i), "block")),
        btn(t("reveal.draw"), () => award(null), "block alt"),
      ])
    );
  }

  function award(winnerIdx) {
    state.scores = G.awardPoint(state.scores, winnerIdx);
    if (state.round >= state.rounds) screenFinal();
    else screenScores(winnerIdx);
  }

  function scoreboard() {
    return h(
      "div",
      { class: "scoreboard" },
      [0, 1].map((i) => h("div", { class: "score" }, h("span", {}, duelist(i)), h("strong", {}, String(state.scores[i]))))
    );
  }

  function screenScores(winnerIdx) {
    show(
      roundKicker(),
      h("h2", {}, winnerIdx === null ? t("scores.draw") : t("scores.title", { name: duelist(winnerIdx) })),
      scoreboard(),
      btn(t("scores.next"), () => {
        state.round += 1;
        state.picks = [null, null];
        screenHandoff(0);
      }, "block")
    );
  }

  function screenFinal() {
    const lead = G.leader(state.scores);
    show(
      h("h2", {}, lead === null ? t("final.draw") : t("final.winner", { name: duelist(lead) })),
      scoreboard(),
      h(
        "div",
        { class: "btns" },
        btn(t("final.again"), () => {
          state = { ...state, round: 1, scores: [0, 0], picks: [null, null] };
          screenHandoff(0);
        }),
        btn(t("final.change"), () => screenSetup(state), "alt")
      )
    );
  }

  // Page chrome that has no markup of its own in index.html.
  document.title = t("documentTitle");
  document.documentElement.lang = t("lang");
  document.getElementById("strip").textContent = t("ornaments").repeat(80);
  document.getElementById("imprint").textContent = t("footer.imprint");
  document.getElementById("builtby").textContent = t("footer.builtBy");
  const credit = Object.values(G.packs).map((p) => p.meta.credit).filter(Boolean)[0];
  document.getElementById("credit").textContent = credit || "";

  screenSetup(null);
})();

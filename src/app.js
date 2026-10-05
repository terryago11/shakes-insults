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

  // Skips null/false entries (an optional part of a screen), which replaceChildren would print as text.
  // After the first screen, focus moves to the new screen's heading: the button that was focused is
  // gone, and without this keyboard users start again from the top and screen readers hear nothing.
  let firstScreen = true;
  function show(...nodes) {
    app.replaceChildren(...nodes.flat(Infinity).filter((n) => n != null && n !== false));
    window.scrollTo(0, 0);
    const heading = app.querySelector("h1");
    if (heading && !firstScreen) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
    firstScreen = false;
  }

  // Names are remembered on this device only (localStorage). Storage can be blocked or throw
  // (private windows, file:// in some browsers), so every access is wrapped and the game just
  // works without it.
  function loadNames() {
    try {
      return S.namesStorageKey ? G.parseSavedNames(localStorage.getItem(S.namesStorageKey), S.minPlayers, S.maxPlayers, S.nameMaxLength) : null;
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

  // state: names (one per player, in seat order, made unique), entered (the names as typed, for the
  // setup screen), scores (same order), plan (G.planRounds: who duels and who judges each round;
  // one round per duel, so its length is the number of rounds), round (1-based), picks (the two
  // duelists' secret picks, by slot).
  let state = null;
  const match = () => state.plan[state.round - 1];
  const duelist = (slot) => state.names[match().duelists[slot]]; // slot 0 or 1
  const judge = () => state.names[match().judge];
  const seats = () => state.names.map((_, i) => i);
  const points = () => ({ win: S.pointsForWin, draw: S.pointsForDraw });
  const word = (n) => G.nth(t("cardinals"), n); // 2 -> "Two"
  const rule = () => h("hr", { class: "rule" });
  const lede = (text) => h("p", { class: "lede" }, text);
  const btn = (label, onclick, cls) => h("button", { type: "button", class: "btn" + (cls ? " " + cls : ""), onclick }, label);

  function roundKicker() {
    return h(
      "p",
      { class: "kicker" },
      t("round", { ordinal: G.nth(t("ordinals"), state.round), total: word(state.plan.length) })
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
    const defaultName = (n) => t("defaultName", { n });
    const names = (prev ? prev.entered : loadNames() || Array.from({ length: S.minPlayers }, (_, i) => defaultName(i + 1))).slice();
    let inputs = [];
    const fields = h("div", { class: "fields" });
    const addSeat = btn(t("setup.addPlayer"), () => {
      syncNames();
      let n = 1;
      while (names.includes(defaultName(n))) n++; // a fresh "Player n" that nobody already has
      names.push(defaultName(n));
      renderSeats();
      inputs[inputs.length - 1].focus();
    }, "alt");

    const syncNames = () => inputs.forEach((el, i) => (names[i] = el.value));

    function renderSeats() {
      inputs = names.map((n) => h("input", { type: "text", value: n, maxlength: S.nameMaxLength, autocomplete: "off" }));
      fields.replaceChildren(
        ...inputs.map((input, i) =>
          h(
            "div",
            { class: "seat" },
            h("label", {}, t("setup.player", { ordinal: G.nth(t("ordinals"), i + 1) }), input),
            names.length > S.minPlayers
              ? h("button", { type: "button", class: "btn alt", "aria-label": t("setup.removeLabel", { name: names[i] }), onclick: () => { syncNames(); names.splice(i, 1); renderSeats(); inputs[Math.min(i, inputs.length - 1)].focus(); } }, t("setup.remove"))
              : null
          )
        )
      );
      addSeat.disabled = names.length >= S.maxPlayers;
    }
    renderSeats();

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
      fields,
      addSeat,
      packIds.length > 1 ? h("label", {}, t("setup.pack"), packSel) : null,
      btn(t("setup.start"), () => {
        syncNames();
        const entered = names.map((n, i) => n.trim() || defaultName(i + 1));
        const finalNames = G.disambiguate(entered, (name, k) => t("setup.duplicate", { name, roman: G.nth(t("romans"), k) }));
        state = {
          names: finalNames,
          entered,
          packId: packSel.value || packIds[0],
          round: 1,
          scores: finalNames.map(() => 0),
          plan: G.planRounds(finalNames.length, G.duelsEach(finalNames.length, S.duelsPerPlayer)),
          picks: [null, null],
        };
        saveNames(entered);
        screenHandoff(0);
      })
    );
  }

  function screenHandoff(i) {
    show(
      roundKicker(),
      h("h1", { class: "heading" }, t("handoff.title", { name: duelist(i) })),
      h("p", { class: "versus" }, t("handoff.versus", { a: duelist(0), b: duelist(1), judge: judge() })),
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
      setStop(c, columns[c].indexOf(word));
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

    // One tab stop per column (the picked word, else the last one visited) so keyboard users are not
    // made to tab through every word; arrow keys, Home/End and typing a letter move within the column.
    function setStop(c, k) {
      buttons[c].forEach((b, i) => (b.tabIndex = i === k ? 0 : -1));
    }

    function onWordKey(e, c) {
      const items = buttons[c];
      const cur = items.indexOf(document.activeElement);
      if (cur === -1 || e.ctrlKey || e.metaKey || e.altKey) return;
      const firstBelow = items.findIndex((b) => b.offsetTop > items[0].offsetTop);
      const perRow = firstBelow > 0 ? firstBelow : 1; // 2 where the phone layout sets words in two columns
      let next = -1;
      if (e.key === "ArrowDown") next = Math.min(items.length - 1, cur + perRow);
      else if (e.key === "ArrowUp") next = Math.max(0, cur - perRow);
      else if (e.key === "ArrowRight") next = Math.min(items.length - 1, cur + 1);
      else if (e.key === "ArrowLeft") next = Math.max(0, cur - 1);
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = items.length - 1;
      else if (e.key.length === 1 && e.key.trim() !== "") {
        const letter = e.key.toLowerCase();
        for (let step = 1; step <= items.length && next === -1; step++) {
          const k = (cur + step) % items.length;
          if (columns[c][k].toLowerCase().startsWith(letter)) next = k;
        }
      }
      if (next === -1) return;
      e.preventDefault();
      items[next].focus();
    }

    const colEls = columns.map((words, c) => {
      const list = h(
        "div",
        { class: "words", onkeydown: (e) => onWordKey(e, c) },
        words.map((w, k) => {
          const b = h(
            "button",
            { type: "button", class: "word", "aria-pressed": "false", tabindex: k === 0 ? "0" : "-1", onclick: () => choose(c, w), onfocus: () => setStop(c, k) },
            h("span", { class: "mark", "aria-hidden": "true" }, t("marker")),
            h("span", { class: "txt" }, w)
          );
          buttons[c][k] = b;
          return b;
        })
      );
      const roman = G.nth(t("romans"), c + 1);
      const heading = h(
        "h2",
        { class: "subheading" },
        h("span", { "aria-hidden": "true" }, t("pick.columnMark") + " "), // the ornament is not read aloud
        t("pick.column", { roman, ordinal: G.nth(t("ordinals"), c + 1) })
      );
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
      h("h1", { class: "heading" }, t("pick.title", { name: duelist(i) })),
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
      h("h1", { class: "heading" }, t("ready.title")),
      rule(),
      lede(t("ready.lede", { judge: judge() })),
      btn(t("ready.button"), runCountdown, "block")
    );
  }

  async function runCountdown() {
    const labels = t("countdown");
    const spoken = t("countdownSpoken");
    // The big numerals are for the eyes ("III" may be read letter by letter); screen readers get the
    // spoken words from a live region.
    const big = h("div", { class: "countdown", "aria-hidden": "true" });
    const say = h("p", { class: "sr-only", "aria-live": "assertive" });
    show(h("h1", { class: "sr-only" }, t("ready.button")), big, say);
    for (let n = 0; n < labels.length; n++) {
      const last = n === labels.length - 1;
      big.textContent = labels[n];
      say.textContent = spoken[n];
      big.classList.toggle("go", last);
      await sleep(last ? S.countdownLastMs : S.countdownStepMs);
    }
    screenReveal();
  }

  function screenReveal() {
    const pack = G.packs[state.packId];
    const card = (i) =>
      h("div", { class: "card" }, h("h2", { class: "subheading" }, duelist(i)), h("p", { class: "insult" }, insultNodes(pack.prefix, state.picks[i])));
    show(
      roundKicker(),
      h("h1", { class: "heading" }, t("reveal.title")),
      h("div", { class: "cards" }, card(0), card(1)),
      h("p", { class: "ask" }, t("reveal.ask", { judge: judge() })),
      h("div", { class: "btns" }, [
        [0, 1].map((slot) => btn(t("reveal.wins", { name: duelist(slot) }), () => award(match().duelists[slot]), "block")),
        btn(t("reveal.draw"), () => award(null), "block alt"),
      ])
    );
  }

  // winnerIdx: the winning player's seat, or null for a draw.
  function award(winnerIdx) {
    state.scores = G.scoreRound(state.scores, match().duelists, winnerIdx, points());
    if (state.round >= state.plan.length) screenFinal();
    else screenScores(winnerIdx);
  }

  // Points as tally marks scratched on a wall: strokes in fours, the fifth one drawn across them.
  // Each stroke leans and runs a little differently (fixed offsets, so a redraw looks the same).
  // `data-points` and the label carry the number for screen readers and tests.
  function tally(points, name) {
    const NS = "http://www.w3.org/2000/svg";
    const line = (cls, x1, y1, x2, y2) => {
      const el = document.createElementNS(NS, "line");
      el.setAttribute("class", cls);
      for (const [k, v] of Object.entries({ x1, y1, x2, y2 })) el.setAttribute(k, String(v));
      return el;
    };
    const groups = Math.max(1, Math.ceil(points / 5));
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "tally");
    svg.setAttribute("viewBox", `0 0 ${groups * 60} 46`);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", t("scores.tallyLabel", { name, points }));
    svg.dataset.points = String(points);
    if (points === 0) svg.append(line("blank", 6, 40, 30, 41)); // nothing scratched yet: just the ruled line
    let k = 0; // stroke counter, drives the offsets
    for (let g = 0; g < groups; g++) {
      const marks = Math.min(5, points - g * 5);
      const strokes = Math.min(4, marks);
      for (let i = 0; i < strokes; i++, k++) {
        const x = g * 60 + 8 + i * 11 + ((k * 37) % 3) - 1;
        const lean = ((k * 53) % 5) - 2;
        svg.append(line("stroke", x, 5 + ((k * 29) % 4), x + lean, 40 + ((k * 17) % 4)));
      }
      if (marks === 5) {
        const x0 = g * 60 + 3;
        svg.append(line("stroke cross", x0, 33, x0 + 52, 12 + (g % 2)));
        k++;
      }
    }
    return svg;
  }

  // One tile per player, in the given seat order.
  function scoreboard(order) {
    return h(
      "div",
      { class: "scoreboard" },
      order.map((p) => h("div", { class: "score" }, h("span", {}, state.names[p]), tally(state.scores[p], state.names[p])))
    );
  }

  function screenScores(winnerIdx) {
    show(
      roundKicker(),
      h(
        "h1",
        { class: "heading" },
        winnerIdx === null
          ? t("scores.draw", { points: word(S.pointsForDraw) })
          : t("scores.title", { points: word(S.pointsForWin), name: state.names[winnerIdx] })
      ),
      scoreboard(seats()),
      btn(t("scores.next"), () => {
        state.round += 1;
        state.picks = [null, null];
        screenHandoff(0);
      }, "block")
    );
  }

  function screenFinal() {
    const top = G.leaders(state.scores);
    const ranked = seats().sort((x, y) => state.scores[y] - state.scores[x]); // stable: ties keep seat order
    show(
      h(
        "h1",
        { class: "heading" },
        top.length === 1
          ? t("final.winner", { name: state.names[top[0]] })
          : t("final.tie", { names: top.map((p) => state.names[p]).join(t("final.nameSeparator")) })
      ),
      scoreboard(ranked),
      h(
        "div",
        { class: "btns" },
        btn(t("final.again"), () => {
          state = { ...state, round: 1, scores: state.names.map(() => 0), plan: G.planRounds(state.names.length, G.duelsEach(state.names.length, S.duelsPerPlayer)), picks: [null, null] };
          screenHandoff(0);
        }),
        btn(t("final.change"), () => screenSetup(state), "alt")
      )
    );
  }

  // Page chrome that has no markup of its own in index.html.
  document.title = t("documentTitle");
  for (const [selector, value] of [
    ['meta[name="description"]', t("documentDescription")],
    ['meta[property="og:image:alt"]', t("documentImageAlt")],
  ]) {
    const meta = document.querySelector(selector);
    if (meta) meta.setAttribute("content", value);
  }
  document.documentElement.lang = t("lang");
  document.getElementById("strip").textContent = t("ornaments").repeat(80);
  document.getElementById("imprint").textContent = t("footer.imprint");
  document.getElementById("builtby").textContent = t("footer.builtBy");
  const credit = Object.values(G.packs).map((p) => p.meta.credit).filter(Boolean)[0];
  document.getElementById("credit").textContent = credit || "";

  screenSetup(null);
})();

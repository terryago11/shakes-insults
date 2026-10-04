// UI: a small screen-by-screen state machine. All text goes through textContent (via h())
// so player names and word-bank entries are never interpreted as HTML.
(function () {
  "use strict";

  const G = window.InsultGame;
  const app = document.getElementById("app");
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (k === "class") el.className = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else if (v === true) el.setAttribute(k, "");
      else if (v !== false && v != null) el.setAttribute(k, v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid);
    return el;
  }

  function show(...nodes) {
    app.replaceChildren(...nodes);
    window.scrollTo(0, 0);
  }

  // state.names = [duelist 1, duelist 2, judge]
  let state = null;
  const duelist = (i) => state.names[i];
  const judge = () => state.names[2];

  function screenSetup(prev) {
    const packIds = Object.keys(G.packs);
    const defaults = prev ? prev.names : ["Player 1", "Player 2", "Player 3"];
    const nameInputs = defaults.map((n, i) =>
      h("input", { type: "text", value: n, maxlength: 24, "aria-label": `Name ${i + 1}`, class: "name" })
    );
    const roundsSel = h(
      "select",
      { "aria-label": "Rounds" },
      [3, 5, 7, 9].map((n) => h("option", { value: n, selected: n === (prev ? prev.rounds : 5) }, `${n} rounds`))
    );
    const packSel = h(
      "select",
      { "aria-label": "Word pack" },
      packIds.map((id) => h("option", { value: id, selected: prev && prev.packId === id }, G.packs[id].meta.name))
    );

    show(
      h("h2", {}, "Set the stage"),
      h("p", { class: "muted" }, "Two duelists trade insults. The third player judges."),
      h("label", {}, "Duelist 1", nameInputs[0]),
      h("label", {}, "Duelist 2", nameInputs[1]),
      h("label", {}, "Judge", nameInputs[2]),
      h("label", {}, "Length", roundsSel),
      packIds.length > 1 ? h("label", {}, "Word pack", packSel) : null,
      h(
        "button",
        {
          class: "primary",
          onclick: () => {
            const names = nameInputs.map((el, i) => el.value.trim() || defaults[i]);
            state = {
              names,
              rounds: Number(roundsSel.value),
              packId: packSel.value || packIds[0],
              round: 1,
              scores: [0, 0],
              picks: [null, null],
            };
            screenHandoff(0);
          },
        },
        "Start the duel"
      )
    );
  }

  function screenHandoff(i) {
    show(
      h("p", { class: "muted" }, `Round ${state.round} of ${state.rounds}`),
      h("h2", {}, `Pass the device to ${duelist(i)}`),
      h("p", { class: "muted" }, "No peeking. Your insult stays secret until the countdown."),
      h("button", { class: "primary", onclick: () => screenPick(i) }, `I'm ${duelist(i)}. Show my words`)
    );
  }

  function screenPick(i) {
    const pack = G.packs[state.packId];
    // Fresh independent shuffle per player, per column, per round.
    const columns = G.resolveColumns(pack).map((words) => G.shuffle(words));
    const chosen = columns.map(() => null);
    const buttons = columns.map(() => []);

    const preview = h("p", { class: "preview", "aria-live": "polite" });
    const error = h("p", { class: "error", "aria-live": "polite" });
    const lock = h("button", { class: "primary", disabled: true, onclick: onLock }, "Lock it in");

    function refresh() {
      columns.forEach((words, c) =>
        words.forEach((w, k) => buttons[c][k].setAttribute("aria-pressed", String(chosen[c] === w)))
      );
      preview.textContent = G.buildInsult(pack.prefix, chosen.map((w) => w || "____"));
      const problem = G.validatePicks(chosen);
      error.textContent = chosen.every(Boolean) && problem ? problem : "";
      lock.disabled = Boolean(problem);
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
          const b = h("button", { class: "word", "aria-pressed": "false", onclick: () => { chosen[c] = w; refresh(); } }, w);
          buttons[c][k] = b;
          return b;
        })
      );
      return h("section", { class: "col" }, h("h3", {}, `Column ${c + 1}`), list);
    });

    show(
      h("h2", {}, `${duelist(i)}, build your insult`),
      h("div", { class: "columns" }, colEls),
      h("div", { class: "sticky" }, preview, error, lock)
    );
    refresh();
  }

  function screenReady() {
    show(
      h("h2", {}, "Both insults are locked in"),
      h("p", { class: "muted" }, `${duelist(0)} and ${duelist(1)}, face each other. ${judge()}, get ready to judge.`),
      h("button", { class: "primary", onclick: runCountdown }, "3 · 2 · 1")
    );
  }

  async function runCountdown() {
    const big = h("div", { class: "countdown", "aria-live": "assertive" });
    show(big);
    for (const label of ["3", "2", "1", "GO!"]) {
      big.textContent = label;
      await sleep(label === "GO!" ? 500 : 800);
    }
    screenReveal();
  }

  function screenReveal() {
    const pack = G.packs[state.packId];
    const card = (i) =>
      h("div", { class: "card" }, h("h3", {}, duelist(i)), h("p", { class: "insult" }, G.buildInsult(pack.prefix, state.picks[i])));
    show(
      h("h2", {}, "Say it out loud!"),
      h("div", { class: "cards" }, card(0), card(1)),
      h("p", { class: "muted" }, `${judge()}, who won the round?`),
      h("div", { class: "row" }, [0, 1].map((i) => h("button", { class: "primary", onclick: () => award(i) }, `${duelist(i)} wins`)))
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
      h("h2", {}, `Point to ${duelist(winnerIdx)}`),
      scoreboard(),
      h(
        "button",
        {
          class: "primary",
          onclick: () => {
            state.round += 1;
            state.picks = [null, null];
            screenHandoff(0);
          },
        },
        "Next round"
      )
    );
  }

  function screenFinal() {
    const lead = G.leader(state.scores);
    show(
      h("h2", {}, lead === null ? "A draw. Both tongues are equally vile." : `${duelist(lead)} wins the duel!`),
      scoreboard(),
      h("div", { class: "row" },
        h("button", { class: "primary", onclick: () => { state = { ...state, round: 1, scores: [0, 0], picks: [null, null] }; screenHandoff(0); } }, "Play again"),
        h("button", { onclick: () => screenSetup(state) }, "Change setup"))
    );
  }

  const credit = Object.values(G.packs).map((p) => p.meta.credit).filter(Boolean)[0];
  if (credit) document.getElementById("credit").textContent = credit;
  screenSetup(null);
})();

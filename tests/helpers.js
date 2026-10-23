// Runs script.js in a sandbox with a minimal DOM stub so its game logic can be
// tested in Node. Top-level `let` bindings (players, rounds…) stay reachable
// through run() because every call shares the same context.
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../script.js", import.meta.url), "utf8");

function element() {
  return {
    value: "",
    innerHTML: "",
    textContent: "",
    classList: {
      list: new Set(),
      add(c) { this.list.add(c); },
      remove(c) { this.list.delete(c); },
      toggle(c, on) { (on ?? !this.list.has(c)) ? this.list.add(c) : this.list.delete(c); },
      contains(c) { return this.list.has(c); },
    },
    focus() {},
  };
}

export function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

export function loadGame({ localStorage = memoryStorage() } = {}) {
  const elements = new Map();
  const document = {
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, element());
      return elements.get(id);
    },
  };
  const context = vm.createContext({ document, localStorage, confirm: () => true });
  vm.runInContext(source, context, { filename: "script.js" });
  const run = (code) => vm.runInContext(code, context);
  return { run, document, localStorage };
}

export const plain = (v) => JSON.parse(JSON.stringify(v));

export const NAMES = ["Ana", "Marko", "Jelena", "Pero"];

export function start(game, names = NAMES) {
  names.forEach((n, i) => (game.document.getElementById(`p${i + 1}`).value = n));
  game.run("startGame()");
}

export function play(game, gameKey, scores) {
  game.run(`onCellClick(currentTurn(), ${JSON.stringify(gameKey)})`);
  scores.forEach((s, i) => (game.document.getElementById(`si-${i}`).value = String(s)));
  game.run("confirmScores()");
}

// Valid scores for every game under the default rules.
export const VALID = {
  plus: [-1, -1, -3, -3],
  minus: [3, 3, 1, 1],
  jtref: [8, 0, 0, 0],
  dame: [2, 2, 4, 0],
  ksrca: [0, 0, 0, 8],
  srcad: [3, 3, 1, 1],
  lora: [1, 2, 0, 0],
};

// Plays all 28 rounds; every player picks every game once.
export function playFullGame(game) {
  const keys = JSON.parse(JSON.stringify(game.run("GAMES.map((g) => g.key)")));
  for (const key of keys) for (let p = 0; p < 4; p++) play(game, key, VALID[key]);
}

import { test } from "node:test";
import assert from "node:assert/strict";
import { loadGame, memoryStorage, plain, start, play, playFullGame } from "./helpers.js";

const history = (storage) => JSON.parse(storage.getItem("lora.history.v1") || "[]");

function entry(id, totals, { finished = true, winners } = {}) {
  const players = Object.keys(totals);
  const min = Math.min(...Object.values(totals));
  return {
    id,
    date: "2026-10-01T18:00:00.000Z",
    players,
    totals,
    winners: winners || players.filter((p) => totals[p] === min),
    rounds: finished ? 28 : 3,
    finished,
  };
}

test("a finished game is stored once in the history", () => {
  const storage = memoryStorage();
  const game = loadGame({ localStorage: storage });
  start(game);
  playFullGame(game);
  const list = history(storage);
  assert.equal(list.length, 1);
  assert.equal(list[0].finished, true);
  assert.deepEqual(list[0].players, ["Ana", "Marko", "Jelena", "Pero"]);
  assert.deepEqual(list[0].totals, { Ana: 64, Marko: 36, Jelena: 12, Pero: 28 });
  assert.deepEqual(list[0].winners, ["Jelena"]);
  assert.equal(list[0].rules.plus, -8);

  // Resetting after the end does not add a second entry.
  game.run("confirmReset()");
  assert.equal(history(storage).length, 1);
});

test("a reset after at least one round stores an unfinished game", () => {
  const storage = memoryStorage();
  const game = loadGame({ localStorage: storage });
  start(game);
  game.run("confirmReset()");
  assert.equal(history(storage).length, 0);

  start(game);
  play(game, "plus", [-2, -2, -2, -2]);
  game.run("confirmReset()");
  const list = history(storage);
  assert.equal(list.length, 1);
  assert.equal(list[0].finished, false);
  assert.equal(list[0].rounds, 1);
});

test("the history keeps the newest 50 games, newest first", () => {
  const game = loadGame();
  game.run("var list = []");
  for (let i = 0; i < 55; i++) game.run(`list = addToHistory(list, { id: "g${i}" })`);
  const ids = plain(game.run("list.map((h) => h.id)"));
  assert.equal(ids.length, 50);
  assert.equal(ids[0], "g54");
  assert.equal(ids[49], "g5");
  game.run('list = addToHistory(list, { id: "g20", again: true })');
  assert.equal(game.run("list.length"), 50);
  assert.equal(game.run("list[0].again"), true);
});

test("stats count games, wins and the average total over finished games", () => {
  const game = loadGame();
  const list = [
    entry("a", { Ana: 10, Marko: 20, Jelena: 30, Pero: 40 }),
    entry("b", { Ana: 25, Marko: 15, Jelena: 15, Pero: 45 }),
    entry("c", { Ana: 50, Marko: 0, Jelena: 0, Pero: 0 }, { finished: false }),
    entry("d", { Ana: 12, Marko: 40, Zoran: 30, Pero: 18 }),
  ];
  const stats = plain(game.run(`computeStats(${JSON.stringify(list)})`));
  assert.deepEqual(stats.map((s) => s.name), ["Ana", "Jelena", "Marko", "Zoran", "Pero"]);
  const ana = stats[0];
  assert.deepEqual(ana, { name: "Ana", played: 3, wins: 2, average: 47 / 3 });
  assert.deepEqual(stats.find((s) => s.name === "Jelena"), { name: "Jelena", played: 2, wins: 1, average: 22.5 });
  assert.deepEqual(stats.find((s) => s.name === "Zoran"), { name: "Zoran", played: 1, wins: 0, average: 30 });
});

test("the setup view lists past games and stats, and the history can be cleared", () => {
  const storage = memoryStorage({
    "lora.history.v1": JSON.stringify([entry("a", { Ana: 10, Marko: 20, "<b>X</b>": 30, Pero: 40 })]),
  });
  const game = loadGame({ localStorage: storage });
  const html = game.document.getElementById("past-games").innerHTML;
  assert.match(html, /Istorija/);
  assert.match(html, /Prosjek/);
  assert.match(html, /01\.10\.2026\./);
  assert.ok(!html.includes("<b>X"));

  game.run("confirmClearHistory()");
  assert.equal(storage.getItem("lora.history.v1"), null);
  assert.equal(game.document.getElementById("past-games").innerHTML, "");
});

test("corrupt history is ignored", () => {
  const game = loadGame({ localStorage: memoryStorage({ "lora.history.v1": "{nope" }) });
  assert.deepEqual(plain(game.run("loadHistory()")), []);
});

test("a new game starts with the rules of the last one", () => {
  const last = { ...entry("a", { Ana: 1, Marko: 2, Jelena: 3, Pero: 4 }), rules: { plus: -10, lora: 0 } };
  const game = loadGame({ localStorage: memoryStorage({ "lora.history.v1": JSON.stringify([last]) }) });
  assert.equal(game.run("rules.plus"), -10);
  assert.equal(game.run("rules.lora"), 0);
  assert.equal(game.run("rules.minus"), 8);
});

test("the share text ranks players and names the winner", () => {
  const game = loadGame();
  start(game);
  playFullGame(game);
  const lines = game.run("shareText()").split("\n");
  assert.match(lines[0], /^🃏 Lora — \d\d\.\d\d\.\d{4}\.$/);
  assert.deepEqual(lines.slice(1), ["1. Jelena: 12", "2. Pero: 28", "3. Marko: 36", "4. Ana: 64", "Pobjednik: Jelena"]);
});

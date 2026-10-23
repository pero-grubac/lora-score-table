import { test } from "node:test";
import assert from "node:assert/strict";
import { loadGame, memoryStorage, plain, start, play, NAMES } from "./helpers.js";

test("setup needs four different names", () => {
  const game = loadGame();
  start(game, ["Ana", "", "Jelena", "Pero"]);
  assert.match(game.document.getElementById("setup-error").textContent, /4 igrača/);
  start(game, ["Ana", "Ana", "Jelena", "Pero"]);
  assert.match(game.document.getElementById("setup-error").textContent, /različita/);
  start(game);
  assert.deepEqual(plain(game.run("players")), NAMES);
});

test("turns rotate and a player cannot pick the same game twice", () => {
  const game = loadGame();
  start(game);
  assert.equal(game.run("currentTurn()"), 0);
  play(game, "plus", [-1, -2, -3, -2]);
  assert.equal(game.run("currentTurn()"), 1);
  game.run("onCellClick(0, 'minus')"); // not player 0's turn
  assert.equal(game.run("pendingGame"), null);
  play(game, "plus", [-2, -2, -2, -2]);
  play(game, "plus", [-2, -2, -2, -2]);
  play(game, "plus", [-2, -2, -2, -2]);
  game.run("onCellClick(0, 'plus')"); // player 0 already played plus
  assert.equal(game.run("pendingGame"), null);
});

test("totals add up per game and overall", () => {
  const game = loadGame();
  start(game);
  play(game, "plus", [-1, -5, -2, 0]);
  play(game, "minus", [0, 1, 3, 4]);
  const t = plain(game.run("computeTotals()"));
  assert.equal(t.Ana._total, -1);
  assert.equal(t.Jelena._total, 1);
  assert.equal(t.Marko.plus, -5);
  assert.equal(t.Marko.dame, null);
  assert.deepEqual(plain(game.run("winners(computeTotals())")), ["Marko"]);
});

test("the game ends after every player has played every game", () => {
  const game = loadGame();
  start(game);
  const keys = plain(game.run("GAMES.map((g) => g.key)"));
  const scores = { plus: [-1, -1, -3, -3], lora: [1, 2, 0, 0] };
  for (const key of keys) for (let p = 0; p < 4; p++) play(game, key, scores[key] || [3, 3, 1, 1]);
  assert.equal(game.run("rounds.length"), 28);
  assert.equal(game.run("isGameOver()"), true);
  assert.deepEqual(plain(game.run("winners(computeTotals())")), ["Jelena", "Pero"]);
  assert.match(game.document.getElementById("round-history").innerHTML, /Pobjednici/);
});

test("a game in progress survives a reload, and a reset clears it", () => {
  const storage = memoryStorage();
  const first = loadGame({ localStorage: storage });
  start(first);
  play(first, "dame", [4, 0, 4, 0]);

  const reloaded = loadGame({ localStorage: storage });
  assert.deepEqual(plain(reloaded.run("players")), NAMES);
  assert.equal(reloaded.run("rounds.length"), 1);

  reloaded.run("confirmReset()");
  assert.equal(loadGame({ localStorage: storage }).run("players.length"), 0);
});

test("corrupt saved data is ignored", () => {
  const game = loadGame({ localStorage: memoryStorage({ "lora.game.v1": "{nope" }) });
  assert.equal(game.run("players.length"), 0);
});

test("player names are escaped in the rendered tables", () => {
  const game = loadGame();
  start(game, ["<img src=x onerror=alert(1)>", "B", "C", "D"]);
  play(game, "plus", [-8, 0, 0, 0]);
  const html =
    game.document.getElementById("score-tbody").innerHTML +
    game.document.getElementById("round-history").innerHTML;
  assert.ok(!html.includes("<img"));
  assert.ok(html.includes("&lt;img"));
});

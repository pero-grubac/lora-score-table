import { test } from "node:test";
import assert from "node:assert/strict";
import { loadGame, memoryStorage, plain, start, play } from "./helpers.js";

test("checkRoundTotal accepts the right sum and explains a wrong one", () => {
  const game = loadGame();
  const check = (scores, expected) =>
    plain(game.run(`checkRoundTotal(${JSON.stringify(scores)}, ${JSON.stringify(expected)})`));
  assert.deepEqual(check([2, 2, 4, 0], 8), { ok: true, sum: 8, error: "" });
  assert.deepEqual(check([-1, -2, -5, 0], -8), { ok: true, sum: -8, error: "" });
  assert.deepEqual(check([2, 2, 4, 1], 8), { ok: false, sum: 9, error: "Zbir mora biti 8 (sada 9)" });
  assert.equal(check([5, 9, 0, 1], null).ok, true);
});

test("parseScore reads negatives and treats blanks as zero", () => {
  const game = loadGame();
  assert.equal(game.run('parseScore("-3")'), -3);
  assert.equal(game.run('parseScore("")'), 0);
  assert.equal(game.run('parseScore("-")'), 0);
  assert.equal(game.run('parseScore("12")'), 12);
});

test("the default rules match the table, with Lora unchecked", () => {
  const game = loadGame();
  assert.deepEqual(plain(game.run("rules")), {
    plus: -8, minus: 8, jtref: 8, dame: 8, ksrca: 8, srcad: 8, lora: null,
  });
});

test("normalizeRules keeps valid values and fills the rest with defaults", () => {
  const game = loadGame();
  const r = plain(game.run('normalizeRules({ plus: -10, minus: "x", dame: null, lora: 12 })'));
  assert.deepEqual(r, { plus: -10, minus: 8, jtref: 8, dame: null, ksrca: 8, srcad: 8, lora: 12 });
  assert.deepEqual(plain(game.run("normalizeRules(undefined)")), plain(game.run("DEFAULT_RULES")));
});

test("a round with the wrong total is not saved and shows an error", () => {
  const game = loadGame();
  start(game);
  play(game, "plus", [1, 2, 3, 2]);
  assert.equal(game.run("rounds.length"), 0);
  assert.notEqual(game.run("pendingGame"), null);
  assert.equal(game.document.getElementById("entry-error").textContent, "Zbir mora biti -8 (sada 8)");
  [-1, -2, -3, -2].forEach((s, i) => (game.document.getElementById(`si-${i}`).value = String(s)));
  game.run("confirmScores()");
  assert.equal(game.run("rounds.length"), 1);
  assert.deepEqual(plain(game.run("rounds[0].scores")), { Ana: -1, Marko: -2, Jelena: -3, Pero: -2 });
});

test("the live sum turns green only when the round adds up", () => {
  const game = loadGame();
  start(game);
  game.run("onCellClick(0, 'minus')");
  const sum = game.document.getElementById("entry-sum");
  [3, 3, 1, 0].forEach((s, i) => (game.document.getElementById(`si-${i}`).value = String(s)));
  game.run("updateEntrySum()");
  assert.equal(sum.textContent, "Zbir: 7 / 8");
  assert.equal(sum.classList.contains("ok"), false);
  game.document.getElementById("si-3").value = "1";
  game.run("updateEntrySum()");
  assert.equal(sum.classList.contains("ok"), true);
});

test("a game without a check takes any total", () => {
  const game = loadGame();
  start(game);
  game.document.getElementById("game-rule-plus-off").checked = true;
  game.run("onRuleToggle('game', 'plus')");
  play(game, "plus", [5, 9, 0, 1]);
  assert.equal(game.run("rounds.length"), 1);
});

test("edited rules apply and are saved with the game", () => {
  const storage = memoryStorage();
  const game = loadGame({ localStorage: storage });
  game.document.getElementById("setup-rule-dame").value = "16";
  game.run("onRuleInput('setup', 'dame')");
  start(game);
  play(game, "dame", [4, 0, 4, 0]);
  assert.equal(game.run("rounds.length"), 0);
  play(game, "dame", [8, 0, 8, 0]);
  assert.equal(game.run("rounds.length"), 1);

  const reloaded = loadGame({ localStorage: storage });
  assert.equal(reloaded.run("rules.dame"), 16);
});

test("an old saved game without rules loads with the defaults", () => {
  const old = JSON.stringify({ players: ["Ana", "Marko", "Jelena", "Pero"], rounds: [] });
  const game = loadGame({ localStorage: memoryStorage({ "lora.game.v1": old }) });
  assert.equal(game.run("players.length"), 4);
  assert.deepEqual(plain(game.run("rules")), plain(game.run("DEFAULT_RULES")));
  assert.equal(typeof game.run("gameId"), "string");
});

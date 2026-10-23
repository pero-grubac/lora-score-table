// End-to-end smoke tests: setup with the rules editor, round validation,
// reload, the end of a game with sharing, and the game history.
import { test, expect } from "@playwright/test";

const NAMES = ["Ana", "Marko", "Jelena", "Pero"];

// Valid scores per game under the default rules.
const VALID = {
  plus: [-1, -1, -3, -3],
  minus: [3, 3, 1, 1],
  jtref: [8, 0, 0, 0],
  dame: [2, 2, 4, 0],
  ksrca: [0, 0, 0, 8],
  srcad: [3, 3, 1, 1],
  lora: [1, 2, 0, 0],
};

test.beforeEach(async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.errors = errors;
});

test.afterEach(async ({ page }) => {
  expect(page.errors, "no JavaScript errors").toEqual([]);
});

async function startGame(page) {
  for (const [i, n] of NAMES.entries()) await page.fill(`#p${i + 1}`, n);
  await page.getByRole("button", { name: /Počni igru/ }).click();
}

// Column of a game in the score table (1 = player names).
const COL = { plus: 2, minus: 3, jtref: 4, dame: 5, ksrca: 6, srcad: 7, lora: 8 };

async function enterScores(page, scores) {
  for (const [i, s] of scores.entries()) await page.fill(`#si-${i}`, String(s));
}

test("setup shows the editable scoring rules and uses them in the game", async ({ page }) => {
  await page.goto("./");
  await expect(page).toHaveTitle("Lora Score Table");

  await page.locator("#setup-view summary", { hasText: "Pravila bodovanja" }).click();
  await expect(page.locator("#setup-rule-plus")).toHaveValue("-8");
  await expect(page.locator("#setup-rule-dame")).toHaveValue("8");
  await expect(page.locator("#setup-rule-lora-off")).toBeChecked();
  await expect(page.locator("#setup-rule-lora")).toBeDisabled();

  await page.fill("#setup-rule-minus", "10");
  await page.locator("#setup-rule-jtref-off").check();
  await expect(page.locator("#setup-rule-jtref")).toBeDisabled();

  await startGame(page);
  await page.locator(`#score-tbody tr.turn-row td:nth-child(${COL.minus})`).click();
  await enterScores(page, VALID.minus);
  await page.getByRole("button", { name: "Potvrdi" }).click();
  await expect(page.locator("#entry-error")).toHaveText("Zbir mora biti 10 (sada 8)");

  await page.locator("#game-view summary", { hasText: "Pravila bodovanja" }).click();
  await expect(page.locator("#game-rule-minus")).toHaveValue("10");
  await expect(page.locator("#game-rule-jtref-off")).toBeChecked();
});

test("a round with the wrong total is rejected, a valid one is saved and survives a reload", async ({ page }) => {
  await page.goto("./");
  await startGame(page);

  await page.locator(`#score-tbody tr.turn-row td:nth-child(${COL.plus})`).click();
  await enterScores(page, [1, 2, 3, 2]);
  await expect(page.locator("#entry-sum")).toHaveText("Zbir: 8 / -8");
  await expect(page.locator("#entry-sum")).not.toHaveClass(/ok/);
  await page.getByRole("button", { name: "Potvrdi" }).click();
  await expect(page.locator("#entry-error")).toHaveText("Zbir mora biti -8 (sada 8)");
  await expect(page.locator(".totals-table")).toHaveCount(0);

  await enterScores(page, [-1, -2, -3, -2]);
  await expect(page.locator("#entry-sum")).toHaveClass(/ok/);
  await page.locator("#si-3").press("Enter");
  await expect(page.locator(".totals-table tbody tr")).toHaveCount(2);

  await page.reload();
  await expect(page.locator("#game-view")).toBeVisible();
  await expect(page.locator(".totals-table tbody tr").first()).toContainText("-3");
  await expect(page.locator("#score-tbody tr.turn-row")).toContainText("Marko");
});

test("finishing a game shares the result, saves an image and fills the history", async ({ page }) => {
  await page.addInitScript(() => {
    // No Web Share API here, so sharing falls back to the clipboard.
    delete Navigator.prototype.share;
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async (t) => void (window.__copied = t) },
    });
  });
  await page.goto("./");

  // 27 of 28 rounds already played; Pero still has to pick Dame.
  const order = ["plus", "minus", "jtref", "ksrca", "srcad", "lora", "dame"];
  const rounds = [];
  for (let i = 0; i < 27; i++) {
    const game = order[Math.floor(i / 4)];
    rounds.push({
      playerIdx: i % 4,
      game,
      scores: Object.fromEntries(NAMES.map((n, j) => [n, VALID[game][j]])),
    });
  }
  await page.evaluate(
    (state) => localStorage.setItem("lora.game.v1", JSON.stringify(state)),
    { id: "e2e", players: NAMES, rounds },
  );
  await page.reload();

  await page.locator(`#score-tbody tr.turn-row td:nth-child(${COL.dame})`).click();
  await enterScores(page, VALID.dame);
  await page.getByRole("button", { name: "Potvrdi" }).click();

  const banner = page.locator(".game-over");
  await expect(banner).toContainText("Kraj igre");
  await expect(banner).toContainText("Jelena");

  await banner.getByRole("button", { name: "Podijeli rezultat" }).click();
  await expect(page.locator("#share-status")).toHaveText("Rezultat je kopiran.");
  const copied = await page.evaluate(() => window.__copied);
  expect(copied).toContain("1. Jelena: 12");
  expect(copied).toContain("Pobjednik: Jelena");

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    banner.getByRole("button", { name: "Sačuvaj sliku" }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^lora-\d{4}-\d{2}-\d{2}\.png$/);

  await page.getByRole("button", { name: /Nova igra/ }).click();
  await page.locator("#reset-modal").getByRole("button", { name: "Resetuj" }).click();

  const past = page.locator("#past-games");
  await expect(past).toContainText("Istorija");
  await expect(past.locator(".past-item")).toHaveCount(1);
  await expect(past.locator(".past-winner")).toHaveText("Jelena 12");
  const jelena = past.locator(".stats-table tbody tr", { hasText: "Jelena" });
  await expect(jelena.locator("td")).toHaveText(["Jelena", "1", "1", "12,0"]);

  await page.reload();
  await expect(past.locator(".past-item")).toHaveCount(1);

  await past.getByRole("button", { name: "Obriši istoriju" }).click();
  await page.locator("#history-modal").getByRole("button", { name: "Obriši" }).click();
  await expect(page.locator("#history-modal")).toBeHidden();
  await expect(past.locator(".past-item")).toHaveCount(0);
});

"use strict";

const GAMES = [
  { key: "plus", label: "Plus", icon: "＋", hint: "−1 po štihu" },
  { key: "minus", label: "Minus", icon: "−", hint: "1 po štihu" },
  { key: "jtref", label: "J tref", icon: "♣", hint: "ko uzme žandara" },
  { key: "dame", label: "Dame", icon: "♛", hint: "2 po dami" },
  { key: "ksrca", label: "K srca", icon: "♡", hint: "ko uzme kralja" },
  { key: "srcad", label: "Srcad", icon: "♥", hint: "1 po srcu" },
  { key: "lora", label: "Lora", icon: "⊕", hint: "" },
];

// What the four scores of one round must add up to, per game.
// null = no check (bez provjere). House rules differ, so this is editable.
const DEFAULT_RULES = {
  plus: -8,
  minus: 8,
  jtref: 8,
  dame: 8,
  ksrca: 8,
  srcad: 8,
  lora: null,
};

let players = [];
let rounds = [];
let pendingGame = null;
let rules = { ...DEFAULT_RULES };
let gameId = null;

const STORAGE_KEY = "lora.game.v1";
const HISTORY_KEY = "lora.history.v1";
const HISTORY_LIMIT = 50;

// Player names end up in innerHTML, so they are escaped first.
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

// Whose turn it is to pick a game (cycles through players in order)
function currentTurn() {
  return rounds.length % players.length;
}

// Every player picks every game once.
function isGameOver() {
  return players.length > 0 && rounds.length === players.length * GAMES.length;
}

// Lowest total wins; ties share the win.
function winners(totals) {
  const min = Math.min(...players.map((p) => totals[p]._total));
  return players.filter((p) => totals[p]._total === min);
}

/* ══════════════════════════════════════════
   RULES — round total per game
══════════════════════════════════════════ */
// Fills in anything missing or invalid with the defaults, so old saved
// games (without rules) and hand-edited storage both load safely.
function normalizeRules(raw) {
  const out = {};
  GAMES.forEach((g) => {
    const v = raw && typeof raw === "object" ? raw[g.key] : undefined;
    if (v === null) out[g.key] = null;
    else if (Number.isInteger(v)) out[g.key] = v;
    else out[g.key] = DEFAULT_RULES[g.key];
  });
  return out;
}

function isDefaultRules(r) {
  return GAMES.every((g) => r[g.key] === DEFAULT_RULES[g.key]);
}

// Pure check of one round: scores is an array of numbers, expected the
// game's total (null = no check).
function checkRoundTotal(scores, expected) {
  const sum = scores.reduce((a, b) => a + b, 0);
  const ok = expected === null || expected === undefined || sum === expected;
  return {
    ok,
    sum,
    error: ok ? "" : `Zbir mora biti ${expected} (sada ${sum})`,
  };
}

function parseScore(value) {
  return parseInt(value, 10) || 0;
}

/* ══════════════════════════════════════════
   PERSISTENCE — survive a refresh or a closed tab
══════════════════════════════════════════ */
function saveState() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ id: gameId, players, rounds, rules }),
    );
  } catch {
    // Storage blocked or full: the game still works for this session.
  }
}

function loadState() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (
      data &&
      Array.isArray(data.players) &&
      data.players.length === 4 &&
      Array.isArray(data.rounds)
    ) {
      return {
        id: typeof data.id === "string" ? data.id : newGameId(),
        players: data.players,
        rounds: data.rounds,
        rules: normalizeRules(data.rules),
      };
    }
  } catch {
    // Corrupt data: start fresh.
  }
  return null;
}

function clearState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
}

function newGameId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/* ══════════════════════════════════════════
   HISTORY — finished (or abandoned) games
══════════════════════════════════════════ */
function loadHistory() {
  try {
    const list = JSON.parse(localStorage.getItem(HISTORY_KEY));
    if (Array.isArray(list)) {
      return list.filter(
        (h) =>
          h &&
          Array.isArray(h.players) &&
          h.totals &&
          typeof h.totals === "object" &&
          Array.isArray(h.winners),
      );
    }
  } catch {
    // Corrupt history: ignore it.
  }
  return [];
}

function saveHistory(list) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  } catch {
    // Storage blocked or full.
  }
}

function buildSummary() {
  const totals = computeTotals();
  const sums = {};
  players.forEach((p) => {
    sums[p] = totals[p]._total;
  });
  return {
    id: gameId,
    date: new Date().toISOString(),
    players: [...players],
    totals: sums,
    winners: winners(totals),
    rounds: rounds.length,
    finished: isGameOver(),
    rules: { ...rules },
  };
}

// Newest first, one entry per game (a game that is recorded twice, e.g.
// finished and then reset, replaces its earlier entry), at most 50.
function addToHistory(list, entry) {
  const rest = list.filter((h) => !entry.id || h.id !== entry.id);
  return [entry, ...rest].slice(0, HISTORY_LIMIT);
}

function recordGame() {
  if (!players.length || !rounds.length) return;
  saveHistory(addToHistory(loadHistory(), buildSummary()));
}

// Per-player stats over finished games: played, wins, average total.
// Sorted by wins, then by the lower average.
function computeStats(list) {
  const byName = new Map();
  list
    .filter((h) => h.finished)
    .forEach((h) => {
      h.players.forEach((name) => {
        const s = byName.get(name) || { name, played: 0, wins: 0, sum: 0 };
        s.played += 1;
        s.sum += Number(h.totals[name]) || 0;
        if (h.winners.includes(name)) s.wins += 1;
        byName.set(name, s);
      });
    });
  return [...byName.values()]
    .map(({ name, played, wins, sum }) => ({
      name,
      played,
      wins,
      average: sum / played,
    }))
    .sort((a, b) => b.wins - a.wins || a.average - b.average || a.name.localeCompare(b.name));
}

function formatDate(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}. ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatAverage(n) {
  return n.toFixed(1).replace(".", ",");
}

function showGame() {
  document.getElementById("setup-view").classList.add("hidden");
  document.getElementById("game-view").classList.remove("hidden");
  renderRules("game");
  render();
}

function showSetup() {
  document.getElementById("game-view").classList.add("hidden");
  document.getElementById("setup-view").classList.remove("hidden");
  renderRules("setup");
  renderPastGames();
}

/* ══════════════════════════════════════════
   SETUP
══════════════════════════════════════════ */
function startGame() {
  const names = [1, 2, 3, 4].map((i) =>
    document.getElementById(`p${i}`).value.trim(),
  );
  const err = document.getElementById("setup-error");
  if (names.some((n) => !n)) {
    err.textContent = "Sva 4 igrača moraju biti upisana.";
    return;
  }
  if (new Set(names).size !== 4) {
    err.textContent = "Imena igrača moraju biti različita.";
    return;
  }
  err.textContent = "";
  players = names;
  rounds = [];
  pendingGame = null;
  gameId = newGameId();
  saveState();
  showGame();
}

/* ══════════════════════════════════════════
   RULES EDITOR — in setup and, collapsed, in the game
══════════════════════════════════════════ */
function renderRules(prefix) {
  const container = document.getElementById(`${prefix}-rules`);
  if (!container) return;
  container.innerHTML = GAMES.map((g) => {
    const total = rules[g.key];
    const off = total === null;
    const id = `${prefix}-rule-${g.key}`;
    return `
      <div class="rule-row">
        <label class="rule-name" for="${id}">
          <span class="rule-icon">${g.icon}</span>${g.label}
          ${g.hint ? `<span class="rule-hint">${g.hint}</span>` : ""}
        </label>
        <input type="number" id="${id}" class="rule-input" step="1"
          value="${off ? "" : total}" ${off ? "disabled" : ""}
          aria-label="Zbir za ${g.label}"
          oninput="onRuleInput('${prefix}', '${g.key}')" />
        <label class="rule-off">
          <input type="checkbox" id="${id}-off" ${off ? "checked" : ""}
            onchange="onRuleToggle('${prefix}', '${g.key}')" />
          bez provjere
        </label>
      </div>`;
  }).join("");
}

function onRuleInput(prefix, key) {
  const el = document.getElementById(`${prefix}-rule-${key}`);
  if (el.value.trim() === "" || isNaN(parseInt(el.value, 10))) return;
  rules[key] = parseInt(el.value, 10);
  rulesChanged();
}

function onRuleToggle(prefix, key) {
  const off = document.getElementById(`${prefix}-rule-${key}-off`).checked;
  const el = document.getElementById(`${prefix}-rule-${key}`);
  if (off) {
    rules[key] = null;
  } else {
    rules[key] = DEFAULT_RULES[key] ?? 0;
    el.value = String(rules[key]);
  }
  el.disabled = off;
  rulesChanged();
}

function resetRules(prefix) {
  rules = { ...DEFAULT_RULES };
  renderRules(prefix);
  rulesChanged();
}

function rulesChanged() {
  if (players.length) saveState();
  updateEntrySum();
}

/* ══════════════════════════════════════════
   CELL CLICK — only current turn player
══════════════════════════════════════════ */
function onCellClick(playerIdx, gameKey) {
  if (pendingGame) return;
  if (playerIdx !== currentTurn()) return;
  if (rounds.some((r) => r.playerIdx === playerIdx && r.game === gameKey))
    return;
  pendingGame = { playerIdx, gameKey };
  render();
  const first = document.getElementById("si-0");
  if (first) first.focus();
}

/* ══════════════════════════════════════════
   CONFIRM / CANCEL
══════════════════════════════════════════ */
function readEntryScores() {
  return players.map((_, i) => {
    const el = document.getElementById(`si-${i}`);
    return el ? parseScore(el.value) : 0;
  });
}

// Live sum next to the inputs, green when the round adds up.
function updateEntrySum() {
  if (!pendingGame) return;
  const el = document.getElementById("entry-sum");
  if (!el) return;
  const expected = rules[pendingGame.gameKey];
  const { ok, sum } = checkRoundTotal(readEntryScores(), expected);
  el.textContent =
    expected === null ? `Zbir: ${sum} · bez provjere` : `Zbir: ${sum} / ${expected}`;
  el.classList.toggle("ok", expected !== null && ok);
}

function confirmScores() {
  if (!pendingGame) return;
  const values = readEntryScores();
  const check = checkRoundTotal(values, rules[pendingGame.gameKey]);
  if (!check.ok) {
    document.getElementById("entry-error").textContent = check.error;
    return;
  }
  const scores = {};
  players.forEach((p, i) => {
    scores[p] = values[i];
  });
  rounds.push({
    playerIdx: pendingGame.playerIdx,
    game: pendingGame.gameKey,
    scores,
  });
  pendingGame = null;
  saveState();
  if (isGameOver()) recordGame();
  render();
}

// Enter confirms, Escape cancels while typing scores.
function onEntryKey(e) {
  if (e.key === "Enter") confirmScores();
  if (e.key === "Escape") cancelEntry();
}

function cancelEntry() {
  pendingGame = null;
  render();
}

/* ══════════════════════════════════════════
   DELETE ROUND
══════════════════════════════════════════ */
function deleteRound(i) {
  if (!confirm("Obrisati ovu rundu?")) return;
  rounds.splice(i, 1);
  pendingGame = null;
  saveState();
  render();
}

/* ══════════════════════════════════════════
   COMPUTE TOTALS
══════════════════════════════════════════ */
function computeTotals() {
  const t = {};
  players.forEach((p) => {
    t[p] = { _total: 0 };
    GAMES.forEach((g) => {
      t[p][g.key] = null;
    });
  });
  rounds.forEach((r) => {
    players.forEach((p) => {
      const v = r.scores[p] || 0;
      t[p][r.game] = (t[p][r.game] ?? 0) + v;
      t[p]._total += v;
    });
  });
  return t;
}

/* ══════════════════════════════════════════
   RENDER
══════════════════════════════════════════ */
function render() {
  renderMainTable();
  renderHistory();
  document.getElementById("hint-text").textContent = isGameOver()
    ? "Sve igre su odigrane."
    : "Klikni na prazno polje u svom redu da odabereš igru.";
}

function renderMainTable() {
  const totals = computeTotals();
  const minTotal = Math.min(...players.map((p) => totals[p]._total));
  const turn = currentTurn();

  // thead
  const thead = document.getElementById("score-thead");
  let hRow = '<tr><th style="text-align:left; min-width:90px;">Igrač</th>';
  GAMES.forEach((g) => {
    hRow += `<th><div class="game-header">
      <span class="g-icon">${g.icon}</span>
      <span class="g-label">${g.label}</span>
    </div></th>`;
  });
  hRow += "</tr>";
  thead.innerHTML = hRow;

  // tbody
  const tbody = document.getElementById("score-tbody");
  let html = "";

  players.forEach((p, pi) => {
    const isWinning = rounds.length > 0 && totals[p]._total === minTotal;
    const isMyTurn = pi === turn;

    html += `<tr${isMyTurn && !pendingGame && !isGameOver() ? ' class="turn-row"' : ""}>`;
    const showTurn = isMyTurn && !pendingGame && !isGameOver();
    html += `<td class="player-col">${showTurn ? "▶ " : ""}${esc(p)}</td>`;

    GAMES.forEach((g) => {
      const thisPlayerPlayed = rounds.some(
        (r) => r.playerIdx === pi && r.game === g.key,
      );
      const entryOpen = pendingGame !== null;
      const isPending =
        entryOpen &&
        pendingGame.playerIdx === pi &&
        pendingGame.gameKey === g.key;

      let content = "—";
      let cls = "game-cell";

      if (isPending) {
        cls += " selected";
        content = "...";
      } else if (entryOpen) {
        cls += " not-turn";
        content = thisPlayerPlayed ? "X" : "—";
      } else if (thisPlayerPlayed) {
        cls += " played";
        content = "X";
      } else if (!isMyTurn) {
        cls += " not-turn";
      }

      const canClick = !thisPlayerPlayed && !entryOpen && isMyTurn;
      const click = canClick ? `onclick="onCellClick(${pi}, '${g.key}')"` : "";

      html += `<td class="${cls}" ${click}>${content}</td>`;
    });

    html += `</tr>`;

    if (pendingGame && pendingGame.playerIdx === pi) {
      html += buildEntryRow();
    }
  });

  tbody.innerHTML = html;
  updateEntrySum();
}

function buildEntryRow() {
  const { playerIdx, gameKey } = pendingGame;
  const gameName = GAMES.find((g) => g.key === gameKey).label;
  const colspan = GAMES.length + 2;

  return `
    <tr class="score-entry">
      <td colspan="${colspan}">
        <div class="entry-panel">
          <p class="entry-label">
            <strong>${esc(players[playerIdx])}</strong> bira
            <strong>${gameName}</strong> — unesi bodove
          </p>
          <div class="entry-inputs">
            ${players
              .map(
                (p, i) => `
              <div class="entry-field">
                <label class="ef-label" for="si-${i}">${esc(p)}</label>
                <input type="number" id="si-${i}" value="0" step="1"
                  onfocus="this.select()" oninput="updateEntrySum()"
                  onkeydown="onEntryKey(event)" />
              </div>
            `,
              )
              .join("")}
          </div>
          <p class="entry-sum" id="entry-sum" aria-live="polite"></p>
          <p class="error-msg entry-error" id="entry-error" role="alert"></p>
          <div class="entry-actions">
            <button class="btn btn-ghost btn-sm" onclick="cancelEntry()">Odustani</button>
            <button class="btn btn-primary btn-sm" onclick="confirmScores()">Potvrdi</button>
          </div>
        </div>
      </td>
    </tr>
  `;
}

function renderHistory() {
  const container = document.getElementById("round-history");
  if (!rounds.length) {
    container.innerHTML = "";
    return;
  }

  const totals = computeTotals();
  const minTotal = Math.min(...players.map((p) => totals[p]._total));

  let histHtml = "";
  if (isGameOver()) {
    const won = winners(totals);
    histHtml += `<div class="game-over" role="status">
      <p class="go-title">Kraj igre</p>
      <p class="go-body">${won.length > 1 ? "Pobjednici" : "Pobjednik"}:
        <strong>${won.map(esc).join(", ")}</strong> — ${minTotal} bodova</p>
      <div class="go-actions">
        <button class="btn btn-primary btn-sm" onclick="shareResult()">Podijeli rezultat</button>
        <button class="btn btn-ghost btn-sm" onclick="saveImage()">Sačuvaj sliku</button>
      </div>
      <p class="share-status" id="share-status" aria-live="polite"></p>
    </div>`;
  }

  histHtml += `<hr class="section-divider">
    <p class="history-title">Bodovi po rundi</p>
    <div class="totals-table-wrap">
    <table class="totals-table">
      <thead>
        <tr>
          <th style="text-align:left; min-width:110px;">Igra</th>
          ${players.map((p) => `<th>${esc(p)}</th>`).join("")}
          <th style="width:32px;"></th>
        </tr>
      </thead>
      <tbody>`;

  rounds.forEach((r, i) => {
    const g = GAMES.find((x) => x.key === r.game);
    histHtml += `<tr>`;
    histHtml += `<td class="tt-name" style="font-size:15px;">
      <span style="margin-right:5px;">${g.icon}</span>${g.label}
      <span class="tt-picker">${esc(players[r.playerIdx])}</span>
    </td>`;
    players.forEach((p) => {
      histHtml += `<td>${r.scores[p] ?? 0}</td>`;
    });
    histHtml += `<td style="text-align:center; padding:4px;">
      <button onclick="deleteRound(${i})" title="Obriši"
        style="background:none;border:none;cursor:pointer;color:#c4a882;font-size:14px;line-height:1;">✕</button>
    </td>`;
    histHtml += `</tr>`;
  });

  histHtml += `<tr style="border-top: 2px solid #c4a882;">`;
  histHtml += `<td class="tt-name" style="font-size:13px; color:#7a5830; font-family:'Source Sans 3',sans-serif;">Ukupno</td>`;
  players.forEach((p) => {
    const isWin = totals[p]._total === minTotal;
    histHtml += `<td class="${isWin ? "tt-winner" : "tt-total"}">${totals[p]._total}</td>`;
  });
  histHtml += `<td></td></tr>`;
  histHtml += `</tbody></table></div>`;

  container.innerHTML = histHtml;
}

/* ══════════════════════════════════════════
   PAST GAMES — history list and stats on the setup view
══════════════════════════════════════════ */
function renderPastGames() {
  const container = document.getElementById("past-games");
  if (!container) return;
  const list = loadHistory();
  if (!list.length) {
    container.innerHTML = "";
    return;
  }

  const stats = computeStats(list);
  let html = `<hr class="section-divider">
    <p class="section-label">Istorija</p>`;

  if (stats.length) {
    html += `<div class="totals-table-wrap">
      <table class="totals-table stats-table">
        <thead>
          <tr>
            <th style="text-align:left;">Igrač</th>
            <th>Igre</th>
            <th>Pobjede</th>
            <th>Prosjek</th>
          </tr>
        </thead>
        <tbody>
          ${stats
            .map(
              (s) => `<tr>
            <td class="tt-name">${esc(s.name)}</td>
            <td>${s.played}</td>
            <td>${s.wins}</td>
            <td>${formatAverage(s.average)}</td>
          </tr>`,
            )
            .join("")}
        </tbody>
      </table>
    </div>
    <p class="hint-text stats-note">Statistika računa samo završene igre.</p>`;
  }

  html += `<ul class="past-list">
    ${list
      .map((h) => {
        const ranked = [...h.players].sort(
          (a, b) => (h.totals[a] ?? 0) - (h.totals[b] ?? 0),
        );
        const tags = [];
        if (!h.finished) tags.push(`nedovršena · ${h.rounds ?? 0}/28`);
        if (h.rules && !isDefaultRules(normalizeRules(h.rules)))
          tags.push("vlastita pravila");
        return `<li class="past-item">
          <span class="past-date">${esc(formatDate(h.date))}</span>
          ${tags.map((t) => `<span class="past-tag">${t}</span>`).join("")}
          <span class="past-scores">${ranked
            .map((p) => {
              const cls = h.winners.includes(p) ? "past-winner" : "";
              return `<span class="${cls}">${esc(p)} ${esc(h.totals[p] ?? 0)}</span>`;
            })
            .join(" · ")}</span>
        </li>`;
      })
      .join("")}
  </ul>
  <div style="text-align:right;">
    <button class="reset-btn" onclick="askClearHistory()">Obriši istoriju</button>
  </div>`;

  container.innerHTML = html;
}

function askClearHistory() {
  document.getElementById("history-modal").classList.remove("hidden");
}

function cancelClearHistory() {
  document.getElementById("history-modal").classList.add("hidden");
}

function confirmClearHistory() {
  document.getElementById("history-modal").classList.add("hidden");
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {
    // Nothing to clear.
  }
  renderPastGames();
}

/* ══════════════════════════════════════════
   SHARE — text summary and a PNG of the totals
══════════════════════════════════════════ */
function shareText() {
  const totals = computeTotals();
  const ranked = [...players].sort((a, b) => totals[a]._total - totals[b]._total);
  const won = winners(totals);
  const date = formatDate(new Date().toISOString()).split(" ")[0];
  return [
    `🃏 Lora — ${date}`,
    ...ranked.map((p, i) => `${i + 1}. ${p}: ${totals[p]._total}`),
    `${won.length > 1 ? "Pobjednici" : "Pobjednik"}: ${won.join(", ")}`,
  ].join("\n");
}

function setShareStatus(msg) {
  const el = document.getElementById("share-status");
  if (el) el.textContent = msg;
}

async function copyResult(text) {
  try {
    await navigator.clipboard.writeText(text);
    setShareStatus("Rezultat je kopiran.");
  } catch {
    setShareStatus("Kopiranje nije uspjelo.");
  }
}

async function shareResult() {
  const text = shareText();
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title: "Lora", text });
      return;
    } catch (e) {
      if (e && e.name === "AbortError") return;
    }
  }
  await copyResult(text);
}

// Draws the final totals table (players × games + total) on a canvas in
// the paper colours and downloads it as a PNG.
function drawResultCanvas() {
  const totals = computeTotals();
  const won = winners(totals);
  const scale = 2;
  const pad = 32;
  const nameW = 170;
  const colW = 78;
  const rowH = 44;
  const headH = 48;
  const titleH = 84;
  const width = pad * 2 + nameW + colW * (GAMES.length + 1);
  const height = pad * 2 + titleH + headH + rowH * players.length + 30;

  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);

  ctx.fillStyle = "#fefcf5";
  ctx.fillRect(0, 0, width, height);

  ctx.textBaseline = "middle";
  ctx.fillStyle = "#2a1a08";
  ctx.font = '700 34px "Playfair Display", serif';
  ctx.textAlign = "left";
  ctx.fillText("🃏 Lora", pad, pad + 22);
  ctx.font = 'italic 15px "Source Sans 3", sans-serif';
  ctx.fillStyle = "#a08060";
  ctx.fillText(
    `${formatDate(new Date().toISOString()).split(" ")[0]} · ${won.length > 1 ? "pobjednici" : "pobjednik"}: ${won.join(", ")}`,
    pad,
    pad + 60,
  );

  const top = pad + titleH;
  const cols = [...GAMES.map((g) => g.label), "Ukupno"];

  // Header row
  ctx.fillStyle = "#ede0ca";
  ctx.fillRect(pad, top, width - pad * 2, headH);
  ctx.fillStyle = "#7a5830";
  ctx.font = '700 12px "Source Sans 3", sans-serif';
  ctx.textAlign = "left";
  ctx.fillText("IGRAČ", pad + 12, top + headH / 2);
  ctx.textAlign = "center";
  cols.forEach((c, i) => {
    ctx.fillText(c.toUpperCase(), pad + nameW + colW * i + colW / 2, top + headH / 2);
  });

  players.forEach((p, ri) => {
    const y = top + headH + rowH * ri;
    const isWin = won.includes(p);
    ctx.fillStyle = isWin ? "#e4f0d8" : ri % 2 ? "#fefcf5" : "#f7efe0";
    ctx.fillRect(pad, y, width - pad * 2, rowH);
    ctx.fillStyle = isWin ? "#2e6010" : "#2a1a08";
    ctx.font = '600 18px "Playfair Display", serif';
    ctx.textAlign = "left";
    ctx.fillText(p, pad + 12, y + rowH / 2, nameW - 20);
    ctx.textAlign = "center";
    ctx.font = '400 16px "Source Sans 3", sans-serif';
    GAMES.forEach((g, gi) => {
      const v = totals[p][g.key];
      ctx.fillText(v === null ? "—" : String(v), pad + nameW + colW * gi + colW / 2, y + rowH / 2);
    });
    ctx.font = '700 18px "Playfair Display", serif';
    ctx.fillText(String(totals[p]._total), pad + nameW + colW * GAMES.length + colW / 2, y + rowH / 2);
  });

  // Grid lines
  ctx.strokeStyle = "#ddd0bb";
  ctx.lineWidth = 1;
  const bottom = top + headH + rowH * players.length;
  for (let r = 0; r <= players.length; r++) {
    const y = top + headH + rowH * r + 0.5;
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(width - pad, y);
    ctx.stroke();
  }
  [0, ...cols.map((_, i) => nameW + colW * i), width - pad * 2].forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(pad + x + 0.5, top);
    ctx.lineTo(pad + x + 0.5, bottom);
    ctx.stroke();
  });
  ctx.strokeStyle = "#d4b896";
  ctx.strokeRect(pad + 0.5, top + 0.5, width - pad * 2 - 1, bottom - top - 1);

  ctx.fillStyle = "#a08060";
  ctx.font = 'italic 12px "Source Sans 3", sans-serif';
  ctx.textAlign = "right";
  ctx.fillText("manje bodova, bolje", width - pad, bottom + 20);

  return canvas;
}

function saveImage() {
  const canvas = drawResultCanvas();
  canvas.toBlob((blob) => {
    if (!blob) {
      setShareStatus("Slika nije napravljena.");
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lora-${new Date().toISOString().slice(0, 10)}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setShareStatus("Slika je sačuvana.");
  }, "image/png");
}

/* ══════════════════════════════════════════
   RESET
══════════════════════════════════════════ */
function resetGame() {
  document.getElementById("reset-modal").classList.remove("hidden");
}

// An abandoned game with at least one round still goes into the history.
// The rules stay for the next game.
function confirmReset() {
  document.getElementById("reset-modal").classList.add("hidden");
  recordGame();
  players = [];
  rounds = [];
  pendingGame = null;
  gameId = null;
  clearState();
  [1, 2, 3, 4].forEach((i) => {
    document.getElementById(`p${i}`).value = "";
  });
  showSetup();
}

/* ══════════════════════════════════════════
   RESTORE — continue a game after a reload
══════════════════════════════════════════ */
const saved = loadState();
if (saved) {
  gameId = saved.id;
  players = saved.players;
  rounds = saved.rounds;
  rules = saved.rules;
  showGame();
} else {
  // A new game starts with the rules of the last one played.
  const last = loadHistory()[0];
  rules = normalizeRules(last && last.rules);
  showSetup();
}

function cancelReset() {
  document.getElementById("reset-modal").classList.add("hidden");
}

"use strict";

const GAMES = [
  { key: "plus", label: "Plus", icon: "＋" },
  { key: "minus", label: "Minus", icon: "−" },
  { key: "jtref", label: "J tref", icon: "♣" },
  { key: "dame", label: "Dame", icon: "♛" },
  { key: "ksrca", label: "K srca", icon: "♡" },
  { key: "srcad", label: "Srcad", icon: "♥" },
  { key: "lora", label: "Lora", icon: "⊕" },
];

let players = [];
let rounds = [];
let pendingGame = null;

// Whose turn it is to pick a game (cycles through players in order)
function currentTurn() {
  return rounds.length % players.length;
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
  document.getElementById("setup-view").classList.add("hidden");
  document.getElementById("game-view").classList.remove("hidden");
  render();
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
}

/* ══════════════════════════════════════════
   CONFIRM / CANCEL
══════════════════════════════════════════ */
function confirmScores() {
  if (!pendingGame) return;
  const scores = {};
  players.forEach((p) => {
    const el = document.getElementById(`si-${p}`);
    scores[p] = el ? parseInt(el.value) || 0 : 0;
  });
  rounds.push({
    playerIdx: pendingGame.playerIdx,
    game: pendingGame.gameKey,
    scores,
  });
  pendingGame = null;
  render();
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

    html += `<tr${isMyTurn && !pendingGame ? ' class="turn-row"' : ""}>`;
    html += `<td class="player-col">${isMyTurn && !pendingGame ? "▶ " : ""}${p}</td>`;

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
}

function buildEntryRow() {
  const { playerIdx, gameKey } = pendingGame;
  const gameName = GAMES.find((g) => g.key === gameKey).label;
  const colspan = GAMES.length + 2;

  return `
    <tr class="score-entry">
      <td colspan="${colspan}">
        <p class="entry-label">
          <strong>${players[playerIdx]}</strong> odabrao:
          <strong>${gameName}</strong> — unesi bodove
        </p>
        <div class="entry-inputs">
          ${players
            .map(
              (p) => `
            <div class="entry-field">
              <span class="ef-label">${p}</span>
              <input type="number" id="si-${p}" value="0" min="0" />
            </div>
          `,
            )
            .join("")}
        </div>
        <div class="entry-actions">
          <button class="btn btn-ghost btn-sm" onclick="cancelEntry()">Odustani</button>
          <button class="btn btn-primary btn-sm" onclick="confirmScores()">Potvrdi</button>
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

  let histHtml = `<hr class="section-divider">
    <p class="history-title">Bodovi po rundi</p>
    <div class="totals-table-wrap">
    <table class="totals-table">
      <thead>
        <tr>
          <th style="text-align:left; min-width:110px;">Igra</th>
          ${players.map((p) => `<th>${p}</th>`).join("")}
          <th style="width:32px;"></th>
        </tr>
      </thead>
      <tbody>`;

  rounds.forEach((r, i) => {
    const g = GAMES.find((x) => x.key === r.game);
    histHtml += `<tr>`;
    histHtml += `<td class="tt-name" style="font-size:15px;">
      <span style="margin-right:5px;">${g.icon}</span>${g.label}
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
   RESET
══════════════════════════════════════════ */
function resetGame() {
  document.getElementById("reset-modal").classList.remove("hidden");
}

function confirmReset() {
  document.getElementById("reset-modal").classList.add("hidden");
  document.getElementById("game-view").classList.add("hidden");
  document.getElementById("setup-view").classList.remove("hidden");
  players = [];
  rounds = [];
  pendingGame = null;
  [1, 2, 3, 4].forEach((i) => {
    document.getElementById(`p${i}`).value = "";
  });
}

function cancelReset() {
  document.getElementById("reset-modal").classList.add("hidden");
}

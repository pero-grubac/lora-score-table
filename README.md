<div align="center">

# 🃏 Lora Score Table

![HTML](https://img.shields.io/badge/HTML-5-e34f26?style=flat-square&logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS-3-1572b6?style=flat-square&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES2024-f7df1e?style=flat-square&logo=javascript&logoColor=black)
![PWA](https://img.shields.io/badge/PWA-offline--ready-5a0fc8?style=flat-square&logo=pwa&logoColor=white)
![GitHub Pages](https://img.shields.io/badge/GitHub_Pages-deployed-4c1?style=flat-square&logo=github&logoColor=white)

[![Live Demo](https://img.shields.io/badge/🃏_Live_Demo-lora--score--table-6b4422?style=for-the-badge)](https://pero-grubac.github.io/lora-score-table/)

</div>

---

## 📌 Project Overview

**Lora Score Table** is a scorecard web app for the Bosnian card game Lora. Tracks scores across 7 game types with turn-based game selection, inline score entry, and a per-round history table. Runs entirely in the browser — no backend, no dependencies, no build step. Works offline as a PWA.

---

## ✨ Features

- 🃏 **4 players** — required, entered at the start of each game
- 🔄 **Turn-based game selection** — players pick games in order; the active player's row is highlighted
- 🎮 **7 game types**: Plus, Minus, J tref, Dame, K srca, Srcad, Lora
- ✏️ **Inline score entry** — input form appears directly below the selecting player's row
- 📊 **Per-round score table** — every round is a separate row with a running total at the bottom
- 🗑️ **Delete rounds** — remove any incorrectly entered round from the log
- 📱 **Mobile friendly** — horizontal scroll on narrow screens
- 📶 **PWA** — installable on mobile and desktop, works fully offline

---

## 🎴 Game rules (short)

| Game    | Description |
|---------|-------------|
| Plus    | Collect as many points as possible |
| Minus   | Collect as few points as possible |
| J tref  | Player who takes the Jack of Clubs receives a penalty |
| Dame    | Taking any Queen is forbidden |
| K srca  | Player who takes the King of Hearts receives a penalty |
| Srcad   | You must collect all Hearts |
| Lora    | Selecting player picks a starting card; others build on it in sequence |

Lower score = better. The player with the fewest points at the end wins.

---

## 📁 Project structure

| File | Purpose |
|------|---------|
| `index.html` | Markup and layout |
| `style.css` | Paper-on-table theme styling |
| `script.js` | Game logic, turn order, score rendering |
| `manifest.json` | PWA manifest (name, icons, display mode) |
| `service-worker.js` | Offline caching (cache-first, disabled on localhost) |

<details>
<summary>🔤 fonts/</summary>

All typefaces served locally — no Google Fonts requests, works fully offline.

`playfair-display-v40-latin-600.woff2`, `playfair-display-v40-latin-700.woff2`
`source-sans-3-v19-latin-300.woff2`, `source-sans-3-v19-latin-regular.woff2`, `source-sans-3-v19-latin-600.woff2`, `source-sans-3-v19-latin-700.woff2`

</details>

<details>
<summary>🔷 icons/</summary>

PWA icons used by the browser for home screen shortcuts and splash screens.

`icon-192.png`, `icon-512.png`

</details>

<details>
<summary>🖼️ images/</summary>

`screenshot.png` — used in README preview.

</details>

---

## 🚀 Deploy to GitHub Pages

1. Create a new repo (e.g. `lora-score-table`)
2. Push all files to the `main` branch root
3. Go to **Settings → Pages → Source** → `main` / `/ (root)`
4. Site will be live at `https://pero-grubac.github.io/lora-score-table`

> **After each update:** bump `CACHE_NAME` in `service-worker.js` (e.g. `lora-v2` → `lora-v3`) so returning users get fresh files.

---

## 🛠️ Local development

No build step needed. A local HTTP server is required — Service Workers don't run on `file://`.

**VS Code Live Server:**
```
Right-click index.html → Open with Live Server
```
Open `http://localhost:5500`

**Python:**
```bash
python3 -m http.server 8080
```
Open `http://localhost:8080`

> **Note:** The Service Worker is automatically disabled on `localhost` and `127.0.0.1` — the app always loads fresh files during development, no cache clearing needed. It activates only on a deployed HTTPS origin.

---

## 📲 Installing as an app

### Mobile (Android / iOS)
1. Open the site in Chrome or Safari
2. Chrome: menu (⋮) → *Add to Home Screen*
3. Safari: Share → *Add to Home Screen*

### Desktop (Chrome)
An install icon (⊕) appears in the address bar — click it to install as a standalone desktop app.

> HTTPS is required for PWA installation. `localhost` works for local testing; for mobile use [GitHub Pages](https://pero-grubac.github.io/lora-score-table/).

---

## 🧱 Tech stack

- Vanilla HTML / CSS / JavaScript — no frameworks, no build tools
- PWA: Web App Manifest + Service Worker (cache-first strategy, disabled on localhost)
- Fonts: Playfair Display, Source Sans 3 (self-hosted, no Google Fonts dependency)

# 🃏 Lora Score Table

A scorecard web app for the card game **Lora**, built as a Progressive Web App (PWA) — works offline and can be installed on mobile or desktop.

[![Live Demo](https://img.shields.io/badge/🃏_Live_Demo-lora--score--table-6b4422?style=for-the-badge)](https://pero-grubac.github.io/lora-score-table/)

---

## Features

- **4 players** — required, entered at the start of each game
- **Free game selection** — each player clicks their own cell in the table to select a game (no turn order restrictions)
- **7 game types**: Plus, Minus, J tref, Dame, K srca, Srcad, Lora
- **Inline score entry** — input form appears directly below the selecting player's row
- **Per-round score table** — every round is a separate row with a running total at the bottom
- **Delete rounds** — made a mistake? Remove any round from the log
- **Mobile friendly** — horizontal scroll on narrow screens
- **Offline support** — works without internet after first load (PWA / Service Worker)
- **Installable** — add to home screen on mobile or install as a desktop app via Chrome

---

## Game rules (short)

| Game   | Description                                                            |
| ------ | ---------------------------------------------------------------------- |
| Plus   | Collect as many points as possible                                     |
| Minus  | Collect as few points as possible                                      |
| J tref | Player who takes the Jack of Clubs receives a penalty                  |
| Dame   | Taking any Queen is forbidden                                          |
| K srca | Player who takes the King of Hearts receives a penalty                 |
| Srcad  | You must collect all Hearts                                            |
| Lora   | Selecting player picks a starting card; others build on it in sequence |

Lower score = better. The player with the fewest points at the end wins.

---

## Project structure

```
lora-score-table/
├── index.html
├── style.css
├── script.js
├── manifest.json
├── service-worker.js
├── fonts/
│   ├── playfair-display-v40-latin-600.woff2
│   ├── playfair-display-v40-latin-700.woff2
│   ├── source-sans-3-v19-latin-300.woff2
│   ├── source-sans-3-v19-latin-regular.woff2
│   ├── source-sans-3-v19-latin-600.woff2
│   └── source-sans-3-v19-latin-700.woff2
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
└── images/

```

---

## Local development

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

---

## Deploy to GitHub Pages

1. Create a new repository (e.g. `lora-score-table`)
2. Push all files to the `main` branch root
3. Go to **Settings → Pages → Source** → `main` / `/ (root)`
4. Site will be live at `https://pero-grubac.github.io/lora-score-table`

---

## Installing as an app

### Mobile (Android / iOS)

1. Open the site in Chrome or Safari
2. Chrome: menu (⋮) → _Add to Home Screen_
3. Safari: Share → _Add to Home Screen_

### Desktop (Chrome)

An install icon (⊕) appears in the address bar — click it to install as a standalone desktop app.

> HTTPS is required for PWA installation. `localhost` works for local testing; for mobile use [GitHub Pages](https://pero-grubac.github.io/lora-score-table/).

---

## Tech stack

- Vanilla HTML / CSS / JavaScript — no frameworks, no build tools
- PWA: Web App Manifest + Service Worker (cache-first strategy)
- Fonts: Playfair Display, Source Sans 3 (self-hosted, no Google Fonts dependency)

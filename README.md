<div align="center">

# GFlow ⚡

**High-velocity pull request triage & review board matching native GitHub Primer aesthetics.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D%2018.0.0-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](docker-compose.yml)

[Quick Start](#-quick-start) • [Features](#-features) • [Docker](#-docker-setup) • [Keyboard Shortcuts](#-keyboard-navigation) • [Contributing](CONTRIBUTING.md)

</div>

---

## 💡 Why GFlow?

GitHub's default `/pulls` page treats all pull requests equally and buries crucial context:
* Who on your team is waiting for your review?
* Which PRs have unaddressed change requests or unresolved comment threads?
* How many hours or days has a PR been stalled in code review?
* Which repositories across your multiple organizations need immediate attention?

**GFlow** organizes your daily pull requests into an actionable triage workflow inspired by modern developer command centers. It connects directly to the GitHub GraphQL API, runs 100% locally or self-hosted, and never sends your code to third-party cloud servers.

---

## ✨ Features

### 1. 🗂️ 3 Core Triage Queues
* **PR where I am reviewer:** Direct review requests and team-requested reviews across all personal and organization repos.
* **PR I raised:** PRs authored by you, with actionable unresolved comment counters (`💬 3 unresolved`).
* **PR I approve:** Recent PRs you reviewed and approved.

### 2. ⏱️ Review SLA Wait Timers & Status Chips
* **SLA Timers:** Minimalist stopwatch chips (`[ ⏱ 4h 35m ]` / `[ ⏱ 1d 4h ]`) displaying elapsed wait times since review was requested.
* **Reviewer Decisions:** Real-time decision chips for each reviewer on your raised PRs:
  * `✓ sumeshj18` (Approved)
  * `✕ alice` (Changes requested)
  * `💬 bob` (Commented)
  * `⏱ charlie` (Awaiting review)
* **Hover Tooltips:** Rich context on hover (e.g. `@alice: approved 7h ago`, `@bob: review requested 4h 35m ago`).

### 3. 📊 Combined Diff Stats & CI Status
* **Files & Line Changes:** Displays changed files count alongside additions and deletions (`27 files • +1,947 -26`).
* **Native CI Status Checks:** GitHub Actions build status icons (`✓`, `✕`, `○`) with check state summaries.
* **Granular Toggles:** Turn diff stats, reviewer chips, SLA timers, or labels on/off in Settings.

### 4. 🏢 Multi-Organization & Repository Scoping
* Filter by **Organization** (`Personal`, `All`, or individual orgs) with dynamic per-org counts.
* Filter by **Repository** in 1 click (e.g., isolate frontend vs backend microservices).
* 1-click **Unresolved Filter Button** to view only PRs needing your replies.

### 5. ⚡ Power-User Keyboard Navigation
Navigate and triage your review queue without touching your mouse:

| Shortcut | Action |
| :---: | :--- |
| <kbd>j</kbd> / <kbd>↓</kbd> | Move down to next pull request |
| <kbd>k</kbd> / <kbd>↑</kbd> | Move up to previous pull request |
| <kbd>Enter</kbd> / <kbd>o</kbd> | Open highlighted PR in new browser tab |
| <kbd>/</kbd> | Instantly focus search filter input |
| <kbd>1</kbd> | Switch to **PR where I am reviewer** |
| <kbd>2</kbd> | Switch to **PR I raised** |
| <kbd>3</kbd> | Switch to **PR I approve** |
| <kbd>r</kbd> | Refresh pull requests from GitHub |
| <kbd>?</kbd> | Open keyboard shortcuts modal |
| <kbd>Esc</kbd> | Close modals or blur search bar |

### 6. 🛡️ Resilient GitHub Rate Limit Protection
* Built-in **60-second in-memory server cache** cuts GitHub GraphQL usage by ~95%.
* Automatic **stale data fallback** with an amber notification banner if GitHub API limits are reached.
* Rate limit spikes (HTTP 429) will **never** log you out of your session.

### 7. 📱 100% Mobile & Touch-Friendly
* Responsive adaptive layout: PR cards wrap badges cleanly below titles on small screens ($\le 768\text{px}$).
* Compact header buttons and bottom-sheet settings modal on mobile devices.

---

## 🚀 Quick Start

### Prerequisites
* **Node.js**: v18.0.0 or higher
* **npm**: v9.0.0 or higher

### Local Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/gflow.git
   cd gflow
   ```

2. **Install dependencies:**
   ```bash
   npm install --prefix server
   npm install --prefix client
   ```

3. **Configure environment:**
   ```bash
   cp .env.example server/.env
   ```
   *(Optional)* Configure GitHub OAuth credentials in `server/.env`, or log in instantly with a Personal Access Token (PAT) directly in the web UI.

4. **Start development servers:**
   * **Terminal 1 (Backend):**
     ```bash
     npm run server
     # API running on http://localhost:5000
     ```
   * **Terminal 2 (Frontend):**
     ```bash
     npm run client
     # Web app running on http://localhost:5173
     ```

5. Open your browser and navigate to **`http://localhost:5173`**.

---

## 🐳 Docker Setup

Run GFlow in a single, lightweight production container:

### Using Docker Compose (Recommended)
```bash
# Start GFlow in the background
docker compose up -d

# View logs
docker compose logs -f
```
Open **`http://localhost:5000`** in your browser.

### Using Docker CLI
```bash
# Build the production image
docker build -t gflow .

# Run the container
docker run -d -p 5000:5000 --name gflow gflow
```

---

## 🔐 Authentication Options

GFlow supports two flexible authentication methods:

1. **Personal Access Token (PAT) — Zero Setup:**
   * Generate a classic token on GitHub ([github.com/settings/tokens](https://github.com/settings/tokens)) with:
     * `repo` (Full control of private repositories)
     * `read:org` (Read organization and team membership)
     * `read:user` (Read user profile data)
   * Paste the token into the GFlow login screen. Tokens are stored securely in HTTP-only session cookies.

2. **GitHub OAuth App:**
   * Create an OAuth App under GitHub Developer Settings:
     * **Homepage URL:** `http://localhost:5173`
     * **Authorization callback URL:** `http://localhost:5000/api/auth/callback`
   * Set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in `server/.env`.
   * Click **"Sign in with GitHub"** for instant 1-click authorization.

---

## 🏗️ Architecture & Tech Stack

```
gflow/
├── client/                     # Frontend (React 18 + Vite)
│   ├── src/
│   │   ├── components/         # PRCard, Navbar, Tabs, SettingsModal, ShortcutsModal
│   │   ├── services/           # Axios API client
│   │   ├── utils/              # Filter utils, date formatting, bot detection
│   │   └── index.css           # GitHub Primer Dark Mode design system
│   └── package.json
├── server/                     # Backend (Node.js + Express)
│   ├── src/
│   │   ├── routes/             # Auth & PR summary endpoints
│   │   ├── services/           # Octokit GraphQL client & query aggregators
│   │   ├── middleware/         # Cookie authentication guard
│   │   └── server.js           # Express app & static production server
│   └── package.json
├── Dockerfile                  # Multi-stage production container build
├── docker-compose.yml          # Production Docker service definition
├── CONTRIBUTING.md             # Community contribution guidelines
└── LICENSE                     # MIT License
```

---

## 🤝 Contributing

Contributions are warmly welcomed! Please check out [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on branch naming, local development, and pull request workflows.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) — feel free to use, modify, and distribute it freely.

<div align="center">

# GFlow

**High-velocity pull request triage & review board matching native GitHub Primer aesthetics.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D%2018.0.0-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](docker-compose.yml)

[Quickstart](#quickstart) &bull; [Features](#features) &bull; [Docker](#docker) &bull; [Keyboard Shortcuts](#keyboard-shortcuts) &bull; [Architecture](#architecture) &bull; [Contributing](CONTRIBUTING.md)

</div>

---

## Why GFlow?

GitHub's default `/pulls` page treats all pull requests equally and buries critical review context:
* Who on your team is currently waiting on your review?
* Which PRs have unaddressed change requests or unresolved comment threads?
* How many hours or days has a pull request been stalled in review?
* Which repositories across multiple organizations require immediate action?

**GFlow** organizes your daily pull requests into an actionable triage workflow inspired by modern developer command centers. It connects directly to the GitHub GraphQL API, runs 100% locally or self-hosted, and never transmits code or credentials to third-party servers.

---

## Features

### Core Triage Queues
* **Review Requests:** Direct review requests and team-requested reviews across personal and organization repositories.
* **Created:** Pull requests authored by you, complete with unresolved comment counters (`3 unresolved`) and instant Open / Merged state toggles.
* **Approved:** Pull requests you have recently reviewed and approved.

### Review SLA Wait Timers & Status Chips
* **SLA Timers:** Compact stopwatch indicators (`4h 35m`, `1d 4h`) displaying elapsed wait time since review was requested.
* **Reviewer Decision Chips:** Real-time decision indicators for each requested reviewer on your created PRs:
  * `sumeshj18` (Approved)
  * `alice` (Changes requested)
  * `bob` (Commented)
  * `charlie` (Awaiting review)
* **Hover Tooltips:** Contextual timestamps on hover (e.g. `@alice: approved 7h ago`, `@bob: review requested 4h 35m ago`).

### Combined Diff Stats & CI Status
* **Files & Line Changes:** Displays changed file counts alongside additions and deletions (`27 files &bull; +1,947 -26`).
* **Native CI Status Checks:** GitHub Actions build status icons with check state summaries directly on PR cards.
* **Granular Preferences:** Configure diff stats, reviewer chips, SLA timers, and labels in the Settings modal.

### Multi-Organization & Repository Scoping
* Filter by **Organization** (`Personal`, `All`, or individual orgs) with dynamic per-organization counts.
* Filter by **Repository** with a single click to isolate microservices or frontend/backend monorepos.
* One-click **Unresolved Filter Button** to focus exclusively on PRs requiring author replies.

### Stale-While-Revalidate (SWR) Instant Startup
* **0ms Startup:** Synchronous local storage hydration loads your pull requests and counts instantly on launch.
* **Silent Background Sync:** Updates seamlessly in place without layout shifts or skeleton flashing.
* **60-Second Server Cache:** Backend in-memory caching cuts GitHub GraphQL consumption by ~95%.
* **Graceful Degradation:** Automatic fallback to cached data with an informative banner if GitHub API rate limits are encountered.

### Responsive Design
* Adaptive layout: PR cards wrap metadata cleanly below titles on smaller screens (&le; 768px).
* Full touch and mobile browser support with compact action bars and bottom sheets.

---

## Keyboard Shortcuts

GFlow includes full keyboard navigation for mouse-free triage:

| Shortcut | Action |
| :---: | :--- |
| <kbd>j</kbd> / <kbd>&darr;</kbd> | Move down to next pull request |
| <kbd>k</kbd> / <kbd>&uarr;</kbd> | Move up to previous pull request |
| <kbd>Enter</kbd> / <kbd>o</kbd> | Open highlighted pull request on GitHub |
| <kbd>/</kbd> | Focus search filter input |
| <kbd>1</kbd> | Switch to **Review Requests** |
| <kbd>2</kbd> | Switch to **Created** |
| <kbd>3</kbd> | Switch to **Approved** |
| <kbd>r</kbd> | Refresh pull requests from GitHub |
| <kbd>?</kbd> | Open keyboard shortcuts reference |
| <kbd>Esc</kbd> | Dismiss modals or blur search input |

---

## Quickstart

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
   *(Optional)* Configure GitHub OAuth credentials in `server/.env`, or log in with a Personal Access Token (PAT) directly in the UI.

4. **Start development servers:**
   ```bash
   # Terminal 1: Backend API (http://localhost:5000)
   npm run server

   # Terminal 2: Frontend App (http://localhost:5173)
   npm run client
   ```

5. Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Docker

Run GFlow in a single production container using Docker:

### Using Docker Compose (Recommended)
```bash
docker compose up -d
```
Open [http://localhost:5000](http://localhost:5000) in your browser.

### Using Docker CLI
```bash
docker build -t gflow .
docker run -d -p 5000:5000 --name gflow gflow
```

---

## Authentication

GFlow supports two authentication methods:

1. **Personal Access Token (PAT) &mdash; Zero Setup:**
   * Generate a classic token on GitHub ([github.com/settings/tokens](https://github.com/settings/tokens)) with:
     * `repo` (Full control of private repositories)
     * `read:org` (Read organization and team membership)
     * `read:user` (Read user profile data)
   * Enter the token into the GFlow login screen. Tokens are stored exclusively in HTTP-only session cookies.

2. **GitHub OAuth App:**
   * Create an OAuth Application under GitHub Developer Settings:
     * **Homepage URL:** `http://localhost:5173`
     * **Authorization callback URL:** `http://localhost:5000/api/auth/callback`
   * Set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in `server/.env`.
   * Click **Sign in with GitHub** for one-click authorization.

---

## Architecture

```
gflow/
├── client/                     # Frontend (React 18 + Vite)
│   ├── src/
│   │   ├── components/         # PRCard, Navbar, Tabs, SettingsModal, ShortcutsModal
│   │   ├── services/           # API client
│   │   ├── utils/              # Cache utilities, filters, date formatting, bot detection
│   │   └── index.css           # GitHub Primer Dark design system
│   └── package.json
├── server/                     # Backend (Node.js + Express)
│   ├── src/
│   │   ├── routes/             # Authentication & PR summary endpoints
│   │   ├── services/           # Octokit GraphQL client & query aggregators
│   │   ├── middleware/         # Cookie authentication guard
│   │   └── server.js           # Express app & static production server
│   └── package.json
├── Dockerfile                  # Multi-stage container build
├── docker-compose.yml          # Production Docker service definition
├── CONTRIBUTING.md             # Community contribution guidelines
├── SECURITY.md                 # Security policy & vulnerability reporting
└── LICENSE                     # MIT License
```

---

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on development workflows, code standards, and pull request procedures.

---

## License

This project is licensed under the [MIT License](LICENSE).

# Contributing to GFlow

Thank you for your interest in contributing to **GFlow**! 🎉

GFlow is an open-source, high-velocity pull request tracker designed to streamline code review triage across multi-organization workflows. We welcome contributions of all sizes—from fixing typos and adding documentation to introducing new features and performance optimizations.

---

## 🛠️ Development Setup

### Prerequisites
* **Node.js**: v18.0.0 or higher
* **npm**: v9.0.0 or higher
* A **GitHub account** (and a GitHub Personal Access Token or OAuth App for testing)

### Local Quickstart

1. **Fork and Clone the Repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/gflow.git
   cd gflow
   ```

2. **Install Dependencies:**
   ```bash
   cd server && npm install
   cd ../client && npm install
   cd ..
   ```

3. **Configure Environment:**
   ```bash
   cp .env.example server/.env
   ```
   *(Optional)* Configure GitHub OAuth credentials in `server/.env`, or simply log in with a Personal Access Token (PAT) with `repo` and `read:org` scopes.

4. **Start the Development Servers:**
   * **Terminal 1 (Backend):**
     ```bash
     npm run server
     # Runs on http://localhost:5000
     ```
   * **Terminal 2 (Frontend):**
     ```bash
     npm run client
     # Runs on http://localhost:5173
     ```

---

## 📐 Design & Code Guidelines

1. **Design Aesthetics (GitHub Primer Dark Mode):**
   * GFlow strictly adheres to GitHub Primer Dark design tokens (defined in `client/src/index.css`).
   * Avoid ad-hoc inline styles. Use Primer tokens (`--color-canvas-default`, `--color-border-default`, `--color-fg-muted`, etc.).
   * Zero generic emojis in core navigation or cards—use Lucide icons or Octicons.

2. **Responsive by Default:**
   * All new components and views must be mobile-friendly and touch-friendly. PR cards wrap cleanly on small screens ($\le 768\text{px}$).

3. **Performance & Rate Limiting:**
   * Cache GraphQL responses where possible. Never spam the GitHub API.
   * Never treat rate limit errors (HTTP 429) as authentication failures (HTTP 401).

---

## 🚀 Submitting a Pull Request

1. Create a feature branch:
   ```bash
   git checkout -b feat/my-new-feature
   ```
2. Make your changes and test locally:
   ```bash
   cd client && npm run build
   ```
3. Commit with a concise, conventional commit message:
   ```bash
   git commit -m "feat(ui): add reviewer filter dropdown"
   ```
4. Push to your fork and open a Pull Request against `main`.
5. Describe the problem your PR solves, what changed, and include screenshots or recordings for UI changes.

---

## 🐛 Reporting Bugs & Requesting Features

* **Bugs:** Open an issue with reproduction steps, your Node version, browser, and error logs if applicable.
* **Feature Requests:** Open an issue or discussion outlining the user problem, proposed solution, and UX impact.

---

Thank you for helping make GFlow better for developers everywhere!

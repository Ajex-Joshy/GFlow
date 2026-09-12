# Contributing to GFlow

Thank you for your interest in contributing to **GFlow**.

GFlow is an open-source, high-velocity pull request tracker designed to streamline code review triage across multi-organization workflows. We welcome contributions of all sizes &mdash; from documentation improvements to bug fixes, feature additions, and performance enhancements.

---

## Development Setup

### Prerequisites
* **Node.js**: v18.0.0 or higher
* **npm**: v9.0.0 or higher
* A **GitHub account** (with a GitHub Personal Access Token or OAuth App for testing)

### Local Quickstart

1. **Fork and Clone the Repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/gflow.git
   cd gflow
   ```

2. **Install Dependencies:**
   ```bash
   npm install --prefix server
   npm install --prefix client
   ```

3. **Configure Environment:**
   ```bash
   cp .env.example server/.env
   ```
   Configure GitHub OAuth credentials in `server/.env`, or log in with a Personal Access Token (PAT) with `repo` and `read:org` scopes.

4. **Start Development Servers:**
   ```bash
   # Terminal 1: Backend API
   npm run server

   # Terminal 2: Frontend Client
   npm run client
   ```

5. **Verify Build & Syntax:**
   ```bash
   npm test
   ```

---

## Design & Code Standards

1. **Design System (GitHub Primer Dark Mode):**
   * GFlow strictly adheres to GitHub Primer Dark design tokens (defined in `client/src/index.css`).
   * Avoid ad-hoc styling. Use established CSS tokens (`--color-canvas-default`, `--color-border-default`, `--color-fg-muted`, etc.).
   * Use Lucide icons or Octicons for interface elements.

2. **Responsive by Default:**
   * All components must remain fully responsive and touch-friendly on viewports &le; 768px.

3. **Performance & Rate Limiting:**
   * Respect GitHub API rate limits. Cache responses where appropriate.
   * Rate limit responses (HTTP 429) must never be treated as authentication failures (HTTP 401).

---

## Submitting a Pull Request

1. **Create a feature branch:**
   ```bash
   git checkout -b feat/my-feature
   ```
2. **Make your changes and verify:**
   ```bash
   npm test
   ```
3. **Commit with a descriptive message:**
   ```bash
   git commit -m "feat(ui): add reviewer filter dropdown"
   ```
4. **Push to your fork and submit a Pull Request against `main`.**
5. **Describe the problem your PR addresses**, what changes were made, and attach screenshots or screen recordings for UI adjustments.

---

## Reporting Issues

* **Bug Reports:** Open an issue using the Bug Report form, providing reproduction steps, environment details, and relevant console/server logs.
* **Feature Requests:** Open an issue using the Feature Request form, detailing the use case, proposed implementation, and workflow impact.
* **Security Issues:** Report vulnerabilities confidentially following our [Security Policy](SECURITY.md).

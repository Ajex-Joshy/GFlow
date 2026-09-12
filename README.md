# OctoPulse - GitHub Pull Request Tracker ⚡

A real-time, full-stack Pull Request tracker with custom timelines, three review queue tabs, and automatic unresolved comment counters.

---

## 🎯 Features

- **3 Review Queue Tabs**:
  1. **PR where I am reviewer**: PRs where your review has been requested or assigned.
  2. **PR I raised**: PRs created by you, with a prominent badge showing the **count of unresolved comment threads** (`⚠️ X Unresolved Comments` or `✅ All Comments Resolved`).
  3. **PR I approve**: PRs that you reviewed and submitted an `APPROVED` review for.
- **Custom Relative & Absolute Timestamps**:
  - Exactly formatted as: `Created: 1d 18h 1m ago (10 Sep, 11:37 PM)`
  - Includes a live ticker that advances relative times in real time.
- **PR Cards**:
  - Repository name (`owner/repo`) with quick link to GitHub repo.
  - PR title with PR number (`#123`), direct link, and Draft / Open badges.
  - Diff stats (`+XX / -YY` lines changed) and file counts.
  - Author avatar and username.
- **Flexible Authentication**:
  - **Personal Access Token (PAT)**: Quick-connect in seconds with a classic or fine-grained GitHub token (`repo`, `read:user`).
  - **GitHub OAuth App**: Full OAuth flow with secure HTTP-only cookies.
- **Modern Cyber-Dark Glassmorphic UI**:
  - Built with responsive design, search filtering, and auto-refresh every 3 minutes.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
# Install backend dependencies
cd server && npm install

# Install frontend dependencies
cd ../client && npm install
```

### 2. Configure Environment Variables (Optional for OAuth)
In `server/.env`:
```env
PORT=5000
CLIENT_URL=http://localhost:5173

# Optional: Only needed if using GitHub OAuth App login
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_CALLBACK_URL=http://localhost:5000/api/auth/callback
```
*(If OAuth credentials are not provided, you can immediately sign in with a GitHub Personal Access Token directly in the UI!)*

### 3. Run the Application
In separate terminal windows (or using npm):

**Terminal 1 (Backend Server):**
```bash
npm run server
# Server runs on http://localhost:5000
```

**Terminal 2 (Frontend Client):**
```bash
npm run client
# Client opens on http://localhost:5173
```

---

## 🔑 Generating a GitHub Token
If logging in via Personal Access Token:
1. Go to [GitHub Settings -> Developer Settings -> Personal Access Tokens](https://github.com/settings/tokens/new?scopes=repo,read:user).
2. Check the `repo` scope (to read pull requests and review threads) and `read:user` (to read your profile).
3. Generate the token and paste it into the OctoPulse login screen.

---

## 📁 Project Architecture

```
PR Tracker/
├── package.json
├── README.md
├── server/
│   ├── package.json
│   ├── .env
│   └── src/
│       ├── server.js               # Express server configuration & middleware
│       ├── middleware/
│       │   └── auth.js             # Token session validator
│       ├── routes/
│       │   ├── auth.routes.js      # OAuth & PAT auth routes
│       │   └── pr.routes.js        # GraphQL PR endpoints & summary
│       └── services/
│           └── githubService.js    # Octokit GraphQL queries (reviewThreads, search)
└── client/
    ├── package.json
    ├── vite.config.js              # Vite config with backend proxy (/api)
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx                 # Main application dashboard
        ├── index.css               # Design system & dark glassmorphism styles
        ├── components/
        │   ├── Navbar.jsx          # Profile header & refresh controls
        │   ├── Tabs.jsx            # 3 review tabs with unresolved comment badges
        │   ├── PRCard.jsx          # Individual PR card with custom timestamps
        │   ├── LoginView.jsx       # OAuth / PAT authentication screen
        │   └── EmptyState.jsx      # Empty / zero-inbox states
        ├── services/
        │   └── api.js              # Fetch client for backend API
        └── utils/
            └── dateFormatter.js    # Formats `Created: 1d 18h 1m ago (10 Sep, 11:37 PM)`
```

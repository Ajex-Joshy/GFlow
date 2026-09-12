# Security Policy

The security of GFlow and its users' GitHub authentication tokens is taken very seriously.

---

## 🛡️ Supported Versions

We release patches and security fixes for the current major release:

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |
| < 1.0   | :x:                |

---

## 🔒 Reporting a Vulnerability

If you discover a security vulnerability in GFlow, please **DO NOT** open a public GitHub issue. Public issues disclose vulnerabilities before a fix is available.

Instead, please report vulnerabilities responsibly using one of the following methods:

1. **GitHub Private Security Advisory:** Submit an advisory directly via the **Security** tab of the GitHub repository.
2. **Email Maintainer:** Send an email with full details and reproduction steps to:
   - **Ajex Joshy**: `ajexjoshywork@gmail.com`

### What to Include:
* Type of issue (e.g. CSRF, XSS, token leakage, authentication bypass).
* Clear, reproducible step-by-step instructions or proof-of-concept.
* Affected components (frontend client, backend Express server, Docker configuration).

### Response Timeline:
* **Initial Response:** Within 48 hours acknowledging receipt of your report.
* **Status Updates:** Every 3–5 business days until a resolution is ready.
* **Public Release & Credit:** Once a patched release is published, we will publicly acknowledge your responsible disclosure (unless you prefer to remain anonymous).

---

## 🔐 Security Best Practices in GFlow

GFlow is built with defense-in-depth security principles:
* **No Plaintext Token Storage:** Personal Access Tokens and OAuth credentials are saved exclusively in secure, `httpOnly`, `sameSite: 'lax'` session cookies.
* **No Database Token Persistence:** GFlow does not maintain an external database of user credentials.
* **Strict CORS:** The Express API strictly restricts cross-origin resource requests to authorized frontend origins.
* **Sanitized Client Rendering:** React DOM prevents cross-site scripting (XSS) attacks by escaping all user-supplied PR titles, comments, and author handles by default.

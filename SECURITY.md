# Security Policy

The security of GFlow and its users' GitHub credentials is taken seriously.

---

## Supported Versions

Security updates are provided for the active release line:

| Version | Supported |
| ------- | --------- |
| 1.x     | Yes       |
| < 1.0   | No        |

---

## Reporting a Vulnerability

If you discover a security vulnerability in GFlow, please do not open a public issue.

Report vulnerabilities responsibly using one of the following methods:

1. **GitHub Security Advisory:** Submit an advisory privately via the **Security** tab of the GitHub repository.
2. **Email Maintainer:** Send an email with reproduction details directly to:
   * **Ajex Joshy**: `ajexjoshywork@gmail.com`

### What to Include
* Description of the vulnerability (e.g. CSRF, XSS, credential leakage, authentication bypass).
* Step-by-step instructions or minimal proof-of-concept to reproduce the issue.
* Impact assessment and affected components.

### Response Timeline
* **Acknowledgment:** Within 48 hours of initial report.
* **Status Updates:** Every 3–5 business days until a patch is verified.
* **Release & Credit:** Public disclosure occurs alongside the patched release with credit to the reporter (unless anonymity is requested).

---

## Security Architecture

GFlow implements defense-in-depth principles:
* **No Plaintext Credential Storage:** Personal Access Tokens and OAuth session tokens are stored exclusively in HTTP-only, `sameSite: 'lax'` encrypted session cookies.
* **No External Database:** GFlow does not persist user credentials to external databases.
* **Strict CORS:** The backend API restricts cross-origin resource access to authorized frontend origins.
* **Sanitized Rendering:** React DOM escapes user-provided content by default to prevent cross-site scripting (XSS).

import React, { useState } from 'react';
import { GitPullRequest, Key, ArrowRight, ShieldCheck, Github } from 'lucide-react';

export default function LoginView({ onLoginWithToken, oauthConfigured, error }) {
  const [patToken, setPatToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!patToken.trim()) {
      setLocalError('Please enter your GitHub Personal Access Token.');
      return;
    }

    try {
      setIsSubmitting(true);
      setLocalError('');
      await onLoginWithToken(patToken.trim());
    } catch (err) {
      setLocalError(err.message || 'Failed to authenticate. Please verify your token permissions.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOAuthLogin = () => {
    window.location.href = '/api/auth/github';
  };

  const displayError = error || localError;

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-icon-badge">
          <GitPullRequest size={28} />
        </div>

        <h1 className="login-title">OctoPulse PR Tracker</h1>
        <p className="login-desc">
          Track review requests, authored PRs, unresolved comments, and approvals in one real-time dashboard.
        </p>

        {displayError && (
          <div className="error-banner">
            <span>{displayError}</span>
          </div>
        )}

        {oauthConfigured && (
          <>
            <button className="oauth-btn" onClick={handleOAuthLogin}>
              <Github size={18} />
              <span>Continue with GitHub</span>
            </button>
            <div className="divider">or connect with token</div>
          </>
        )}

        <form onSubmit={handleSubmit} className="pat-form">
          <label className="input-label" htmlFor="pat-input">
            Personal Access Token (Classic or Fine-grained)
          </label>
          <input
            id="pat-input"
            type="password"
            className="pat-input"
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            value={patToken}
            onChange={(e) => setPatToken(e.target.value)}
            disabled={isSubmitting}
            autoComplete="off"
            spellCheck="false"
          />

          <button
            type="submit"
            className="submit-pat-btn"
            disabled={isSubmitting || !patToken.trim()}
          >
            <Key size={16} />
            <span>{isSubmitting ? 'Authenticating...' : 'Connect to GitHub'}</span>
            <ArrowRight size={16} />
          </button>

          <p className="pat-hint">
            Need a token? Generate one on{' '}
            <a
              href="https://github.com/settings/tokens/new?scopes=repo,read:user"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub Settings &rarr; Tokens
            </a>{' '}
            with <code>repo</code> and <code>read:user</code> scopes.
          </p>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              color: 'var(--text-muted)',
              fontSize: '0.75rem',
              marginTop: '0.5rem',
              justifyContent: 'center',
            }}
          >
            <ShieldCheck size={14} style={{ color: 'var(--status-open)' }} />
            <span>Tokens are sent directly to GitHub and never shared.</span>
          </div>
        </form>
      </div>
    </div>
  );
}

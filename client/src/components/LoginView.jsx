import React, { useState } from 'react';
import { Key, Shield } from 'lucide-react';

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
      <div className="github-logo-header">
        <svg
          height="48"
          aria-hidden="true"
          viewBox="0 0 24 24"
          version="1.1"
          width="48"
          data-view-component="true"
          fill="currentColor"
        >
          <path d="M12.5.75C6.146.75 1 5.896 1 12.25c0 5.089 3.292 9.387 7.863 10.91.575.101.79-.244.79-.546 0-.273-.014-1.178-.014-2.142-2.889.532-3.636-.704-3.866-1.35-.13-.331-.69-1.352-1.18-1.625-.402-.216-.977-.748-.014-.762.906-.014 1.553.834 1.769 1.179 1.035 1.74 2.688 1.25 3.349.948.1-.747.402-1.25.733-1.538-2.559-.287-5.232-1.279-5.232-5.678 0-1.25.445-2.285 1.178-3.09-.115-.288-.517-1.467.115-3.048 0 0 .963-.302 3.163 1.179.92-.259 1.897-.388 2.875-.388.977 0 1.955.13 2.875.388 2.2-1.495 3.162-1.179 3.162-1.179.633 1.581.23 2.76.115 3.048.733.805 1.179 1.825 1.179 3.09 0 4.413-2.688 5.39-5.247 5.678.417.36.776 1.05.776 2.128 0 1.538-.014 2.774-.014 3.162 0 .302.216.662.79.547C20.709 21.637 24 17.324 24 12.25 24 5.896 18.854.75 12.5.75Z"></path>
        </svg>
      </div>

      <h1 className="login-heading">Sign in to PR Tracker</h1>

      {displayError && (
        <div style={{ width: '100%', maxWidth: '340px' }} className="error-banner">
          <span>{displayError}</span>
        </div>
      )}

      <div className="login-box">
        {oauthConfigured && (
          <>
            <button
              type="button"
              className="gh-primary-btn"
              onClick={handleOAuthLogin}
              style={{ marginBottom: '0.5rem' }}
            >
              <span>Sign in with GitHub</span>
            </button>
            <div className="login-divider">or connect with token</div>
          </>
        )}

        <form onSubmit={handleSubmit}>
          <div className="gh-form-group">
            <label className="gh-label-text" htmlFor="pat-input">
              Personal Access Token
            </label>
            <input
              id="pat-input"
              type="password"
              className="gh-input"
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              value={patToken}
              onChange={(e) => setPatToken(e.target.value)}
              disabled={isSubmitting}
              autoComplete="off"
              spellCheck="false"
            />
          </div>

          <button
            type="submit"
            className="gh-primary-btn"
            disabled={isSubmitting || !patToken.trim()}
          >
            <Key size={14} />
            <span>{isSubmitting ? 'Verifying token...' : 'Sign in'}</span>
          </button>
        </form>
      </div>

      <div className="login-help-box">
        <div>
          <span>Need a token? </span>
          <a
            href="https://github.com/settings/tokens/new?scopes=repo,read:user,read:org"
            target="_blank"
            rel="noopener noreferrer"
          >
            Create token with <code>repo</code>, <code>read:user</code>, <code>read:org</code>
          </a>
        </div>
        <div style={{ marginTop: '0.5rem', color: 'var(--color-fg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
          <Shield size={12} />
          <span>If your organization uses SAML SSO, click <strong>Configure SSO &rarr; Authorize</strong> on GitHub.</span>
        </div>
      </div>
    </div>
  );
}

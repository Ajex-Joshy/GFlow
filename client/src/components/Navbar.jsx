import React from 'react';
import { GitPullRequest, RefreshCw, LogOut, ExternalLink } from 'lucide-react';

export default function Navbar({ user, onRefresh, isRefreshing, onLogout }) {
  return (
    <header className="navbar">
      <div className="navbar-inner">
        <div className="brand">
          <div className="brand-icon">
            <GitPullRequest size={20} />
          </div>
          <span>OctoPulse</span>
        </div>

        {user && (
          <div className="nav-actions">
            <button
              className={`refresh-btn ${isRefreshing ? 'spinning' : ''}`}
              onClick={onRefresh}
              disabled={isRefreshing}
              title="Refresh PRs"
            >
              <RefreshCw size={15} />
              <span>Refresh</span>
            </button>

            <a
              href={`https://github.com/${user.login}`}
              target="_blank"
              rel="noopener noreferrer"
              className="user-profile-badge"
              title={`View ${user.login} on GitHub`}
            >
              <img
                src={user.avatarUrl}
                alt={user.login}
                className="user-avatar"
              />
              <span className="user-name">@{user.login}</span>
              <ExternalLink size={12} style={{ color: 'var(--text-muted)' }} />
            </a>

            <button
              className="logout-btn"
              onClick={onLogout}
              title="Sign Out"
            >
              <LogOut size={18} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

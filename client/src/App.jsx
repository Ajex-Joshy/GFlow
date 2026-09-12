import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search } from 'lucide-react';
import { api } from './services/api';
import Navbar from './components/Navbar';
import Tabs from './components/Tabs';
import PRCard from './components/PRCard';
import EmptyState from './components/EmptyState';
import LoginView from './components/LoginView';

export default function App() {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [oauthConfigured, setOauthConfigured] = useState(false);
  const [authError, setAuthError] = useState('');

  // PR Data State
  const [activeTab, setActiveTab] = useState('reviewer'); // 'reviewer' | 'raised' | 'approved'
  const [prData, setPrData] = useState({
    reviewer: [],
    raised: [],
    approved: [],
  });
  const [counts, setCounts] = useState({
    reviewer: 0,
    raised: 0,
    approved: 0,
    totalUnresolvedRaisedComments: 0,
  });
  const [isLoadingPRs, setIsLoadingPRs] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Ticker to force re-render every minute so timestamps like "1m ago" advance in real-time
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // 1. Initial Auth Check & OAuth config
  useEffect(() => {
    const checkAuth = async () => {
      // Check for URL error params from OAuth redirect
      const urlParams = new URLSearchParams(window.location.search);
      const err = urlParams.get('error');
      if (err) {
        setAuthError(decodeURIComponent(err));
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      try {
        const config = await api.getAuthConfig();
        setOauthConfigured(Boolean(config.oauthConfigured));
      } catch (e) {
        console.warn('Could not fetch auth config:', e.message);
      }

      try {
        const authData = await api.getCurrentUser();
        if (authData?.user) {
          setUser(authData.user);
          setIsAuthenticated(true);
        }
      } catch {
        // Not authenticated
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    };

    checkAuth();
  }, []);

  // 2. Fetch PRs function
  const loadPRData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoadingPRs(true);
    setIsRefreshing(true);
    setFetchError('');

    try {
      const result = await api.getPRSummary();
      setPrData(result.data || { reviewer: [], raised: [], approved: [] });
      setCounts(result.counts || { reviewer: 0, raised: 0, approved: 0, totalUnresolvedRaisedComments: 0 });
    } catch (err) {
      console.error('Failed to load PRs:', err);
      if (err.status === 401) {
        setIsAuthenticated(false);
        setUser(null);
      } else {
        setFetchError(err.message || 'Failed to fetch Pull Requests.');
      }
    } finally {
      setIsLoadingPRs(false);
      setIsRefreshing(false);
    }
  }, []);

  // Load PRs whenever authentication is confirmed
  useEffect(() => {
    if (isAuthenticated) {
      loadPRData();
    }
  }, [isAuthenticated, loadPRData]);

  // Auto-refresh PRs every 3 minutes
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      loadPRData(true);
    }, 180000);
    return () => clearInterval(interval);
  }, [isAuthenticated, loadPRData]);

  // Handle Login with PAT
  const handleLoginWithToken = async (token) => {
    const res = await api.loginWithPAT(token);
    if (res.user) {
      setUser(res.user);
      setIsAuthenticated(true);
      setAuthError('');
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      setPrData({ reviewer: [], raised: [], approved: [] });
      setCounts({ reviewer: 0, raised: 0, approved: 0, totalUnresolvedRaisedComments: 0 });
    }
  };

  // Filter PRs by search query
  const currentPRs = useMemo(() => {
    const list = prData[activeTab] || [];
    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase().trim();
    return list.filter((pr) => {
      const matchTitle = pr.title?.toLowerCase().includes(q);
      const matchRepo = pr.repository?.nameWithOwner?.toLowerCase().includes(q);
      const matchAuthor = pr.author?.login?.toLowerCase().includes(q);
      const matchNumber = pr.number?.toString().includes(q);
      return matchTitle || matchRepo || matchAuthor || matchNumber;
    });
  }, [prData, activeTab, searchQuery]);

  // If initial auth check is loading
  if (authLoading) {
    return (
      <div className="app-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div className="refresh-btn spinning" style={{ margin: '0 auto 1rem', padding: '0.75rem' }}>
            <span style={{ display: 'inline-block', width: 24, height: 24, border: '3px solid var(--border-active)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
          <p>Connecting to GitHub...</p>
        </div>
      </div>
    );
  }

  // If not logged in, show Login / Auth screen
  if (!isAuthenticated) {
    return (
      <div className="app-container">
        <Navbar />
        <LoginView
          onLoginWithToken={handleLoginWithToken}
          oauthConfigured={oauthConfigured}
          error={authError}
        />
      </div>
    );
  }

  return (
    <div className="app-container">
      <Navbar
        user={user}
        onRefresh={() => loadPRData(false)}
        isRefreshing={isRefreshing}
        onLogout={handleLogout}
      />

      <main className="main-content">
        {/* Header Title & Search Controls */}
        <div className="dashboard-header">
          <div className="dashboard-title-row">
            <div>
              <h1 className="page-title">Pull Request Dashboard</h1>
              <p className="page-subtitle">
                Real-time review requests, your authored PRs with unresolved comment tracking, and approvals.
              </p>
            </div>

            <div className="search-filter-box">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Filter by repo, title, #id..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {fetchError && (
            <div className="error-banner">
              <span>{fetchError}</span>
            </div>
          )}

          {/* 3 Tabs: Reviewer, Raised, Approved */}
          <Tabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            counts={counts}
          />
        </div>

        {/* PR List / Cards Section */}
        {isLoadingPRs ? (
          <div className="pr-grid">
            {[1, 2, 3].map((n) => (
              <div key={n} className="skeleton-card">
                <div className="skeleton-line" style={{ width: '35%', height: '22px' }} />
                <div className="skeleton-line" style={{ width: '80%', height: '26px' }} />
                <div className="skeleton-line" style={{ width: '45%', height: '18px' }} />
              </div>
            ))}
          </div>
        ) : currentPRs.length === 0 ? (
          <EmptyState tabType={activeTab} searchQuery={searchQuery} />
        ) : (
          <section className="pr-grid" aria-label="Pull Requests List">
            {currentPRs.map((pr) => (
              <PRCard
                key={pr.id || `${pr.repository?.nameWithOwner}-${pr.number}`}
                pr={pr}
                tabType={activeTab}
              />
            ))}
          </section>
        )}
      </main>
    </div>
  );
}

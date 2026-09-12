import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, GitPullRequest, Building2 } from 'lucide-react';
import { api } from './services/api';
import Navbar from './components/Navbar';
import Tabs from './components/Tabs';
import PRCard from './components/PRCard';
import EmptyState from './components/EmptyState';
import LoginView from './components/LoginView';

export default function App() {
  const [user, setUser] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState('all'); // 'all' | 'personal' | orgLogin
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [oauthConfigured, setOauthConfigured] = useState(false);
  const [authError, setAuthError] = useState('');

  // PR Data State
  const [activeTab, setActiveTab] = useState('reviewer'); // 'reviewer' | 'raised' | 'approved' | 'org'
  const [prData, setPrData] = useState({
    reviewer: [],
    raised: [],
    approved: [],
    org: [],
  });
  const [counts, setCounts] = useState({
    reviewer: 0,
    raised: 0,
    approved: 0,
    org: 0,
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
          setOrganizations(authData.user.organizations?.nodes || []);
          setIsAuthenticated(true);
        }
      } catch {
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
      setPrData(result.data || { reviewer: [], raised: [], approved: [], org: [] });
      setCounts(result.counts || { reviewer: 0, raised: 0, approved: 0, org: 0, totalUnresolvedRaisedComments: 0 });
      if (result.organizations) {
        setOrganizations(result.organizations);
      }
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
      setOrganizations(res.user.organizations?.nodes || []);
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
      setOrganizations([]);
      setSelectedOrg('all');
      setIsAuthenticated(false);
      setPrData({ reviewer: [], raised: [], approved: [], org: [] });
      setCounts({ reviewer: 0, raised: 0, approved: 0, org: 0, totalUnresolvedRaisedComments: 0 });
    }
  };

  // Filter PRs by organization and search query
  const currentPRs = useMemo(() => {
    const list = prData[activeTab] || [];

    // Filter by Organization
    const orgFiltered = list.filter((pr) => {
      if (selectedOrg === 'all') return true;
      const owner = pr.repository?.owner;
      if (selectedOrg === 'personal') {
        return owner === user?.login;
      }
      return owner === selectedOrg;
    });

    if (!searchQuery.trim()) return orgFiltered;

    const q = searchQuery.toLowerCase().trim();
    return orgFiltered.filter((pr) => {
      const matchTitle = pr.title?.toLowerCase().includes(q);
      const matchRepo = pr.repository?.nameWithOwner?.toLowerCase().includes(q);
      const matchAuthor = pr.author?.login?.toLowerCase().includes(q);
      const matchNumber = pr.number?.toString().includes(q);
      return matchTitle || matchRepo || matchAuthor || matchNumber;
    });
  }, [prData, activeTab, selectedOrg, searchQuery, user?.login]);

  // If initial auth check is loading
  if (authLoading) {
    return (
      <div className="app-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--color-fg-muted)' }}>
          <div className="gh-btn spinning" style={{ margin: '0 auto 0.75rem', padding: '0.5rem', background: 'transparent', border: 'none' }}>
            <span style={{ display: 'inline-block', width: 22, height: 22, border: '2px solid var(--color-border-default)', borderTopColor: 'var(--color-accent-emphasis)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
          <p style={{ fontSize: '13px' }}>Loading GitHub pull requests...</p>
        </div>
      </div>
    );
  }

  // If not logged in, show Login / Auth screen
  if (!isAuthenticated) {
    return (
      <div className="app-container">
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
        <div className="dashboard-header">
          <div className="dashboard-title-row">
            <h1 className="page-title">
              <GitPullRequest size={20} style={{ color: 'var(--color-fg-muted)' }} />
              <span>Pull Requests</span>
            </h1>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              {/* Organization Filter Dropdown */}
              {organizations.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Building2 size={15} style={{ color: 'var(--color-fg-muted)' }} />
                  <select
                    className="gh-input"
                    style={{ padding: '0.35rem 0.65rem', width: 'auto', cursor: 'pointer' }}
                    value={selectedOrg}
                    onChange={(e) => setSelectedOrg(e.target.value)}
                    title="Filter by Organization"
                  >
                    <option value="all">All Organizations & Personal</option>
                    <option value="personal">Personal (@{user?.login})</option>
                    {organizations.map((org) => (
                      <option key={org.id || org.login} value={org.login}>
                        🏢 {org.name || org.login}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Search Filter */}
              <div className="search-filter-box">
                <Search size={14} className="search-icon" />
                <input
                  type="text"
                  className="search-input"
                  placeholder="Filter pull requests..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          {fetchError && (
            <div className="error-banner">
              <span>{fetchError}</span>
            </div>
          )}

          {/* UnderlineNav Tabs: Reviewer, Raised, Approved, Organization PRs */}
          <Tabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            counts={counts}
          />
        </div>

        {/* GitHub Box Container for PR Rows */}
        <div className="gh-box">
          <div className="gh-box-header">
            <div className="gh-box-header-title">
              {currentPRs.length} {currentPRs.length === 1 ? 'Pull Request' : 'Pull Requests'}
              {selectedOrg !== 'all' && (
                <span style={{ color: 'var(--color-accent-fg)', fontWeight: 400, marginLeft: '0.5rem' }}>
                  • {selectedOrg === 'personal' ? 'Personal' : selectedOrg}
                </span>
              )}
            </div>

            {activeTab === 'raised' && counts.totalUnresolvedRaisedComments > 0 && (
              <span style={{ color: 'var(--color-attention-fg)', fontSize: '12px', fontWeight: 500 }}>
                {counts.totalUnresolvedRaisedComments} unresolved comments across open PRs
              </span>
            )}
          </div>

          {isLoadingPRs ? (
            <div>
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="gh-skeleton-row">
                  <div className="gh-skeleton-line" style={{ width: '40%', height: '18px' }} />
                  <div className="gh-skeleton-line" style={{ width: '65%', height: '14px' }} />
                </div>
              ))}
            </div>
          ) : currentPRs.length === 0 ? (
            <EmptyState
              tabType={activeTab}
              searchQuery={searchQuery}
              selectedOrg={selectedOrg}
            />
          ) : (
            <div>
              {currentPRs.map((pr) => (
                <PRCard
                  key={pr.id || `${pr.repository?.nameWithOwner}-${pr.number}`}
                  pr={pr}
                  tabType={activeTab}
                  userLogin={user?.login}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

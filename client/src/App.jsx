import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Search, GitPullRequest, GitMerge, Building2, Bot, Command } from 'lucide-react';
import { api } from './services/api';
import Navbar from './components/Navbar';
import Tabs from './components/Tabs';
import PRCard from './components/PRCard';
import EmptyState from './components/EmptyState';
import LoginView from './components/LoginView';
import SettingsModal from './components/SettingsModal';
import ShortcutsModal from './components/ShortcutsModal';
import { loadSettings, saveSettings, isBotPR } from './utils/filterUtils';

export default function App() {
  const [user, setUser] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [settings, setSettings] = useState(loadSettings);
  const [selectedOrg, setSelectedOrg] = useState(() => {
    const s = loadSettings();
    return s.defaultOrg || 'all';
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const cardRefs = useRef([]);
  const searchInputRef = useRef(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [oauthConfigured, setOauthConfigured] = useState(false);
  const [authError, setAuthError] = useState('');

  // 3 Core Tabs State: 'reviewer' | 'raised' | 'approved'
  const [activeTab, setActiveTab] = useState('reviewer');
  const [raisedStateFilter, setRaisedStateFilter] = useState('open'); // 'open' | 'merged'

  const [prData, setPrData] = useState({
    reviewer: [],
    raised: [],
    raisedMerged: [],
    approved: [],
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
      setPrData(result.data || { reviewer: [], raised: [], raisedMerged: [], approved: [] });
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
      setSelectedOrg(settings.defaultOrg || 'all');
      setIsAuthenticated(false);
      setPrData({ reviewer: [], raised: [], raisedMerged: [], approved: [] });
    }
  };

  // Handle Settings Save
  const handleSaveSettings = (newSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
    if (newSettings.showApprovedTab === false && activeTab === 'approved') {
      setActiveTab('reviewer');
    }
  };

  // Extract all unique repositories available in loaded PRs
  const availableRepos = useMemo(() => {
    const all = [
      ...(prData.reviewer || []),
      ...(prData.raised || []),
      ...(prData.raisedMerged || []),
      ...(prData.approved || []),
    ];
    const set = new Set();
    all.forEach((pr) => {
      if (pr.repository?.nameWithOwner) {
        set.add(pr.repository.nameWithOwner);
      }
    });
    return Array.from(set).sort();
  }, [prData]);

  // Compute organization-filtered, bot-filtered, and repo-excluded datasets and dynamic counts
  const filteredData = useMemo(() => {
    let hiddenBotsCount = 0;
    let hiddenExcludedReposCount = 0;

    const applyFilters = (list = []) => {
      return list.filter((pr) => {
        // 1. Organization filter
        const owner = pr.repository?.owner;
        if (selectedOrg !== 'all') {
          if (selectedOrg === 'personal') {
            if (owner?.toLowerCase() !== user?.login?.toLowerCase()) return false;
          } else if (owner?.toLowerCase() !== selectedOrg?.toLowerCase()) {
            return false;
          }
        }

        // 2. Excluded repositories filter (blacklist)
        if (
          settings.excludedRepos?.some(
            (excluded) => excluded.toLowerCase() === pr.repository?.nameWithOwner?.toLowerCase()
          )
        ) {
          hiddenExcludedReposCount++;
          return false;
        }

        // 3. Bot filter
        if (settings.ignoreBots && isBotPR(pr)) {
          hiddenBotsCount++;
          return false;
        }

        return true;
      });
    };

    const reviewer = applyFilters(prData.reviewer);
    const raised = applyFilters(prData.raised);
    const raisedMerged = applyFilters(prData.raisedMerged);
    const approved = applyFilters(prData.approved);

    const totalUnresolvedRaisedComments = raised.reduce(
      (sum, pr) => sum + (pr.unresolvedCommentsCount || 0),
      0
    );

    return {
      reviewer,
      raised,
      raisedMerged,
      approved,
      hiddenBotsCount,
      hiddenExcludedReposCount,
      counts: {
        reviewer: reviewer.length,
        raised: raised.length,
        raisedMerged: raisedMerged.length,
        approved: approved.length,
        totalUnresolvedRaisedComments,
      },
    };
  }, [prData, selectedOrg, settings.ignoreBots, settings.excludedRepos, user?.login]);

  // Filter active list by search query
  const currentPRs = useMemo(() => {
    let list = [];
    if (activeTab === 'raised') {
      list = raisedStateFilter === 'merged' ? filteredData.raisedMerged : filteredData.raised;
    } else {
      list = filteredData[activeTab] || [];
    }

    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase().trim();
    return list.filter((pr) => {
      const matchTitle = pr.title?.toLowerCase().includes(q);
      const matchRepo = pr.repository?.nameWithOwner?.toLowerCase().includes(q);
      const matchAuthor = pr.author?.login?.toLowerCase().includes(q);
      const matchNumber = pr.number?.toString().includes(q);
      return matchTitle || matchRepo || matchAuthor || matchNumber;
    });
  }, [filteredData, activeTab, raisedStateFilter, searchQuery]);

  // Reset keyboard focus when view or search changes
  useEffect(() => {
    setFocusedIndex(-1);
  }, [activeTab, selectedOrg, raisedStateFilter, searchQuery]);

  // Global Keyboard Navigation & Hotkeys
  useEffect(() => {
    const handleKeyDown = (e) => {
      // If modal is open, let Escape close it
      if (isSettingsOpen || isShortcutsOpen) {
        if (e.key === 'Escape') {
          setIsSettingsOpen(false);
          setIsShortcutsOpen(false);
        }
        return;
      }

      const activeElement = document.activeElement;
      const isInputFocused =
        activeElement &&
        (activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.tagName === 'SELECT' ||
          activeElement.isContentEditable);

      // '/' to focus search bar (when not already typing)
      if (e.key === '/' && !isInputFocused) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      // 'Escape' to blur search input or clear PR selection
      if (e.key === 'Escape') {
        if (isInputFocused) {
          activeElement.blur();
        } else {
          setFocusedIndex(-1);
        }
        return;
      }

      // If user is currently typing in an input/search, don't trigger hotkeys
      if (isInputFocused) {
        return;
      }

      // '?' to open shortcuts modal
      if (e.key === '?') {
        e.preventDefault();
        setIsShortcutsOpen(true);
        return;
      }

      // 'r' or 'R' to refresh data
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        loadPRData(false);
        return;
      }

      // '1', '2', '3' tab switches
      if (e.key === '1') {
        e.preventDefault();
        setActiveTab('reviewer');
        return;
      }
      if (e.key === '2') {
        e.preventDefault();
        setActiveTab('raised');
        setRaisedStateFilter('open');
        return;
      }
      if (e.key === '3' && settings.showApprovedTab !== false) {
        e.preventDefault();
        setActiveTab('approved');
        return;
      }

      const totalPRs = currentPRs.length;
      if (totalPRs === 0) return;

      // 'j' or 'ArrowDown': Next PR
      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((prev) => {
          const next = prev < totalPRs - 1 ? prev + 1 : 0;
          cardRefs.current[next]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          return next;
        });
        return;
      }

      // 'k' or 'ArrowUp': Previous PR
      if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) => {
          const next = prev > 0 ? prev - 1 : totalPRs - 1;
          cardRefs.current[next]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          return next;
        });
        return;
      }

      // 'Enter' or 'o': Open selected PR on GitHub
      if (e.key === 'Enter' || e.key === 'o' || e.key === 'O') {
        if (focusedIndex >= 0 && focusedIndex < totalPRs) {
          const targetPR = currentPRs[focusedIndex];
          if (targetPR?.url) {
            e.preventDefault();
            window.open(targetPR.url, '_blank', 'noopener,noreferrer');
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isSettingsOpen,
    isShortcutsOpen,
    currentPRs,
    focusedIndex,
    settings.showApprovedTab,
    loadPRData,
  ]);

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
        onOpenSettings={() => setIsSettingsOpen(true)}
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
                        {org.name || org.login}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Search Filter */}
              <div className="search-filter-box">
                <Search size={14} className="search-icon" />
                <input
                  ref={searchInputRef}
                  type="text"
                  className="search-input"
                  placeholder="Filter pull requests... (Press /)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Keyboard Shortcuts Helper Button */}
              <button
                type="button"
                className="keyboard-hint-btn"
                onClick={() => setIsShortcutsOpen(true)}
                title="View Keyboard Shortcuts (?)"
              >
                <Command size={12} />
                <span>Shortcuts</span>
                <kbd className="gh-kbd">?</kbd>
              </button>
            </div>
          </div>

          {fetchError && (
            <div className="error-banner">
              <span>{fetchError}</span>
            </div>
          )}

          {/* UnderlineNav 3 Tabs: Reviewer, Raised, Approved (dynamically reflects selected organization & filters) */}
          <Tabs
            activeTab={activeTab}
            onTabChange={(tab) => {
              setActiveTab(tab);
              // Reset raisedStateFilter to 'open' when navigating
              if (tab === 'raised') setRaisedStateFilter('open');
            }}
            counts={filteredData.counts}
            showApprovedTab={settings.showApprovedTab !== false}
          />
        </div>

        {/* GitHub Box Container for PR Rows */}
        <div className="gh-box">
          <div className="gh-box-header">
            {activeTab === 'raised' ? (
              /* GitHub-Style Open / Merged State Switcher with dynamic org-specific counts */
              <div className="gh-state-filters">
                <button
                  type="button"
                  className={`gh-state-btn ${raisedStateFilter === 'open' ? 'active open-filter' : ''}`}
                  onClick={() => setRaisedStateFilter('open')}
                >
                  <GitPullRequest size={14} style={{ color: raisedStateFilter === 'open' ? 'var(--color-open-fg)' : 'inherit' }} />
                  <span>{filteredData.counts.raised} Open</span>
                </button>

                <button
                  type="button"
                  className={`gh-state-btn ${raisedStateFilter === 'merged' ? 'active merged-filter' : ''}`}
                  onClick={() => setRaisedStateFilter('merged')}
                >
                  <GitMerge size={14} style={{ color: raisedStateFilter === 'merged' ? 'var(--color-merged-fg)' : 'inherit' }} />
                  <span>{filteredData.counts.raisedMerged} Merged</span>
                </button>
              </div>
            ) : (
              <div className="gh-box-header-title">
                {currentPRs.length} {currentPRs.length === 1 ? 'Pull Request' : 'Pull Requests'}
                {selectedOrg !== 'all' && (
                  <span style={{ color: 'var(--color-accent-fg)', fontWeight: 400, marginLeft: '0.5rem' }}>
                    • {selectedOrg === 'personal' ? 'Personal' : selectedOrg}
                  </span>
                )}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {/* Bot filter indicator if bots are hidden */}
              {settings.ignoreBots && (
                <span
                  style={{
                    fontSize: '11px',
                    color: 'var(--color-fg-muted)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                  }}
                  title="Bot PRs (Dependabot, Renovate, etc.) are hidden. Configure in Settings."
                >
                  <Bot size={12} />
                  Bots hidden
                </span>
              )}

              {activeTab === 'raised' && raisedStateFilter === 'open' && filteredData.counts.totalUnresolvedRaisedComments > 0 && (
                <span style={{ color: 'var(--color-attention-fg)', fontSize: '12px', fontWeight: 500 }}>
                  {filteredData.counts.totalUnresolvedRaisedComments} unresolved comments across open PRs
                </span>
              )}
            </div>
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
              {currentPRs.map((pr, idx) => (
                <PRCard
                  key={pr.id || `${pr.repository?.nameWithOwner}-${pr.number}`}
                  cardRef={(el) => (cardRefs.current[idx] = el)}
                  isSelected={idx === focusedIndex}
                  pr={pr}
                  tabType={activeTab}
                  showLabels={settings.showLabels !== false}
                  showDetailedTimestamp={settings.showDetailedTimestamp !== false}
                  showCIStatus={settings.showCIStatus !== false}
                  showReviewWaitTimer={settings.showReviewWaitTimer !== false}
                  showReviewerStatus={settings.showReviewerStatus !== false}
                  showDiffStats={settings.showDiffStats !== false}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Settings & Filtering Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        user={user}
        organizations={organizations}
        availableRepos={availableRepos}
      />

      {/* Keyboard Shortcuts Modal */}
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </div>
  );
}

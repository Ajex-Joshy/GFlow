import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Search, GitPullRequest, GitMerge, Building2, Bot, Command, ArrowUpDown, GitFork, MessageSquare, Check, AlertTriangle } from 'lucide-react';
import { api } from './services/api';
import Navbar from './components/Navbar';
import Tabs from './components/Tabs';
import PRCard from './components/PRCard';
import EmptyState from './components/EmptyState';
import LoginView from './components/LoginView';
import SettingsModal from './components/SettingsModal';
import ShortcutsModal from './components/ShortcutsModal';
import { loadSettings, saveSettings, isBotPR } from './utils/filterUtils';
import { formatRelativeOnly } from './utils/dateFormatter';
import {
  getCachedUser,
  setCachedUser,
  getCachedPRSummary,
  setCachedPRSummary,
  clearClientCache,
} from './utils/cacheUtils';

export default function App() {
  // Synchronous initial cache read for instant 0ms startup (Stale-While-Revalidate)
  const cachedUserEntry = useMemo(() => getCachedUser(), []);
  const cachedPREntry = useMemo(() => getCachedPRSummary(), []);

  const [user, setUser] = useState(() => cachedUserEntry?.user || null);
  const [organizations, setOrganizations] = useState(() => cachedUserEntry?.organizations || []);
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
  const [selectedRepo, setSelectedRepo] = useState('all');
  const [sortOrder, setSortOrder] = useState('recently-updated');
  const [onlyUnresolved, setOnlyUnresolved] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(cachedUserEntry?.user));
  const [authLoading, setAuthLoading] = useState(() => !Boolean(cachedUserEntry?.user));
  const [oauthConfigured, setOauthConfigured] = useState(false);
  const [authError, setAuthError] = useState('');

  // 3 Core Tabs State: 'reviewer' | 'raised' | 'approved'
  const [activeTab, setActiveTab] = useState('reviewer');
  const [raisedStateFilter, setRaisedStateFilter] = useState('open'); // 'open' | 'merged'

  const [prData, setPrData] = useState(() => {
    return (
      cachedPREntry?.data || {
        reviewer: [],
        raised: [],
        raisedMerged: [],
        approved: [],
      }
    );
  });
  // Track if we already have data loaded to eliminate skeleton shimmer on revisit/refresh
  const hasLoadedOnceRef = useRef(Boolean(cachedPREntry?.data));
  const [isLoadingPRs, setIsLoadingPRs] = useState(() => !Boolean(cachedPREntry?.data));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [staleNotice, setStaleNotice] = useState(() => cachedPREntry?.staleNotice || null);
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
          const orgs = authData.user.organizations?.nodes || [];
          setOrganizations(orgs);
          setIsAuthenticated(true);
          setCachedUser(authData.user, orgs);
        }
      } catch (err) {
        if (err.status === 429 || err.message?.toLowerCase().includes('rate limit')) {
          setIsAuthenticated(true);
          setFetchError('GitHub API hourly rate limit reached. Existing data is preserved; retrying automatically.');
        } else {
          setIsAuthenticated(false);
          setUser(null);
          clearClientCache();
        }
      } finally {
        setAuthLoading(false);
      }
    };

    checkAuth();
  }, []);

  // 2. Fetch PRs function (Stale-While-Revalidate)
  const loadPRData = useCallback(async (isSilent = false, force = false) => {
    // Only display full skeleton loader if this is the first load with no existing/cached PRs
    if (!isSilent && !hasLoadedOnceRef.current) {
      setIsLoadingPRs(true);
    }
    setIsRefreshing(true);
    setFetchError('');

    try {
      const result = await api.getPRSummary(force);
      const freshData = result.data || { reviewer: [], raised: [], raisedMerged: [], approved: [] };
      setPrData(freshData);
      hasLoadedOnceRef.current = true;

      const orgs = result.organizations || [];
      if (orgs.length > 0) {
        setOrganizations(orgs);
      }

      let notice = null;
      if (result.isStale || result.rateLimited) {
        notice = {
          isStale: true,
          fetchedAt: result.fetchedAt,
          staleReason: result.staleReason || 'GitHub API hourly rate limit exceeded.',
        };
      }
      setStaleNotice(notice);

      // Persist to local cache so next startup is instantaneous
      setCachedPRSummary(freshData, orgs, notice);
    } catch (err) {
      console.error('Failed to load PRs:', err);
      if (err.status === 401) {
        setIsAuthenticated(false);
        setUser(null);
        clearClientCache();
      } else if (err.status === 429 || err.message?.toLowerCase().includes('rate limit')) {
        setFetchError('GitHub API hourly rate limit reached. Cached data remains accessible.');
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
      loadPRData(hasLoadedOnceRef.current, true);
    }
  }, [isAuthenticated, loadPRData]);

  // Auto-refresh PRs every 3 minutes
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      loadPRData(true, true);
    }, 180000);
    return () => clearInterval(interval);
  }, [isAuthenticated, loadPRData]);

  // Handle Login with PAT
  const handleLoginWithToken = async (token) => {
    const res = await api.loginWithPAT(token);
    if (res.user) {
      setUser(res.user);
      const orgs = res.user.organizations?.nodes || [];
      setOrganizations(orgs);
      setIsAuthenticated(true);
      setCachedUser(res.user, orgs);
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
      clearClientCache();
      setUser(null);
      setOrganizations([]);
      setSelectedOrg(settings.defaultOrg || 'all');
      setIsAuthenticated(false);
      hasLoadedOnceRef.current = false;
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

    const unresolvedRaisedPRs = raised.filter(
      (pr) => (pr.unresolvedCommentsCount || 0) > 0
    );
    const unresolvedRaisedPRsCount = unresolvedRaisedPRs.length;
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
        unresolvedRaisedPRsCount,
        totalUnresolvedRaisedComments,
      },
    };
  }, [prData, selectedOrg, settings.ignoreBots, settings.excludedRepos, user?.login]);

  // Available repositories filtered by active organization
  const filteredAvailableRepos = useMemo(() => {
    if (selectedOrg === 'all') return availableRepos;
    if (selectedOrg === 'personal') {
      return availableRepos.filter(
        (repo) => repo.split('/')[0]?.toLowerCase() === user?.login?.toLowerCase()
      );
    }
    return availableRepos.filter(
      (repo) => repo.split('/')[0]?.toLowerCase() === selectedOrg?.toLowerCase()
    );
  }, [availableRepos, selectedOrg, user?.login]);

  // Tab-adaptive sort options
  const currentSortOptions = useMemo(() => {
    const isSlaEnabled = settings.enableSlaTracking !== false;

    if (activeTab === 'reviewer') {
      const options = [
        { value: 'recently-updated', label: 'Recently updated' },
      ];
      if (isSlaEnabled) {
        options.push({ value: 'sla-urgency', label: 'SLA Urgency (Most Overdue)' });
      }
      options.push(
        { value: 'longest-waiting', label: 'Longest waiting for review' },
        { value: 'newest', label: 'Newest created' },
        { value: 'oldest', label: 'Oldest created' },
        { value: 'smallest-diff', label: 'Smallest diff first' },
        { value: 'most-comments', label: 'Most comments' },
      );
      return options;
    }
    if (activeTab === 'raised') {
      const options = [
        { value: 'recently-updated', label: 'Recently updated' },
      ];
      if (isSlaEnabled) {
        options.push({ value: 'sla-urgency', label: 'SLA Urgency (Most Stalled)' });
      }
      options.push(
        { value: 'most-unresolved', label: 'Most unresolved comments' },
        { value: 'newest', label: 'Newest created' },
        { value: 'oldest', label: 'Oldest created' },
        { value: 'most-comments', label: 'Most comments' },
      );
      return options;
    }
    return [
      { value: 'recently-updated', label: 'Recently updated' },
      { value: 'newest', label: 'Newest created' },
      { value: 'oldest', label: 'Oldest created' },
      { value: 'most-comments', label: 'Most comments' },
    ];
  }, [activeTab, settings.enableSlaTracking]);

  // Reset selectedRepo if not present in the newly selected organization
  useEffect(() => {
    if (selectedRepo !== 'all' && !filteredAvailableRepos.includes(selectedRepo)) {
      setSelectedRepo('all');
    }
  }, [selectedOrg, filteredAvailableRepos, selectedRepo]);

  // Tab change adjustments for sort and filters
  useEffect(() => {
    setOnlyUnresolved(false);
    const isSortAvailable = currentSortOptions.some((opt) => opt.value === sortOrder);
    if (!isSortAvailable) {
      setSortOrder('recently-updated');
    }
  }, [activeTab, currentSortOptions, sortOrder]);

  // Filter and sort active list
  const currentPRs = useMemo(() => {
    let list = [];
    if (activeTab === 'raised') {
      list = raisedStateFilter === 'merged' ? filteredData.raisedMerged : filteredData.raised;
      if (raisedStateFilter === 'open' && onlyUnresolved) {
        list = list.filter((pr) => (pr.unresolvedCommentsCount || 0) > 0);
      }
    } else {
      list = filteredData[activeTab] || [];
    }

    // Repository filter
    if (selectedRepo !== 'all') {
      list = list.filter((pr) => pr.repository?.nameWithOwner?.toLowerCase() === selectedRepo.toLowerCase());
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((pr) => {
        const matchTitle = pr.title?.toLowerCase().includes(q);
        const matchRepo = pr.repository?.nameWithOwner?.toLowerCase().includes(q);
        const matchAuthor = pr.author?.login?.toLowerCase().includes(q);
        const matchNumber = pr.number?.toString().includes(q);
        return matchTitle || matchRepo || matchAuthor || matchNumber;
      });
    }

    // Sorting algorithms
    const sorted = [...list];
    switch (sortOrder) {
      case 'sla-urgency':
      case 'longest-waiting':
        sorted.sort((a, b) => {
          const timeA = new Date(a.reviewRequestedAt || a.createdAt).getTime();
          const timeB = new Date(b.reviewRequestedAt || b.createdAt).getTime();
          return timeA - timeB; // Oldest review wait / most overdue first
        });
        break;
      case 'most-unresolved':
        sorted.sort((a, b) => (b.unresolvedCommentsCount || 0) - (a.unresolvedCommentsCount || 0));
        break;
      case 'newest':
        sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'oldest':
        sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case 'smallest-diff':
        sorted.sort((a, b) => ((a.additions || 0) + (a.deletions || 0)) - ((b.additions || 0) + (b.deletions || 0)));
        break;
      case 'most-comments':
        sorted.sort((a, b) => (b.totalCommentsCount || 0) - (a.totalCommentsCount || 0));
        break;
      case 'recently-updated':
      default:
        sorted.sort((a, b) => {
          const timeA = new Date(a.updatedAt || a.createdAt).getTime();
          const timeB = new Date(b.updatedAt || b.createdAt).getTime();
          return timeB - timeA; // Most recently updated first
        });
        break;
    }

    return sorted;
  }, [filteredData, activeTab, raisedStateFilter, onlyUnresolved, selectedRepo, searchQuery, sortOrder]);

  // Reset keyboard focus when view or search changes
  useEffect(() => {
    setFocusedIndex(-1);
  }, [activeTab, selectedOrg, raisedStateFilter, searchQuery, selectedRepo, sortOrder, onlyUnresolved]);

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
        loadPRData(true, true);
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
        onRefresh={() => loadPRData(true, true)}
        isRefreshing={isRefreshing}
        onLogout={handleLogout}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isStale={Boolean(staleNotice)}
      />

      <main className="main-content">
        <div className="dashboard-header">
          <div className="dashboard-title-row">
            <h1 className="page-title">
              <GitPullRequest size={20} style={{ color: 'var(--color-fg-muted)' }} />
              <span>Pull Requests</span>
            </h1>

            <div className="dashboard-controls">
              {/* Organization Filter Dropdown */}
              {organizations.length > 0 && (
                <div className="org-filter-box">
                  <Building2 size={14} className="org-icon" />
                  <select
                    className="org-select"
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

          {staleNotice && (
            <div className="warning-banner">
              <AlertTriangle size={18} style={{ flexShrink: 0, color: 'var(--color-attention-fg)' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <span>
                  <strong>Showing Cached Data:</strong> {staleNotice.staleReason}{' '}
                  {staleNotice.fetchedAt ? `(Last synced ${formatRelativeOnly(staleNotice.fetchedAt)})` : ''}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--color-fg-muted)' }}>
                  Your pull requests remain fully viewable and interactive. Fresh data will automatically update once GitHub&apos;s hourly limit resets.
                </span>
              </div>
            </div>
          )}

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
              /* GitHub-Style Open / Merged / Unresolved State Switcher */
              <div className="gh-state-filters">
                <button
                  type="button"
                  className={`gh-state-btn ${raisedStateFilter === 'open' && !onlyUnresolved ? 'active open-filter' : ''}`}
                  onClick={() => {
                    setRaisedStateFilter('open');
                    setOnlyUnresolved(false);
                  }}
                >
                  <GitPullRequest size={14} style={{ color: raisedStateFilter === 'open' && !onlyUnresolved ? 'var(--color-open-fg)' : 'inherit' }} />
                  <span>{filteredData.counts.raised} Open</span>
                </button>

                <button
                  type="button"
                  className={`gh-state-btn ${raisedStateFilter === 'merged' ? 'active merged-filter' : ''}`}
                  onClick={() => {
                    setRaisedStateFilter('merged');
                    setOnlyUnresolved(false);
                  }}
                >
                  <GitMerge size={14} style={{ color: raisedStateFilter === 'merged' ? 'var(--color-merged-fg)' : 'inherit' }} />
                  <span>{filteredData.counts.raisedMerged} Merged</span>
                </button>

                {filteredData.counts.unresolvedRaisedPRsCount > 0 && (
                  <button
                    type="button"
                    className={`gh-state-btn ${onlyUnresolved ? 'active unresolved-filter' : ''}`}
                    onClick={() => {
                      setRaisedStateFilter('open');
                      setOnlyUnresolved(!onlyUnresolved);
                    }}
                    title={`${filteredData.counts.unresolvedRaisedPRsCount} open PR${filteredData.counts.unresolvedRaisedPRsCount > 1 ? 's have' : ' has'} ${filteredData.counts.totalUnresolvedRaisedComments} unresolved comment thread${filteredData.counts.totalUnresolvedRaisedComments > 1 ? 's' : ''}`}
                  >
                    <MessageSquare size={13} style={{ color: onlyUnresolved ? 'var(--color-attention-fg)' : 'inherit' }} />
                    <span>{filteredData.counts.unresolvedRaisedPRsCount} Unresolved</span>
                  </button>
                )}
              </div>
            ) : activeTab === 'reviewer' ? (
              <div className="gh-box-header-title">
                <GitPullRequest size={14} style={{ color: 'var(--color-open-fg)' }} />
                <span>{currentPRs.length} {currentPRs.length === 1 ? 'Review needed' : 'Reviews needed'}</span>
                {selectedRepo !== 'all' && (
                  <span className="filter-tag">• {selectedRepo.includes('/') ? selectedRepo.split('/')[1] : selectedRepo}</span>
                )}
              </div>
            ) : (
              <div className="gh-box-header-title">
                <Check size={14} style={{ color: 'var(--color-open-fg)' }} />
                <span>{currentPRs.length} Approved</span>
                {selectedRepo !== 'all' && (
                  <span className="filter-tag">• {selectedRepo.includes('/') ? selectedRepo.split('/')[1] : selectedRepo}</span>
                )}
              </div>
            )}

            {/* Header Right Actions: Bot pill, Repo select, Sort select */}
            <div className="gh-box-header-actions">
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

              {/* Repository Filter Dropdown */}
              <div className="header-filter-box">
                <GitFork size={13} className="header-filter-icon" />
                <select
                  className="header-filter-select"
                  value={selectedRepo}
                  onChange={(e) => setSelectedRepo(e.target.value)}
                  title="Filter by Repository"
                >
                  <option value="all">Repository: All</option>
                  {filteredAvailableRepos.map((repo) => (
                    <option key={repo} value={repo}>
                      {repo.includes('/') ? repo.split('/')[1] : repo}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort Dropdown */}
              <div className="header-filter-box">
                <ArrowUpDown size={13} className="header-filter-icon" />
                <select
                  className="header-filter-select"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  title="Sort Pull Requests"
                >
                  {currentSortOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      Sort: {opt.label}
                    </option>
                  ))}
                </select>
              </div>
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
              selectedRepo={selectedRepo}
              onlyUnresolved={onlyUnresolved}
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
                  selectedOrg={selectedOrg}
                  settings={settings}
                  showLabels={Boolean(settings.showLabels)}
                  showDetailedTimestamp={Boolean(settings.showDetailedTimestamp)}
                  showCIStatus={settings.showCIStatus !== false}
                  showReviewWaitTimer={Boolean(settings.showReviewWaitTimer)}
                  showReviewerStatus={Boolean(settings.showReviewerStatus)}
                  showDiffStats={Boolean(settings.showDiffStats)}
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

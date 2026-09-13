/**
 * Settings and Bot Filtering Utilities
 */

const SETTINGS_KEY = 'gflow_settings';
const LEGACY_SETTINGS_KEY = 'octopulse_settings';

export const DEFAULT_SETTINGS = {
  ignoreBots: false,
  excludedRepos: [],
  defaultOrg: 'all',
  showApprovedTab: true,
  showLabels: false,
  showDetailedTimestamp: false,
  showCIStatus: true,
  showReviewWaitTimer: false,
  showReviewerStatus: false,
  showDiffStats: false,

  // Review SLA & Urgency Configuration (Hours)
  reviewWarningHours: 12,
  reviewOverdueHours: 24,
  createdNudgeHours: 24,
  createdStalledHours: 48,
  slaExcludedDays: [0, 6], // 0 = Sunday, 6 = Saturday (Default weekend days off)
};

/**
 * Load settings from localStorage with fallback to defaults (with automatic migration from legacy key)
 */
export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY) || localStorage.getItem(LEGACY_SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save settings to localStorage and clean up any legacy key
 */
export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    localStorage.removeItem(LEGACY_SETTINGS_KEY);
  } catch (err) {
    console.error('Failed to save settings:', err);
  }
}

/**
 * Detects if a PR was created by a bot or automated tool
 * Checks author login, bot title prefixes ([Snyk], [Dependabot], etc.), and dependency patterns.
 */
export function isBotPR(pr) {
  if (!pr) return false;

  // 1. Check author username
  const login = (pr.author?.login || '').toLowerCase();
  if (
    login.includes('[bot]') ||
    login.endsWith('-bot') ||
    login.startsWith('dependabot') ||
    login.startsWith('renovate') ||
    login.startsWith('greenkeeper') ||
    login.startsWith('snyk') ||
    login.startsWith('github-actions') ||
    login === 'ghost'
  ) {
    return true;
  }

  // 2. Check title for automated tool signatures (Snyk, Dependabot, Renovate, dependency bumps)
  // Many tools like Snyk open PRs under the developer's personal account!
  const title = (pr.title || '').toLowerCase().trim();
  if (
    title.startsWith('[snyk]') ||
    title.includes('[snyk]') ||
    title.startsWith('[dependabot]') ||
    title.startsWith('[renovate]') ||
    title.startsWith('chore(deps)') ||
    title.startsWith('chore(deps-dev)') ||
    title.startsWith('build(deps)') ||
    title.startsWith('build(deps-dev)') ||
    (title.startsWith('bump ') && title.includes(' from ') && title.includes(' to ')) ||
    title.startsWith('update dependency ') ||
    title.startsWith('pin dependency ')
  ) {
    return true;
  }

  // 3. Check labels for dependency / bot tags
  if (Array.isArray(pr.labels)) {
    const hasBotLabel = pr.labels.some((l) => {
      const name = (l.name || '').toLowerCase();
      return (
        name === 'dependencies' ||
        name === 'dependency' ||
        name === 'snyk' ||
        name === 'dependabot' ||
        name === 'renovate' ||
        name === 'bot'
      );
    });
    if (hasBotLabel) return true;
  }

  return false;
}

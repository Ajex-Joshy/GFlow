/**
 * Settings and Bot Filtering Utilities
 */

const SETTINGS_KEY = 'octopulse_settings';

export const DEFAULT_SETTINGS = {
  ignoreBots: true,
  excludedRepos: [],
  defaultOrg: 'all',
};

/**
 * Load settings from localStorage with fallback to defaults
 */
export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
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
 * Save settings to localStorage
 */
export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save settings:', err);
  }
}

/**
 * Detects if a PR was created by a known bot (Dependabot, Renovate, Snyk, GitHub Actions, etc.)
 */
export function isBotPR(pr) {
  if (!pr?.author?.login) return false;
  const login = pr.author.login.toLowerCase();

  return (
    login.includes('[bot]') ||
    login.endsWith('-bot') ||
    login.startsWith('dependabot') ||
    login.startsWith('renovate') ||
    login.startsWith('greenkeeper') ||
    login.startsWith('snyk') ||
    login === 'ghost' ||
    login.startsWith('github-actions')
  );
}

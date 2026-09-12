/**
 * Client-side Cache Utilities for GFlow (Stale-While-Revalidate)
 * Persists user session and PR dashboard data to localStorage for 0ms instant startup.
 */

const PR_CACHE_KEY = 'gflow_cached_pr_summary';
const USER_CACHE_KEY = 'gflow_cached_user';

/**
 * Retrieves the cached GitHub user profile and organization list
 */
export function getCachedUser() {
  try {
    const raw = localStorage.getItem(USER_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn('Failed to parse cached user:', e);
    return null;
  }
}

/**
 * Stores or clears the user profile in localStorage
 */
export function setCachedUser(user, organizations = []) {
  try {
    if (user) {
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify({ user, organizations }));
    } else {
      localStorage.removeItem(USER_CACHE_KEY);
    }
  } catch (e) {
    console.warn('Failed to cache user:', e);
  }
}

/**
 * Retrieves the cached PR summary data
 */
export function getCachedPRSummary() {
  try {
    const raw = localStorage.getItem(PR_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn('Failed to parse cached PR summary:', e);
    return null;
  }
}

/**
 * Stores the PR summary data in localStorage for instant re-render
 */
export function setCachedPRSummary(data, organizations, staleNotice = null) {
  try {
    if (data) {
      localStorage.setItem(
        PR_CACHE_KEY,
        JSON.stringify({
          data,
          organizations: organizations || [],
          staleNotice,
          cachedAt: new Date().toISOString(),
        })
      );
    } else {
      localStorage.removeItem(PR_CACHE_KEY);
    }
  } catch (e) {
    console.warn('Failed to cache PR summary:', e);
  }
}

/**
 * Clears all cached user and PR data from localStorage (e.g. on logout)
 */
export function clearClientCache() {
  try {
    localStorage.removeItem(PR_CACHE_KEY);
    localStorage.removeItem(USER_CACHE_KEY);
  } catch (e) {
    console.warn('Failed to clear client cache:', e);
  }
}

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
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.staleNotice) {
      const noticeTime = parsed.staleNotice.fetchedAt || parsed.cachedAt;
      if (noticeTime) {
        const ageMs = Date.now() - new Date(noticeTime).getTime();
        // Discard stale banners older than 5 minutes
        if (ageMs > 5 * 60 * 1000) {
          parsed.staleNotice = null;
          try {
            localStorage.setItem(PR_CACHE_KEY, JSON.stringify(parsed));
          } catch (e) {}
        }
      } else {
        parsed.staleNotice = null;
        try {
          localStorage.setItem(PR_CACHE_KEY, JSON.stringify(parsed));
        } catch (e) {}
      }
    }
    return parsed;
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
      const existing = getCachedPRSummary();
      const existingCount = existing?.data
        ? Object.values(existing.data).reduce((s, a) => s + (Array.isArray(a) ? a.length : 0), 0)
        : 0;
      const newCount = Object.values(data).reduce(
        (s, a) => s + (Array.isArray(a) ? a.length : 0),
        0
      );

      // CRITICAL SHIELD: Never overwrite an existing populated PR cache with empty data during rate-limit / errors
      if (newCount === 0 && existingCount > 0) {
        console.warn('[Cache Shield] Blocked overwriting populated PR cache with empty list during rate limit.');
        localStorage.setItem(
          PR_CACHE_KEY,
          JSON.stringify({
            ...existing,
            staleNotice: staleNotice || {
              isStale: true,
              staleReason: 'GitHub API hourly rate limit exceeded. Cached data is preserved.',
            },
          })
        );
        return;
      }

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

import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { requireAuth } from '../middleware/auth.js';
import {
  getUserProfile,
  getReviewerPRs,
  getRaisedPRs,
  getRaisedMergedPRs,
  getApprovedPRs,
  getTeamPRs,
} from '../services/githubService.js';

const router = express.Router();
router.use(requireAuth);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CACHE_DIR = path.join(__dirname, '../../.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'summary_cache.json');

// Ensure persistent disk cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  } catch (e) {
    console.warn('[Cache] Could not create cache directory:', e.message);
  }
}

function loadDiskCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      return data;
    }
  } catch (e) {
    console.warn('[Cache] Failed to read disk cache:', e.message);
  }
  return null;
}

function saveDiskCache(payload) {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(payload, null, 2), 'utf8');
  } catch (e) {
    console.warn('[Cache] Failed to save disk cache:', e.message);
  }
}

// In-memory cache for PR summaries (15-second debounce TTL)
const summaryCache = new Map();
const SUMMARY_CACHE_TTL_MS = 15 * 1000;

function isActualRateLimit(err) {
  if (!err) return false;
  if (err.status === 429) return true;
  const msg = (err.message || "").toLowerCase();
  if (
    msg.includes("rate limit") ||
    msg.includes("rate-limit") ||
    msg.includes("secondary rate") ||
    msg.includes("abuse detection") ||
    msg.includes("too many requests")
  ) {
    return true;
  }
  const remaining =
    err.headers?.["x-ratelimit-remaining"] ||
    err.response?.headers?.["x-ratelimit-remaining"];
  if (remaining !== undefined && (remaining === "0" || remaining === 0)) {
    return true;
  }
  return false;
}

function formatResetTime(err) {
  const resetSec =
    err?.headers?.["x-ratelimit-reset"] ||
    err?.response?.headers?.["x-ratelimit-reset"];
  if (resetSec) {
    const resetDate = new Date(Number(resetSec) * 1000);
    const diffMs = resetDate.getTime() - Date.now();
    if (diffMs <= 0) {
      return "Rate limit window has reset.";
    }
    const mins = Math.max(1, Math.round(diffMs / 60000));
    return `Resets in ~${mins}m (at ${resetDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })})`;
  }
  return "Resets at the top of the hour.";
}

/**
 * GET /api/prs/summary
 * Fetches PRs for the core tabs (Reviewer, Raised, Approved, Team)
 */
router.get('/summary', async (req, res) => {
  const isForce = req.query.force === 'true';
  if (isForce) {
    summaryCache.delete(req.ghToken);
  }
  const memCached = summaryCache.get(req.ghToken);
  const diskCached = loadDiskCache();
  const cached = memCached?.payload || diskCached;
  const now = Date.now();

  // If not forced and memory cache is fresh (< 15s) and NOT stale, serve immediately
  if (!isForce && memCached && !memCached.payload?.isStale && (now - memCached.timestamp < SUMMARY_CACHE_TTL_MS)) {
    console.log('[Cache] Serving PR summary from fresh in-memory cache');
    return res.json(memCached.payload);
  }

  console.log(`[GitHub API] ${isForce ? 'Forced refresh' : 'Fetching'} - Querying live data from GitHub GraphQL...`);

  try {
    const user = await getUserProfile(req.ghToken);
    const username = user.login;
    const orgs = user.organizations?.nodes || [];

    let rateLimitError = null;
    const failedCategories = new Set();
    const handleSubError = (category, err) => {
      console.error(`Error fetching ${category} PRs:`, err.message);
      failedCategories.add(category);
      if (isActualRateLimit(err)) {
        rateLimitError = err;
      }
      return [];
    };

    const [reviewerPRs, raisedPRs, raisedMergedPRs, approvedPRs, teamPRs] = await Promise.all([
      getReviewerPRs(req.ghToken, username).catch((err) => handleSubError('reviewer', err)),
      getRaisedPRs(req.ghToken, username).catch((err) => handleSubError('raised', err)),
      getRaisedMergedPRs(req.ghToken, username).catch((err) => handleSubError('raised merged', err)),
      getApprovedPRs(req.ghToken, username).catch((err) => handleSubError('approved', err)),
      getTeamPRs(req.ghToken, username, orgs).catch((err) => handleSubError('team', err)),
    ]);

    // Only fall back to cache for categories that actually threw errors
    const finalReviewerPRs = failedCategories.has('reviewer') && cached?.data?.reviewer ? cached.data.reviewer : reviewerPRs;
    const finalRaisedPRs = failedCategories.has('raised') && cached?.data?.raised ? cached.data.raised : raisedPRs;
    const finalRaisedMergedPRs = failedCategories.has('raised merged') && cached?.data?.raisedMerged ? cached.data.raisedMerged : raisedMergedPRs;
    const finalApprovedPRs = failedCategories.has('approved') && cached?.data?.approved ? cached.data.approved : approvedPRs;
    const finalTeamPRs = failedCategories.has('team') && cached?.data?.team ? cached.data.team : teamPRs;

    // Only mark whole response as stale if ALL 5 categories failed
    const allFailed = failedCategories.size >= 5;
    if (allFailed && rateLimitError) {
      console.warn('[Cache] All queries failed due to rate limit. Serving preserved cache.');
      if (cached) {
        return res.json({
          ...cached,
          isStale: true,
          rateLimited: true,
          staleReason: `GitHub API rate limit reached. ${formatResetTime(rateLimitError)}`,
        });
      }

      return res.status(429).json({
        error: 'GitHub API Rate Limit Exceeded',
        message: `GitHub API rate limit exceeded. ${formatResetTime(rateLimitError)}`,
        rateLimited: true,
      });
    }

    // Compute total unresolved comments across all raised PRs
    const totalUnresolvedRaisedComments = finalRaisedPRs.reduce(
      (sum, pr) => sum + (pr.unresolvedCommentsCount || 0),
      0
    );

    const payload = {
      user,
      organizations: orgs,
      isStale: false,
      rateLimited: false,
      counts: {
        reviewer: finalReviewerPRs.length,
        raised: finalRaisedPRs.length,
        raisedMerged: finalRaisedMergedPRs.length,
        approved: finalApprovedPRs.length,
        team: finalTeamPRs.length,
        totalUnresolvedRaisedComments,
      },
      data: {
        reviewer: finalReviewerPRs,
        raised: finalRaisedPRs,
        raisedMerged: finalRaisedMergedPRs,
        approved: finalApprovedPRs,
        team: finalTeamPRs,
      },
      fetchedAt: new Date().toISOString(),
    };

    summaryCache.set(req.ghToken, { payload, timestamp: now });
    saveDiskCache(payload);
    res.json(payload);
  } catch (error) {
    console.error("Error fetching PR summary:", error.message);
    try {
      fs.writeFileSync("./server/debug.log", JSON.stringify({
        message: error.message,
        status: error.status,
        headers: error.headers || error.response?.headers,
        stack: error.stack,
        time: new Date().toISOString()
      }, null, 2));
    } catch(e) {}
    const isRateLimit = isActualRateLimit(error);

    // If cached data exists (memory or disk), serve it with appropriate stale reason
    if (cached) {
      console.log('[Cache] Serving preserved cached PRs during outer error');
      return res.json({
        ...cached,
        isStale: true,
        rateLimited: isRateLimit,
        staleReason: isRateLimit
          ? `GitHub API hourly rate limit reached. ${formatResetTime(error)}`
          : `Live sync temporarily unavailable: ${error.message || "Network error"}`,
      });
    }

    if (isRateLimit) {
      return res.status(429).json({
        error: 'GitHub API Rate Limit Exceeded',
        message: `GitHub API rate limit exceeded. ${formatResetTime(error)}`,
        rateLimited: true,
      });
    }

    res.status(500).json({
      error: 'Failed to fetch PR summary',
      message: error.message,
    });
  }
});

/**
 *  */
router.get('/reviewer', async (req, res) => {
  try {
    const user = await getUserProfile(req.ghToken);
    const prs = await getReviewerPRs(req.ghToken, user.login);
    res.json({ count: prs.length, prs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/prs/raised
 */
router.get('/raised', async (req, res) => {
  try {
    const user = await getUserProfile(req.ghToken);
    const prs = await getRaisedPRs(req.ghToken, user.login);
    res.json({ count: prs.length, prs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/prs/approved
 */
router.get('/approved', async (req, res) => {
  try {
    const user = await getUserProfile(req.ghToken);
    const prs = await getApprovedPRs(req.ghToken, user.login);
    res.json({ count: prs.length, prs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/prs/team
 */
router.get('/team', async (req, res) => {
  try {
    const user = await getUserProfile(req.ghToken);
    const orgs = user.organizations?.nodes || [];
    const prs = await getTeamPRs(req.ghToken, user.login, orgs);
    res.json({ count: prs.length, prs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

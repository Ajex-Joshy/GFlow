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

function formatResetTime(err) {
  const resetSec = err?.headers?.['x-ratelimit-reset'] || err?.response?.headers?.['x-ratelimit-reset'];
  if (resetSec) {
    const resetDate = new Date(Number(resetSec) * 1000);
    const mins = Math.max(1, Math.round((resetDate.getTime() - Date.now()) / 60000));
    return `Resets in ~${mins}m (at ${resetDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })})`;
  }
  return 'Resets at the top of the hour.';
}

/**
 * GET /api/prs/summary
 * Fetches PRs for the core tabs (Reviewer, Raised, Approved, Team)
 */
router.get('/summary', async (req, res) => {
  const isForce = req.query.force === 'true';
  const memCached = summaryCache.get(req.ghToken);
  const diskCached = loadDiskCache();
  const cached = memCached?.payload || diskCached;
  const now = Date.now();

  // If not forced and memory cache is fresh (< 15s), serve immediately
  if (!isForce && memCached && (now - memCached.timestamp < SUMMARY_CACHE_TTL_MS)) {
    console.log('[Cache] Serving PR summary from fresh in-memory cache');
    return res.json(memCached.payload);
  }

  console.log(`[GitHub API] ${isForce ? 'Forced refresh' : 'Fetching'} - Querying live data from GitHub GraphQL...`);

  try {
    const user = await getUserProfile(req.ghToken);
    const username = user.login;
    const orgs = user.organizations?.nodes || [];

    let rateLimitError = null;
    const handleSubError = (category, err) => {
      console.error(`Error fetching ${category} PRs:`, err.message);
      if (
        err.message?.toLowerCase().includes('rate limit') ||
        err.status === 403 ||
        err.status === 429
      ) {
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

    // If a rate limit was caught during any sub-query, NEVER overwrite cache with empty arrays!
    if (rateLimitError) {
      console.warn('[Cache] GitHub rate limit hit during sub-queries. Preserving cache.');
      if (cached) {
        return res.json({
          ...cached,
          isStale: true,
          rateLimited: true,
          staleReason: `GitHub API hourly rate limit reached. ${formatResetTime(rateLimitError)}`,
        });
      }

      return res.status(429).json({
        error: 'GitHub API Rate Limit Exceeded',
        message: `GitHub API rate limit exceeded. ${formatResetTime(rateLimitError)}`,
        rateLimited: true,
      });
    }

    // Compute total unresolved comments across all raised PRs
    const totalUnresolvedRaisedComments = raisedPRs.reduce(
      (sum, pr) => sum + (pr.unresolvedCommentsCount || 0),
      0
    );

    const payload = {
      user,
      organizations: orgs,
      counts: {
        reviewer: reviewerPRs.length,
        raised: raisedPRs.length,
        raisedMerged: raisedMergedPRs.length,
        approved: approvedPRs.length,
        team: teamPRs.length,
        totalUnresolvedRaisedComments,
      },
      data: {
        reviewer: reviewerPRs,
        raised: raisedPRs,
        raisedMerged: raisedMergedPRs,
        approved: approvedPRs,
        team: teamPRs,
      },
      fetchedAt: new Date().toISOString(),
    };

    summaryCache.set(req.ghToken, { payload, timestamp: now });
    saveDiskCache(payload);
    res.json(payload);
  } catch (error) {
    console.error('Error fetching PR summary:', error.message);
    const isRateLimit =
      error.message?.toLowerCase().includes('rate limit') ||
      error.status === 403 ||
      error.status === 429;

    // If rate limited but we have cached data (memory or disk), serve it with stale notice
    if (cached) {
      console.log('[Cache] Serving preserved cached PRs during outer error');
      return res.json({
        ...cached,
        isStale: true,
        rateLimited: isRateLimit,
        staleReason: `GitHub API hourly rate limit reached. ${formatResetTime(error)}`,
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
 * GET /api/prs/reviewer
 */
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

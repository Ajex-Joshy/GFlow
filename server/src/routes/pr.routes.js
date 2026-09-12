import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getUserProfile,
  getReviewerPRs,
  getRaisedPRs,
  getRaisedMergedPRs,
  getApprovedPRs,
} from '../services/githubService.js';

const router = express.Router();

// Apply auth middleware to all PR routes
router.use(requireAuth);

// In-memory cache for PR summaries (60-second TTL) to protect GitHub API rate limit
const summaryCache = new Map();
const SUMMARY_CACHE_TTL_MS = 60 * 1000;

/**
 * GET /api/prs/summary
 * Fetches PRs for the 3 core tabs (Reviewer, Raised, Approved) across personal and org repos
 */
router.get('/summary', async (req, res) => {
  const cached = summaryCache.get(req.ghToken);
  const now = Date.now();

  // If cached data is fresh (< 60s), serve instantly without calling GitHub
  if (cached && (now - cached.timestamp < SUMMARY_CACHE_TTL_MS) && req.query.force !== 'true') {
    return res.json(cached.payload);
  }

  try {
    const user = await getUserProfile(req.ghToken);
    const username = user.login;
    const orgs = user.organizations?.nodes || [];

    const [reviewerPRs, raisedPRs, raisedMergedPRs, approvedPRs] = await Promise.all([
      getReviewerPRs(req.ghToken, username).catch((err) => {
        console.error('Error fetching reviewer PRs:', err.message);
        return [];
      }),
      getRaisedPRs(req.ghToken, username).catch((err) => {
        console.error('Error fetching raised PRs:', err.message);
        return [];
      }),
      getRaisedMergedPRs(req.ghToken, username).catch((err) => {
        console.error('Error fetching raised merged PRs:', err.message);
        return [];
      }),
      getApprovedPRs(req.ghToken, username).catch((err) => {
        console.error('Error fetching approved PRs:', err.message);
        return [];
      }),
    ]);

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
        totalUnresolvedRaisedComments,
      },
      data: {
        reviewer: reviewerPRs,
        raised: raisedPRs,
        raisedMerged: raisedMergedPRs,
        approved: approvedPRs,
      },
      fetchedAt: new Date().toISOString(),
    };

    summaryCache.set(req.ghToken, { payload, timestamp: now });
    res.json(payload);
  } catch (error) {
    console.error('Error fetching PR summary:', error.message);
    const isRateLimit =
      error.message?.toLowerCase().includes('rate limit') ||
      error.status === 403 ||
      error.status === 429;

    // If rate limited but we have cached data, return the cache gracefully
    if (cached) {
      return res.json({
        ...cached.payload,
        isStale: true,
        rateLimited: isRateLimit,
      });
    }

    if (isRateLimit) {
      return res.status(429).json({
        error: 'GitHub API Rate Limit Exceeded',
        message: 'GitHub API rate limit exceeded. Data will update automatically once the hourly window resets.',
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

export default router;

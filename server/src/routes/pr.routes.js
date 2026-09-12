import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getUserProfile,
  getReviewerPRs,
  getRaisedPRs,
  getApprovedPRs,
} from '../services/githubService.js';

const router = express.Router();

// Apply auth middleware to all PR routes
router.use(requireAuth);

/**
 * GET /api/prs/summary
 * Fetches PRs for all three tabs in parallel
 */
router.get('/summary', async (req, res) => {
  try {
    const user = await getUserProfile(req.ghToken);
    const username = user.login;

    const [reviewerPRs, raisedPRs, approvedPRs] = await Promise.all([
      getReviewerPRs(req.ghToken, username).catch((err) => {
        console.error('Error fetching reviewer PRs:', err.message);
        return [];
      }),
      getRaisedPRs(req.ghToken, username).catch((err) => {
        console.error('Error fetching raised PRs:', err.message);
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

    res.json({
      user,
      counts: {
        reviewer: reviewerPRs.length,
        raised: raisedPRs.length,
        approved: approvedPRs.length,
        totalUnresolvedRaisedComments,
      },
      data: {
        reviewer: reviewerPRs,
        raised: raisedPRs,
        approved: approvedPRs,
      },
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching PR summary:', error.message);
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

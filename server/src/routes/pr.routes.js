import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getUserProfile,
  getReviewerPRs,
  getRaisedPRs,
  getApprovedPRs,
  getOrganizationPRs,
} from '../services/githubService.js';

const router = express.Router();

// Apply auth middleware to all PR routes
router.use(requireAuth);

/**
 * GET /api/prs/summary
 * Fetches PRs for all tabs including organizations in parallel
 */
router.get('/summary', async (req, res) => {
  try {
    const user = await getUserProfile(req.ghToken);
    const username = user.login;
    const orgs = user.organizations?.nodes || [];

    const [reviewerPRs, raisedPRs, approvedPRs, orgPRs] = await Promise.all([
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
      getOrganizationPRs(req.ghToken, orgs).catch((err) => {
        console.error('Error fetching organization PRs:', err.message);
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
      organizations: orgs,
      counts: {
        reviewer: reviewerPRs.length,
        raised: raisedPRs.length,
        approved: approvedPRs.length,
        org: orgPRs.length,
        totalUnresolvedRaisedComments,
      },
      data: {
        reviewer: reviewerPRs,
        raised: raisedPRs,
        approved: approvedPRs,
        org: orgPRs,
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

/**
 * GET /api/prs/org
 */
router.get('/org', async (req, res) => {
  try {
    const user = await getUserProfile(req.ghToken);
    const orgs = user.organizations?.nodes || [];
    const prs = await getOrganizationPRs(req.ghToken, orgs);
    res.json({ count: prs.length, prs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

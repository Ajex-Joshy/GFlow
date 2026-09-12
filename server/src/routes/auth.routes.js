import express from 'express';
import { exchangeOAuthCode, getUserProfile } from '../services/githubService.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/auth/config
 * Returns OAuth readiness status (whether clientId is configured)
 */
router.get('/config', (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  res.json({
    oauthConfigured: Boolean(clientId && process.env.GITHUB_CLIENT_SECRET),
    clientId: clientId || null,
  });
});

/**
 * GET /api/auth/github
 * Redirects user to GitHub OAuth login
 */
router.get('/github', (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return res.status(500).json({ error: 'GitHub OAuth Client ID is not configured.' });
  }

  const redirectUri = process.env.GITHUB_CALLBACK_URL || 'http://localhost:5000/api/auth/callback';
  const scope = 'repo read:user user:email';
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=${encodeURIComponent(scope)}`;

  res.redirect(githubAuthUrl);
});

/**
 * GET /api/auth/callback
 * Handles OAuth callback, exchanges code for access token, sets HTTP-only cookie
 */
router.get('/callback', async (req, res) => {
  const { code } = req.query;
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

  if (!code) {
    return res.redirect(`${clientUrl}?error=missing_code`);
  }

  try {
    const tokenData = await exchangeOAuthCode(
      code,
      process.env.GITHUB_CLIENT_ID,
      process.env.GITHUB_CLIENT_SECRET
    );

    if (tokenData.error || !tokenData.access_token) {
      return res.redirect(
        `${clientUrl}?error=${encodeURIComponent(tokenData.error_description || tokenData.error || 'token_exchange_failed')}`
      );
    }

    // Set cookie
    res.cookie('gh_token', tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.redirect(clientUrl);
  } catch (error) {
    console.error('OAuth callback error:', error.message);
    res.redirect(`${clientUrl}?error=oauth_failed`);
  }
});

/**
 * POST /api/auth/token
 * Login with a Personal Access Token (PAT)
 */
router.post('/token', async (req, res) => {
  const { token } = req.body;

  if (!token || typeof token !== 'string' || !token.trim()) {
    return res.status(400).json({ error: 'Valid Personal Access Token is required.' });
  }

  try {
    // Validate token by fetching viewer
    const profile = await getUserProfile(token.trim());

    res.cookie('gh_token', token.trim(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      user: profile,
    });
  } catch (error) {
    console.error('PAT authentication error:', error.message);
    res.status(401).json({
      error: 'Invalid token',
      message: error.message || 'Unable to authenticate with GitHub using this token.',
    });
  }
});

/**
 * GET /api/auth/me
 * Retrieves current user profile from authenticated session
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const profile = await getUserProfile(req.ghToken);
    res.json({
      authenticated: true,
      user: profile,
    });
  } catch (error) {
    console.error('Fetch me error:', error.message);
    res.status(401).json({
      authenticated: false,
      error: 'Session expired or token invalid.',
    });
  }
});

/**
 * POST /api/auth/logout
 * Clears session cookie
 */
router.post('/logout', (req, res) => {
  res.clearCookie('gh_token');
  res.json({ success: true, message: 'Logged out successfully.' });
});

export default router;

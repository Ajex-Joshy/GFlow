/**
 * Authentication middleware
 * Checks for GitHub access token in cookies (session) or Authorization header
 */
export const requireAuth = (req, res, next) => {
  const token = req.cookies?.gh_token || req.headers.authorization?.replace(/^Bearer\s+/i, '');

  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'GitHub access token is required. Please log in.'
    });
  }

  req.ghToken = token;
  next();
};

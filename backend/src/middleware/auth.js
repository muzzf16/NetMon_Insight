/**
 * Auth Middleware - API Key validation
 * In development mode, auth is optional (skip if no key provided).
 */
function authMiddleware(req, res, next) {
  // Skip auth in development mode
  if (process.env.NODE_ENV === 'development') {
    return next();
  }

  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing API key' });
  }

  next();
}

module.exports = authMiddleware;

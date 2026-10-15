const { getSession } = require('../session/sessionStore');

module.exports = function requireSession(req, res, next) {
  const sessionId = req.signedCookies.sid;

  // Check whether the signed cookie exists and is valid.
  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
  }

  // Find the corresponding server-side session.
  const session = getSession(sessionId);

  if (!session) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
  }

  // Attach the authenticated user's ID to the request.
  req.user = {
    id: session.userId,
  };

  next();
};
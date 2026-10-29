const sessions = new Map();

function createSession(userId, ttlMs) {
  const sessionId = require('crypto').randomBytes(32).toString('hex');

  const expiresAt = Date.now() + ttlMs;

  sessions.set(sessionId, {
    userId,
    expiresAt,
  });

  return {
    sessionId,
    expiresAt,
  };
}

function getSession(sessionId) {
  if (!sessionId || typeof sessionId !== 'string') {
    return null;
  }

  const session = sessions.get(sessionId);

  if (!session) {
    return null;
  }

  if (session.expiresAt <= Date.now()) {
    sessions.delete(sessionId);
    return null;
  }

  return session;
}

function destroySession(sessionId) {
  if (!sessionId || typeof sessionId !== 'string') {
    return false;
  }

  return sessions.delete(sessionId);
}

module.exports = {
  createSession,
  getSession,
  destroySession,
};
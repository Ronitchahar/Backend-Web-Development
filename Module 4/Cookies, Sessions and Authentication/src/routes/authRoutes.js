const express = require('express');
const bcrypt = require('bcryptjs');

const prisma = require('../db/prisma');

const {
  createSession,
  destroySession,
} = require('../session/sessionStore');

const requireSession = require('../middleware/requireSession');

const router = express.Router();

const COOKIE_NAME = 'sid';
const SESSION_TTL_MS = Number(
  process.env.SESSION_TTL_MS || 3600000
);

const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true';

const cookieOptions = {
  httpOnly: true,
  secure: COOKIE_SECURE,
  sameSite: 'lax',
  signed: true,
  path: '/',
  maxAge: SESSION_TTL_MS,
};

// POST /auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    // Validate input.
    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email and password are required',
        },
      });
    }

    // Find the user in the database.
    const user = await prisma.user.findUnique({
      where: {
        email: email.trim().toLowerCase(),
      },
    });

    // Use a generic error to avoid revealing whether the account exists.
    if (
      !user ||
      !(await bcrypt.compare(password, user.passwordHash))
    ) {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      });
    }

    // Create a server-side session.
    const { sessionId } = createSession(
      user.id,
      SESSION_TTL_MS
    );

    // Send a signed session cookie to the browser.
    res.cookie(COOKIE_NAME, sessionId, cookieOptions);

    return res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /auth/me
router.get('/me', requireSession, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: req.user.id,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    }

    return res.status(200).json({
      user,
    });
  } catch (error) {
    next(error);
  }
});

// POST /auth/logout
router.post('/logout', (req, res, next) => {
  try {
    const sessionId = req.signedCookies.sid;

    // Destroy the server-side session.
    if (typeof sessionId === 'string') {
      destroySession(sessionId);
    }

    // Clear the cookie using matching cookie settings.
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: COOKIE_SECURE,
      sameSite: 'lax',
      path: '/',
    });

    return res.status(200).json({
      message: 'Logout successful',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
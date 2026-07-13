// Authentication routes: register, login, logout, and current-user lookup.
// Uses Passport's local strategy.
import express from 'express';
import passport from 'passport';
import bcrypt from 'bcryptjs';
import { usersCollection } from '../db.js';

const router = express.Router();

// Shape the user object we send to the client (never expose the password hash).
function publicUser(user) {
  return {
    _id: user._id,
    username: user.username,
    displayName: user.displayName,
  };
}

// POST /api/auth/register — create a new account, then log them in.
router.post('/register', async (req, res, next) => {
  try {
    const username = (req.body.username || '').toLowerCase().trim();
    const password = req.body.password || '';
    const displayName = (req.body.displayName || '').trim() || username;

    if (username.length < 3 || password.length < 6) {
      return res.status(400).json({
        error: 'Username must be 3+ chars and password 6+ chars.',
      });
    }

    const existing = await usersCollection().findOne({ username });
    if (existing) {
      return res.status(409).json({ error: 'That username is already taken.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date();
    const result = await usersCollection().insertOne({
      username,
      displayName,
      passwordHash,
      createdAt: now,
    });

    const user = { _id: result.insertedId, username, displayName };
    // Log the new user in so the client gets an authenticated session.
    req.login(user, (err) => {
      if (err) return next(err);
      return res.status(201).json({ user: publicUser(user) });
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login - authenticate with username + password.
router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      return res.status(401).json({ error: info?.message || 'Login failed.' });
    }
    req.login(user, (loginErr) => {
      if (loginErr) return next(loginErr);
      return res.json({ user: publicUser(user) });
    });
  })(req, res, next);
});

// POST /api/auth/logout — destroy the current session.
router.post('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    return res.json({ ok: true });
  });
});

// GET /api/auth/me — return the logged-in user, or null.
router.get('/me', (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return res.json({ user: publicUser(req.user) });
  }
  return res.json({ user: null });
});

export default router;

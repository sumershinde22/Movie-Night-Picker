// Passport authentication setup using the local (username + password) strategy.
// Passwords are hashed with bcryptjs; sessions are persisted via express-session.
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';
import { usersCollection } from '../db.js';

export function configurePassport() {
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await usersCollection().findOne({
          username: username.toLowerCase().trim(),
        });
        if (!user) {
          return done(null, false, {
            message: 'Incorrect username or password.',
          });
        }
        const match = await bcrypt.compare(password, user.passwordHash);
        if (!match) {
          return done(null, false, {
            message: 'Incorrect username or password.',
          });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  // Store only the user id in the session cookie.
  passport.serializeUser((user, done) => {
    done(null, user._id.toString());
  });

  // Rehydrate the full user (minus the password hash) on each request.
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await usersCollection().findOne(
        { _id: new ObjectId(id) },
        { projection: { passwordHash: 0 } }
      );
      done(null, user || false);
    } catch (err) {
      done(err);
    }
  });
}

// Route guard: rejects unauthenticated requests with 401.
export function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ error: 'You must be logged in to do that.' });
}

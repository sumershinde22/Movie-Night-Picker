// Movie Night Picker — Express server.
// Serves the JSON API under /api and the built React frontend for everything
// else, so the whole app is same-origin (no CORS library needed).
import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import passport from 'passport';

import { connectToDatabase } from './db.js';
import { configurePassport } from './config/passport.js';
import authRouter from './routes/auth.js';
import moviesRouter from './routes/movies.js';
import sessionsRouter from './routes/sessions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 4000;

async function start() {
  await connectToDatabase();
  configurePassport();

  const app = express();
  app.use(express.json());

  // Render (and most hosts) terminate HTTPS at a proxy. Trusting it lets
  // express-session send the `secure` session cookie in production.
  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  // Persist login sessions in MongoDB so they survive server restarts.
  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'dev_only_secret_change_me',
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI,
        dbName: process.env.DB_NAME || 'movie_night',
        collectionName: 'login_sessions',
      }),
      cookie: {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        secure: process.env.NODE_ENV === 'production',
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  // API routes.
  app.use('/api/auth', authRouter);
  app.use('/api/movies', moviesRouter);
  app.use('/api/sessions', sessionsRouter);

  // Simple health check for the hosting platform.
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  // Serve the compiled React app (frontend/dist) in production.
  const clientDir = path.join(__dirname, '..', 'frontend', 'dist');
  app.use(express.static(clientDir));

  // SPA fallback: any non-API route returns index.html so React Router works.
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(clientDir, 'index.html'));
  });

  // Centralized error handler.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong on the server.' });
  });

  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

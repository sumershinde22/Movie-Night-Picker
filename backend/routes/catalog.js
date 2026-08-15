// Movie catalog lookup, proxied to TMDB.
//
// This exists so the user does not have to know a film's genre and runtime by
// heart: the usability study found two of three participants stalling on the
// required Genre field, one asking "can I just make this up?" and another
// filing a sci-fi comedy under "horror".
//
// The request goes through the server rather than straight from the browser so
// that TMDB_API_KEY is never shipped to the client. Uses the global fetch built
// into Node 18+, so there is no HTTP client dependency to add.
import express from 'express';
import { ensureAuthenticated } from '../config/passport.js';

const router = express.Router();

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_TIMEOUT_MS = 6000;

// Only logged-in users can search, so this cannot be used as an open proxy that
// burns through the project's TMDB quota.
router.use(ensureAuthenticated);

// TMDB issues two credential styles: a v3 key used as a query parameter, and a
// v4 "API Read Access Token" (a JWT) used as a bearer token. Accept either so
// it works with whichever one the dashboard shows.
function tmdbRequestInit(key) {
  const isReadAccessToken = key.startsWith('ey') && key.split('.').length === 3;
  return {
    headers: isReadAccessToken
      ? { Authorization: `Bearer ${key}`, accept: 'application/json' }
      : { accept: 'application/json' },
    usesQueryKey: !isReadAccessToken,
  };
}

async function callTmdb(pathname, params = {}) {
  const key = process.env.TMDB_API_KEY;
  if (!key) {
    const err = new Error('Movie search is not configured on this server.');
    err.status = 503;
    throw err;
  }

  const { headers, usesQueryKey } = tmdbRequestInit(key);
  const url = new URL(`${TMDB_BASE}${pathname}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  if (usesQueryKey) url.searchParams.set('api_key', key);

  // Do not let a slow upstream hold the request open indefinitely.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TMDB_TIMEOUT_MS);
  try {
    const response = await fetch(url, { headers, signal: controller.signal });
    if (!response.ok) {
      const err = new Error(
        response.status === 401
          ? 'Movie search credentials were rejected.'
          : 'Movie search is unavailable right now.'
      );
      err.status = response.status === 401 ? 503 : 502;
      throw err;
    }
    return await response.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      const timeout = new Error('Movie search timed out.');
      timeout.status = 504;
      throw timeout;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

const releaseYear = (date) =>
  typeof date === 'string' && date.length >= 4 ? date.slice(0, 4) : '';

// SEARCH: GET /api/catalog/search?q=... — drives the type-ahead. Deliberately
// lean: TMDB's search payload has no runtime, so the client fetches details
// only for the one title the user actually picks.
router.get('/search', async (req, res, next) => {
  try {
    const query = (req.query.q || '').trim();
    if (query.length < 2) return res.json({ results: [] });

    const data = await callTmdb('/search/movie', {
      query,
      include_adult: 'false',
      language: 'en-US',
      page: '1',
    });

    const results = (data.results || []).slice(0, 8).map((movie) => ({
      tmdbId: movie.id,
      title: movie.title,
      year: releaseYear(movie.release_date),
    }));

    res.json({ results });
  } catch (err) {
    next(err);
  }
});

// DETAILS: GET /api/catalog/movie/:tmdbId — the fields the add form needs.
router.get('/movie/:tmdbId', async (req, res, next) => {
  try {
    const { tmdbId } = req.params;
    if (!/^\d+$/.test(tmdbId)) {
      return res.status(400).json({ error: 'Invalid movie id.' });
    }

    const movie = await callTmdb(`/movie/${tmdbId}`, { language: 'en-US' });

    res.json({
      movie: {
        tmdbId: movie.id,
        title: movie.title || '',
        // The form takes a single genre; TMDB returns them most-relevant first.
        genre: movie.genres?.[0]?.name || '',
        // Occasionally null or 0 for unreleased films: leave it for the user.
        runtime:
          Number.isFinite(movie.runtime) && movie.runtime > 0
            ? movie.runtime
            : '',
        year: releaseYear(movie.release_date),
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;

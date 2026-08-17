// Movie catalog lookup, proxied to TMDB.
//
// This exists so the user does not have to know a film's genre and runtime by
// heart: the usability study found two of three participants stalling on the
// required Genre field, one asking "can I just make this up?" and another
// filing a sci-fi comedy under "horror".
//
// The request goes through the server rather than straight from the browser so
// that TMDB_API_KEY is never shipped to the client.
import express from 'express';
import { ensureAuthenticated } from '../config/passport.js';
import { tmdbFetch, releaseYear } from '../tmdb.js';

const router = express.Router();

// Only logged-in users can search, so this cannot be used as an open proxy that
// burns through the project's TMDB quota.
router.use(ensureAuthenticated);

// SEARCH: GET /api/catalog/search?q=... — drives the type-ahead. Deliberately
// lean: TMDB's search payload has no runtime, so the client fetches details
// only for the one title the user actually picks.
router.get('/search', async (req, res, next) => {
  try {
    const query = (req.query.q || '').trim();
    if (query.length < 2) return res.json({ results: [] });

    const data = await tmdbFetch('/search/movie', {
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

    const movie = await tmdbFetch(`/movie/${tmdbId}`, { language: 'en-US' });

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

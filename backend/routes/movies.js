// US-01: Personal watchlist management — full CRUD on the "movies" collection.
// Every movie belongs to the logged-in user (scoped by userId).
import express from 'express';
import { ObjectId } from 'mongodb';
import { moviesCollection } from '../db.js';
import { ensureAuthenticated } from '../config/passport.js';

const router = express.Router();

// All watchlist routes require a logged-in user.
router.use(ensureAuthenticated);

const MOOD_OPTIONS = ['cozy', 'intense', 'background noise', 'scary', 'funny'];

// Validate and normalize the incoming movie payload.
function parseMoviePayload(body) {
  const title = (body.title || '').trim();
  const genre = (body.genre || '').trim();
  const platform = (body.platform || '').trim();
  const runtime = Number.parseInt(body.runtime, 10);
  const watched = Boolean(body.watched);

  const moodTags = Array.isArray(body.moodTags)
    ? body.moodTags
        .map((tag) => String(tag).toLowerCase().trim())
        .filter((tag) => MOOD_OPTIONS.includes(tag))
    : [];

  const errors = [];
  if (!title) errors.push('Title is required.');
  if (!genre) errors.push('Genre is required.');
  if (Number.isNaN(runtime) || runtime <= 0) {
    errors.push('Runtime must be a positive number of minutes.');
  }

  return {
    errors,
    movie: { title, genre, platform, runtime, watched, moodTags },
  };
}

// READ (list): GET /api/movies — the current user's watchlist, newest first.
router.get('/', async (req, res, next) => {
  try {
    const movies = await moviesCollection()
      .find({ userId: new ObjectId(req.user._id) })
      .sort({ createdAt: -1 })
      .toArray();
    res.json({ movies });
  } catch (err) {
    next(err);
  }
});

// READ (one): GET /api/movies/:id
router.get('/:id', async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid movie id.' });
    }
    const movie = await moviesCollection().findOne({
      _id: new ObjectId(req.params.id),
      userId: new ObjectId(req.user._id),
    });
    if (!movie) return res.status(404).json({ error: 'Movie not found.' });
    res.json({ movie });
  } catch (err) {
    next(err);
  }
});

// CREATE: POST /api/movies
router.post('/', async (req, res, next) => {
  try {
    const { errors, movie } = parseMoviePayload(req.body);
    if (errors.length) return res.status(400).json({ error: errors.join(' ') });

    const doc = {
      ...movie,
      userId: new ObjectId(req.user._id),
      createdAt: new Date(),
    };
    const result = await moviesCollection().insertOne(doc);
    res.status(201).json({ movie: { ...doc, _id: result.insertedId } });
  } catch (err) {
    next(err);
  }
});

// UPDATE: PUT /api/movies/:id
router.put('/:id', async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid movie id.' });
    }
    const { errors, movie } = parseMoviePayload(req.body);
    if (errors.length) return res.status(400).json({ error: errors.join(' ') });

    const result = await moviesCollection().findOneAndUpdate(
      {
        _id: new ObjectId(req.params.id),
        userId: new ObjectId(req.user._id),
      },
      { $set: movie },
      { returnDocument: 'after' }
    );
    if (!result) return res.status(404).json({ error: 'Movie not found.' });
    res.json({ movie: result });
  } catch (err) {
    next(err);
  }
});

// DELETE: DELETE /api/movies/:id
router.delete('/:id', async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid movie id.' });
    }
    const result = await moviesCollection().deleteOne({
      _id: new ObjectId(req.params.id),
      userId: new ObjectId(req.user._id),
    });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Movie not found.' });
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;

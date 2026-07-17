// US-02: Create and configure a Movie Night Session.
// A session gathers candidate movies from the host's (and invited friends') watchlists, optionally narrowed by a mood filter or max runtime.
import express from 'express';
import { ObjectId } from 'mongodb';
import {
  sessionsCollection,
  moviesCollection,
  usersCollection,
} from '../db.js';
import { ensureAuthenticated } from '../config/passport.js';

const router = express.Router();

router.use(ensureAuthenticated);

// Turn a watchlist movie document into a session candidate snapshot.
function toCandidate(movie) {
  return {
    movieId: movie._id,
    title: movie.title,
    genre: movie.genre,
    moodTags: movie.moodTags || [],
    runtime: movie.runtime,
    platform: movie.platform,
    ownerId: movie.userId,
  };
}

// CREATE: POST /api/sessions — configure a new movie night. (US-02)
router.post('/', async (req, res, next) => {
  try {
    const hostId = new ObjectId(req.user._id);
    const title = (req.body.title || '').trim() || 'Movie Night';
    const moodFilter = (req.body.moodFilter || '').toLowerCase().trim();
    const maxRuntime = Number.parseInt(req.body.maxRuntime, 10);
    const invitedUsernames = Array.isArray(req.body.invited)
      ? req.body.invited
          .map((u) => String(u).toLowerCase().trim())
          .filter(Boolean)
      : [];

    // Resolve invited usernames to real users (silently skip unknown ones).
    const invitedUsers = invitedUsernames.length
      ? await usersCollection()
          .find({ username: { $in: invitedUsernames } })
          .project({ passwordHash: 0 })
          .toArray()
      : [];

    const participantIds = [hostId, ...invitedUsers.map((u) => u._id)];

    // Build the candidate pool from every participant's watchlist.
    const movieQuery = {
      userId: { $in: participantIds },
      watched: false,
    };
    if (moodFilter) {
      movieQuery.moodTags = moodFilter;
    }
    if (!Number.isNaN(maxRuntime) && maxRuntime > 0) {
      movieQuery.runtime = { $lte: maxRuntime };
    }

    const movies = await moviesCollection()
      .find(movieQuery)
      .limit(50)
      .toArray();
    const candidates = movies.map(toCandidate);
    const participants = [
      { userId: hostId, username: req.user.username },
      ...invitedUsers.map((u) => ({ userId: u._id, username: u.username })),
    ];
    const votes = {};
    candidates.forEach((candidate) => {
      votes[candidate.movieId] = {}; // if userId1 votes for a movie, it will be recorded as: { userId1: true }
    });

    const now = new Date();
    const sessionDoc = {
      title,
      hostId,
      hostName: req.user.displayName || req.user.username,
      participants,
      moodFilter: moodFilter || null,
      maxRuntime:
        !Number.isNaN(maxRuntime) && maxRuntime > 0 ? maxRuntime : null,
      candidates,
      votes,
      winningPick: null,
      status: 'open',
      createdAt: now,
    };

    const result = await sessionsCollection().insertOne(sessionDoc);
    res
      .status(201)
      .json({ session: { ...sessionDoc, _id: result.insertedId } });
  } catch (err) {
    next(err);
  }
});

// READ (list): GET /api/sessions — sessions the current user hosts or joined.
// Doubles as the "movie night history log" for past sessions.
router.get('/', async (req, res, next) => {
  try {
    const userId = new ObjectId(req.user._id);
    const sessions = await sessionsCollection()
      .find({ 'participants.userId': userId })
      .sort({ createdAt: -1 })
      .toArray();
    res.json({ sessions });
  } catch (err) {
    next(err);
  }
});

// READ (one): GET /api/sessions/:id
router.get('/:id', async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid session id.' });
    }
    const session = await sessionsCollection().findOne({
      _id: new ObjectId(req.params.id),
    });
    if (!session) return res.status(404).json({ error: 'Session not found.' });
    res.json({ session });
  } catch (err) {
    next(err);
  }
});

// DELETE: DELETE /api/sessions/:id — only the host may delete their session.
router.delete('/:id', async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid session id.' });
    }
    const result = await sessionsCollection().deleteOne({
      _id: new ObjectId(req.params.id),
      hostId: new ObjectId(req.user._id),
    });
    if (result.deletedCount === 0) {
      return res
        .status(404)
        .json({ error: 'Session not found or you are not the host.' });
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// UPDATE (vote): POST /api/sessions/:id/votes
router.post('/:id/votes', async (req, res, next) => {
  try {
    const sessionId = req.params.id;
    const { movieId, voteBool } = req.body;
    const userId = req.user._id.toString();
    if (!ObjectId.isValid(sessionId)) {
      return res.status(400).json({ error: 'Invalid session id.' });
    }
    if (!ObjectId.isValid(movieId)) {
      return res.status(400).json({ error: 'Invalid movie id.' });
    }
    if (typeof voteBool !== 'boolean') {
      return res.status(400).json({ error: 'voteBool must be true or false.' });
    }
    const sessionObjectId = new ObjectId(sessionId);
    const movieObjectId = new ObjectId(movieId);
    const voteField = `votes.${movieId}.${userId}`;
    let session = await sessionsCollection().findOneAndUpdate(
      {
        _id: sessionObjectId,
        status: 'open',
        'participants.userId': new ObjectId(userId),
        'candidates.movieId': movieObjectId,
      },
      {
        $set: {
          [voteField]: voteBool,
        },
      },
      {
        returnDocument: 'after',
      }
    );
    if (!session) {
      return res.status(404).json({
        error:
          'Session not found, session is closed, you are not a participant, or the movie is not a candidate.',
      });
    }
    const totalResponses = Object.values(session.votes ?? {}).reduce(
      (total, movieVotes) => total + Object.keys(movieVotes).length,
      0
    );
    const expectedResponses =
      session.participants.length * session.candidates.length;
    if (totalResponses >= expectedResponses) {
      let winningMovieId = null;
      let highestYesCount = -1;
      for (const [candidateMovieId, movieVotes] of Object.entries(
        session.votes ?? {}
      )) {
        const yesCount = Object.values(movieVotes).filter(
          (voteBool) => voteBool === true
        ).length;
        if (yesCount > highestYesCount) {
          highestYesCount = yesCount;
          winningMovieId = candidateMovieId;
        }
      }
      const winningMovie = session.candidates.find(
        (candidate) => candidate.movieId.toString() === winningMovieId
      );
      if (!winningMovie) {
        return res.status(500).json({
          error: 'Winning movie not found in candidate list.',
        });
      }
      const finalizedSession = await sessionsCollection().findOneAndUpdate(
        {
          _id: sessionObjectId,
          status: 'open',
          winningPick: null,
        },
        {
          $set: {
            winningPick: winningMovie,
            status: 'closed',
          },
        },
        {
          returnDocument: 'after',
        }
      );
      if (finalizedSession) {
        session = finalizedSession;
      } else {
        session = await sessionsCollection().findOne({
          _id: sessionObjectId,
        });
      }
    }
    res.json({ session });
  } catch (err) {
    next(err);
  }
});

// UPDATE (setWinner): PATCH /api/sessions/:id/winner
// Only the host may replace the winning pick.
router.patch('/:id/winner', async (req, res, next) => {
  try {
    const sessionId = req.params.id;
    const { movieId } = req.body;
    if (!ObjectId.isValid(sessionId)) {
      return res.status(400).json({ error: 'Invalid session id.' });
    }
    if (!ObjectId.isValid(movieId)) {
      return res.status(400).json({ error: 'Invalid movie id.' });
    }
    const sessionObjectId = new ObjectId(sessionId);
    const movieObjectId = new ObjectId(movieId);
    const hostId = new ObjectId(req.user._id);
    const session = await sessionsCollection().findOne({
      _id: sessionObjectId,
      hostId,
    });
    if (!session) {
      return res.status(404).json({
        error: 'Session not found or you are not the host.',
      });
    }
    if (session.status !== 'closed' || !session.winningPick) {
      return res.status(400).json({
        error: 'Voting must be finished before spinning the wheel.',
      });
    }
    const selectedMovie = session.candidates.find(
      (candidate) => candidate.movieId.toString() === movieObjectId.toString()
    );
    if (!selectedMovie) {
      return res.status(400).json({
        error: 'Selected movie is not a candidate in this session.',
      });
    }
    const yesVoteCount = Object.values(session.votes?.[movieId] ?? {}).filter(
      (vote) => vote === true
    ).length;
    if (yesVoteCount === 0) {
      return res.status(400).json({
        error: 'A movie with zero votes cannot win the wheel.',
      });
    }
    const updatedSession = await sessionsCollection().findOneAndUpdate(
      {
        _id: sessionObjectId,
        hostId,
      },
      {
        $set: {
          winningPick: selectedMovie,
        },
      },
      {
        returnDocument: 'after',
      }
    );
    res.json({ session: updatedSession });
  } catch (err) {
    next(err);
  }
});

export default router;

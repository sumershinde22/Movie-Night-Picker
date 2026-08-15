// US-01: Personal watchlist manager. Orchestrates the full CRUD flow — listing movies, and creating / editing / deleting them via MovieForm and MovieCard child components.
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { moviesApi } from '../api.js';
import MovieForm from './MovieForm.jsx';
import MovieCard from './MovieCard.jsx';
import './Watchlist.css';

function Watchlist() {
  const [movies, setMovies] = useState([]);
  const [editing, setEditing] = useState(null); // movie being edited, or null
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  // Usability study: a participant deleted a movie, asked "is there a way to
  // undo?", and rated reversibility 2/7. Keep the last deletion recoverable.
  const [lastDeleted, setLastDeleted] = useState(null);

  const loadMovies = useCallback(async () => {
    setLoading(true);
    try {
      const data = await moviesApi.list();
      setMovies(data.movies);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMovies();
  }, [loadMovies]);

  // Create or update depending on whether we're editing an existing movie.
  async function handleSave(payload) {
    if (editing) {
      await moviesApi.update(editing._id, payload);
    } else {
      await moviesApi.create(payload);
    }
    setEditing(null);
    await loadMovies();
  }

  async function handleDelete(movie) {
    try {
      await moviesApi.remove(movie._id);
      setMovies((prev) => prev.filter((m) => m._id !== movie._id));
      setLastDeleted(movie);
    } catch (err) {
      setError(err.message);
    }
  }

  // There is no soft delete on the server, so "undo" re-adds the movie from the
  // copy we kept. The entry comes back with a new id, which is invisible here.
  async function handleUndoDelete() {
    try {
      await moviesApi.create({
        title: lastDeleted.title,
        genre: lastDeleted.genre,
        runtime: lastDeleted.runtime,
        platform: lastDeleted.platform,
        moodTags: lastDeleted.moodTags || [],
        watched: Boolean(lastDeleted.watched),
      });
      setLastDeleted(null);
      await loadMovies();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="watchlist">
      <h2>My Watchlist</h2>
      <p className="watchlist-sub">
        Add movies you want to watch, tag them with a mood, and mark them
        watched. These become the candidate pool for your movie nights.
      </p>

      {/* Usability study: 2 of 3 participants could not find their way from the
          watchlist to creating a movie night, so step 2 is signposted here. */}
      <Link to="/sessions" className="watchlist-next-step">
        <span>
          <strong>Ready to watch with friends?</strong> Start a movie night and
          vote on what to watch together.
        </span>
        <span className="watchlist-next-step-cta">Start a movie night →</span>
      </Link>

      {error && <div className="error-banner">{error}</div>}

      {lastDeleted && (
        <div className="watchlist-undo">
          <span>
            Removed <strong>{lastDeleted.title}</strong> from your watchlist.
          </span>
          <div className="watchlist-undo-actions">
            <button type="button" className="secondary" onClick={handleUndoDelete}>
              Undo
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => setLastDeleted(null)}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <MovieForm
        key={editing ? editing._id : 'new'}
        initialMovie={editing}
        onSave={handleSave}
        onCancel={editing ? () => setEditing(null) : null}
      />

      {loading ? (
        <p>Loading your watchlist…</p>
      ) : movies.length === 0 ? (
        <p className="watchlist-empty">
          Your watchlist is empty. Add your first movie above!
        </p>
      ) : (
        <div className="watchlist-grid">
          {movies.map((movie) => (
            <MovieCard
              key={movie._id}
              movie={movie}
              onEdit={() => setEditing(movie)}
              onDelete={() => handleDelete(movie)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default Watchlist;

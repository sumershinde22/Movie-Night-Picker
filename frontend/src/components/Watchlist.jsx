// US-01: Personal watchlist manager. Orchestrates the full CRUD flow — listing movies, and creating / editing / deleting them via MovieForm and MovieCard child components.
import { useState, useEffect, useCallback } from 'react';
import { moviesApi } from '../api.js';
import MovieForm from './MovieForm.jsx';
import MovieCard from './MovieCard.jsx';
import './Watchlist.css';

function Watchlist() {
  const [movies, setMovies] = useState([]);
  const [editing, setEditing] = useState(null); // movie being edited, or null
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

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

  async function handleDelete(id) {
    try {
      await moviesApi.remove(id);
      setMovies((prev) => prev.filter((m) => m._id !== id));
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

      {error && <div className="error-banner">{error}</div>}

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
              onDelete={() => handleDelete(movie._id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default Watchlist;

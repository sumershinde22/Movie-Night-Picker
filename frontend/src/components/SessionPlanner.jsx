// US-02: Movie Night planner. Lets a host configure a new session (inviting
// friends and applying a mood filter) and shows their session history — which
// doubles as the movie-night history log.
import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { sessionsApi } from '../api.js';
import SessionForm from './SessionForm.jsx';
import SessionCard from './SessionCard.jsx';
import './SessionPlanner.css';

function SessionPlanner({ user }) {
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await sessionsApi.list();
      setSessions(data.sessions);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  async function handleCreate(payload) {
    await sessionsApi.create(payload);
    await loadSessions();
  }

  async function handleDelete(id) {
    try {
      await sessionsApi.remove(id);
      setSessions((prev) => prev.filter((s) => s._id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="session-planner">
      <h2>Movie Nights</h2>
      <p className="session-planner-sub">
        Start a movie night, invite friends by username, and pull candidate
        movies from everyone&apos;s watchlists — optionally narrowed by mood.
      </p>

      {error && <div className="error-banner">{error}</div>}

      <SessionForm onCreate={handleCreate} />

      <h3 className="session-planner-heading">Your movie night history</h3>
      {loading ? (
        <p>Loading sessions…</p>
      ) : sessions.length === 0 ? (
        <p className="session-planner-empty">
          No movie nights yet. Create your first one above!
        </p>
      ) : (
        <div className="session-list">
          {sessions.map((session) => (
            <SessionCard
              key={session._id}
              session={session}
              currentUserId={user._id}
              onDelete={() => handleDelete(session._id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

SessionPlanner.propTypes = {
  user: PropTypes.shape({
    _id: PropTypes.string.isRequired,
  }).isRequired,
};

export default SessionPlanner;

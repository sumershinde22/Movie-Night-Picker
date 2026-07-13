// Displays one movie night session: its participants, mood filter, candidate movies, and the winning pick if one has been chosen.
import PropTypes from 'prop-types';
import './SessionCard.css';

function SessionCard({ session, currentUserId, onDelete }) {
  const isHost = session.hostId === currentUserId;
  const created = new Date(session.createdAt).toLocaleDateString();

  return (
    <article className="session-card">
      <header className="session-card-head">
        <div>
          <h4 className="session-card-title">{session.title}</h4>
          <p className="session-card-meta">
            Hosted by {session.hostName} · {created} ·{' '}
            <span className={`session-status status-${session.status}`}>
              {session.status}
            </span>
          </p>
        </div>
        {isHost && (
          <button type="button" className="danger" onClick={onDelete}>
            Delete
          </button>
        )}
      </header>

      <p className="session-card-line">
        <strong>Participants:</strong>{' '}
        {session.participants.map((p) => p.username).join(', ')}
      </p>
      {session.moodFilter && (
        <p className="session-card-line">
          <strong>Mood filter:</strong> {session.moodFilter}
        </p>
      )}
      {session.winningPick && (
        <p className="session-card-winner">
          🏆 Winner: {session.winningPick.title}
        </p>
      )}

      <details className="session-card-candidates">
        <summary>{session.candidates.length} candidate movies</summary>
        {session.candidates.length === 0 ? (
          <p className="session-card-empty">
            No movies matched the filters. Add movies to your watchlist first.
          </p>
        ) : (
          <ul>
            {session.candidates.map((c) => (
              <li key={c.movieId}>
                {c.title}{' '}
                <span className="session-card-candidate-meta">
                  ({c.runtime} min · {c.platform})
                </span>
              </li>
            ))}
          </ul>
        )}
      </details>
    </article>
  );
}

SessionCard.propTypes = {
  session: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    hostId: PropTypes.string.isRequired,
    hostName: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    createdAt: PropTypes.string.isRequired,
    moodFilter: PropTypes.string,
    participants: PropTypes.arrayOf(
      PropTypes.shape({ username: PropTypes.string.isRequired })
    ).isRequired,
    candidates: PropTypes.arrayOf(
      PropTypes.shape({
        movieId: PropTypes.string.isRequired,
        title: PropTypes.string.isRequired,
        runtime: PropTypes.number,
        platform: PropTypes.string,
      })
    ).isRequired,
    winningPick: PropTypes.shape({ title: PropTypes.string }),
  }).isRequired,
  currentUserId: PropTypes.string.isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default SessionCard;

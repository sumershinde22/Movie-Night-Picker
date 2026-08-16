// Displays a single watchlist movie with edit and delete actions.
import { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import './MovieCard.css';
import { MOVIE_CARD_TYPE } from '../enums';

const noop = () => {};

function MovieCard({
  movie,
  onEdit = noop,
  onDelete = noop,
  onVoteNo = noop,
  onVoteYes = noop,
  type = MOVIE_CARD_TYPE.MOVIE_CARD_EDIT,
}) {
  const [confirming, setConfirming] = useState(false);
  const confirmRef = useRef(null);
  const deleteRef = useRef(null);

  // Delete is replaced by Confirm/Cancel in place. Without this, the element
  // holding focus unmounts and focus falls back to <body>, stranding keyboard
  // users. Move focus onto the control that replaced it, and back on cancel.
  const wasConfirming = useRef(false);
  useEffect(() => {
    if (confirming && !wasConfirming.current) {
      confirmRef.current?.focus();
    } else if (!confirming && wasConfirming.current) {
      deleteRef.current?.focus();
    }
    wasConfirming.current = confirming;
  }, [confirming]);

  const movieCardEditActions =
    type === MOVIE_CARD_TYPE.MOVIE_CARD_EDIT ? (
      <div className="movie-card-actions">
        <button type="button" className="neutral_cta" onClick={onEdit}>
          Edit<span className="visually-hidden"> {movie.title}</span>
        </button>
        {confirming ? (
          <>
            <button
              type="button"
              className="danger"
              onClick={onDelete}
              ref={confirmRef}
            >
              {/* The watchlist renders one of these per card, so without the
                  title every Confirm/Cancel button has an identical accessible
                  name and a screen reader user cannot tell which film they are
                  about to delete. The visible label stays short. */}
              Confirm Delete
              <span className="visually-hidden"> of {movie.title}</span>
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => setConfirming(false)}
            >
              Cancel Delete
              <span className="visually-hidden"> of {movie.title}</span>
            </button>
          </>
        ) : (
          <button
            type="button"
            className="danger"
            onClick={() => setConfirming(true)}
            ref={deleteRef}
          >
            Delete<span className="visually-hidden"> {movie.title}</span>
          </button>
        )}
      </div>
    ) : null;

  const movieCardVoteActions =
    type === MOVIE_CARD_TYPE.MOVIE_CARD_VOTE ? (
      <div className="movie-card-actions">
        <button type="button" className="danger" onClick={onVoteNo}>
          Skip<span className="visually-hidden"> {movie.title}</span>
          <span aria-hidden="true"> ❌</span>
        </button>
        <button type="button" className="success" onClick={onVoteYes}>
          Watch<span className="visually-hidden"> {movie.title}</span>
          <span aria-hidden="true"> ✅</span>
        </button>
      </div>
    ) : null;

  return (
    <article className={`movie-card ${movie.watched ? 'is-watched' : ''}`}>
      <header className="movie-card-head">
        <h3 className="movie-card-title">{movie.title}</h3>
        {movie.watched && <span className="movie-card-badge">Watched</span>}
      </header>

      <p className="movie-card-meta">
        {movie.genre} · {movie.runtime} min · {movie.platform}
      </p>

      {movie.moodTags && movie.moodTags.length > 0 && (
        <ul className="movie-card-moods">
          {movie.moodTags.map((mood) => (
            <li key={mood} className="movie-card-mood">
              {mood}
            </li>
          ))}
        </ul>
      )}
      {movieCardEditActions}
      {movieCardVoteActions}
    </article>
  );
}

MovieCard.propTypes = {
  // Watchlist entries arrive with _id; session candidates are snapshots keyed
  // by movieId. This component renders neither, so neither is required.
  movie: PropTypes.shape({
    title: PropTypes.string.isRequired,
    genre: PropTypes.string.isRequired,
    runtime: PropTypes.number.isRequired,
    platform: PropTypes.string,
    moodTags: PropTypes.arrayOf(PropTypes.string),
    watched: PropTypes.bool,
  }).isRequired,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  onVoteNo: PropTypes.func,
  onVoteYes: PropTypes.func,
  type: PropTypes.oneOf(Object.values(MOVIE_CARD_TYPE)),
};

export default MovieCard;

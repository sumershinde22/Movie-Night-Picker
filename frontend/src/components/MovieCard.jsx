// Displays a single watchlist movie with edit and delete actions.
import { useState } from 'react';
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

  const movieCardEditActions =
    type === MOVIE_CARD_TYPE.MOVIE_CARD_EDIT ? (
      <div className="movie-card-actions">
        <button type="button" className="secondary" onClick={onEdit}>
          Edit
        </button>
        {confirming ? (
          <>
            <button type="button" className="danger" onClick={onDelete}>
              Confirm
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => setConfirming(false)}
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            className="danger"
            onClick={() => setConfirming(true)}
          >
            Delete
          </button>
        )}
      </div>
    ) : null;

  const movieCardVoteActions =
    type === MOVIE_CARD_TYPE.MOVIE_CARD_VOTE ? (
      <div className="movie-card-actions">
        <button type="button" className="danger" onClick={onVoteNo}>
          Skip ❌
        </button>
        <button type="button" className="success" onClick={onVoteYes}>
          Watch ✅
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
  movie: PropTypes.shape({
    _id: PropTypes.string.isRequired,
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
};

export default MovieCard;

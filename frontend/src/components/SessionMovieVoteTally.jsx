// A single row in the live vote tally: a movie name and its current vote count.
import PropTypes from 'prop-types';
import './SessionMovieVoteTally.css';

function SessionMovieVoteTally({ movieName, numVotes }) {
  return (
    <div className="session_movie_vote_tally">
      <div className="session_movie_vote_tally--name">{movieName}</div>
      <div className="session_movie_vote_tally--num_votes">
        {numVotes} vote{numVotes === 1 ? '' : 's'}
      </div>
    </div>
  );
}

SessionMovieVoteTally.propTypes = {
  movieName: PropTypes.string.isRequired,
  numVotes: PropTypes.number.isRequired,
};

export default SessionMovieVoteTally;

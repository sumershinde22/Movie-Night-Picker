// US-03: Session UI. Allows users to engage with a movie night session, cast and see votes, and see the eventual winner.
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import { sessionsApi } from '../api.js';
import './Session.css';
import MovieCard from './MovieCard.jsx';
import { MOVIE_CARD_TYPE } from '../enums.js';

const SessionMovieVoteTally = ({ movieName, numVotes }) => {
  return (
    <div className="session_movie_vote_tally">
      <div className="session_movie_vote_tally--name">{movieName}</div>
      <div className="session_movie_vote_tally--num_votes">
        {numVotes} vote{numVotes == 1 ? '' : 's'}
      </div>
    </div>
  );
};

function Session({ user }) {
  const [session, setSession] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const { id } = useParams();

  const loadSession = useCallback(
    async ({ showLoading = false } = {}) => {
      if (showLoading) {
        setLoading(true);
      }
      try {
        const data = await sessionsApi.one(id);
        setSession(data.session);
        setError('');
      } catch (err) {
        setError(err.message);
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    [id, user._id]
  );

  useEffect(() => {
    loadSession({ showLoading: true });
    const pollingInterval = setInterval(() => {
      loadSession();
    }, 5000);
    return () => {
      clearInterval(pollingInterval);
    };
  }, [loadSession]);

  const activeMovie =
    session?.candidates.find(
      (movie) => session.votes?.[movie.movieId]?.[user._id] === undefined
    ) ?? null;
  const numVotesCast = session
    ? Object.values(session.votes).reduce(
        (acc, movieVotes) => acc + Object.keys(movieVotes).length,
        0
      )
    : 0;
  const numMaxVotes = session
    ? session.candidates.length * session.participants.length
    : 0;

  const handleVote = async (voteBool) => {
    try {
      const data = await sessionsApi.vote(id, activeMovie.movieId, voteBool);
      setSession(data.session);
    } catch (err) {
      setError(err.message);
    }
  };

  console.log(session);
  console.log('active movie', activeMovie);

  return (
    <div className="session">
      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <p>Loading session…</p>
      ) : (
        <>
          <h2>{session.hostName}'s Movie Night</h2>
          <p className="session-sub">
            Vote for the movies you want to see! (tallies will update every 5s)
          </p>
          <div className="session_content">
            <div className="session_vote_cast">
              {activeMovie ? (
                <MovieCard
                  movie={activeMovie}
                  onVoteNo={() => handleVote(false)}
                  onVoteYes={() => handleVote(true)}
                  type={MOVIE_CARD_TYPE.MOVIE_CARD_VOTE}
                />
              ) : (
                <div className="movie-card-finished-voting movie-card">
                  <div>You have finished voting!</div>
                </div>
              )}
            </div>
            <div className="session_vote_tallies">
              {session.candidates.map((candidate) => (
                <SessionMovieVoteTally
                  key={candidate.movieId}
                  movieName={candidate.title}
                  numVotes={
                    Object.values(
                      session.votes?.[candidate.movieId] ?? {}
                    ).filter(Boolean).length
                  }
                />
              ))}
            </div>
          </div>
          <div className="session_summary">
            {session.winningPick
              ? `Voting has finished! The winner: ${session.winningPick.title}`
              : `Voting in progress! Number of votes cast: (${numVotesCast}/${numMaxVotes})`}
          </div>
        </>
      )}
    </div>
  );
}

Session.propTypes = {
  user: PropTypes.shape({
    _id: PropTypes.string.isRequired,
  }).isRequired,
};

export default Session;

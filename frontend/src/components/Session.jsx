// US-03: Session UI. Allows users to engage with a movie night session, cast and see votes, and see the eventual winner.
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import { sessionsApi } from '../api.js';
import './Session.css';
import MovieCard from './MovieCard.jsx';
import { MOVIE_CARD_TYPE } from '../enums.js';
import SessionWeightedMovieWheel from './SessionWeightedMovieWheel.jsx';
import SessionMovieVoteTally from './SessionMovieVoteTally.jsx';

function Session({ user }) {
  const [session, setSession] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [showWheel, setShowWheel] = useState(false);
  const [winnerDecisionFinished, setWinnerDecisionFinished] = useState(false);

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

  const isHost = session && String(session.hostId) === String(user._id);
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
  const weightedWheelMovies = session
    ? session.candidates
        .map((candidate) => ({
          ...candidate,
          voteCount: Object.values(
            session.votes?.[candidate.movieId] ?? {}
          ).filter((vote) => vote === true).length,
        }))
        .filter((candidate) => candidate.voteCount > 0)
    : [];

  const handleWheelWinner = (movie) => {
    setTimeout(async () => {
      try {
        const data = await sessionsApi.setWinner(id, movie.movieId);
        setSession(data.session);
        setWinnerDecisionFinished(true);
        setError('');
      } catch (err) {
        setError(err.message);
        throw err;
      }
    }, 2000); // 2000ms is how long it takes the wheel to finish animating after it stops spinning.
  };

  const handleVote = async (voteBool) => {
    try {
      const data = await sessionsApi.vote(id, activeMovie.movieId, voteBool);
      setSession(data.session);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="session">
      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <p>Loading session…</p>
      ) : (
        <>
          <h2>{session.hostName}'s Movie Night</h2>
          <p className="session-sub">
            Vote for the movies you want to see! (tallies will update every 5s)
          </p>
          <article className="session_content">
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
          </article>
          <article className="session_summary">
            {session.winningPick ? (
              <>
                <p className="session_final_choice">
                  Voting has finished! The winner: {session.winningPick.title}
                </p>
                {isHost && !showWheel && !winnerDecisionFinished && (
                  <div className="session_winner_options">
                    <p>
                      Visible to you only as the host:
                      <br />
                      Keep this result, or let a random wheel select a new
                      winner? Only movies that received votes will be included
                      in the wheel.
                    </p>
                    <div className="session_winner_option_buttons">
                      <button
                        type="button"
                        className="success"
                        onClick={() => setWinnerDecisionFinished(true)}
                      >
                        Keep this result
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => setShowWheel(true)}
                      >
                        Spin the wheel!
                      </button>
                    </div>
                  </div>
                )}
                {isHost && showWheel && !winnerDecisionFinished && (
                  <SessionWeightedMovieWheel
                    movies={weightedWheelMovies}
                    onWinnerSelected={handleWheelWinner}
                  />
                )}
                {isHost && showWheel && winnerDecisionFinished && (
                  <p className="session_final_choice">
                    The wheel has chosen a new winner:{' '}
                    {session.winningPick.title}!
                  </p>
                )}
              </>
            ) : (
              `Voting in progress! Number of votes cast: (${numVotesCast}/${numMaxVotes})`
            )}
          </article>
        </>
      )}
    </section>
  );
}

Session.propTypes = {
  user: PropTypes.shape({
    _id: PropTypes.string.isRequired,
  }).isRequired,
};

export default Session;

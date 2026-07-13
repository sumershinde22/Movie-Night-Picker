// US-02: Configure and create a new Movie Night Session.
import { useState } from 'react';
import PropTypes from 'prop-types';
import { MOOD_OPTIONS } from './MovieForm.jsx';
import './SessionForm.css';

function SessionForm({ onCreate }) {
  const [title, setTitle] = useState('');
  const [invited, setInvited] = useState('');
  const [moodFilter, setMoodFilter] = useState('');
  const [maxRuntime, setMaxRuntime] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      // Turn the comma/space separated usernames into a clean array.
      const invitedList = invited
        .split(/[,\s]+/)
        .map((u) => u.trim())
        .filter(Boolean);
      await onCreate({
        title: title.trim(),
        invited: invitedList,
        moodFilter,
        maxRuntime: maxRuntime ? Number(maxRuntime) : null,
      });
      setTitle('');
      setInvited('');
      setMoodFilter('');
      setMaxRuntime('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="session-form" onSubmit={handleSubmit}>
      <h3>Start a movie night</h3>

      {error && <div className="error-banner">{error}</div>}

      <div className="session-form-grid">
        <div>
          <label htmlFor="session-title">Session name</label>
          <input
            id="session-title"
            placeholder="Friday Horror Night"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="session-invited">Invite friends (usernames)</label>
          <input
            id="session-invited"
            placeholder="alice, bob"
            value={invited}
            onChange={(e) => setInvited(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="session-mood">Mood filter</label>
          <select
            id="session-mood"
            value={moodFilter}
            onChange={(e) => setMoodFilter(e.target.value)}
          >
            <option value="">Any mood</option>
            {MOOD_OPTIONS.map((mood) => (
              <option key={mood} value={mood}>
                {mood}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="session-runtime">Max runtime (min, optional)</label>
          <input
            id="session-runtime"
            type="number"
            min="1"
            placeholder="e.g. 100 for something short"
            value={maxRuntime}
            onChange={(e) => setMaxRuntime(e.target.value)}
          />
        </div>
      </div>

      <button type="submit" disabled={busy}>
        {busy ? 'Creating…' : 'Create movie night'}
      </button>
    </form>
  );
}

SessionForm.propTypes = {
  onCreate: PropTypes.func.isRequired,
};

export default SessionForm;

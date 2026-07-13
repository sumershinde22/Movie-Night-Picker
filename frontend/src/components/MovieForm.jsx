// Reusable form for adding a new movie or editing an existing one.
// Controlled inputs via React hooks. Shared mood options keep tags consistent.
import { useState } from 'react';
import PropTypes from 'prop-types';
import './MovieForm.css';

export const MOOD_OPTIONS = [
  'cozy',
  'intense',
  'background noise',
  'scary',
  'funny',
];

const PLATFORM_OPTIONS = [
  'Netflix',
  'Hulu',
  'Disney+',
  'Max',
  'Prime Video',
  'Apple TV+',
  'Peacock',
  'Paramount+',
];

const EMPTY = {
  title: '',
  genre: '',
  runtime: '',
  platform: PLATFORM_OPTIONS[0],
  moodTags: [],
  watched: false,
};

function MovieForm({ initialMovie, onSave, onCancel }) {
  const [form, setForm] = useState(
    initialMovie
      ? {
          title: initialMovie.title || '',
          genre: initialMovie.genre || '',
          runtime: initialMovie.runtime || '',
          platform: initialMovie.platform || PLATFORM_OPTIONS[0],
          moodTags: initialMovie.moodTags || [],
          watched: Boolean(initialMovie.watched),
        }
      : EMPTY
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleMood(mood) {
    setForm((prev) => ({
      ...prev,
      moodTags: prev.moodTags.includes(mood)
        ? prev.moodTags.filter((m) => m !== mood)
        : [...prev.moodTags, mood],
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await onSave({ ...form, runtime: Number(form.runtime) });
      if (!initialMovie) setForm(EMPTY); // reset only when adding
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="movie-form" onSubmit={handleSubmit}>
      <h3>{initialMovie ? 'Edit movie' : 'Add a movie'}</h3>

      {error && <div className="error-banner">{error}</div>}

      <div className="movie-form-grid">
        <div>
          <label htmlFor="title">Title</label>
          <input
            id="title"
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="genre">Genre</label>
          <input
            id="genre"
            value={form.genre}
            onChange={(e) => update('genre', e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="runtime">Runtime (minutes)</label>
          <input
            id="runtime"
            type="number"
            min="1"
            value={form.runtime}
            onChange={(e) => update('runtime', e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="platform">Streaming platform</label>
          <select
            id="platform"
            value={form.platform}
            onChange={(e) => update('platform', e.target.value)}
          >
            {PLATFORM_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset className="movie-form-moods">
        <legend>Mood tags</legend>
        {MOOD_OPTIONS.map((mood) => (
          <label key={mood} className="mood-check">
            <input
              type="checkbox"
              checked={form.moodTags.includes(mood)}
              onChange={() => toggleMood(mood)}
            />
            {mood}
          </label>
        ))}
      </fieldset>

      <label className="mood-check">
        <input
          type="checkbox"
          checked={form.watched}
          onChange={(e) => update('watched', e.target.checked)}
        />
        Already watched
      </label>

      <div className="movie-form-actions">
        <button type="submit" disabled={busy}>
          {busy
            ? 'Saving…'
            : initialMovie
              ? 'Save changes'
              : 'Add to watchlist'}
        </button>
        {onCancel && (
          <button type="button" className="secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

MovieForm.propTypes = {
  initialMovie: PropTypes.shape({
    title: PropTypes.string,
    genre: PropTypes.string,
    runtime: PropTypes.number,
    platform: PropTypes.string,
    moodTags: PropTypes.arrayOf(PropTypes.string),
    watched: PropTypes.bool,
  }),
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func,
};

MovieForm.defaultProps = {
  initialMovie: null,
  onCancel: null,
};

export default MovieForm;

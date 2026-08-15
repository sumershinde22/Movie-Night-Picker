// Type-ahead lookup against the movie catalog, used to pre-fill the add form.
//
// Built as an ARIA combobox with a listbox popup rather than a div soup, so the
// whole thing works from the keyboard: Down/Up move through results, Enter
// picks, Escape closes. That matters because the rest of the app is keyboard
// operable and this is the first control most users will touch.
import { useState, useRef, useEffect, useId } from 'react';
import PropTypes from 'prop-types';
import { catalogApi } from '../api.js';
import './MovieSearch.css';

const DEBOUNCE_MS = 275;
const MIN_QUERY = 2;

function MovieSearch({ onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [status, setStatus] = useState(''); // 'searching' | 'error' | ''
  const [message, setMessage] = useState('');

  const listboxId = useId();
  const optionId = (i) => `${listboxId}-option-${i}`;
  // The popup only renders when there is something in it, so aria-expanded has
  // to track that, not just intent: claiming expanded with no listbox present
  // points assistive tech at an element that does not exist.
  const popupVisible = open && results.length > 0;

  const abortRef = useRef(null);
  const blurTimer = useRef(null);
  const skipNextSearch = useRef(false);

  // Debounced search. Every keystroke cancels the previous timer and aborts any
  // in-flight request, so only the latest query can populate the list.
  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return undefined;
    }

    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY) {
      abortRef.current?.abort();
      setResults([]);
      setOpen(false);
      setStatus('');
      setMessage('');
      return undefined;
    }

    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setStatus('searching');
      setMessage('Searching…');
      try {
        const data = await catalogApi.search(trimmed, controller.signal);
        setResults(data.results);
        setActiveIndex(-1);
        setOpen(true);
        setStatus('');
        setMessage(
          data.results.length
            ? `${data.results.length} result${data.results.length === 1 ? '' : 's'}. Use the arrow keys to review them.`
            : 'No matches. You can still type the details in yourself.'
        );
      } catch (err) {
        if (err.name === 'AbortError') return; // superseded by a newer keystroke
        setResults([]);
        setOpen(false);
        setStatus('error');
        setMessage(err.message);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(
    () => () => {
      abortRef.current?.abort();
      clearTimeout(blurTimer.current);
    },
    []
  );

  async function choose(result) {
    // Keep the chosen title in the box, but do not fire a fresh search for it.
    skipNextSearch.current = true;
    setQuery(result.title);
    setOpen(false);
    setResults([]);
    setActiveIndex(-1);
    setStatus('searching');
    setMessage(`Loading details for ${result.title}…`);

    try {
      const data = await catalogApi.details(result.tmdbId);
      onSelect(data.movie);
      setStatus('');
      setMessage(
        `Filled in ${data.movie.title}. Add a platform and mood tags to finish.`
      );
    } catch (err) {
      setStatus('error');
      setMessage(err.message);
    }
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    // This input sits inside the add-movie form, so a bare Enter would submit
    // it and trip validation on fields the user has not reached yet. Enter here
    // means "take the highlighted result", never "save the movie".
    if (event.key === 'Enter') {
      event.preventDefault();
      if (open && activeIndex >= 0) choose(results[activeIndex]);
      return;
    }

    if (!open || results.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
    }
  }

  return (
    <div className="movie-search">
      <label htmlFor={`${listboxId}-input`}>
        Search for a movie (optional), or manually input a movie below.
      </label>
      <div className="movie-search-control">
        <input
          id={`${listboxId}-input`}
          type="text"
          role="combobox"
          aria-expanded={popupVisible}
          aria-controls={`${listboxId}-listbox`}
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 ? optionId(activeIndex) : undefined
          }
          aria-describedby={`${listboxId}-hint`}
          autoComplete="off"
          placeholder="(optional search field) e.g. Everything Everywhere All at Once"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          // Delay so a click on an option is not cancelled by the blur.
          onBlur={() => {
            blurTimer.current = setTimeout(() => setOpen(false), 150);
          }}
        />

        {popupVisible && (
          <ul
            className="movie-search-results"
            id={`${listboxId}-listbox`}
            role="listbox"
            aria-label="Movie search results"
          >
            {results.map((result, index) => (
              <li
                key={result.tmdbId}
                id={optionId(index)}
                role="option"
                aria-selected={index === activeIndex}
                className={`movie-search-result${index === activeIndex ? ' is-active' : ''}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(result)}
              >
                <span className="movie-search-result-title">
                  {result.title}
                </span>
                {result.year && (
                  <span className="movie-search-result-year">
                    {result.year}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p
        id={`${listboxId}-hint`}
        className={`movie-search-hint${status === 'error' ? ' is-error' : ''}`}
        role="status"
      >
        {message || 'Pick a result and we will fill in the genre and runtime.'}
      </p>
    </div>
  );
}

MovieSearch.propTypes = {
  onSelect: PropTypes.func.isRequired,
};

export default MovieSearch;

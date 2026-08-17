// Shared TMDB client, used by the catalog API route and by the seed script.
// Uses the global fetch built into Node 18+, so there is no HTTP dependency.
const TMDB_BASE = 'https://api.themoviedb.org/3';
const DEFAULT_TIMEOUT_MS = 8000;

// TMDB issues two credential styles: a v3 key passed as a query parameter, and
// a v4 "API Read Access Token" (a JWT) passed as a bearer token. Accept either,
// so it works with whichever one the TMDB dashboard shows.
function credentialStyle(key) {
  const isReadAccessToken = key.startsWith('ey') && key.split('.').length === 3;
  return {
    headers: isReadAccessToken
      ? { Authorization: `Bearer ${key}`, accept: 'application/json' }
      : { accept: 'application/json' },
    usesQueryKey: !isReadAccessToken,
  };
}

export function hasTmdbKey() {
  return Boolean(process.env.TMDB_API_KEY);
}

export async function tmdbFetch(pathname, params = {}, options = {}) {
  const key = process.env.TMDB_API_KEY;
  if (!key) {
    const err = new Error('Movie search is not configured on this server.');
    err.status = 503;
    throw err;
  }

  const { headers, usesQueryKey } = credentialStyle(key);
  const url = new URL(`${TMDB_BASE}${pathname}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  if (usesQueryKey) url.searchParams.set('api_key', key);

  // Do not let a slow upstream hold a request open indefinitely.
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  );
  try {
    const response = await fetch(url, { headers, signal: controller.signal });

    // TMDB asks clients to back off on 429 rather than hammering.
    if (response.status === 429) {
      const retryAfter = Number(response.headers.get('retry-after')) || 1;
      const err = new Error('Movie search is rate limited right now.');
      err.status = 429;
      err.retryAfterMs = retryAfter * 1000;
      throw err;
    }

    if (!response.ok) {
      const err = new Error(
        response.status === 401
          ? 'Movie search credentials were rejected.'
          : 'Movie search is unavailable right now.'
      );
      err.status = response.status === 401 ? 503 : 502;
      throw err;
    }
    return await response.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      const timeout = new Error('Movie search timed out.');
      timeout.status = 504;
      throw timeout;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export const releaseYear = (date) =>
  typeof date === 'string' && date.length >= 4 ? date.slice(0, 4) : '';

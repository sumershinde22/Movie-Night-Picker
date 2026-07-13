// Thin wrapper around the Fetch API for talking to our backend.
// `credentials: 'include'` sends the session cookie so Passport knows who we are.
async function request(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  let data = null;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const message = data?.error || `Request failed (${response.status})`;
    throw new Error(message);
  }
  return data;
}

// --- Auth ----------------------------------------------------------------
export const authApi = {
  me: () => request('/api/auth/me'),
  register: (body) =>
    request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  login: (body) =>
    request('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
};

// --- Movies (US-01) ------------------------------------------------------
export const moviesApi = {
  list: () => request('/api/movies'),
  create: (body) =>
    request('/api/movies', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) =>
    request(`/api/movies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  remove: (id) => request(`/api/movies/${id}`, { method: 'DELETE' }),
};

// --- Sessions (US-02) ----------------------------------------------------
export const sessionsApi = {
  list: () => request('/api/sessions'),
  create: (body) =>
    request('/api/sessions', { method: 'POST', body: JSON.stringify(body) }),
  remove: (id) => request(`/api/sessions/${id}`, { method: 'DELETE' }),
};

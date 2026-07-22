// Login / register form. Toggles between the two modes with local state.
import { useState } from 'react';
import PropTypes from 'prop-types';
import { authApi } from '../api.js';
import './AuthForm.css';

function AuthForm({ onAuthed }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const isRegister = mode === 'register';

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data = isRegister
        ? await authApi.register({ username, password, displayName })
        : await authApi.login({ username, password });
      onAuthed(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-tabs">
        <button
          type="button"
          className={!isRegister ? '' : 'secondary'}
          onClick={() => setMode('login')}
        >
          Log In
        </button>
        <button
          type="button"
          className={isRegister ? '' : 'secondary'}
          onClick={() => setMode('register')}
        >
          Sign Up
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <form onSubmit={handleSubmit} className="auth-form">
        <div>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </div>

        {isRegister && (
          <div>
            <label htmlFor="displayName">Display name (optional)</label>
            <input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
        )}

        <div>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            required
          />
        </div>

        <button type="submit" disabled={busy}>
          {busy ? 'Please wait…' : isRegister ? 'Create account' : 'Log in'}
        </button>
      </form>

      {/* <p className="auth-hint">
        Try the demo account: <strong>demo</strong> / <strong>password</strong>
      </p> */}
    </div>
  );
}

AuthForm.propTypes = {
  onAuthed: PropTypes.func.isRequired,
};

export default AuthForm;

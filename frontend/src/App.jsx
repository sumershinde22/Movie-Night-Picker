// Top-level component: holds the authenticated-user state and wires up routing.
import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { authApi } from './api.js';
import Navbar from './components/Navbar.jsx';
import AuthForm from './components/AuthForm.jsx';
import Watchlist from './components/Watchlist.jsx';
import SessionPlanner from './components/SessionPlanner.jsx';
import Session from './components/Session.jsx';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On first load, ask the backend whether we already have a session.
  useEffect(() => {
    authApi
      .me()
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  if (loading) {
    return (
      <main className="page">
        <p role="status">Loading…</p>
      </main>
    );
  }

  // Unauthenticated users only see the login / register screen.
  if (!user) {
    return (
      <main className="page">
        <h1 className="app-title">
          <span aria-hidden="true">🎬</span> Movie Night Picker
        </h1>
        <AuthForm onAuthed={setUser} />
      </main>
    );
  }

  // header > nav, then main, then footer: landmarks in document order so that
  // screen readers and sequential keyboard traversal follow the visual order.
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <header>
        <Navbar user={user} onLogout={handleLogout} />
      </header>
      <main className="page" id="main-content">
        <Routes>
          <Route path="/" element={<Watchlist />} />
          <Route path="/sessions" element={<SessionPlanner user={user} />} />
          <Route path="/session/:id" element={<Session user={user} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="app-footer">
        <p>
          Movie Night Picker · CS5610 Web Development · Northeastern University
        </p>
      </footer>
    </>
  );
}

export default App;

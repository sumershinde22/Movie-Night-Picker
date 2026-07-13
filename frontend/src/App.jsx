// Top-level component: holds the authenticated-user state and wires up routing.
import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { authApi } from './api.js';
import Navbar from './components/Navbar.jsx';
import AuthForm from './components/AuthForm.jsx';
import Watchlist from './components/Watchlist.jsx';
import SessionPlanner from './components/SessionPlanner.jsx';
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
    return <div className="page">Loading…</div>;
  }

  // Unauthenticated users only see the login / register screen.
  if (!user) {
    return (
      <div className="page">
        <h1 className="app-title">🎬 Movie Night Picker</h1>
        <AuthForm onAuthed={setUser} />
      </div>
    );
  }

  return (
    <>
      <Navbar user={user} onLogout={handleLogout} />
      <div className="page">
        <Routes>
          <Route path="/" element={<Watchlist />} />
          <Route path="/sessions" element={<SessionPlanner user={user} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </>
  );
}

export default App;

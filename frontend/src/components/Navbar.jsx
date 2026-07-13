// Top navigation bar shown to logged-in users.
import PropTypes from 'prop-types';
import { NavLink } from 'react-router-dom';
import './Navbar.css';

function Navbar({ user, onLogout }) {
  return (
    <nav className="navbar">
      <span className="navbar-brand">🎬 Movie Night Picker</span>
      <div className="navbar-links">
        <NavLink to="/" end className="navbar-link">
          My Watchlist
        </NavLink>
        <NavLink to="/sessions" className="navbar-link">
          Movie Nights
        </NavLink>
      </div>
      <div className="navbar-user">
        <span className="navbar-username">Hi, {user.displayName}</span>
        <button type="button" className="secondary" onClick={onLogout}>
          Log out
        </button>
      </div>
    </nav>
  );
}

Navbar.propTypes = {
  user: PropTypes.shape({
    displayName: PropTypes.string.isRequired,
  }).isRequired,
  onLogout: PropTypes.func.isRequired,
};

export default Navbar;

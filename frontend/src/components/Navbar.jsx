// Top navigation bar shown to logged-in users.
import PropTypes from 'prop-types';
import { NavLink } from 'react-router-dom';
import './Navbar.css';

function Navbar({ user, onLogout }) {
  return (
    <nav className="navbar" aria-label="Main">
      <span className="navbar-brand">
        <span aria-hidden="true">🎬</span> Movie Night Picker
      </span>
      {/* A list, so assistive tech announces how many destinations there are.
          NavLink sets aria-current="page" on the active one for us. */}
      <ul className="navbar-links">
        <li>
          <NavLink to="/" end className="navbar-link">
            My Watchlist
          </NavLink>
        </li>
        <li>
          <NavLink to="/sessions" className="navbar-link">
            Movie Nights
          </NavLink>
        </li>
      </ul>
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

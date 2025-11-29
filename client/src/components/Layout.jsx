import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Accueil', icon: '🏠' },
    { path: '/matching', label: 'Matching', icon: '❤️' },
    { path: '/members', label: 'Membres', icon: '👥' },
    { path: '/messages', label: 'Messages', icon: '💬' },
    { path: '/inspiration', label: 'Inspiration', icon: '✨' },
    { path: '/events', label: 'Événements', icon: '📅' },
    { path: '/courses', label: 'Cours', icon: '🎓' },
    { path: '/profile', label: 'Profil', icon: '👤' },
  ];

  if (user?.role === 'Admin') {
    navItems.push({ path: '/admin', label: 'Admin', icon: '🛡️' });
  }

  return (
    <div className="layout">
      <nav className="navbar">
        <div className="navbar-brand">
          <span className="logo">🤍</span>
          <div className="brand-text">
            <span className="brand-leaders">Leaders</span>
            <span className="brand-sensibles">Sensibles</span>
            <div className="brand-subtitle">Networking & Rencontres</div>
          </div>
        </div>
        <div className="navbar-links">
          {navItems.map((item) => (
            <button
              key={item.path}
              className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </div>
        <div className="navbar-user">
          <div className="user-info">
            <div className="user-name">{user?.firstName} {user?.lastName}</div>
            <div className="user-email">{user?.email}</div>
          </div>
          <div className="user-avatar">
            {user?.photo ? (
              <img src={user.photo} alt={user.firstName} />
            ) : (
              <div className="avatar-placeholder">
                {user?.firstName?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
          </div>
          <button className="logout-btn" onClick={logout}>
            Déconnexion
          </button>
        </div>
      </nav>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;




import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import logoWhite from '../assets/642-logo-white.png';

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/strategy', label: 'Estrategia' },
  { to: '/campaigns', label: 'Campañas' },
  { to: '/production', label: 'Producción' },
  { to: '/riders', label: 'Riders' },
  { to: '/settings', label: 'Configuración' },
];

export const AppLayout = () => {
  const { profile, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <img src={logoWhite} alt="642 Studio" className="brand-logo" />
          <h2>642MediaPlanner</h2>
          <p>642 Studio</p>
        </div>

        <nav>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="profile-block">
          <strong>{profile?.name ?? 'Sin perfil'}</strong>
          <span>{profile?.role ?? 'sin rol'}</span>
          <button
            className="btn"
            onClick={async () => {
              await signOut();
              navigate('/login');
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="main">
        {toast ? <div className={`toast toast-${toast.tone}`}>{toast.message}</div> : null}
        <Outlet />
      </main>
    </div>
  );
};

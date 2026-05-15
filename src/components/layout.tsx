import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import logoWhite from '../assets/642-logo-white.png';
import { Button, Card } from './ui';

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/clients', label: 'Clientes' },
  { to: '/packages', label: 'Paquetes' },
  { to: '/strategy', label: 'Estrategia' },
  { to: '/campaigns', label: 'Campañas' },
  { to: '/production', label: 'Producción' },
  { to: '/riders', label: 'Riders' },
  { to: '/settings', label: 'Configuración' },
];

export const AppLayout = () => {
  const { profile, session, refreshProfile, signOut } = useAuth();
  const { toast, showToast } = useToast();
  const navigate = useNavigate();
  const userId = session?.user.id ?? '';
  const userEmail = session?.user.email ?? '';
  const rawName = ((session?.user.user_metadata?.name as string | undefined)?.trim() || userEmail.split('@')[0] || 'usuario');
  const escapedName = rawName.replaceAll("'", "''");
  const profileUpsertSql = userId
    ? `do $$
declare
  has_name boolean;
  has_full_name boolean;
begin
  select exists(
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'name'
  ) into has_name;

  select exists(
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'full_name'
  ) into has_full_name;

  if has_name then
    insert into public.profiles(id, name, role, active)
    values ('${userId}', '${escapedName}', 'admin', true)
    on conflict (id)
    do update set role = 'admin', active = true;
  elsif has_full_name then
    insert into public.profiles(id, full_name, role, active)
    values ('${userId}', '${escapedName}', 'admin', true)
    on conflict (id)
    do update set role = 'admin', active = true;
  else
    insert into public.profiles(id, role, active)
    values ('${userId}', 'admin', true)
    on conflict (id)
    do update set role = 'admin', active = true;
  end if;
end $$;`
    : '';

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
        {!profile && session ? (
          <Card className="access-alert">
            <div className="between">
              <div>
                <h3>Acceso pendiente de rol</h3>
                <p className="muted">
                  Tu sesión está activa, pero no existe perfil con rol en `public.profiles`.
                </p>
                <p className="muted" style={{ marginTop: 8 }}>
                  user_id: <code>{userId}</code>
                  <br />
                  email: <code>{userEmail}</code>
                </p>
              </div>
              <div className="inline-actions">
                <Button
                  onClick={async () => {
                    await refreshProfile();
                    showToast('Perfil recargado desde Supabase.', 'info');
                  }}
                >
                  Reintentar perfil
                </Button>
                <Button
                  className="btn-primary"
                  onClick={async () => {
                    if (!profileUpsertSql) return;
                    try {
                      await navigator.clipboard.writeText(profileUpsertSql);
                      showToast('SQL copiado. Ejecútalo en Supabase SQL Editor.', 'ok');
                    } catch {
                      showToast('No se pudo copiar al portapapeles.', 'error');
                    }
                  }}
                >
                  Copiar SQL admin
                </Button>
              </div>
            </div>
            {profileUpsertSql ? (
              <pre className="json-preview" style={{ marginTop: 12 }}>
                {profileUpsertSql}
              </pre>
            ) : null}
          </Card>
        ) : null}
        <Outlet />
      </main>
    </div>
  );
};

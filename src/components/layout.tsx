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
  has_id boolean;
  has_user_id boolean;
  has_name boolean;
  has_full_name boolean;
  has_active boolean;
  id_column text;
  insert_cols text;
  insert_vals text;
  update_set text := 'role = ''admin''';
begin
  select exists(
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'id'
  ) into has_id;

  select exists(
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'user_id'
  ) into has_user_id;

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

  select exists(
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'active'
  ) into has_active;

  if has_id then
    id_column := 'id';
  elsif has_user_id then
    id_column := 'user_id';
  else
    raise exception 'La tabla public.profiles no tiene columna id ni user_id';
  end if;

  insert_cols := id_column || ', role';
  insert_vals := quote_literal('${userId}') || ', ''admin''';

  if has_name then
    insert_cols := insert_cols || ', name';
    insert_vals := insert_vals || ', ' || quote_literal('${escapedName}');
  elsif has_full_name then
    insert_cols := insert_cols || ', full_name';
    insert_vals := insert_vals || ', ' || quote_literal('${escapedName}');
  end if;

  if has_active then
    insert_cols := insert_cols || ', active';
    insert_vals := insert_vals || ', true';
    update_set := update_set || ', active = true';
  end if;

  execute format(
    'insert into public.profiles(%s) values (%s) on conflict (%I) do update set %s',
    insert_cols,
    insert_vals,
    id_column,
    update_set
  );
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

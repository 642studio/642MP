// Top-level App: router state + login gate + session management.

const App = () => {
  const [user, setUser]   = React.useState(() => window.A ? window.A.getSession() : null);
  const [route, setRoute] = React.useState({section:'home'});
  const [toast, setToast] = React.useState(null);

  // Expose global helpers
  window.__go = setRoute;
  window.__route = route;
  window.__toast = (msg, type) => { setToast({msg, type}); };

  const go = (next) => setRoute({...next});

  const handleLogin = (u) => {
    setUser(u);
    go({section:'home'});
  };

  const handleLogout = () => {
    if (window.A) window.A.logout();
    setUser(null);
    go({section:'home'});
  };

  if (!user) return <Login onEnter={handleLogin}/>;

  return (
    <div className="app">
      <Sidebar route={route} go={go} user={user}/>
      <div className="main">
        {route.section==='home'       && <Dashboard go={go}/>}
        {route.section==='clients'    && <Clients go={go} route={route}/>}
        {route.section==='packages'   && <Packages go={go}/>}
        {route.section==='campaigns'  && route.view==='create'  && <CampaignCreate go={go} initialClient={route.client}/>}
        {route.section==='campaigns'  && route.view!=='create'  && <Workspace go={go} route={route}/>}
        {route.section==='feed'       && <Workspace go={go} route={{...route, view:'workspace', wsTab:'feed', client:route.client||'hollman'}}/>}
        {route.section==='production' && <Production go={go} route={route}/>}
        {route.section==='approvals'  && <Approvals go={go}/>}
        {route.section==='riders'     && <RidersIndex go={go} route={route}/>}
        {route.section==='reports'    && <ReportsIndex go={go} route={route}/>}
        {route.section==='settings'   && <Settings route={route}/>}

        <DemoNav route={route} go={go} onLogout={handleLogout}/>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </div>
  );
};

// Floating jump menu for reviewers
const DemoNav = ({route, go, onLogout}) => {
  const [open, setOpen] = React.useState(false);
  const QUICK = [
    {label:'⎋  Cerrar sesión',                 on:()=>onLogout()},
    {label:'◉  Dashboard',                      on:()=>go({section:'home'})},
    {label:'◎  Clientes',                       on:()=>go({section:'clients'})},
    {label:'◎  Cliente · Hollman BESS',         on:()=>go({section:'clients', view:'profile', client:'hollman'})},
    {label:'◎  Paquetes',                       on:()=>go({section:'packages'})},
    {label:'◎  Crear campaña',                  on:()=>go({section:'campaigns', view:'create'})},
    {label:'◈  Workspace · Resumen',            on:()=>go({section:'campaigns', view:'workspace', client:'hollman', wsTab:'summary'})},
    {label:'◈  Workspace · Estrategia',         on:()=>go({section:'campaigns', view:'workspace', client:'hollman', wsTab:'strategy'})},
    {label:'◈  Workspace · Feed',               on:()=>go({section:'campaigns', view:'workspace', client:'hollman', wsTab:'feed'})},
    {label:'◈  Workspace · Producción',         on:()=>go({section:'campaigns', view:'workspace', client:'hollman', wsTab:'production'})},
    {label:'◈  Workspace · Aprobaciones',       on:()=>go({section:'campaigns', view:'workspace', client:'hollman', wsTab:'approvals'})},
    {label:'◈  Workspace · Rider',              on:()=>go({section:'campaigns', view:'workspace', client:'hollman', wsTab:'rider'})},
    {label:'◈  Workspace · Reporte',            on:()=>go({section:'campaigns', view:'workspace', client:'hollman', wsTab:'report'})},
    {label:'◎  Producción · Calendario',        on:()=>go({section:'production'})},
    {label:'◎  Sesión · Detalle',               on:()=>go({section:'production', view:'detail', id:'s1'})},
    {label:'◎  Aprobaciones (Kanban)',           on:()=>go({section:'approvals'})},
    {label:'◎  Riders',                         on:()=>go({section:'riders'})},
    {label:'◎  Reportes',                       on:()=>go({section:'reports'})},
    {label:'◎  Configuración',                  on:()=>go({section:'settings'})},
    {label:'⚠  Resetear datos de demo',         on:()=>{ if(window.A && confirm('¿Resetear todos los datos al estado inicial?')) window.A.resetState(); }},
  ];
  return (
    <div style={{position:'fixed',bottom:18,right:18,zIndex:60}}>
      {open && (
        <div style={{width:300,background:'#0E0E0E',color:'#fff',border:'1px solid #222',borderRadius:12,padding:8,marginBottom:8,maxHeight:'70vh',overflow:'auto',boxShadow:'0 10px 30px rgba(0,0,0,.25)'}}>
          <div style={{padding:'8px 10px 10px',fontFamily:'var(--mono)',fontSize:10.5,letterSpacing:'.16em',color:'#888',borderBottom:'1px solid #1f1f1f',marginBottom:4}}>NAVEGAR A PANTALLA</div>
          {QUICK.map((q,i)=>(
            <button key={i} onClick={()=>{q.on();setOpen(false);}} style={{display:'block',width:'100%',textAlign:'left',padding:'8px 10px',background:'transparent',border:'none',color:'#ddd',fontSize:12.5,cursor:'pointer',borderRadius:6}}
              onMouseEnter={e=>e.currentTarget.style.background='#1a1a1a'}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              {q.label}
            </button>
          ))}
        </div>
      )}
      <button onClick={()=>setOpen(!open)} style={{height:42,padding:'0 14px',background:'#0E0E0E',color:'#fff',border:'1px solid #222',borderRadius:99,display:'flex',alignItems:'center',gap:8,fontSize:12.5,fontFamily:'var(--mono)',letterSpacing:'.08em',boxShadow:'0 6px 20px rgba(0,0,0,.18)',cursor:'pointer'}}>
        <span style={{width:6,height:6,borderRadius:'50%',background:'var(--red)'}}/>
        DEMO · NAVEGAR
        <Icon.chevD size={12}/>
      </button>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);

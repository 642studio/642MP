// Sidebar + Header shell.

const NAV = [
  {id:'home',       label:'Inicio',        icon:'home',      group:'main'},
  {id:'clients',    label:'Clientes',      icon:'users',     group:'main'},
  {id:'campaigns',  label:'Campañas',      icon:'briefcase', group:'main'},
  {id:'feed',       label:'Feed Planner',  icon:'grid',      group:'main'},
  {id:'production', label:'Producción',    icon:'camera',    group:'main'},
  {id:'approvals',  label:'Aprobaciones',  icon:'check',     group:'main'},
  {id:'riders',     label:'Riders',        icon:'doc',       group:'main'},
  {id:'reports',    label:'Reportes',      icon:'chart',     group:'sys'},
  {id:'packages',   label:'Paquetes',      icon:'box',       group:'sys'},
  {id:'settings',   label:'Configuración', icon:'cog',       group:'sys'},
];

const Sidebar = ({route, go, user}) => {
  const [state] = window.useStore ? window.useStore() : [{}];
  const main = NAV.filter(n=>n.group==='main');
  const sys  = NAV.filter(n=>n.group==='sys');

  // Live badges from store
  const badges = {
    clients:    (state.clients||[]).length,
    campaigns:  (state.campaigns||[]).filter(c=>c.status!=='closed').length,
    production: (state.sessions||[]).filter(s=>s.confirmed==='pending').length,
    approvals:  (state.approvals||[]).filter(a=>['internal_review','ready_client','client_changes'].includes(a.col)).length,
  };

  const Item = ({n}) => {
    const Ic = Icon[n.icon];
    const active = route.section===n.id;
    const badge = badges[n.id];
    return (
      <button className={`nav-item ${active?'active':''}`} onClick={()=>go({section:n.id})}>
        <span className="ico"><Ic size={16}/></span>
        <span>{n.label}</span>
        {badge>0 && <span className="badge">{badge}</span>}
        {active && <span className="dot" style={{marginLeft:'auto'}}/>}
      </button>
    );
  };

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="logo">642</div>
        <div className="name">MediaPlanner <span className="dim">·</span></div>
      </div>
      <div className="nav-section">Operación</div>
      {main.map(n=><Item key={n.id} n={n}/>)}
      <div className="nav-section">Sistema</div>
      {sys.map(n=><Item key={n.id} n={n}/>)}
      <div className="me">
        <Avatar id={user.id} size={32}/>
        <div style={{minWidth:0}}>
          <div style={{fontSize:12.5,fontWeight:500,letterSpacing:'-.1px'}}>{user.name}</div>
          <div style={{fontSize:10.5,color:'#888'}}>{user.role}</div>
        </div>
        <button className="iconbtn" onClick={()=>go({section:'settings'})} style={{background:'transparent',border:'1px solid #262626',color:'#888',marginLeft:'auto',width:28,height:28}}><Icon.cog size={14}/></button>
      </div>
    </aside>
  );
};

const Crumbs = ({trail, go}) => (
  <div className="crumbs">
    {trail.map((t,i)=>(
      <React.Fragment key={i}>
        {i>0 && <span className="sep"><Icon.chevR size={12}/></span>}
        <span className={i===trail.length-1?'now':''}
          style={i<trail.length-1&&go?{cursor:'pointer',textDecoration:'underline',textDecorationColor:'var(--border)'}:{}}
          onClick={i<trail.length-1&&go?t.onClick:undefined}>{t.label||t}</span>
      </React.Fragment>
    ))}
  </div>
);

const Header = ({trail, right, go}) => (
  <header className="header">
    <Crumbs trail={trail} go={go}/>
    <div className="search">
      <span className="ico"><Icon.search size={14}/></span>
      <input placeholder="Buscar clientes, campañas, piezas… (próximamente)"/>
      <span className="kbd">⌘K</span>
    </div>
    <div className="actions">
      {right}
      <button className="iconbtn" style={{position:'relative'}}>
        <Icon.bell size={16}/>
        <span className="dotnotif"/>
      </button>
    </div>
  </header>
);

window.Sidebar = Sidebar;
window.Header  = Header;

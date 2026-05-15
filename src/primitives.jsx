// Small reusable bits used across screens.

const Avatar = ({id, name, size=26, ring}) => {
  const m = (window.TEAM||[]).find(t=>t.id===id);
  const initials = m ? m.initials : (id||'').slice(0,2).toUpperCase();
  return (
    <div title={m?m.name:name||id} style={{
      width:size,height:size,borderRadius:'50%',background:'#111',color:'#fff',
      display:'grid',placeItems:'center',fontSize:size>=32?12:10,fontWeight:600,
      fontFamily:'var(--display)',letterSpacing:'.3px',
      boxShadow:ring?'0 0 0 2px #fff, 0 0 0 3px var(--red)':'none',
      flexShrink:0,
    }}>{initials}</div>
  );
};

const AvatarStack = ({ids=[], max=4, size=24}) => (
  <div style={{display:'flex'}}>
    {ids.slice(0,max).map((id,i)=>(
      <div key={id+i} style={{marginLeft:i?-8:0,border:'2px solid #fff',borderRadius:'50%'}}>
        <Avatar id={id} size={size}/>
      </div>
    ))}
    {ids.length>max && (
      <div style={{marginLeft:-8,width:size,height:size,borderRadius:'50%',background:'#EEE',color:'#666',border:'2px solid #fff',display:'grid',placeItems:'center',fontSize:10,fontWeight:600}}>+{ids.length-max}</div>
    )}
  </div>
);

const StateChip = ({state, size}) => {
  const s = (window.STATES||{})[state] || {label:state, cls:'gray'};
  return <span className={`chip ${s.cls} ${size==='lg'?'lg':''}`}><span className="dotc"/>{s.label}</span>;
};

const ClientLogo = ({client, size=36, radius=8}) => (
  <div style={{
    width:size,height:size,borderRadius:radius,
    background:client.accent||'#0E0E0E',color:'#fff',
    display:'grid',placeItems:'center',fontFamily:'var(--display)',fontWeight:600,
    fontSize:size>=44?13:11,letterSpacing:'-.3px',flexShrink:0,
  }}>{client.logo}</div>
);

const Bar = ({value, max=100, tone}) => {
  const pct = Math.max(0, Math.min(100, (value/max)*100));
  return <div className={`bar ${tone||''}`}><span style={{width:pct+'%'}}/></div>;
};

const Stat = ({label, value, sub, tone='ink', icon}) => (
  <div className="card" style={{padding:'16px 18px'}}>
    <div className="between">
      <div className="uppercase">{label}</div>
      {icon}
    </div>
    <div style={{fontFamily:'var(--display)',fontSize:34,fontWeight:600,letterSpacing:'-.8px',lineHeight:1.1,marginTop:6,color:tone==='red'?'var(--red)':'var(--ink)'}}>{value}</div>
    {sub && <div className="dim" style={{fontSize:12,marginTop:4}}>{sub}</div>}
  </div>
);

const AttentionRow = ({item, onClick}) => {
  const dotCls = {red:'red',amber:'amber',blue:'blue',purple:'purple',green:'green'}[item.sev]||'gray';
  const iconMap = {rider:Icon.doc, edit:Icon.reel, package:Icon.box, campaign:Icon.briefcase, production:Icon.camera, approval:Icon.check};
  const Ic = iconMap[item.kind]||Icon.bolt;
  return (
    <button onClick={onClick} style={{display:'flex',gap:14,alignItems:'flex-start',background:'#fff',border:'1px solid var(--border)',borderRadius:10,padding:'14px 16px',width:'100%',textAlign:'left',cursor:'pointer'}}>
      <div style={{width:34,height:34,borderRadius:8,background:'#F5F5F5',display:'grid',placeItems:'center',color:'var(--ink)',flexShrink:0}}><Ic size={16}/></div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:2}}>
          <span className={`dot ${dotCls}`}/>
          <span style={{fontSize:11.5,color:'var(--ink-2)',fontFamily:'var(--mono)',textTransform:'uppercase',letterSpacing:'.08em'}}>{item.client}</span>
        </div>
        <div style={{fontSize:13.5,color:'var(--ink)',fontWeight:500,letterSpacing:'-.1px'}}>{item.text}</div>
        <div className="dim" style={{fontSize:12,marginTop:2}}>{item.meta}</div>
      </div>
      <Icon.chevR/>
    </button>
  );
};

const FeedThumb = ({tile, label}) => {
  const baseColors = {
    dark: ['#0E0E0E','#1d1d1d'],
    red:  ['#E30613','#9F0510'],
    photo:['#5C3A21','#3a2615'],
    mint: ['#1F8A5B','#0d5c3a'],
    blue: ['#2A6FDB','#163e89'],
  };
  const [a,b] = baseColors[tile.tone]||['#222','#000'];
  return (
    <div style={{width:'100%',height:'100%',position:'relative',background:`linear-gradient(135deg,${a} 0%,${b} 100%)`,color:'#fff'}}>
      <div style={{position:'absolute',inset:0,backgroundImage:`repeating-linear-gradient(135deg,rgba(255,255,255,.04) 0 12px,transparent 12px 24px)`}}/>
      <div style={{position:'absolute',bottom:14,left:14,right:14}}>
        <div style={{fontFamily:'var(--mono)',fontSize:9.5,letterSpacing:'.16em',textTransform:'uppercase',opacity:.65,marginBottom:6}}>{tile.type} · {tile.pilar}</div>
        <div style={{fontFamily:'var(--display)',fontSize:15,fontWeight:600,letterSpacing:'-.3px',lineHeight:1.2}}>{label||tile.title}</div>
      </div>
    </div>
  );
};

const SectionHd = ({title, kicker, right}) => (
  <div className="between" style={{marginBottom:12}}>
    <div>
      {kicker && <div className="uppercase" style={{marginBottom:4}}>{kicker}</div>}
      <h2 className="section-title">{title}</h2>
    </div>
    {right}
  </div>
);

const TabRow = ({tabs, active, onChange}) => (
  <div className="tabs">
    {tabs.map(t=>(
      <button key={t.id} className={`tab ${active===t.id?'active':''}`} onClick={()=>onChange(t.id)}>
        {t.label} {t.count!=null && <span className="count">{t.count}</span>}
      </button>
    ))}
  </div>
);

const Toggle = ({on, onChange}) => (
  <button onClick={()=>onChange(!on)} style={{width:34,height:20,borderRadius:99,background:on?'var(--ink)':'#D5D5D5',border:'none',position:'relative',transition:'background .15s',cursor:'pointer'}}>
    <span style={{position:'absolute',top:2,left:on?16:2,width:16,height:16,borderRadius:'50%',background:'#fff',transition:'left .15s'}}/>
  </button>
);

// Toast notification
const Toast = ({msg, type='success', onClose}) => {
  React.useEffect(()=>{ const t=setTimeout(onClose,3500); return ()=>clearTimeout(t); }, []);
  const bg = type==='error'?'var(--red)':type==='warn'?'var(--amber)':'var(--green)';
  return (
    <div style={{position:'fixed',bottom:80,left:'50%',transform:'translateX(-50%)',background:bg,color:'#fff',padding:'10px 18px',borderRadius:8,fontSize:13.5,fontWeight:500,zIndex:200,boxShadow:'0 4px 16px rgba(0,0,0,.18)',display:'flex',gap:10,alignItems:'center'}}>
      {msg}
      <button onClick={onClose} style={{background:'transparent',border:'none',color:'#fff',cursor:'pointer',padding:0,marginLeft:4}}><Icon.x size={14}/></button>
    </div>
  );
};

// Modal overlay wrapper
const Modal = ({onClose, children, width=600}) => (
  <div style={{position:'fixed',inset:0,background:'rgba(10,10,10,.55)',zIndex:100,display:'grid',placeItems:'center'}} onClick={onClose}>
    <div onClick={e=>e.stopPropagation()} style={{width,maxWidth:'95vw',maxHeight:'90vh',background:'#fff',borderRadius:14,overflow:'auto',display:'flex',flexDirection:'column'}}>
      {children}
    </div>
  </div>
);

// Drawer (slide from right)
const Drawer = ({onClose, children, width=680}) => (
  <div style={{position:'fixed',inset:0,background:'rgba(10,10,10,.5)',zIndex:100,display:'flex',justifyContent:'flex-end'}} onClick={onClose}>
    <div onClick={e=>e.stopPropagation()} style={{width,maxWidth:'100%',background:'#fff',height:'100%',overflow:'auto',display:'flex',flexDirection:'column'}}>
      {children}
    </div>
  </div>
);

Object.assign(window, { Avatar, AvatarStack, StateChip, ClientLogo, Bar, Stat, AttentionRow, FeedThumb, SectionHd, TabRow, Toggle, Toast, Modal, Drawer });

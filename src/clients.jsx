// Clients — list, profile, and full CRUD modal.

const STATUS_LABELS = {active:'Activo', paused:'Pausado', prospect:'Prospecto', finished:'Finalizado'};
const STATUS_CHIP   = {active:'green',  paused:'amber',   prospect:'purple',    finished:'outline'};
const NICHES = ['Energía','Hospitality','Moda','F&B','Wellness','Arquitectura','Lujo / Joyería','Fitness','Salud','Tecnología','Retail','Educación','Otro'];

const Clients = ({go, route}) => {
  if (route.view === 'profile') return <ClientProfile go={go} clientId={route.client}/>;
  if (route.view === 'create')  return <ClientsList go={go} openCreate/>;
  return <ClientsList go={go}/>;
};

const ClientsList = ({go, openCreate}) => {
  const [state]  = window.useStore();
  const clients  = state.clients || [];
  const [filter, setFilter] = React.useState('all');
  const [q, setQ]           = React.useState('');
  const [modal, setModal]   = React.useState(openCreate ? {} : null);
  const [toast, setToast]   = React.useState(null);

  const FILTERS = [
    {id:'all',        label:'Todos',           count: clients.length},
    {id:'active',     label:'Activos',         count: clients.filter(c=>c.status==='active').length},
    {id:'prospect',   label:'Prospectos',      count: clients.filter(c=>c.status==='prospect').length},
    {id:'paused',     label:'Pausados',        count: clients.filter(c=>c.status==='paused').length},
    {id:'no_campaign',label:'Sin campaña activa', count: clients.filter(c=>!c.activeCampaign).length},
    {id:'no_package', label:'Sin paquete',     count: clients.filter(c=>!c.package).length},
  ];

  const list = clients.filter(c => {
    if (filter==='active'      && c.status!=='active')    return false;
    if (filter==='prospect'    && c.status!=='prospect')  return false;
    if (filter==='paused'      && c.status!=='paused')    return false;
    if (filter==='no_campaign' && c.activeCampaign)       return false;
    if (filter==='no_package'  && c.package)              return false;
    if (q && !c.name.toLowerCase().includes(q.toLowerCase()) && !(c.niche||'').toLowerCase().includes(q.toLowerCase()) && !(c.city||'').toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const handleSave = (data) => {
    if (modal.id) {
      window.A.updateClient(modal.id, data);
      setToast({msg:'Cliente actualizado.', type:'success'});
    } else {
      const id = window.A.createClient(data);
      setToast({msg:'Cliente creado.', type:'success'});
      setTimeout(()=>go({section:'clients', view:'profile', client:id}), 600);
    }
    setModal(null);
  };

  const handleDelete = (id) => {
    if (!confirm('¿Eliminar este cliente? Esta acción no se puede deshacer.')) return;
    window.A.deleteClient(id);
    setToast({msg:'Cliente eliminado.', type:'warn'});
  };

  return (
    <>
      <Header trail={[{label:'642 Studio'},{label:'Clientes'}]}
        right={<button className="btn primary" onClick={()=>setModal({})}><Icon.plus size={14}/> Alta de cliente</button>}/>
      <div className="content">
        <div className="between" style={{marginBottom:18}}>
          <div>
            <h1 className="page-title">Clientes</h1>
            <p className="page-sub">{clients.length} clientes — {clients.filter(c=>c.status==='active').length} activos, {clients.filter(c=>c.status==='paused').length} pausados, {clients.filter(c=>c.status==='prospect').length} prospectos</p>
          </div>
        </div>

        <div className="card" style={{padding:0,marginBottom:16}}>
          <div style={{padding:'14px 16px',display:'flex',gap:12,alignItems:'center',borderBottom:'1px solid var(--border)'}}>
            <div style={{position:'relative',flex:1,maxWidth:520}}>
              <span style={{position:'absolute',left:12,top:11,color:'var(--ink-3)'}}><Icon.search size={14}/></span>
              <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar cliente, nicho o ciudad…"
                style={{width:'100%',height:38,border:'1px solid var(--border)',borderRadius:8,padding:'0 12px 0 36px',background:'#fff',fontSize:13.5,outline:'none'}}/>
            </div>
            <div style={{flex:1}}/>
            <div style={{display:'flex',gap:8}}>
              <button className="btn sm"><Icon.filter size={12}/> Más filtros</button>
            </div>
          </div>
          <div style={{display:'flex',gap:6,padding:'10px 16px',overflowX:'auto'}}>
            {FILTERS.map(f=>(
              <button key={f.id} onClick={()=>setFilter(f.id)} className={`chip ${filter===f.id?'black':'outline'} lg`} style={{cursor:'pointer',border:'none'}}>
                {f.label} <span style={{opacity:.6,fontFamily:'var(--mono)',fontSize:10.5,marginLeft:4}}>{f.count}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="card nopad">
          <table className="table">
            <thead><tr>
              <th>Cliente</th><th>Nicho</th><th>Ciudad</th><th>Paquete</th>
              <th>Campaña activa</th><th>Resp.</th><th>Estado</th>
              <th style={{width:140,textAlign:'right'}}>Acciones</th>
            </tr></thead>
            <tbody>
              {list.map(c=>(
                <tr key={c.id} className="clickable" onClick={()=>go({section:'clients', view:'profile', client:c.id})}>
                  <td>
                    <div style={{display:'flex',gap:10,alignItems:'center'}}>
                      <ClientLogo client={c} size={32}/>
                      <div>
                        <div style={{fontWeight:500,letterSpacing:'-.1px'}}>{c.name}</div>
                        <div className="dim" style={{fontSize:11.5}}>{c.contact} {c.ig?`· ${c.ig}`:''}</div>
                      </div>
                    </div>
                  </td>
                  <td className="dim">{c.niche}</td>
                  <td className="dim">{c.city}</td>
                  <td>{c.package?<span className="chip">{c.package}</span>:<span className="chip red">Sin paquete</span>}</td>
                  <td className="dim" style={{fontSize:13}}>{c.activeCampaign||<span style={{color:'var(--amber)'}}>—</span>}</td>
                  <td>{c.owner&&c.owner!=='—'?<Avatar id={c.owner}/>:<span className="dim">—</span>}</td>
                  <td>
                    <span className={`chip ${STATUS_CHIP[c.status]||'outline'}`}><span className="dotc"/>{STATUS_LABELS[c.status]||c.status}</span>
                  </td>
                  <td style={{textAlign:'right'}}>
                    <button className="btn sm" onClick={e=>{e.stopPropagation();go({section:'clients', view:'profile', client:c.id});}}>Ver</button>
                    <button className="btn sm" style={{marginLeft:6}} onClick={e=>{e.stopPropagation();setModal(c);}}>Editar</button>
                  </td>
                </tr>
              ))}
              {list.length===0 && (
                <tr><td colSpan={8} style={{textAlign:'center',padding:32,color:'var(--ink-3)'}}>No se encontraron clientes con los filtros actuales.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal !== null && <ClientModal client={modal.id?modal:null} packages={state.packages||[]} onSave={handleSave} onClose={()=>setModal(null)}/>}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </>
  );
};

// ─── CLIENT MODAL ─────────────────────────────────────────────────────────────

const ClientModal = ({client, packages, onSave, onClose}) => {
  const isNew = !client;
  const [form, setForm] = React.useState({
    name:'', niche:'', city:'', zone:'', address:'',
    contact:'', contactPhone:'', contactEmail:'',
    ig:'', facebook:'', tiktok:'', web:'',
    logo:'', accent:'#0E0E0E',
    status:'prospect', owner:'AM',
    package: null,
    notes:'',
    ...(client||{}),
  });
  const [err, setErr] = React.useState('');

  const F = (k) => ({
    value: form[k] || '',
    onChange: e => setForm(f => ({...f, [k]: e.target.value})),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setErr('El nombre del cliente es obligatorio.'); return; }
    onSave(form);
  };

  return (
    <Drawer onClose={onClose} width={720}>
      <div style={{padding:'18px 24px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:14}}>
        <div>
          <div className="uppercase">{isNew?'Nuevo cliente':'Editar cliente'}</div>
          <div style={{fontFamily:'var(--display)',fontWeight:600,fontSize:20,letterSpacing:'-.4px'}}>{isNew?'Alta de cliente':form.name}</div>
        </div>
        <div style={{marginLeft:'auto',display:'flex',gap:8}}>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn primary" onClick={handleSubmit}>Guardar cliente</button>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{padding:24,display:'flex',flexDirection:'column',gap:20,overflow:'auto',flex:1}}>
        {err && <div style={{padding:'10px 14px',background:'var(--red-tint)',border:'1px solid #F5C2C6',borderRadius:8,color:'var(--red)',fontSize:13}}>{err}</div>}

        <div>
          <div className="uppercase" style={{marginBottom:10}}>Información general</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div className="field" style={{gridColumn:'1/-1'}}>
              <label>Nombre comercial *</label>
              <input {...F('name')} placeholder="ej. Hollman BESS"/>
            </div>
            <div className="field">
              <label>Nicho / industria</label>
              <select value={form.niche} onChange={e=>setForm(f=>({...f,niche:e.target.value}))}>
                <option value="">Seleccionar</option>
                {NICHES.map(n=><option key={n}>{n}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Estado</label>
              <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                {Object.entries(STATUS_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="field"><label>Ciudad</label><input {...F('city')} placeholder="ej. Monterrey"/></div>
            <div className="field"><label>Zona / colonia</label><input {...F('zone')} placeholder="ej. San Pedro"/></div>
            <div className="field" style={{gridColumn:'1/-1'}}>
              <label>Dirección</label>
              <input {...F('address')} placeholder="Calle, número, colonia"/>
            </div>
          </div>
        </div>

        <div>
          <div className="uppercase" style={{marginBottom:10}}>Contacto principal</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div className="field"><label>Nombre del contacto</label><input {...F('contact')} placeholder="ej. Lucía Treviño"/></div>
            <div className="field"><label>WhatsApp / Teléfono</label><input {...F('contactPhone')} placeholder="+52 81 0000 0000"/></div>
            <div className="field" style={{gridColumn:'1/-1'}}><label>Correo</label><input type="email" {...F('contactEmail')} placeholder="contacto@empresa.com"/></div>
          </div>
        </div>

        <div>
          <div className="uppercase" style={{marginBottom:10}}>Redes sociales</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div className="field"><label>Instagram</label><input {...F('ig')} placeholder="@usuario"/></div>
            <div className="field"><label>Facebook</label><input {...F('facebook')} placeholder="@pagina"/></div>
            <div className="field"><label>TikTok</label><input {...F('tiktok')} placeholder="@usuario"/></div>
            <div className="field"><label>Sitio web</label><input {...F('web')} placeholder="www.empresa.com"/></div>
          </div>
        </div>

        <div>
          <div className="uppercase" style={{marginBottom:10}}>Marca</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div className="field">
              <label>Iniciales del logo (2-3 chars)</label>
              <input {...F('logo')} maxLength={3} placeholder="ej. HB"/>
            </div>
            <div className="field">
              <label>Color de acento</label>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <input type="color" value={form.accent||'#0E0E0E'} onChange={e=>setForm(f=>({...f,accent:e.target.value}))} style={{width:40,height:38,border:'1px solid var(--border)',borderRadius:6,padding:2,cursor:'pointer'}}/>
                <input value={form.accent||''} onChange={e=>setForm(f=>({...f,accent:e.target.value}))} placeholder="#000000" style={{flex:1,height:38,border:'1px solid var(--border)',borderRadius:8,padding:'0 12px',fontSize:13.5,outline:'none'}}/>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="uppercase" style={{marginBottom:10}}>Asignación</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div className="field">
              <label>Paquete contratado</label>
              <select value={form.package||''} onChange={e=>setForm(f=>({...f,package:e.target.value||null}))}>
                <option value="">Sin paquete</option>
                {packages.filter(p=>p.active).map(p=><option key={p.id} value={p.name}>{p.name} — {p.price}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Responsable interno</label>
              <select value={form.owner||'—'} onChange={e=>setForm(f=>({...f,owner:e.target.value}))}>
                <option value="—">Sin asignar</option>
                {(window.TEAM||[]).map(t=><option key={t.id} value={t.id}>{t.name} — {t.role}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="field">
          <label>Notas internas</label>
          <textarea rows={3} value={form.notes||''} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Notas sobre el cliente, contexto especial, etc."/>
        </div>
      </form>
    </Drawer>
  );
};

// ─── CLIENT PROFILE ───────────────────────────────────────────────────────────

const ClientProfile = ({go, clientId}) => {
  const [state] = window.useStore();
  const c = (state.clients||[]).find(x=>x.id===clientId) || (state.clients||[])[0];
  if (!c) return <div className="content"><p>Cliente no encontrado.</p></div>;

  const [tab, setTab]     = React.useState('summary');
  const [modal, setModal] = React.useState(null);
  const [toast, setToast] = React.useState(null);
  const pkg     = (state.packages||[]).find(p=>p.name===c.package);
  const camps   = (state.campaigns||[]).filter(x=>x.clientId===c.id);
  const sessions= (state.sessions||[]).filter(s=>s.clientId===c.id);

  const handleSave = (data) => {
    window.A.updateClient(c.id, data);
    setToast({msg:'Cliente actualizado.', type:'success'});
    setModal(null);
  };

  return (
    <>
      <Header trail={[{label:'Clientes', onClick:()=>go({section:'clients'})},{label:c.name}]} go={go}
        right={<>
          <button className="btn"><Icon.ext size={14}/> Compartir ficha</button>
          <button className="btn" onClick={()=>setModal(c)}><Icon.cog size={14}/> Editar cliente</button>
          <button className="btn primary" onClick={()=>go({section:'campaigns', view:'create', client:c.id})}><Icon.plus size={14}/> Nueva campaña</button>
        </>}/>
      <div className="content">
        <div className="card" style={{padding:'22px 24px',marginBottom:16}}>
          <div style={{display:'flex',gap:18,alignItems:'center'}}>
            <ClientLogo client={c} size={64} radius={12}/>
            <div style={{flex:1,minWidth:0}}>
              <div className="uppercase" style={{marginBottom:4}}>{c.niche} · {c.city}</div>
              <h1 style={{fontFamily:'var(--display)',fontWeight:600,fontSize:32,letterSpacing:'-.8px',margin:0}}>{c.name}</h1>
              <div className="dim" style={{fontSize:13.5,marginTop:6,display:'flex',gap:14,flexWrap:'wrap'}}>
                {c.contact && <span><b style={{color:'var(--ink)',fontWeight:500}}>Contacto:</b> {c.contact}</span>}
                {c.ig      && <span><b style={{color:'var(--ink)',fontWeight:500}}>IG:</b> {c.ig}</span>}
                {c.web     && <span><b style={{color:'var(--ink)',fontWeight:500}}>Web:</b> {c.web}</span>}
                <span className={`chip ${STATUS_CHIP[c.status]||'outline'}`}><span className="dotc"/>{STATUS_LABELS[c.status]||c.status}</span>
              </div>
            </div>
            <div style={{display:'flex',gap:8,flexShrink:0}}>
              <button className="btn" onClick={()=>go({section:'production'})}><Icon.camera size={14}/> Nueva producción</button>
              <button className="btn" onClick={()=>setModal(c)}><Icon.cog size={14}/> Editar cliente</button>
            </div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginTop:22,paddingTop:22,borderTop:'1px solid var(--border)'}}>
            <KV k="Paquete activo"        v={c.package||'—'}            tone={c.package?'ink':'red'}/>
            <KV k="Campaña actual"        v={c.activeCampaign||'—'}     tone={c.activeCampaign?'ink':'amber'}/>
            <KV k="Sesiones agendadas"    v={sessions.length}/>
            <KV k="Piezas entregadas"     v={`${c.delivered||0}/${(c.delivered||0)+(c.pending||0)}`}/>
            <KV k="Estado"                v={STATUS_LABELS[c.status]||c.status} tone={c.status==='active'?'ink':c.status==='paused'?'amber':'ink'}/>
          </div>
        </div>

        <TabRow active={tab} onChange={setTab} tabs={[
          {id:'summary',   label:'Resumen'},
          {id:'campaigns', label:'Campañas', count:camps.length},
          {id:'package',   label:'Paquete / Contrato'},
          {id:'ai',        label:'Investigación IA'},
          {id:'notes',     label:'Notas internas'},
        ]}/>

        <div style={{marginTop:20}}>
          {tab==='summary'   && <ClientSummary c={c} pkg={pkg} go={go} camps={camps}/>}
          {tab==='campaigns' && <ClientCampaigns c={c} go={go} camps={camps}/>}
          {tab==='package'   && <ClientPackage c={c} pkg={pkg}/>}
          {tab==='ai'        && <ClientAI c={c}/>}
          {tab==='notes'     && <ClientNotes c={c}/>}
        </div>
      </div>

      {modal && <ClientModal client={modal} packages={state.packages||[]} onSave={handleSave} onClose={()=>setModal(null)}/>}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </>
  );
};

const KV = ({k, v, tone='ink'}) => (
  <div>
    <div className="uppercase" style={{marginBottom:6}}>{k}</div>
    <div style={{fontFamily:'var(--display)',fontWeight:600,fontSize:18,letterSpacing:'-.3px',color:tone==='red'?'var(--red)':tone==='amber'?'var(--amber)':'var(--ink)'}}>{v}</div>
  </div>
);

const ClientSummary = ({c, pkg, go, camps}) => (
  <div style={{display:'grid',gridTemplateColumns:'1.4fr .6fr',gap:16}}>
    <div className="stack" style={{gap:16}}>
      {camps.length > 0 && (
        <div className="card">
          <div className="hd">
            <div className="section-title">Campaña activa</div>
            <span className="chip amber"><span className="dotc"/>En curso</span>
            <div style={{marginLeft:'auto'}}><button className="btn sm" onClick={()=>go({section:'campaigns', view:'workspace', client:c.id, campaignId:camps[0].id})}>Abrir workspace <Icon.chevR size={12}/></button></div>
          </div>
          <div className="bd">
            <div style={{fontFamily:'var(--display)',fontSize:22,fontWeight:600,letterSpacing:'-.4px',marginBottom:4}}>{camps[0].name}</div>
            <p className="dim" style={{marginTop:4}}>{camps[0].objective||'Sin objetivo definido.'}</p>
            <div style={{display:'flex',gap:8,marginTop:14}}>
              <button className="btn primary" onClick={()=>go({section:'campaigns', view:'workspace', client:c.id, campaignId:camps[0].id})}><Icon.arrow size={14}/> Abrir workspace</button>
              <button className="btn" onClick={()=>go({section:'campaigns', view:'create', client:c.id})}><Icon.plus size={14}/> Nueva campaña</button>
            </div>
          </div>
        </div>
      )}
      {camps.length === 0 && (
        <div className="card" style={{padding:'22px 24px',textAlign:'center'}}>
          <div className="dim" style={{fontSize:14,marginBottom:14}}>Este cliente no tiene campañas activas.</div>
          <button className="btn primary" onClick={()=>go({section:'campaigns', view:'create', client:c.id})}><Icon.plus size={14}/> Crear primera campaña</button>
        </div>
      )}

      <div className="card">
        <div className="hd"><div className="section-title">Información de contacto</div></div>
        <div className="bd">
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <KVD k="Contacto" v={c.contact||'—'}/>
            <KVD k="WhatsApp" v={c.contactPhone||'—'}/>
            <KVD k="Correo" v={c.contactEmail||'—'}/>
            <KVD k="Ciudad" v={`${c.city||'—'}${c.zone?` · ${c.zone}`:''}`}/>
            {c.ig      && <KVD k="Instagram" v={c.ig}/>}
            {c.facebook&& <KVD k="Facebook"  v={c.facebook}/>}
            {c.tiktok  && <KVD k="TikTok"   v={c.tiktok}/>}
            {c.web     && <KVD k="Web"       v={c.web}/>}
          </div>
        </div>
      </div>
    </div>

    <div className="stack" style={{gap:16}}>
      <div className="card" style={{padding:'16px 18px'}}>
        <div className="uppercase" style={{marginBottom:8}}>Paquete activo</div>
        <div style={{fontFamily:'var(--display)',fontWeight:600,fontSize:20,letterSpacing:'-.3px'}}>{c.package||'Sin paquete'}</div>
        {pkg && <>
          <div className="dim" style={{fontSize:12.5,marginTop:2}}>{pkg.price}</div>
          <div className="divider"/>
          {pkg.deliverables.map(d=>(
            <div key={d.type} className="between" style={{padding:'4px 0',fontSize:12.5}}>
              <span className="dim">{d.type}</span>
              <span className="mono">{d.qty} / mes</span>
            </div>
          ))}
        </>}
        {!pkg && c.status==='active' && (
          <div style={{marginTop:12}}>
            <button className="btn red sm"><Icon.bolt size={12}/> Asignar paquete</button>
          </div>
        )}
      </div>

      <div className="card" style={{padding:'16px 18px'}}>
        <div className="uppercase" style={{marginBottom:10}}>Historial de campañas</div>
        {camps.length === 0 && <p className="dim" style={{fontSize:13}}>Sin campañas aún.</p>}
        {camps.slice(0,5).map((cm,i)=>(
          <div key={cm.id} className="between" style={{padding:'6px 0',fontSize:12.5,borderBottom:i<camps.length-1?'1px solid var(--border)':'none'}}>
            <span style={{fontWeight:500}}>{cm.name}</span>
            <span className="chip">{cm.status==='closed'?'Cerrada':'En curso'}</span>
          </div>
        ))}
      </div>

      {c.notes && (
        <div className="card" style={{padding:'16px 18px'}}>
          <div className="uppercase" style={{marginBottom:8}}>Notas</div>
          <p style={{margin:0,fontSize:13.5,lineHeight:1.6,color:'var(--ink-2)'}}>{c.notes}</p>
        </div>
      )}
    </div>
  </div>
);

const ClientCampaigns = ({c, go, camps}) => (
  <div className="card nopad">
    {camps.length === 0 ? (
      <div style={{padding:42,textAlign:'center'}}>
        <p className="dim" style={{marginBottom:14}}>Este cliente no tiene campañas todavía.</p>
        <button className="btn primary" onClick={()=>go({section:'campaigns', view:'create', client:c.id})}><Icon.plus size={14}/> Crear campaña</button>
      </div>
    ) : (
      <table className="table">
        <thead><tr><th>Campaña</th><th>Mes / Año</th><th>Paquete</th><th>Estado</th><th></th></tr></thead>
        <tbody>
          {camps.map((cm,i)=>(
            <tr key={cm.id} className="clickable" onClick={()=>go({section:'campaigns', view:'workspace', client:c.id, campaignId:cm.id})}>
              <td style={{fontWeight:500}}>{cm.name}</td>
              <td className="dim">{cm.month} {cm.year}</td>
              <td className="dim">{cm.package}</td>
              <td><span className="chip amber"><span className="dotc"/>{cm.status==='closed'?'Cerrada':'En curso'}</span></td>
              <td style={{textAlign:'right'}}><button className="btn sm">Abrir <Icon.chevR size={12}/></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
);

const ClientPackage = ({c, pkg}) => (
  <div style={{display:'grid',gridTemplateColumns:'1.2fr .8fr',gap:16}}>
    <div className="card">
      <div className="hd">
        <div className="section-title">{c.package||'Sin paquete asignado'}</div>
        {pkg && <span className="chip">{pkg.price}</span>}
      </div>
      {pkg ? (
        <div className="bd" style={{padding:0}}>
          <table className="table">
            <thead><tr><th>Entregable</th><th>Cantidad</th><th>Periodicidad</th></tr></thead>
            <tbody>
              {pkg.deliverables.map(d=>(
                <tr key={d.type}><td style={{fontWeight:500}}>{d.type}</td><td className="mono">{d.qty}</td><td className="dim">{d.period}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bd" style={{textAlign:'center',padding:32}}>
          <p className="dim">Este cliente no tiene paquete contratado.</p>
        </div>
      )}
    </div>
    <div className="card" style={{padding:'16px 18px'}}>
      <div className="uppercase" style={{marginBottom:8}}>Detalles del contrato</div>
      <div className="between" style={{padding:'6px 0',borderTop:'1px solid var(--border)'}}><span className="dim">Estado servicio</span><span className={`chip ${STATUS_CHIP[c.status]||'outline'}`}>{STATUS_LABELS[c.status]||c.status}</span></div>
      <div className="between" style={{padding:'6px 0',borderTop:'1px solid var(--border)'}}><span className="dim">Responsable</span><span>{c.owner&&c.owner!=='—'?<span style={{display:'flex',gap:8,alignItems:'center'}}><Avatar id={c.owner} size={20}/>{(window.TEAM||[]).find(t=>t.id===c.owner)?.name||c.owner}</span>:'Sin asignar'}</span></div>
    </div>
  </div>
);

const ClientAI = ({c}) => {
  const [state] = window.useStore();
  const [loading, setLoading] = React.useState(false);
  const [result,  setResult]  = React.useState(null);
  const [error,   setError]   = React.useState('');
  const hasKey = !!(state.settings?.openaiKey);

  const generate = async () => {
    setLoading(true); setError('');
    try {
      const prompt = `Genera una investigación estratégica completa para el cliente "${c.name}" con las siguientes características:
- Nicho / industria: ${c.niche || 'no especificado'}
- Ciudad: ${c.city || 'no especificada'}
- Redes sociales: ${[c.ig,c.facebook,c.tiktok].filter(Boolean).join(', ')||'no especificadas'}
- Sitio web: ${c.web||'no especificado'}

Responde en formato JSON con estas secciones:
{
  "perfil": "Descripción del negocio y su posicionamiento",
  "tono": "Tono recomendado para comunicación",
  "competidores": ["lista", "de", "competidores"],
  "pilares": ["pilar1", "pilar2", "pilar3"],
  "oportunidades": ["oportunidad1", "oportunidad2"],
  "ideas": ["idea campaña 1", "idea campaña 2"],
  "evitar": "Cosas a evitar en la comunicación"
}`;
      const text = await window.A.callAI(prompt, true);
      const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || '{}');
      setResult(json);
    } catch(e) {
      setError(e.message === 'NO_API_KEY' ? 'Configura una API Key de OpenAI en Configuración para usar funciones IA.' : `Error: ${e.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="stack" style={{gap:16}}>
      <div className="card" style={{padding:'18px 20px',display:'flex',gap:16,alignItems:'center',background:'linear-gradient(180deg,#fff,#FAF7FF)'}}>
        <div style={{width:42,height:42,borderRadius:10,background:'var(--purple-tint)',color:'var(--purple)',display:'grid',placeItems:'center'}}><Icon.sparkles/></div>
        <div style={{flex:1}}>
          <div style={{fontFamily:'var(--display)',fontWeight:600,fontSize:18,letterSpacing:'-.3px'}}>Investigación IA · {c.name}</div>
          <div className="dim" style={{fontSize:12.5}}>{hasKey ? 'Conectado a OpenAI · gpt-4o' : 'Sin API Key configurada'}</div>
        </div>
        <button className="btn" onClick={generate} disabled={loading||!hasKey}>
          <Icon.sparkles size={14}/> {loading?'Generando…':'Generar investigación'}
        </button>
      </div>

      {!hasKey && !result && (
        <div style={{padding:24,textAlign:'center',border:'1px dashed var(--border)',borderRadius:10}}>
          <div className="dim">Agrega una API Key de OpenAI en <b style={{color:'var(--ink)'}}>Configuración → OpenAI / IA</b> para usar esta función.</div>
        </div>
      )}
      {error && <div style={{padding:'12px 16px',background:'var(--red-tint)',borderRadius:8,color:'var(--red)',fontSize:13}}>{error}</div>}

      {result && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
          {result.perfil  && <AICard title="Perfil del negocio"         body={result.perfil}/>}
          {result.tono    && <AICard title="Tono recomendado"           body={result.tono}/>}
          {result.competidores && <AICard title="Competidores detectados" list={result.competidores}/>}
          {result.pilares && <AICard title="Pilares sugeridos"          list={result.pilares}/>}
          {result.oportunidades && <AICard title="Oportunidades de contenido" list={result.oportunidades}/>}
          {result.ideas   && <AICard title="Ideas de campaña"           list={result.ideas}/>}
          {result.evitar  && <AICard title="No hacer / restricciones"   body={result.evitar}/>}
        </div>
      )}
    </div>
  );
};

const ClientNotes = ({c}) => {
  const [notes, setNotes] = React.useState(c.notes||'');
  const [saved, setSaved] = React.useState(false);
  return (
    <div className="card" style={{padding:'18px 20px'}}>
      <div className="between" style={{marginBottom:12}}>
        <div className="section-title">Notas internas</div>
        <button className="btn sm primary" onClick={()=>{window.A.updateClient(c.id,{notes});setSaved(true);setTimeout(()=>setSaved(false),2000);}}>
          {saved?'¡Guardado!':'Guardar notas'}
        </button>
      </div>
      <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={10}
        placeholder="Notas privadas del equipo sobre este cliente…"
        style={{width:'100%',border:'1px solid var(--border)',borderRadius:8,padding:'12px',fontSize:13.5,lineHeight:1.6,resize:'vertical',outline:'none',fontFamily:'var(--body)'}}/>
    </div>
  );
};

const AICard = ({title, body, list}) => (
  <div className="card" style={{padding:'16px 18px'}}>
    <div className="uppercase" style={{marginBottom:8}}>{title}</div>
    {body && <p style={{margin:0,fontSize:13.5,lineHeight:1.6}}>{body}</p>}
    {list && <ul style={{margin:'2px 0 0',padding:0,listStyle:'none',display:'flex',flexDirection:'column',gap:8}}>
      {list.map((t,i)=>(
        <li key={i} style={{display:'flex',gap:10,alignItems:'flex-start',fontSize:13.5,lineHeight:1.5}}>
          <span style={{width:18,height:18,borderRadius:5,background:'#F0F0F0',color:'var(--ink)',display:'grid',placeItems:'center',fontSize:10,fontWeight:600,fontFamily:'var(--mono)',flexShrink:0,marginTop:1}}>{i+1}</span>
          {t}
        </li>
      ))}
    </ul>}
  </div>
);

const KVD = ({k, v}) => (
  <div>
    <div className="uppercase" style={{marginBottom:4}}>{k}</div>
    <div style={{fontSize:13.5,fontWeight:500}}>{v||'—'}</div>
  </div>
);

window.Clients = Clients;
window.ClientModal = ClientModal;
window.AICard = AICard;
window.KVD = KVD;

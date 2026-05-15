const Production = ({go, route}) => {
  if (route.view === 'detail') return <ProductionDetail go={go} sessionId={route.id}/>;
  if (route.view === 'create') return <ProductionCreate go={go} route={route}/>;
  return <ProductionIndex go={go}/>;
};

const ProductionIndex = ({go}) => {
  const [state] = window.useStore();
  const sessions = state.sessions || [];
  const campaigns = state.campaigns || [];
  const clients = state.clients || [];

  const [q, setQ] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('all');

  const list = sessions.filter(s => {
    if (statusFilter !== 'all' && s.confirmed !== statusFilter) return false;
    if (!q) return true;
    const hay = `${s.client} ${s.campaign} ${s.loc}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  return (
    <>
      <Header trail={[{label:'642 Studio'},{label:'Producción'}]}
        right={<button className="btn primary" onClick={()=>go({section:'production', view:'create'})}><Icon.plus size={14}/> Nueva sesión</button>}/>
      <div className="content">
        <div className="between" style={{marginBottom:16}}>
          <div>
            <h1 className="page-title">Producción</h1>
            <p className="page-sub">Convierte el feed planeado en sesiones ejecutables con equipo, shotlist y checklist.</p>
          </div>
          <div style={{display:'flex',gap:10}}>
            <button className="btn" onClick={()=>go({section:'riders'})}><Icon.doc size={14}/> Riders</button>
            <button className="btn" onClick={()=>go({section:'reports'})}><Icon.chart size={14}/> Reportes</button>
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:14}}>
          <Stat label="Sesiones totales" value={sessions.length} sub="histórico"/>
          <Stat label="Pendientes" value={sessions.filter(s=>s.confirmed==='pending').length} sub="por confirmar"/>
          <Stat label="Confirmadas" value={sessions.filter(s=>s.confirmed==='confirmed').length} sub="listas para ejecutar"/>
          <Stat label="Sin rider" value={sessions.filter(s=>s.rider==='none').length} sub="acción requerida" tone="red"/>
        </div>

        <div className="card" style={{padding:0,marginBottom:14}}>
          <div style={{padding:'12px 14px',display:'flex',gap:8,borderBottom:'1px solid var(--border)'}}>
            <div style={{position:'relative',flex:1,maxWidth:420}}>
              <span style={{position:'absolute',left:10,top:9,color:'var(--ink-3)'}}><Icon.search size={14}/></span>
              <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar por cliente, campaña o locación" style={{width:'100%',height:34,border:'1px solid var(--border)',borderRadius:8,padding:'0 12px 0 34px'}}/>
            </div>
            <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{height:34,border:'1px solid var(--border)',borderRadius:8,padding:'0 10px',background:'#fff'}}>
              <option value="all">Todos</option>
              <option value="pending">Pendiente</option>
              <option value="confirmed">Confirmada</option>
              <option value="done">Realizada</option>
            </select>
          </div>
          <table className="table">
            <thead><tr><th>Fecha</th><th>Cliente</th><th>Campaña</th><th>Horario</th><th>Locación</th><th>Rider</th><th>Confirmación</th><th></th></tr></thead>
            <tbody>
              {list.map(s => (
                <tr key={s.id} className="clickable" onClick={()=>go({section:'production', view:'detail', id:s.id})}>
                  <td style={{fontWeight:500}}>{s.date}</td>
                  <td>{s.client}</td>
                  <td className="dim">{s.campaign}</td>
                  <td className="dim">{s.time}</td>
                  <td className="dim">{s.loc}</td>
                  <td><span className={`chip ${s.rider==='approved'?'green':s.rider==='sent'?'purple':s.rider==='draft'?'amber':'red'}`}>{s.rider}</span></td>
                  <td><span className={`chip ${s.confirmed==='done'?'black':s.confirmed==='confirmed'?'green':'amber'}`}>{s.confirmed}</span></td>
                  <td style={{textAlign:'right'}}><button className="btn sm" onClick={e=>{e.stopPropagation();go({section:'production', view:'detail', id:s.id});}}>Abrir</button></td>
                </tr>
              ))}
              {list.length===0 && <tr><td colSpan={8} style={{padding:24,textAlign:'center',color:'var(--ink-3)'}}>No hay sesiones con los filtros actuales.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="card" style={{padding:'16px 18px'}}>
          <div className="section-title" style={{marginBottom:10}}>Calendario rápido (próximas sesiones)</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
            {sessions.slice(0,6).map(s => (
              <div key={s.id} style={{border:'1px solid var(--border)',borderRadius:8,padding:'10px 11px'}}>
                <div className="uppercase" style={{marginBottom:4}}>{s.date}</div>
                <div style={{fontWeight:600,marginBottom:2}}>{s.client}</div>
                <div className="dim" style={{fontSize:12.5,marginBottom:6}}>{s.campaign}</div>
                <div style={{display:'flex',gap:6,alignItems:'center',fontSize:12.5}}><Icon.clock size={12}/>{s.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

const ProductionCreate = ({go, route}) => {
  const [state] = window.useStore();
  const campaigns = state.campaigns || [];
  const clients = state.clients || [];

  const initialCampaign = campaigns.find(c => c.id === route.campaignId) || campaigns[0] || null;
  const initialClientId = route.clientId || initialCampaign?.clientId || clients[0]?.id || '';

  const [form, setForm] = React.useState({
    clientId: initialClientId,
    campaignId: initialCampaign?.id || '',
    date: '',
    time: '',
    loc: '',
    photo: 'CM',
    video: 'SP',
    director: 'AM',
    clientSupportPerson: '',
    clientContact: '',
    notes: '',
  });

  const client = clients.find(c => c.id === form.clientId) || null;
  const campaign = campaigns.find(c => c.id === form.campaignId) || campaigns.find(c => c.clientId === form.clientId) || null;

  React.useEffect(() => {
    if (!campaign && form.clientId) {
      const c = campaigns.find(x => x.clientId === form.clientId);
      if (c) setForm(f=>({...f, campaignId:c.id}));
    }
  }, [form.clientId]);

  const onCreate = () => {
    if (!form.clientId || !campaign) {
      window.__toast?.('Selecciona cliente y campaña.', 'error');
      return;
    }
    const id = window.A.createSession({
      clientId: form.clientId,
      client: client?.name || '',
      campaignId: campaign.id,
      campaign: campaign.name,
      date: form.date || 'Por definir',
      time: form.time || 'Por definir',
      loc: form.loc || 'Por definir',
      photo: form.photo,
      video: form.video,
      director: form.director,
      clientSupportPerson: form.clientSupportPerson,
      clientContact: form.clientContact,
      notes: form.notes,
      shotlist: [],
      requirements: [],
      checklist: {
        riderSent:false,
        clientConfirmed:false,
        teamAssigned:true,
        locationConfirmed:false,
        materialReviewed:false,
        productionDone:false,
      }
    });
    go({section:'production', view:'detail', id});
  };

  return (
    <>
      <Header trail={[{label:'Producción', onClick:()=>go({section:'production'})},{label:'Nueva sesión'}]} go={go}
        right={<button className="btn" onClick={()=>go({section:'production'})}>Cancelar</button>}/>
      <div className="content" style={{maxWidth:980}}>
        <div className="card" style={{padding:'18px 20px'}}>
          <div className="section-title" style={{marginBottom:12}}>Crear sesión de producción</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div className="field"><label>Cliente</label>
              <select value={form.clientId} onChange={e=>setForm(f=>({...f, clientId:e.target.value}))}>
                <option value="">Seleccionar</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="field"><label>Campaña</label>
              <select value={form.campaignId} onChange={e=>setForm(f=>({...f, campaignId:e.target.value}))}>
                <option value="">Seleccionar</option>
                {campaigns.filter(c=>c.clientId===form.clientId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="field"><label>Fecha</label><input value={form.date} onChange={e=>setForm(f=>({...f, date:e.target.value}))} placeholder="ej. Mié 27 May"/></div>
            <div className="field"><label>Horario</label><input value={form.time} onChange={e=>setForm(f=>({...f, time:e.target.value}))} placeholder="09:00–13:00"/></div>
            <div className="field" style={{gridColumn:'1/-1'}}><label>Ubicación</label><input value={form.loc} onChange={e=>setForm(f=>({...f, loc:e.target.value}))}/></div>
            <div className="field"><label>Responsable foto</label>
              <select value={form.photo} onChange={e=>setForm(f=>({...f, photo:e.target.value}))}>{(window.TEAM||[]).map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select>
            </div>
            <div className="field"><label>Responsable video</label>
              <select value={form.video} onChange={e=>setForm(f=>({...f, video:e.target.value}))}>{(window.TEAM||[]).map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select>
            </div>
            <div className="field"><label>Dirección</label>
              <select value={form.director} onChange={e=>setForm(f=>({...f, director:e.target.value}))}>{(window.TEAM||[]).map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select>
            </div>
            <div className="field"><label>Contacto cliente</label><input value={form.clientContact} onChange={e=>setForm(f=>({...f, clientContact:e.target.value}))}/></div>
            <div className="field" style={{gridColumn:'1/-1'}}><label>Persona de apoyo cliente</label><input value={form.clientSupportPerson} onChange={e=>setForm(f=>({...f, clientSupportPerson:e.target.value}))}/></div>
            <div className="field" style={{gridColumn:'1/-1'}}><label>Notas</label><textarea rows={3} value={form.notes} onChange={e=>setForm(f=>({...f, notes:e.target.value}))}/></div>
          </div>

          <div className="between" style={{marginTop:14}}>
            <button className="btn" onClick={()=>go({section:'production'})}><Icon.arrowL size={12}/> Regresar</button>
            <button className="btn primary" onClick={onCreate}><Icon.check size={14}/> Crear sesión</button>
          </div>
        </div>
      </div>
    </>
  );
};

const ProductionDetail = ({go, sessionId}) => {
  const [state] = window.useStore();
  const session = (state.sessions || []).find(s => s.id === sessionId);
  if (!session) {
    return (
      <div className="content">
        <p>Sesión no encontrada.</p>
      </div>
    );
  }

  const campaign = (state.campaigns || []).find(c => c.id === session.campaignId) || (state.campaigns || []).find(c => c.name === session.campaign);
  const feedItems = campaign ? (state.feedItems?.[campaign.id] || []) : [];

  const [shotlist, setShotlist] = React.useState(session.shotlist || []);
  const [moodboard, setMoodboard] = React.useState(session.moodboard || '');
  const [requirements, setRequirements] = React.useState(session.requirements || [
    'Productos listos',
    'Locaciones disponibles',
    'Personas/modelos confirmados',
    'Permisos y uso de imagen',
    'Vestuario preparado',
    'Puntualidad del equipo',
  ]);
  const [checklist, setChecklist] = React.useState(session.checklist || {
    riderSent: session.rider === 'sent' || session.rider === 'approved',
    clientConfirmed: session.confirmed === 'confirmed' || session.confirmed === 'done',
    teamAssigned: true,
    locationConfirmed: false,
    materialReviewed: false,
    productionDone: session.confirmed === 'done',
  });

  const save = (patch = {}) => {
    window.A.updateSession(session.id, {
      shotlist,
      moodboard,
      requirements,
      checklist,
      ...patch,
    });
    window.__toast?.('Sesión actualizada.', 'success');
  };

  const addShot = () => {
    setShotlist(s => [...s, {
      id: `shot_${Date.now()}`,
      name: 'Nueva toma',
      type: 'Video',
      description: '',
      responsible: session.video || 'SP',
      priority: 'Media',
      status: 'Pendiente',
    }]);
  };

  return (
    <>
      <Header trail={[{label:'Producción', onClick:()=>go({section:'production'})},{label:session.client},{label:'Detalle sesión'}]} go={go}
        right={<>
          <button className="btn" onClick={()=>go({section:'riders', view:'create', campaignId:campaign?.id, sessionId:session.id})}><Icon.doc size={14}/> Crear rider</button>
          <button className="btn" onClick={()=>save({confirmed:'confirmed'})}>Marcar confirmada</button>
          <button className="btn primary" onClick={()=>save({confirmed:'done'})}>Marcar realizada</button>
        </>}/>
      <div className="content" style={{maxWidth:1280}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
          <div className="card" style={{padding:'16px 18px'}}>
            <div className="section-title" style={{marginBottom:10}}>A) Datos generales</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <KVD k="Cliente" v={session.client}/>
              <KVD k="Campaña" v={session.campaign}/>
              <KVD k="Fecha" v={session.date}/>
              <KVD k="Horario" v={session.time}/>
              <KVD k="Ubicación" v={session.loc}/>
              <KVD k="Contacto cliente" v={session.clientContact || '—'}/>
              <KVD k="Apoyo cliente" v={session.clientSupportPerson || '—'}/>
            </div>
          </div>

          <div className="card" style={{padding:'16px 18px'}}>
            <div className="section-title" style={{marginBottom:10}}>B) Entregables de sesión</div>
            <div style={{display:'flex',flexDirection:'column',gap:7}}>
              {['Reel','Post','Carrusel','Historia'].map(t => {
                const c = feedItems.filter(f => String(f.type).toLowerCase().includes(String(t).toLowerCase())).length;
                return <div key={t} className="between"><span>{t}</span><span className="chip">{c}</span></div>;
              })}
              <div className="between"><span>B-roll / clips extra</span><span className="chip">{feedItems.filter(f => f.isExtra).length}</span></div>
            </div>
          </div>

          <div className="card" style={{padding:'16px 18px',gridColumn:'1/-1'}}>
            <div className="between" style={{marginBottom:10}}>
              <div className="section-title">C) Shotlist</div>
              <button className="btn sm" onClick={addShot}><Icon.plus size={12}/> Agregar toma</button>
            </div>
            <table className="table">
              <thead><tr><th>Nombre</th><th>Tipo</th><th>Descripción</th><th>Responsable</th><th>Prioridad</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                {shotlist.map((s, i) => (
                  <tr key={s.id || i}>
                    <td><input value={s.name} onChange={e=>setShotlist(l=>l.map((x,j)=>j===i?{...x,name:e.target.value}:x))} style={{width:'100%',height:30,border:'1px solid var(--border)',borderRadius:6,padding:'0 8px'}}/></td>
                    <td><input value={s.type} onChange={e=>setShotlist(l=>l.map((x,j)=>j===i?{...x,type:e.target.value}:x))} style={{width:'100%',height:30,border:'1px solid var(--border)',borderRadius:6,padding:'0 8px'}}/></td>
                    <td><input value={s.description} onChange={e=>setShotlist(l=>l.map((x,j)=>j===i?{...x,description:e.target.value}:x))} style={{width:'100%',height:30,border:'1px solid var(--border)',borderRadius:6,padding:'0 8px'}}/></td>
                    <td><select value={s.responsible} onChange={e=>setShotlist(l=>l.map((x,j)=>j===i?{...x,responsible:e.target.value}:x))} style={{height:30,border:'1px solid var(--border)',borderRadius:6,padding:'0 8px'}}>{(window.TEAM||[]).map(t=><option key={t.id} value={t.id}>{t.id}</option>)}</select></td>
                    <td><select value={s.priority} onChange={e=>setShotlist(l=>l.map((x,j)=>j===i?{...x,priority:e.target.value}:x))} style={{height:30,border:'1px solid var(--border)',borderRadius:6,padding:'0 8px'}}><option>Alta</option><option>Media</option><option>Baja</option></select></td>
                    <td><select value={s.status} onChange={e=>setShotlist(l=>l.map((x,j)=>j===i?{...x,status:e.target.value}:x))} style={{height:30,border:'1px solid var(--border)',borderRadius:6,padding:'0 8px'}}><option>Pendiente</option><option>En curso</option><option>Hecha</option></select></td>
                    <td><button className="btn ghost sm" onClick={()=>setShotlist(l=>l.filter((_,j)=>j!==i))}><Icon.x size={12}/></button></td>
                  </tr>
                ))}
                {shotlist.length===0 && <tr><td colSpan={7} style={{padding:20,textAlign:'center',color:'var(--ink-3)'}}>Sin tomas capturadas todavía.</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="card" style={{padding:'16px 18px'}}>
            <div className="section-title" style={{marginBottom:10}}>D) Requerimientos del cliente</div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {requirements.map((r, i) => (
                <div key={i} style={{display:'flex',gap:8}}>
                  <input value={r} onChange={e=>setRequirements(list=>list.map((x,j)=>j===i?e.target.value:x))} style={{flex:1,height:34,border:'1px solid var(--border)',borderRadius:8,padding:'0 10px'}}/>
                  <button className="btn ghost sm" onClick={()=>setRequirements(list=>list.filter((_,j)=>j!==i))}><Icon.x size={12}/></button>
                </div>
              ))}
              <button className="btn sm" onClick={()=>setRequirements(list=>[...list, 'Nuevo requerimiento'])}><Icon.plus size={12}/> Agregar</button>
            </div>
          </div>

          <div className="card" style={{padding:'16px 18px'}}>
            <div className="section-title" style={{marginBottom:10}}>E/F) Responsabilidades y moodboard</div>
            <div style={{display:'grid',gap:8,marginBottom:10}}>
              {['Foto','Video','Dirección','Edición','Selección de material','Cuidado de marca'].map(k => (
                <div key={k} className="between"><span>{k}</span><span className="chip">{k==='Foto'?session.photo:k==='Video'?session.video:k==='Dirección'?session.director:'Equipo 642'}</span></div>
              ))}
            </div>
            <div className="field"><label>Moodboard (links o notas)</label><textarea rows={5} value={moodboard} onChange={e=>setMoodboard(e.target.value)} placeholder="Pega links de referencia, estilos visuales, encuadres, etc."/></div>
          </div>

          <div className="card" style={{padding:'16px 18px',gridColumn:'1/-1'}}>
            <div className="section-title" style={{marginBottom:10}}>G) Checklist de sesión</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
              {[
                ['riderSent','Rider enviado'],
                ['clientConfirmed','Cliente confirmó'],
                ['teamAssigned','Equipo asignado'],
                ['locationConfirmed','Locación confirmada'],
                ['materialReviewed','Material revisado'],
                ['productionDone','Producción finalizada'],
              ].map(([key,label]) => (
                <button key={key} className="btn" style={{justifyContent:'flex-start'}} onClick={()=>setChecklist(c=>({...c,[key]:!c[key]}))}>
                  <span className={`check ${checklist[key] ? 'done' : ''}`}/>{label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="between" style={{marginTop:14}}>
          <button className="btn" onClick={()=>go({section:'production'})}><Icon.arrowL size={12}/> Volver a producción</button>
          <button className="btn primary" onClick={()=>save()}><Icon.check size={14}/> Guardar sesión</button>
        </div>
      </div>
    </>
  );
};

window.Production = Production;

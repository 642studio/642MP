const WS_TABS = [
  {id:'summary',    label:'Resumen'},
  {id:'strategy',   label:'Estrategia'},
  {id:'feed',       label:'Feed'},
  {id:'production', label:'Producción'},
  {id:'approvals',  label:'Aprobaciones'},
  {id:'rider',      label:'Rider'},
  {id:'report',     label:'Reporte'},
];

const normalizeType = (t='') => {
  const v = String(t).toLowerCase();
  if (v.includes('reel')) return 'Reel';
  if (v.includes('post')) return 'Post';
  if (v.includes('carr')) return 'Carrusel';
  if (v.includes('hist')) return 'Historias';
  if (v.includes('sesi')) return 'Sesión';
  return t || 'Otro';
};

const buildContractedMap = (pkg) => {
  const map = {};
  (pkg?.deliverables||[]).forEach(d => {
    const key = normalizeType(d.type);
    map[key] = (map[key] || 0) + Number(d.qty || 0);
  });
  return map;
};

const buildPlannedMap = (items=[]) => {
  const map = {};
  items.forEach(i => {
    const key = normalizeType(i.type);
    map[key] = (map[key] || 0) + 1;
  });
  return map;
};

const Workspace = ({go, route}) => {
  const [state] = window.useStore();
  const clients = state.clients || [];
  const campaigns = state.campaigns || [];
  const packages = state.packages || [];
  const sessions = state.sessions || [];
  const riders = state.riders || [];
  const reports = state.internalReports || [];

  let campaign = null;
  if (route.campaignId) {
    campaign = campaigns.find(c => c.id === route.campaignId) || null;
  }
  if (!campaign && route.client) {
    campaign = campaigns.find(c => c.clientId === route.client) || null;
  }
  if (!campaign) campaign = campaigns[0] || null;

  if (!campaign) {
    return (
      <>
        <Header trail={[{label:'Campañas'},{label:'Workspace'}]}
          right={<button className="btn primary" onClick={()=>go({section:'campaigns', view:'create'})}><Icon.plus size={14}/> Crear campaña</button>}/>
        <div className="content" style={{maxWidth:980}}>
          <div className="card" style={{padding:'32px 34px',textAlign:'center'}}>
            <div className="uppercase" style={{marginBottom:8}}>Workspace</div>
            <h1 className="page-title" style={{marginBottom:8}}>No hay campañas disponibles</h1>
            <p className="page-sub" style={{marginBottom:18}}>Crea una campaña para empezar a planear feed, producción, rider y reporte.</p>
            <button className="btn primary" onClick={()=>go({section:'campaigns', view:'create'})}><Icon.plus size={14}/> Crear campaña</button>
          </div>
        </div>
      </>
    );
  }

  const client = clients.find(c => c.id === campaign.clientId) || clients.find(c => c.id === route.client) || null;
  const pkg = packages.find(p => p.name === campaign.package) || null;
  const items = state.feedItems?.[campaign.id] || [];
  const activeTab = route.wsTab || 'summary';

  const contractedMap = buildContractedMap(pkg);
  const plannedMap = buildPlannedMap(items);
  const contractedTotal = Object.values(contractedMap).reduce((s,n)=>s+n,0);
  const plannedTotal = items.length;

  const producedCount = items.filter(i => ['production','shot','editing','review','client_ready','sent','approved','published'].includes(i.state)).length;
  const editingCount = items.filter(i => ['editing','review','client_ready','sent'].includes(i.state)).length;
  const approvedCount = items.filter(i => ['approved','published'].includes(i.state)).length;
  const publishedCount = items.filter(i => i.state === 'published').length;

  const campaignSessions = sessions.filter(s => s.campaignId === campaign.id || s.campaign === campaign.name || s.clientId === campaign.clientId);
  const campaignRiders = riders.filter(r => r.campaignId === campaign.id);
  const campaignReports = reports.filter(r => r.campaignId === campaign.id);

  const checklist = [
    {id:'client', label:'Cliente capturado', done: !!client},
    {id:'package', label:'Paquete asignado', done: !!campaign.package},
    {id:'strategy', label:'Estrategia definida', done: !!(campaign.objective || campaign.audience || campaign.tone || campaign.mainCta)},
    {id:'feed', label:'Feed planeado', done: items.length > 0},
    {id:'production', label:'Producción creada', done: campaignSessions.length > 0},
    {id:'rider', label:'Rider generado', done: campaignRiders.length > 0 || campaignSessions.some(s => s.rider && s.rider !== 'none')},
    {id:'rider_sent', label:'Rider enviado', done: campaignRiders.some(r => ['sent','approved'].includes(r.status)) || campaignSessions.some(s => ['sent','approved'].includes(s.rider))},
    {id:'client_ok', label:'Cliente aprobó', done: approvedCount > 0},
    {id:'material', label:'Material producido', done: producedCount > 0},
    {id:'editing', label:'Edición terminada', done: items.length > 0 && items.every(i => !['editing','production','shot'].includes(i.state))},
    {id:'pub_ok', label:'Publicaciones aprobadas', done: items.length > 0 && approvedCount >= Math.min(items.length, contractedTotal || items.length)},
    {id:'report', label:'Reporte generado', done: campaignReports.length > 0},
  ];

  const doneChecklist = checklist.filter(c => c.done).length;
  const progress = checklist.length ? Math.round((doneChecklist / checklist.length) * 100) : 0;

  const headerRight = (
    <>
      <button className="btn" onClick={()=>window.__toast?.('Cambios guardados.', 'success')}><Icon.check size={14}/> Guardar</button>
      <button className="btn" onClick={()=>go({section:'campaigns', view:'workspace', client:campaign.clientId, campaignId:campaign.id, wsTab:'feed'})}><Icon.sparkles size={14}/> Generar feed con IA</button>
      <button className="btn" onClick={()=>go({section:'production', view:'create', campaignId:campaign.id, clientId:campaign.clientId})}><Icon.camera size={14}/> Crear sesión</button>
      <button className="btn" onClick={()=>go({section:'riders', view:'create', campaignId:campaign.id})}><Icon.doc size={14}/> Generar rider</button>
      <button className="btn primary" onClick={()=>go({section:'reports', view:'create', campaignId:campaign.id})}><Icon.download size={14}/> Exportar reporte</button>
    </>
  );

  const goTab = (tab) => go({
    section:'campaigns',
    view:'workspace',
    client:campaign.clientId,
    campaignId:campaign.id,
    wsTab:tab,
  });

  return (
    <>
      <Header trail={[{label:'Campañas', onClick:()=>go({section:'home'})},{label:client?.name || campaign.clientName || 'Cliente'},{label:campaign.name}]} go={go} right={headerRight}/>
      <div className="content">
        <div className="card" style={{padding:'18px 20px',marginBottom:16}}>
          <div className="between" style={{alignItems:'flex-start',marginBottom:12}}>
            <div>
              <div className="uppercase" style={{marginBottom:4}}>Workspace de campaña</div>
              <div style={{fontFamily:'var(--display)',fontSize:28,fontWeight:600,letterSpacing:'-.7px'}}>{campaign.name}</div>
              <div className="dim" style={{fontSize:13.5,marginTop:4}}>
                {client?.name || campaign.clientName || 'Cliente'} · {campaign.month} {campaign.year} · {campaign.package || 'Sin paquete'}
              </div>
            </div>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <span className="chip amber"><span className="dotc"/>{campaign.status || 'brief'}</span>
              {campaign.ownerId ? <span style={{display:'inline-flex',alignItems:'center',gap:8}}><Avatar id={campaign.ownerId}/><span className="dim" style={{fontSize:12}}>Responsable</span></span> : null}
            </div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:10,marginBottom:10}}>
            <Stat label="Entregables contratados" value={contractedTotal || '—'} sub={pkg ? pkg.name : 'sin paquete'}/>
            <Stat label="Entregables planeados" value={plannedTotal} sub={plannedTotal < contractedTotal ? `Faltan ${contractedTotal - plannedTotal}` : plannedTotal > contractedTotal ? `+${plannedTotal - contractedTotal} extra` : 'Paquete cubierto'}/>
            <Stat label="En edición" value={editingCount} sub="piezas en flujo"/>
            <Stat label="Aprobadas/Publicadas" value={`${approvedCount}/${publishedCount}`} sub="avance final"/>
          </div>

          <div>
            <div className="between" style={{marginBottom:6}}>
              <span className="uppercase">Progreso general</span>
              <span className="mono" style={{fontSize:12,color:'var(--ink-2)'}}>{progress}%</span>
            </div>
            <Bar value={progress}/>
          </div>
        </div>

        <TabRow tabs={WS_TABS} active={activeTab} onChange={goTab}/>

        <div style={{marginTop:18}}>
          {activeTab === 'summary' && <WorkspaceSummary campaign={campaign} client={client} pkg={pkg} items={items} contractedMap={contractedMap} plannedMap={plannedMap} checklist={checklist} go={go}/>} 
          {activeTab === 'strategy' && <WorkspaceStrategy campaign={campaign}/>} 
          {activeTab === 'feed' && <WorkspaceFeed campaign={campaign} client={client} pkg={pkg} />} 
          {activeTab === 'production' && <WorkspaceProduction campaign={campaign} sessions={campaignSessions} go={go} />} 
          {activeTab === 'approvals' && <WorkspaceApprovals campaign={campaign} go={go} state={state} />} 
          {activeTab === 'rider' && <WorkspaceRider campaign={campaign} riders={campaignRiders} go={go} />} 
          {activeTab === 'report' && <WorkspaceReport campaign={campaign} reports={campaignReports} go={go} />} 
        </div>
      </div>
    </>
  );
};

const WorkspaceSummary = ({campaign, client, pkg, items, contractedMap, plannedMap, checklist, go}) => {
  const rows = Object.keys(contractedMap).length
    ? Object.entries(contractedMap).map(([type,qty]) => {
        const planned = plannedMap[type] || 0;
        return { type, qty, planned, diff: planned - qty };
      })
    : Object.entries(plannedMap).map(([type,planned]) => ({ type, qty:0, planned, diff: planned }));

  return (
    <div style={{display:'grid',gridTemplateColumns:'1.2fr .8fr',gap:16}}>
      <div className="stack" style={{gap:16}}>
        <div className="card">
          <div className="hd">
            <div className="section-title">Entregables contratados vs planeados</div>
          </div>
          <div className="bd" style={{padding:0}}>
            <table className="table">
              <thead><tr><th>Tipo</th><th>Contratados</th><th>Planeados</th><th>Estatus</th></tr></thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.type}>
                    <td style={{fontWeight:500}}>{r.type}</td>
                    <td className="mono">{r.qty}</td>
                    <td className="mono">{r.planned}</td>
                    <td>
                      {r.diff < 0 && <span className="chip red">Faltan {Math.abs(r.diff)}</span>}
                      {r.diff === 0 && <span className="chip green">Completo</span>}
                      {r.diff > 0 && <span className="chip amber">+{r.diff} extra</span>}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={4} style={{padding:20,textAlign:'center',color:'var(--ink-3)'}}>Sin entregables definidos todavía.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="hd">
            <div className="section-title">Piezas del feed</div>
            <button className="btn sm" style={{marginLeft:'auto'}} onClick={()=>go({section:'campaigns', view:'workspace', client:campaign.clientId, campaignId:campaign.id, wsTab:'feed'})}>Abrir planner <Icon.chevR size={12}/></button>
          </div>
          <div className="bd" style={{padding:0}}>
            <table className="table">
              <thead><tr><th>Pieza</th><th>Tipo</th><th>Estado</th><th>Responsable</th></tr></thead>
              <tbody>
                {items.slice(0,10).map(i => (
                  <tr key={i.id}>
                    <td style={{fontWeight:500}}>{i.title || i.internal_title || `Pieza #${i.id}`}</td>
                    <td className="dim">{i.type}</td>
                    <td><StateChip state={i.state}/></td>
                    <td>{i.owner ? <Avatar id={i.owner}/> : '—'}</td>
                  </tr>
                ))}
                {items.length === 0 && <tr><td colSpan={4} style={{padding:20,textAlign:'center',color:'var(--ink-3)'}}>No hay piezas planeadas todavía.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="stack" style={{gap:16}}>
        <div className="card" style={{padding:'16px 18px'}}>
          <div className="section-title" style={{marginBottom:10}}>Checklist operativo</div>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {checklist.map(c => (
              <div key={c.id} style={{display:'flex',gap:10,alignItems:'center'}}>
                <span className={`check ${c.done ? 'done' : ''}`}/>
                <span style={{fontSize:13.2,color:c.done ? 'var(--ink)' : 'var(--ink-2)'}}>{c.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{padding:'16px 18px'}}>
          <div className="uppercase" style={{marginBottom:8}}>Información base</div>
          <WSKVD k="Cliente" v={client?.name || campaign.clientName || '—'}/>
          <div className="divider"/>
          <WSKVD k="Paquete" v={campaign.package || 'Sin paquete'}/>
          <div className="divider"/>
          <WSKVD k="Objetivo" v={campaign.objective || 'Sin definir'}/>
          <div className="divider"/>
          <WSKVD k="CTA" v={campaign.mainCta || 'Sin definir'}/>
        </div>
      </div>
    </div>
  );
};

const WSKVD = ({k, v}) => (
  <div>
    <div className="uppercase" style={{marginBottom:4}}>{k}</div>
    <div style={{fontSize:13.5,fontWeight:500,color:'var(--ink-2)'}}>{v || '—'}</div>
  </div>
);

const WorkspaceStrategy = ({campaign}) => {
  const [form, setForm] = React.useState({
    objective: campaign.objective || '',
    audience: campaign.audience || '',
    tone: campaign.tone || '',
    mainCta: campaign.mainCta || '',
    activePromotion: campaign.activePromotion || '',
    contentPillars: Array.isArray(campaign.contentPillars) ? campaign.contentPillars.join(', ') : (campaign.contentPillars || ''),
    competitors: Array.isArray(campaign.competitors) ? campaign.competitors.join(', ') : (campaign.competitors || ''),
    differentiator: campaign.differentiator || '',
    notes: campaign.notes || '',
    restrictions: campaign.restrictions || '',
  });
  const [saving, setSaving] = React.useState(false);

  const onSave = () => {
    setSaving(true);
    window.A.updateCampaign(campaign.id, {
      objective: form.objective,
      audience: form.audience,
      tone: form.tone,
      mainCta: form.mainCta,
      activePromotion: form.activePromotion,
      contentPillars: form.contentPillars.split(',').map(s=>s.trim()).filter(Boolean),
      competitors: form.competitors.split(',').map(s=>s.trim()).filter(Boolean),
      differentiator: form.differentiator,
      notes: form.notes,
      restrictions: form.restrictions,
      status: 'planning',
    });
    setTimeout(() => {
      setSaving(false);
      window.__toast?.('Estrategia guardada.', 'success');
    }, 220);
  };

  return (
    <div className="card" style={{padding:'18px 20px'}}>
      <div className="between" style={{marginBottom:14}}>
        <div>
          <div className="section-title">Estrategia del mes</div>
          <div className="dim" style={{fontSize:12.5}}>Define lineamientos para generar y validar el feed.</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn"><Icon.sparkles size={14}/> Mejorar con IA</button>
          <button className="btn primary" onClick={onSave} disabled={saving}>{saving ? 'Guardando…' : 'Guardar estrategia'}</button>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <div className="field" style={{gridColumn:'1/-1'}}><label>Objetivo del mes</label><textarea rows={2} value={form.objective} onChange={e=>setForm(f=>({...f, objective:e.target.value}))}/></div>
        <div className="field"><label>Audiencia</label><input value={form.audience} onChange={e=>setForm(f=>({...f, audience:e.target.value}))}/></div>
        <div className="field"><label>Tono</label><input value={form.tone} onChange={e=>setForm(f=>({...f, tone:e.target.value}))}/></div>
        <div className="field"><label>CTA principal</label><input value={form.mainCta} onChange={e=>setForm(f=>({...f, mainCta:e.target.value}))}/></div>
        <div className="field"><label>Promoción activa</label><input value={form.activePromotion} onChange={e=>setForm(f=>({...f, activePromotion:e.target.value}))}/></div>
        <div className="field" style={{gridColumn:'1/-1'}}><label>Pilares de contenido (coma separada)</label><input value={form.contentPillars} onChange={e=>setForm(f=>({...f, contentPillars:e.target.value}))}/></div>
        <div className="field"><label>Competidores</label><input value={form.competitors} onChange={e=>setForm(f=>({...f, competitors:e.target.value}))}/></div>
        <div className="field"><label>Diferenciadores</label><input value={form.differentiator} onChange={e=>setForm(f=>({...f, differentiator:e.target.value}))}/></div>
        <div className="field"><label>Notas creativas</label><textarea rows={3} value={form.notes} onChange={e=>setForm(f=>({...f, notes:e.target.value}))}/></div>
        <div className="field"><label>Restricciones / no hacer</label><textarea rows={3} value={form.restrictions} onChange={e=>setForm(f=>({...f, restrictions:e.target.value}))}/></div>
      </div>
    </div>
  );
};

const WorkspaceFeed = ({campaign, client, pkg}) => {
  const FeedPlannerComp = window.FeedPlanner;
  if (!FeedPlannerComp) {
    return <div className="card" style={{padding:24}}>Cargando planner…</div>;
  }
  return <FeedPlannerComp campaign={campaign} client={client} pkg={pkg}/>;
};

const WorkspaceProduction = ({campaign, sessions, go}) => (
  <div className="card" style={{padding:'18px 20px'}}>
    <div className="between" style={{marginBottom:12}}>
      <div>
        <div className="section-title">Producción vinculada</div>
        <div className="dim" style={{fontSize:12.5}}>Sesiones de producción asociadas a esta campaña.</div>
      </div>
      <button className="btn primary" onClick={()=>go({section:'production', view:'create', campaignId:campaign.id, clientId:campaign.clientId})}><Icon.plus size={14}/> Nueva sesión</button>
    </div>
    <table className="table">
      <thead><tr><th>Fecha</th><th>Horario</th><th>Locación</th><th>Rider</th><th>Confirmación</th><th></th></tr></thead>
      <tbody>
        {sessions.map(s => (
          <tr key={s.id}>
            <td style={{fontWeight:500}}>{s.date}</td>
            <td className="dim">{s.time}</td>
            <td className="dim">{s.loc}</td>
            <td><span className={`chip ${s.rider==='approved'?'green':s.rider==='sent'?'purple':s.rider==='draft'?'amber':'red'}`}>{s.rider || 'none'}</span></td>
            <td><span className={`chip ${s.confirmed==='confirmed'?'green':s.confirmed==='done'?'black':'amber'}`}>{s.confirmed || 'pending'}</span></td>
            <td style={{textAlign:'right'}}><button className="btn sm" onClick={()=>go({section:'production', view:'detail', id:s.id})}>Abrir</button></td>
          </tr>
        ))}
        {sessions.length===0 && <tr><td colSpan={6} style={{padding:20,textAlign:'center',color:'var(--ink-3)'}}>Sin sesiones vinculadas todavía.</td></tr>}
      </tbody>
    </table>
  </div>
);

const WorkspaceApprovals = ({campaign, go, state}) => {
  const cards = (state.approvals||[]).filter(a => {
    const c = String(a.campaign || '').toLowerCase();
    return c.includes(String(campaign.month||'').toLowerCase()) || c.includes(String(campaign.name||'').split(' ')[0].toLowerCase()) || String(a.client||'').toLowerCase().includes(String(campaign.clientName||'').toLowerCase());
  });

  return (
    <div className="card" style={{padding:'18px 20px'}}>
      <div className="between" style={{marginBottom:12}}>
        <div>
          <div className="section-title">Aprobaciones de la campaña</div>
          <div className="dim" style={{fontSize:12.5}}>{cards.length} tarjetas relacionadas</div>
        </div>
        <button className="btn" onClick={()=>go({section:'approvals'})}>Abrir tablero completo <Icon.chevR size={12}/></button>
      </div>
      <table className="table">
        <thead><tr><th>Pieza</th><th>Tipo</th><th>Responsable</th><th>Estado</th><th>Fecha límite</th></tr></thead>
        <tbody>
          {cards.map(c => (
            <tr key={c.id}>
              <td style={{fontWeight:500}}>{c.piece}</td>
              <td className="dim">{c.type}</td>
              <td>{c.owner ? <Avatar id={c.owner}/> : '—'}</td>
              <td><span className="chip">{c.col}</span></td>
              <td className="dim">{c.due || '—'}</td>
            </tr>
          ))}
          {cards.length===0 && <tr><td colSpan={5} style={{padding:20,textAlign:'center',color:'var(--ink-3)'}}>No hay aprobaciones mapeadas aún para esta campaña.</td></tr>}
        </tbody>
      </table>
    </div>
  );
};

const WorkspaceRider = ({campaign, riders, go}) => (
  <div className="card" style={{padding:'18px 20px'}}>
    <div className="between" style={{marginBottom:12}}>
      <div>
        <div className="section-title">Rider de producción</div>
        <div className="dim" style={{fontSize:12.5}}>Genera, edita y envía el rider desde esta campaña.</div>
      </div>
      <button className="btn primary" onClick={()=>go({section:'riders', view:'create', campaignId:campaign.id})}><Icon.doc size={14}/> Crear rider</button>
    </div>

    <table className="table">
      <thead><tr><th>Título</th><th>Estatus</th><th>Actualizado</th><th></th></tr></thead>
      <tbody>
        {riders.map(r => (
          <tr key={r.id}>
            <td style={{fontWeight:500}}>{r.title || 'Rider de Producción'}</td>
            <td><span className={`chip ${r.status==='approved'?'green':r.status==='sent'?'purple':r.status==='draft'?'amber':'outline'}`}>{r.status || 'draft'}</span></td>
            <td className="dim">{r.updatedAt ? new Date(r.updatedAt).toLocaleString('es-MX') : '—'}</td>
            <td style={{textAlign:'right'}}><button className="btn sm" onClick={()=>go({section:'riders', view:'detail', id:r.id})}>Abrir</button></td>
          </tr>
        ))}
        {riders.length===0 && <tr><td colSpan={4} style={{padding:20,textAlign:'center',color:'var(--ink-3)'}}>Todavía no existe rider para esta campaña.</td></tr>}
      </tbody>
    </table>
  </div>
);

const WorkspaceReport = ({campaign, reports, go}) => (
  <div className="card" style={{padding:'18px 20px'}}>
    <div className="between" style={{marginBottom:12}}>
      <div>
        <div className="section-title">Reporte interno</div>
        <div className="dim" style={{fontSize:12.5}}>Histórico de reportes generados para esta campaña.</div>
      </div>
      <button className="btn primary" onClick={()=>go({section:'reports', view:'create', campaignId:campaign.id})}><Icon.chart size={14}/> Generar reporte</button>
    </div>

    <table className="table">
      <thead><tr><th>Fecha</th><th>Resumen</th><th></th></tr></thead>
      <tbody>
        {reports.map(r => (
          <tr key={r.id}>
            <td style={{fontWeight:500}}>{new Date(r.createdAt).toLocaleString('es-MX')}</td>
            <td className="dim">{r.summary || 'Reporte operativo guardado.'}</td>
            <td style={{textAlign:'right'}}><button className="btn sm" onClick={()=>go({section:'reports', view:'detail', id:r.id})}>Ver</button></td>
          </tr>
        ))}
        {reports.length===0 && <tr><td colSpan={3} style={{padding:20,textAlign:'center',color:'var(--ink-3)'}}>No hay reportes guardados para esta campaña.</td></tr>}
      </tbody>
    </table>
  </div>
);

window.Workspace = Workspace;

const RidersIndex = ({go, route = {}}) => {
  if (route.view === 'create') return <RiderEditor go={go} route={route} mode="create"/>;
  if (route.view === 'detail') return <RiderEditor go={go} route={route} mode="detail"/>;

  const [state] = window.useStore();
  const riders = state.riders || [];
  const campaigns = state.campaigns || [];
  const sessions = state.sessions || [];

  return (
    <>
      <Header trail={[{label:'642 Studio'},{label:'Riders'}]}
        right={<button className="btn primary" onClick={()=>go({section:'riders', view:'create'})}><Icon.plus size={14}/> Crear rider</button>}/>
      <div className="content">
        <div className="between" style={{marginBottom:16}}>
          <div>
            <h1 className="page-title">Rider Builder</h1>
            <p className="page-sub">Documento operativo para enviar al cliente antes de la sesión.</p>
          </div>
          <span className="chip">{riders.length} riders</span>
        </div>

        <div className="card" style={{padding:0,marginBottom:14}}>
          <table className="table">
            <thead><tr><th>Título</th><th>Campaña</th><th>Sesión</th><th>Estatus</th><th>Actualizado</th><th></th></tr></thead>
            <tbody>
              {riders.map(r => {
                const campaign = campaigns.find(c => c.id === r.campaignId);
                const session = sessions.find(s => s.id === r.sessionId);
                return (
                  <tr key={r.id} className="clickable" onClick={()=>go({section:'riders', view:'detail', id:r.id})}>
                    <td style={{fontWeight:500}}>{r.title || 'Rider de Producción'}</td>
                    <td className="dim">{campaign?.name || '—'}</td>
                    <td className="dim">{session ? `${session.date} · ${session.time}` : '—'}</td>
                    <td><span className={`chip ${r.status==='approved'?'green':r.status==='sent'?'purple':r.status==='draft'?'amber':'outline'}`}>{r.status || 'draft'}</span></td>
                    <td className="dim">{r.updatedAt ? new Date(r.updatedAt).toLocaleString('es-MX') : '—'}</td>
                    <td style={{textAlign:'right'}}><button className="btn sm" onClick={e=>{e.stopPropagation();go({section:'riders', view:'detail', id:r.id});}}>Abrir</button></td>
                  </tr>
                );
              })}
              {riders.length===0 && <tr><td colSpan={6} style={{padding:24,textAlign:'center',color:'var(--ink-3)'}}>No hay riders creados todavía.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="card" style={{padding:'16px 18px'}}>
          <div className="section-title" style={{marginBottom:10}}>Sesiones listas para rider</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
            {sessions.map(s => (
              <div key={s.id} style={{border:'1px solid var(--border)',borderRadius:8,padding:'10px 11px'}}>
                <div style={{fontWeight:600,marginBottom:3}}>{s.client}</div>
                <div className="dim" style={{fontSize:12.5,marginBottom:4}}>{s.campaign}</div>
                <div className="dim" style={{fontSize:12.5,marginBottom:8}}>{s.date} · {s.time}</div>
                <button className="btn sm" onClick={()=>go({section:'riders', view:'create', sessionId:s.id})}><Icon.doc size={12}/> Generar rider</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

const defaultRiderContent = ({campaign, session}) => ({
  coverTitle: 'Rider de Producción',
  objective: campaign?.objective || '',
  deliverables: `Fotografías, Reels, Historias y clips extra según campaña ${campaign?.name || ''}`,
  moodboard: session?.moodboard || '',
  clientResponsibilities: 'Productos listos, locaciones confirmadas, permisos de uso de imagen, puntualidad.',
  studioResponsibilities: 'Captura profesional, dirección creativa, cuidado de marca, selección y edición de material.',
  photoLine: 'Planos generales, close-ups, producto, ambiente, equipo/personas.',
  reelLine: 'Escenas clave, hooks, entrevistas cortas, b-roll.',
  deadlines: 'Previsualización 48h después de sesión. Entrega final según paquete contratado.',
  extras: '',
  confirmation: 'Confirmación de fecha, horario y requerimientos operativos.',
});

const RiderEditor = ({go, route, mode}) => {
  const [state] = window.useStore();
  const riders = state.riders || [];
  const campaigns = state.campaigns || [];
  const sessions = state.sessions || [];

  const existing = mode === 'detail' ? riders.find(r => r.id === route.id) : null;
  const session = sessions.find(s => s.id === (route.sessionId || existing?.sessionId)) || null;
  const campaign = campaigns.find(c => c.id === (route.campaignId || existing?.campaignId || session?.campaignId)) || campaigns[0] || null;

  const [title, setTitle] = React.useState(existing?.title || 'Rider de Producción');
  const [status, setStatus] = React.useState(existing?.status || 'draft');
  const [sessionId, setSessionId] = React.useState(existing?.sessionId || route.sessionId || session?.id || '');
  const [campaignId, setCampaignId] = React.useState(existing?.campaignId || route.campaignId || campaign?.id || '');
  const [content, setContent] = React.useState(existing?.content || defaultRiderContent({campaign, session}));

  React.useEffect(() => {
    if (mode === 'create' && !existing && !content.coverTitle) {
      setContent(defaultRiderContent({campaign, session}));
    }
  }, [campaignId, sessionId]);

  const linkedSession = sessions.find(s => s.id === sessionId) || null;
  const linkedCampaign = campaigns.find(c => c.id === campaignId) || null;
  const linkedClient = linkedCampaign ? (state.clients || []).find(c => c.id === linkedCampaign.clientId) : null;

  const save = () => {
    const payload = {
      title,
      status,
      sessionId: sessionId || null,
      campaignId: campaignId || null,
      content,
      sentAt: status === 'sent' ? (existing?.sentAt || new Date().toISOString()) : null,
      approvedAt: status === 'approved' ? (existing?.approvedAt || new Date().toISOString()) : null,
    };

    if (existing) {
      window.A.updateRider(existing.id, payload);
      window.__toast?.('Rider actualizado.', 'success');
    } else {
      const id = window.A.createRider(payload);
      window.__toast?.('Rider creado.', 'success');
      go({section:'riders', view:'detail', id});
      return;
    }
  };

  const markSent = () => {
    setStatus('sent');
    if (sessionId) window.A.updateSession(sessionId, {rider:'sent'});
  };

  const markApproved = () => {
    setStatus('approved');
    if (sessionId) window.A.updateSession(sessionId, {rider:'approved'});
  };

  return (
    <>
      <Header trail={[{label:'Riders', onClick:()=>go({section:'riders'})},{label:existing ? 'Detalle' : 'Nuevo rider'}]} go={go}
        right={<>
          <button className="btn" onClick={()=>window.print()}><Icon.pdf size={14}/> Imprimir / Guardar PDF</button>
          <button className="btn" onClick={markSent}>Marcar enviado</button>
          <button className="btn" onClick={markApproved}>Marcar aprobado</button>
          <button className="btn primary" onClick={save}><Icon.check size={14}/> Guardar rider</button>
        </>}/>
      <div className="content" style={{maxWidth:1280}}>
        <div style={{display:'grid',gridTemplateColumns:'420px 1fr',gap:14}}>
          <div className="card" style={{padding:'16px 18px'}}>
            <div className="section-title" style={{marginBottom:10}}>Configuración</div>
            <div className="field"><label>Título</label><input value={title} onChange={e=>setTitle(e.target.value)}/></div>
            <div className="field"><label>Estatus</label>
              <select value={status} onChange={e=>setStatus(e.target.value)}>
                <option value="draft">Borrador</option>
                <option value="sent">Enviado</option>
                <option value="approved">Aprobado</option>
              </select>
            </div>
            <div className="field"><label>Campaña</label>
              <select value={campaignId} onChange={e=>setCampaignId(e.target.value)}>
                <option value="">Sin campaña</option>
                {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="field"><label>Sesión</label>
              <select value={sessionId} onChange={e=>setSessionId(e.target.value)}>
                <option value="">Sin sesión</option>
                {sessions.map(s => <option key={s.id} value={s.id}>{s.client} · {s.date}</option>)}
              </select>
            </div>

            <div className="divider"/>
            <div className="section-title" style={{fontSize:15,marginBottom:8}}>Secciones</div>
            {[
              ['objective','Objetivo de sesión'],
              ['deliverables','Entregables finales'],
              ['moodboard','Moodboard'],
              ['clientResponsibilities','Responsabilidades del cliente'],
              ['studioResponsibilities','Responsabilidades de 642 Studio'],
              ['photoLine','Línea de producción fotográfica'],
              ['reelLine','Línea de producción de reels'],
              ['deadlines','Plazos de entrega'],
              ['extras','Requerimientos extra'],
              ['confirmation','Confirmación final'],
            ].map(([k, label]) => (
              <div className="field" key={k} style={{marginBottom:8}}>
                <label>{label}</label>
                <textarea rows={2} value={content[k] || ''} onChange={e=>setContent(c=>({...c,[k]:e.target.value}))}/>
              </div>
            ))}
          </div>

          <div className="card" style={{padding:'26px 34px',background:'#fff'}}>
            <div style={{borderBottom:'2px solid #111',paddingBottom:16,marginBottom:18}}>
              <div className="uppercase" style={{marginBottom:8}}>642 Studio</div>
              <div style={{fontFamily:'var(--display)',fontSize:34,fontWeight:700,letterSpacing:'-1px'}}>642</div>
              <div style={{fontFamily:'var(--display)',fontSize:30,fontWeight:600,letterSpacing:'-.8px',marginTop:2}}>{title}</div>
              <div className="dim" style={{marginTop:6,fontSize:13}}>{linkedClient?.name || linkedCampaign?.clientName || 'Cliente'} · {linkedCampaign?.name || 'Campaña'} · {linkedCampaign?.month || ''} {linkedCampaign?.year || ''}</div>
            </div>

            <RiderSection title="Fecha y horario" body={`${linkedSession?.date || 'Por definir'} · ${linkedSession?.time || 'Por definir'} · ${linkedSession?.loc || 'Por definir'}`}/>
            <RiderSection title="Entregables finales" body={content.deliverables}/>
            <RiderSection title="Objetivo de sesión" body={content.objective}/>
            <RiderSection title="Moodboard" body={content.moodboard}/>
            <RiderSection title="Responsabilidades del cliente" body={content.clientResponsibilities}/>
            <RiderSection title="Responsabilidades de 642 Studio" body={content.studioResponsibilities}/>
            <RiderSection title="Línea de producción fotográfica" body={content.photoLine}/>
            <RiderSection title="Línea de producción de reels" body={content.reelLine}/>
            <RiderSection title="Plazos de entrega" body={content.deadlines}/>
            <RiderSection title="Requerimientos extra" body={content.extras}/>
            <RiderSection title="Confirmación final" body={content.confirmation}/>

            <div style={{marginTop:16,paddingTop:12,borderTop:'1px solid var(--border)',fontSize:12.5,color:'var(--ink-2)'}}>
              Estatus actual: <span className="chip" style={{marginLeft:6}}>{status}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const RiderSection = ({title, body}) => (
  <div style={{marginBottom:14}}>
    <div className="uppercase" style={{marginBottom:5}}>{title}</div>
    <div style={{fontSize:13.5,lineHeight:1.6,color:'var(--ink-2)'}}>{body || '—'}</div>
  </div>
);

window.RidersIndex = RidersIndex;

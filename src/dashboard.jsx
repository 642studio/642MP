// Dashboard — operative control center with live store data.

const Dashboard = ({go}) => {
  const [state] = window.useStore();
  const clients    = state.clients || [];
  const campaigns  = state.campaigns || [];
  const sessions   = state.sessions || [];
  const approvals  = state.approvals || [];
  const feedItems  = state.feedItems || {};

  const today = new Date().toLocaleDateString('es-MX', {weekday:'long', day:'numeric', month:'long', year:'numeric'});

  // Compute KPIs
  const activeCampaigns  = campaigns.filter(c => c.status !== 'closed').length;
  const upcomingSessions = sessions.filter(s => s.confirmed !== 'done').length;
  const pendingApprovals = approvals.filter(a => ['internal_review','ready_client','client_changes'].includes(a.col)).length;
  const ridersNeeded     = sessions.filter(s => s.rider === 'none').length;
  const allFeedItems     = Object.values(feedItems).flat();
  const pendingPieces    = allFeedItems.filter(t => !['approved','published'].includes(t.state)).length;
  const overduePieces    = allFeedItems.filter(t => t.state === 'changes').length;

  const nextActions = {
    hollman:'Enviar carrusel a cliente',
    casavera:'Producción viernes 7am',
    pasarela:'Faltan 2 historias por planear',
    nordheim:'Generar reporte mensual',
    salmar:'Generar rider de sesión',
    kineo:'Aprobar reel #2',
  };

  return (
    <>
      <Header trail={[{label:'642 Studio'},{label:'Panel operativo'}]}
        right={<>
          <button className="btn"><Icon.filter size={14}/> Filtros</button>
          <button className="btn primary" onClick={()=>go({section:'campaigns', view:'create'})}>
            <Icon.plus size={14}/> Nueva campaña
          </button>
        </>}/>
      <div className="content">
        <div className="between" style={{marginBottom:22}}>
          <div>
            <div className="uppercase" style={{marginBottom:6}}>HOY · {today}</div>
            <h1 className="page-title">Panel operativo</h1>
            <p className="page-sub">Bienvenido al sistema de producción creativa de 642 Studio.</p>
          </div>
          <div style={{display:'flex',gap:10}}>
            <button className="btn"><Icon.download size={14}/> Reporte semanal</button>
            <button className="btn" onClick={()=>go({section:'production'})}><Icon.calendar size={14}/> Ver producción</button>
          </div>
        </div>

        {/* KPIs */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:12,marginBottom:24}}>
          <Stat label="Campañas activas"      value={activeCampaigns}   sub={`${clients.filter(c=>c.status==='active').length} clientes activos`} icon={<Icon.briefcase size={14}/>}/>
          <Stat label="Producciones próximas" value={upcomingSessions}  sub="por confirmar"                icon={<Icon.camera size={14}/>}/>
          <Stat label="Piezas pendientes"     value={pendingPieces}     sub="sin aprobar"                 icon={<Icon.grid size={14}/>}/>
          <Stat label="Riders por generar"    value={ridersNeeded}      sub="sesiones sin rider"          icon={<Icon.doc size={14}/>}/>
          <Stat label="Aprobaciones"          value={pendingApprovals}  sub="en revisión o cambios"       icon={<Icon.check size={14}/>}/>
          <Stat label="Piezas con cambios"    value={overduePieces}     sub="acción inmediata" tone="red" icon={<Icon.flame size={14}/>}/>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1.15fr .85fr',gap:20}}>
          {/* LEFT */}
          <div style={{display:'flex',flexDirection:'column',gap:20}}>
            <div>
              <SectionHd kicker="Hoy requiere atención" title="Elementos pendientes en orden de prioridad"
                right={<button className="btn ghost sm">Ver todo <Icon.chevR size={12}/></button>}/>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {(window.ATTENTION||[]).map((it,i)=>(
                  <AttentionRow key={i} item={it} onClick={()=>{
                    const c = (state.clients||[]).find(x=>x.name===it.client);
                    if(c) {
                      const camp = (state.campaigns||[]).find(x=>x.clientId===c.id);
                      if(camp) go({section:'campaigns', view:'workspace', client:c.id, campaignId:camp.id});
                      else go({section:'clients', view:'profile', client:c.id});
                    }
                  }}/>
                ))}
              </div>
            </div>

            <div>
              <SectionHd kicker="Próximas sesiones" title="Producciones agendadas"
                right={<button className="btn ghost sm" onClick={()=>go({section:'production'})}>Calendario completo <Icon.chevR size={12}/></button>}/>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                {sessions.slice(0,4).map(s=>(
                  <ProductionMiniCard key={s.id} s={s} onClick={()=>go({section:'production', view:'detail', id:s.id})}/>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div style={{display:'flex',flexDirection:'column',gap:20}}>
            <div className="card nopad">
              <div className="hd">
                <div>
                  <div className="uppercase">Junio 2026</div>
                  <div className="section-title">Campañas del mes</div>
                </div>
                <div style={{marginLeft:'auto',display:'flex',gap:6}}>
                  <span className="chip">{activeCampaigns} activas</span>
                </div>
              </div>
              <div className="bd" style={{padding:0}}>
                <table className="table">
                  <thead><tr><th>Cliente</th><th>Progreso</th><th>Resp.</th><th>Próxima acción</th></tr></thead>
                  <tbody>
                    {campaigns.filter(c=>c.status!=='closed').map(camp=>{
                      const client = clients.find(x=>x.id===camp.clientId);
                      if(!client) return null;
                      const items = feedItems[camp.id] || [];
                      const pkg = (state.packages||[]).find(p=>p.name===camp.package);
                      const contracted = pkg ? pkg.deliverables.reduce((s,d)=>s+d.qty,0) : 16;
                      const done = items.filter(t=>['approved','published'].includes(t.state)).length;
                      const pct = contracted ? (done/contracted*100) : 0;
                      const risk = done < contracted*0.5;
                      return (
                        <tr key={camp.id} className="clickable" onClick={()=>go({section:'campaigns', view:'workspace', client:camp.clientId, campaignId:camp.id})}>
                          <td>
                            <div style={{display:'flex',gap:10,alignItems:'center'}}>
                              <ClientLogo client={client} size={30}/>
                              <div>
                                <div style={{fontWeight:500}}>{client.name}</div>
                                <div className="dim" style={{fontSize:11.5}}>{camp.package} · {camp.name}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{width:180}}>
                            <div style={{display:'flex',gap:8,alignItems:'center'}}>
                              <Bar value={pct} tone={risk?'amber':''}/>
                              <span className="mono dim" style={{fontSize:11.5}}>{done}/{contracted}</span>
                            </div>
                          </td>
                          <td><Avatar id={camp.ownerId}/></td>
                          <td className="dim" style={{fontSize:12.5}}>{nextActions[camp.clientId]||'—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div className="card" style={{padding:'14px 16px'}}>
                <div className="uppercase" style={{marginBottom:8}}>Mes en números</div>
                {[
                  {l:'Piezas planeadas',    v:`${allFeedItems.length} / ${allFeedItems.length+pendingPieces}`},
                  {l:'Sesiones agendadas',  v:`${sessions.length}`},
                  {l:'Aprobaciones cliente',v:`${approvals.filter(a=>a.col==='approved').length}`},
                  {l:'Publicaciones',       v:`${allFeedItems.filter(t=>t.state==='published').length}`, tone:'green'},
                ].map((s,i)=>(
                  <div key={i} className="between" style={{padding:'4px 0'}}>
                    <span className="dim" style={{fontSize:12.5}}>{s.l}</span>
                    <span className="display" style={{fontSize:18,fontWeight:600,color:s.tone==='green'?'var(--green)':'var(--ink)'}}>{s.v}</span>
                  </div>
                ))}
              </div>
              <div className="card" style={{padding:'14px 16px'}}>
                <div className="uppercase" style={{marginBottom:8}}>Atajos rápidos</div>
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  <button className="btn sm" style={{justifyContent:'flex-start'}} onClick={()=>go({section:'campaigns', view:'create'})}><Icon.plus size={12}/> Crear campaña</button>
                  <button className="btn sm" style={{justifyContent:'flex-start'}} onClick={()=>go({section:'clients', view:'create'})}><Icon.users size={12}/> Alta de cliente</button>
                  <button className="btn sm" style={{justifyContent:'flex-start'}} onClick={()=>go({section:'riders'})}><Icon.doc size={12}/> Generar rider</button>
                  <button className="btn sm" style={{justifyContent:'flex-start'}} onClick={()=>go({section:'production'})}><Icon.camera size={12}/> Agendar sesión</button>
                  <button className="btn sm" style={{justifyContent:'flex-start'}} onClick={()=>go({section:'approvals'})}><Icon.check size={12}/> Ver aprobaciones</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const ProductionMiniCard = ({s, onClick}) => {
  const riderChip = {
    sent:    <span className="chip purple"><span className="dotc"/>Rider enviado</span>,
    approved:<span className="chip green"><span className="dotc"/>Rider aprobado</span>,
    draft:   <span className="chip amber"><span className="dotc"/>Rider borrador</span>,
    none:    <span className="chip red"><span className="dotc"/>Sin rider</span>,
  }[s.rider] || <span className="chip outline">—</span>;

  return (
    <div className="card" style={{padding:'14px 16px',cursor:'pointer'}} onClick={onClick}>
      <div className="between">
        <div className="uppercase">{s.date}</div>
        <Icon.more/>
      </div>
      <div style={{fontFamily:'var(--display)',fontWeight:600,fontSize:16,letterSpacing:'-.2px',margin:'4px 0 2px'}}>{s.client}</div>
      <div className="dim" style={{fontSize:12.5}}>{s.campaign}</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr',gap:4,fontSize:12.5,margin:'10px 0 12px'}}>
        <div style={{display:'flex',gap:8,alignItems:'center'}}><Icon.clock size={12}/><span className="dim">{s.time}</span></div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}><Icon.pin size={12}/><span className="dim">{s.loc}</span></div>
      </div>
      <div className="between">
        <div style={{display:'flex',gap:4}}><Avatar id={s.photo}/>{s.video&&s.video!=='—'&&<Avatar id={s.video}/>}</div>
        {riderChip}
      </div>
    </div>
  );
};

window.Dashboard = Dashboard;

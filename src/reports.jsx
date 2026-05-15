const ReportsIndex = ({go, route = {}}) => {
  if (route.view === 'create') return <ReportBuilder go={go} route={route}/>;
  if (route.view === 'detail') return <ReportDetail go={go} id={route.id}/>;

  const [state] = window.useStore();
  const reports = state.internalReports || [];
  const campaigns = state.campaigns || [];

  return (
    <>
      <Header trail={[{label:'642 Studio'},{label:'Reportes'}]}
        right={<button className="btn primary" onClick={()=>go({section:'reports', view:'create'})}><Icon.plus size={14}/> Generar reporte</button>}/>
      <div className="content">
        <div className="between" style={{marginBottom:16}}>
          <div>
            <h1 className="page-title">Reportes internos</h1>
            <p className="page-sub">Resumen operativo mensual por campaña para seguimiento de equipo.</p>
          </div>
          <span className="chip">{reports.length} reportes</span>
        </div>

        <div className="card" style={{padding:0}}>
          <table className="table">
            <thead><tr><th>Fecha</th><th>Campaña</th><th>Cliente</th><th>Resumen</th><th></th></tr></thead>
            <tbody>
              {reports.map(r => {
                const campaign = campaigns.find(c => c.id === r.campaignId);
                return (
                  <tr key={r.id} className="clickable" onClick={()=>go({section:'reports', view:'detail', id:r.id})}>
                    <td style={{fontWeight:500}}>{new Date(r.createdAt).toLocaleString('es-MX')}</td>
                    <td>{campaign?.name || '—'}</td>
                    <td className="dim">{campaign?.clientName || '—'}</td>
                    <td className="dim">{r.summary || 'Reporte operativo'}</td>
                    <td style={{textAlign:'right'}}><button className="btn sm" onClick={e=>{e.stopPropagation();go({section:'reports', view:'detail', id:r.id});}}>Ver</button></td>
                  </tr>
                );
              })}
              {reports.length===0 && <tr><td colSpan={5} style={{padding:24,textAlign:'center',color:'var(--ink-3)'}}>No hay reportes generados todavía.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

const buildCampaignReport = (campaign, state) => {
  const pkg = (state.packages || []).find(p => p.name === campaign.package) || null;
  const client = (state.clients || []).find(c => c.id === campaign.clientId) || null;
  const items = state.feedItems?.[campaign.id] || [];
  const sessions = (state.sessions || []).filter(s => s.campaignId === campaign.id || s.campaign === campaign.name || s.clientId === campaign.clientId);
  const approvals = (state.approvals || []).filter(a => String(a.client||'').toLowerCase().includes(String(campaign.clientName||'').toLowerCase()));

  const contracted = {};
  (pkg?.deliverables || []).forEach(d => {
    const key = String(d.type || 'Otro');
    contracted[key] = (contracted[key] || 0) + Number(d.qty || 0);
  });

  const planned = {};
  items.forEach(i => {
    const key = String(i.type || 'Otro');
    planned[key] = (planned[key] || 0) + 1;
  });

  const statusCounts = {};
  items.forEach(i => {
    statusCounts[i.state || 'idea'] = (statusCounts[i.state || 'idea'] || 0) + 1;
  });

  const pendingClient = approvals.filter(a => ['ready_client','sent','client_changes'].includes(a.col));
  const pendingTeam = items.filter(i => !['approved','published'].includes(i.state));
  const overdue = items.filter(i => i.state === 'changes');

  const report = {
    campaignId: campaign.id,
    summary: `${campaign.clientName} · ${campaign.name} · ${items.length} piezas planeadas`,
    data: {
      client: campaign.clientName,
      campaign: campaign.name,
      month: `${campaign.month} ${campaign.year}`,
      package: campaign.package,
      contracted,
      planned,
      statusCounts,
      responsible: campaign.ownerId,
      pendingClient: pendingClient.map(p => p.piece),
      pendingTeam: pendingTeam.map(p => p.title || `Pieza ${p.id}`),
      upcomingSessions: sessions.map(s => `${s.date} · ${s.time} · ${s.loc}`),
      overdue: overdue.map(p => p.title || `Pieza ${p.id}`),
      risks: overdue.length ? ['Piezas en cambios prolongados'] : [],
      comments: campaign.notes || '',
      generatedAt: new Date().toISOString(),
      clientMeta: {
        niche: client?.niche || '',
        city: client?.city || '',
      }
    }
  };

  return report;
};

const downloadCsv = (report) => {
  const rows = [];
  const d = report.data;
  rows.push(['Cliente', d.client]);
  rows.push(['Campaña', d.campaign]);
  rows.push(['Mes', d.month]);
  rows.push(['Paquete', d.package]);
  rows.push([]);
  rows.push(['Entregables contratados']);
  Object.entries(d.contracted || {}).forEach(([k,v]) => rows.push([k, v]));
  rows.push([]);
  rows.push(['Entregables planeados']);
  Object.entries(d.planned || {}).forEach(([k,v]) => rows.push([k, v]));
  rows.push([]);
  rows.push(['Avance por estado']);
  Object.entries(d.statusCounts || {}).forEach(([k,v]) => rows.push([k, v]));
  rows.push([]);
  rows.push(['Pendientes cliente']);
  (d.pendingClient || []).forEach(x => rows.push([x]));
  rows.push([]);
  rows.push(['Pendientes equipo']);
  (d.pendingTeam || []).forEach(x => rows.push([x]));

  const csv = rows.map(r => r.map(v => `"${String(v ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `reporte_${report.data.client}_${report.data.month}.csv`.replaceAll(' ', '_');
  document.body.appendChild(a);
  a.click();
  a.remove();
};

const ReportBuilder = ({go, route}) => {
  const [state] = window.useStore();
  const campaigns = state.campaigns || [];
  const [campaignId, setCampaignId] = React.useState(route.campaignId || campaigns[0]?.id || '');

  const campaign = campaigns.find(c => c.id === campaignId) || null;
  const report = campaign ? buildCampaignReport(campaign, state) : null;

  const onSave = () => {
    if (!report) return;
    const id = window.A.createInternalReport(report);
    window.__toast?.('Reporte guardado.', 'success');
    go({section:'reports', view:'detail', id});
  };

  return (
    <>
      <Header trail={[{label:'Reportes', onClick:()=>go({section:'reports'})},{label:'Generar reporte'}]} go={go}
        right={<>
          <button className="btn" onClick={()=>report && downloadCsv(report)}><Icon.download size={14}/> Exportar CSV</button>
          <button className="btn" onClick={()=>window.print()}><Icon.pdf size={14}/> Exportar PDF</button>
          <button className="btn primary" onClick={onSave}><Icon.check size={14}/> Guardar histórico</button>
        </>}/>
      <div className="content" style={{maxWidth:1180}}>
        <div className="card" style={{padding:'16px 18px',marginBottom:12}}>
          <div className="field" style={{maxWidth:520}}>
            <label>Campaña</label>
            <select value={campaignId} onChange={e=>setCampaignId(e.target.value)}>
              {campaigns.map(c => <option key={c.id} value={c.id}>{c.clientName} · {c.name}</option>)}
            </select>
          </div>
        </div>

        {report && <ReportView report={report}/>} 
      </div>
    </>
  );
};

const ReportDetail = ({go, id}) => {
  const [state] = window.useStore();
  const report = (state.internalReports || []).find(r => r.id === id) || null;

  if (!report) {
    return (
      <>
        <Header trail={[{label:'Reportes', onClick:()=>go({section:'reports'})},{label:'Detalle'}]} go={go}/>
        <div className="content"><p>Reporte no encontrado.</p></div>
      </>
    );
  }

  return (
    <>
      <Header trail={[{label:'Reportes', onClick:()=>go({section:'reports'})},{label:'Detalle'}]} go={go}
        right={<>
          <button className="btn" onClick={()=>downloadCsv(report)}><Icon.download size={14}/> CSV</button>
          <button className="btn" onClick={()=>window.print()}><Icon.pdf size={14}/> PDF</button>
        </>}/>
      <div className="content" style={{maxWidth:1180}}>
        <ReportView report={report}/>
      </div>
    </>
  );
};

const ReportView = ({report}) => {
  const d = report.data || {};
  return (
    <div className="card" style={{padding:'22px 24px'}}>
      <div style={{marginBottom:14}}>
        <div className="uppercase" style={{marginBottom:5}}>Reporte interno 642MP</div>
        <div style={{fontFamily:'var(--display)',fontSize:28,fontWeight:600,letterSpacing:'-.7px'}}>{d.client} · {d.campaign}</div>
        <div className="dim" style={{fontSize:13}}>{d.month} · {d.package}</div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:12}}>
        <Stat label="Entregables planeados" value={Object.values(d.planned || {}).reduce((s,n)=>s+n,0)} sub="total piezas"/>
        <Stat label="Pendientes cliente" value={(d.pendingClient || []).length} sub="requieren respuesta"/>
        <Stat label="Piezas vencidas" value={(d.overdue || []).length} sub="riesgo operativo" tone={(d.overdue || []).length ? 'red' : 'ink'}/>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <ReportBox title="Entregables contratados" entries={d.contracted}/>
        <ReportBox title="Entregables planeados" entries={d.planned}/>
        <ReportBox title="Avance por estado" entries={d.statusCounts}/>
        <ReportList title="Producciones próximas" items={d.upcomingSessions}/>
        <ReportList title="Pendientes del cliente" items={d.pendingClient}/>
        <ReportList title="Pendientes del equipo" items={d.pendingTeam}/>
        <ReportList title="Riesgos" items={d.risks}/>
      </div>

      {d.comments ? (
        <div style={{marginTop:12,padding:'12px 14px',background:'#FAFAFA',border:'1px solid var(--border)',borderRadius:8}}>
          <div className="uppercase" style={{marginBottom:5}}>Comentarios internos</div>
          <div style={{fontSize:13.5,lineHeight:1.6,color:'var(--ink-2)'}}>{d.comments}</div>
        </div>
      ) : null}
    </div>
  );
};

const ReportBox = ({title, entries={}}) => (
  <div className="card" style={{padding:'12px 14px'}}>
    <div className="section-title" style={{fontSize:15,marginBottom:8}}>{title}</div>
    {Object.keys(entries).length ? Object.entries(entries).map(([k,v]) => (
      <div key={k} className="between" style={{padding:'4px 0'}}><span className="dim">{k}</span><span className="mono">{v}</span></div>
    )) : <div className="dim" style={{fontSize:12.5}}>Sin datos</div>}
  </div>
);

const ReportList = ({title, items=[]}) => (
  <div className="card" style={{padding:'12px 14px'}}>
    <div className="section-title" style={{fontSize:15,marginBottom:8}}>{title}</div>
    {items.length ? (
      <ul style={{listStyle:'none',padding:0,margin:0,display:'flex',flexDirection:'column',gap:6}}>
        {items.map((it,i) => <li key={i} style={{fontSize:13.2,color:'var(--ink-2)'}}>• {it}</li>)}
      </ul>
    ) : <div className="dim" style={{fontSize:12.5}}>Sin elementos</div>}
  </div>
);

window.ReportsIndex = ReportsIndex;

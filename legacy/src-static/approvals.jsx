const APPROVAL_COLUMNS = [
  {id:'internal_review', label:'Pendiente revisión interna'},
  {id:'internal_changes', label:'Cambios internos'},
  {id:'ready_client', label:'Listo para cliente'},
  {id:'sent', label:'Enviado a cliente'},
  {id:'approved', label:'Aprobado'},
  {id:'client_changes', label:'Cambios del cliente'},
];

const Approvals = ({go}) => {
  const [state] = window.useStore();
  const cards = state.approvals || [];

  const [q, setQ] = React.useState('');
  const [clientFilter, setClientFilter] = React.useState('all');
  const [ownerFilter, setOwnerFilter] = React.useState('all');
  const [dragCard, setDragCard] = React.useState(null);

  const clients = Array.from(new Set(cards.map(c => c.client))).filter(Boolean);
  const owners = Array.from(new Set(cards.map(c => c.owner))).filter(Boolean);

  const visible = cards.filter(c => {
    if (clientFilter !== 'all' && c.client !== clientFilter) return false;
    if (ownerFilter !== 'all' && c.owner !== ownerFilter) return false;
    if (!q) return true;
    const hay = `${c.client} ${c.campaign} ${c.piece} ${c.comment}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  const byCol = Object.fromEntries(APPROVAL_COLUMNS.map(col => [col.id, visible.filter(c => c.col === col.id)]));

  const moveCard = (cardId, newCol) => {
    window.A.moveApproval(cardId, newCol);
  };

  const updateComment = (card, comment) => {
    window.A.updateApproval(card.id, {comment});
  };

  return (
    <>
      <Header trail={[{label:'642 Studio'},{label:'Aprobaciones'}]}
        right={<button className="btn" onClick={()=>go({section:'reports'})}><Icon.chart size={14}/> Ver reporte operativo</button>}/>
      <div className="content">
        <div className="between" style={{marginBottom:16}}>
          <div>
            <h1 className="page-title">Aprobaciones</h1>
            <p className="page-sub">Tablero interno para revisión, envío y aprobación final de piezas.</p>
          </div>
          <span className="chip black">{cards.length} tarjetas</span>
        </div>

        <div className="card" style={{padding:'12px 14px',marginBottom:12}}>
          <div style={{display:'grid',gridTemplateColumns:'1.2fr .7fr .7fr auto',gap:8}}>
            <div style={{position:'relative'}}>
              <span style={{position:'absolute',left:10,top:9,color:'var(--ink-3)'}}><Icon.search size={14}/></span>
              <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar pieza, cliente, comentario" style={{width:'100%',height:34,border:'1px solid var(--border)',borderRadius:8,padding:'0 12px 0 34px'}}/>
            </div>
            <select value={clientFilter} onChange={e=>setClientFilter(e.target.value)} style={{height:34,border:'1px solid var(--border)',borderRadius:8,padding:'0 10px',background:'#fff'}}>
              <option value="all">Todos los clientes</option>
              {clients.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={ownerFilter} onChange={e=>setOwnerFilter(e.target.value)} style={{height:34,border:'1px solid var(--border)',borderRadius:8,padding:'0 10px',background:'#fff'}}>
              <option value="all">Todos los responsables</option>
              {owners.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <button className="btn" onClick={()=>{setQ('');setClientFilter('all');setOwnerFilter('all');}}>Limpiar</button>
          </div>
        </div>

        <div className="kanban">
          {APPROVAL_COLUMNS.map(col => (
            <div key={col.id} className="col"
              onDragOver={e=>e.preventDefault()}
              onDrop={()=>{ if (dragCard) moveCard(dragCard.id, col.id); setDragCard(null); }}>
              <h4>
                <span>{col.label}</span>
                <span className="chip">{byCol[col.id]?.length || 0}</span>
              </h4>

              {(byCol[col.id] || []).map(card => (
                <div key={card.id} className="kcard" draggable onDragStart={()=>setDragCard(card)}>
                  <div className="between" style={{marginBottom:6}}>
                    <span className="chip">{card.type}</span>
                    <span className="mono dim" style={{fontSize:10.5}}>{card.due || '—'}</span>
                  </div>
                  <div style={{fontWeight:600,fontSize:13.2,letterSpacing:'-.1px',lineHeight:1.3,marginBottom:4}}>{card.piece}</div>
                  <div className="dim" style={{fontSize:11.5,marginBottom:8}}>{card.client} · {card.campaign}</div>

                  <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:8}}>
                    {card.owner ? <Avatar id={card.owner} size={20}/> : null}
                    <span className="dim" style={{fontSize:11.5}}>Resp: {card.owner || '—'}</span>
                  </div>

                  <textarea value={card.comment || ''} onChange={e=>updateComment(card, e.target.value)} rows={2} style={{width:'100%',border:'1px solid var(--border)',borderRadius:6,padding:'7px 8px',fontSize:12,lineHeight:1.4,resize:'vertical'}} placeholder="Comentario"/>

                  <div style={{display:'flex',gap:6,marginTop:8,flexWrap:'wrap'}}>
                    <button className="btn sm" onClick={()=>moveCard(card.id, 'internal_review')}>Interna</button>
                    <button className="btn sm" onClick={()=>moveCard(card.id, 'ready_client')}>Listo cliente</button>
                    <button className="btn sm" onClick={()=>moveCard(card.id, 'sent')}>Enviado</button>
                    <button className="btn sm" onClick={()=>moveCard(card.id, 'approved')}>Aprobado</button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

window.Approvals = Approvals;

const FEED_TYPE_OPTIONS = ['Reel','Post','Carrusel','Historia','Sesión'];
const FEED_STATE_OPTIONS = [
  'idea','planned','script','production','shot','editing','review','client_ready','sent','approved','published','changes'
];

const feedNormalizeType = (t='') => {
  const v = String(t).toLowerCase();
  if (v.includes('hist')) return 'Historias';
  if (v.includes('reel')) return 'Reel';
  if (v.includes('post')) return 'Post';
  if (v.includes('carr')) return 'Carrusel';
  if (v.includes('sesi')) return 'Sesión';
  return t || 'Otro';
};

const feedContractedMap = (pkg) => {
  const map = {};
  (pkg?.deliverables || []).forEach(d => {
    const key = feedNormalizeType(d.type);
    map[key] = (map[key] || 0) + Number(d.qty || 0);
  });
  return map;
};

const feedPlannedMap = (items=[]) => {
  const map = {};
  items.forEach(i => {
    const key = feedNormalizeType(i.type);
    map[key] = (map[key] || 0) + 1;
  });
  return map;
};

const FeedPlanner = ({campaign, client, pkg}) => {
  const [state] = window.useStore();
  const items = state.feedItems?.[campaign.id] || [];

  const [selectedId, setSelectedId] = React.useState(items[0]?.id || null);
  const [filterType, setFilterType] = React.useState('all');
  const [filterState, setFilterState] = React.useState('all');
  const [dragId, setDragId] = React.useState(null);
  const [aiPreview, setAiPreview] = React.useState(null);
  const [aiLoading, setAiLoading] = React.useState(false);

  React.useEffect(() => {
    if (!items.find(i => i.id === selectedId)) {
      setSelectedId(items[0]?.id || null);
    }
  }, [campaign.id, items.length]);

  const selected = items.find(i => i.id === selectedId) || null;
  const contracted = feedContractedMap(pkg);
  const planned = feedPlannedMap(items);

  const filtered = items.filter(i => {
    if (filterType !== 'all' && i.type !== filterType) return false;
    if (filterState !== 'all' && i.state !== filterState) return false;
    return true;
  });

  const setItems = (next) => window.A.setFeedItems(campaign.id, next);

  const onAdd = (type='Post') => {
    window.A.addFeedItem(campaign.id, {
      type,
      title: `Nueva ${type.toLowerCase()}`,
      pilar: 'Producto',
      state: 'idea',
      owner: campaign.ownerId || 'AM',
      date: '',
    });
    setTimeout(() => {
      const latest = (window.store.getState().feedItems[campaign.id] || []).slice(-1)[0];
      if (latest) setSelectedId(latest.id);
    }, 20);
  };

  const onDuplicate = (item) => {
    window.A.addFeedItem(campaign.id, {
      ...item,
      id: undefined,
      title: `${item.title || 'Pieza'} (copia)`,
      state: 'idea',
      isExtra: true,
    });
    window.__toast?.('Pieza duplicada.', 'success');
  };

  const onDelete = (itemId) => {
    if (!confirm('¿Eliminar esta pieza del feed?')) return;
    window.A.deleteFeedItem(campaign.id, itemId);
    if (selectedId === itemId) setSelectedId(null);
  };

  const onReorder = (fromId, toId) => {
    if (fromId == null || toId == null || fromId === toId) return;
    const list = [...items];
    const from = list.findIndex(i => i.id === fromId);
    const to = list.findIndex(i => i.id === toId);
    if (from < 0 || to < 0) return;
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);
    setItems(list.map((x, idx) => ({...x, gridPosition: idx + 1})));
  };

  const updateSelected = (patch) => {
    if (!selected) return;
    window.A.updateFeedItem(campaign.id, selected.id, patch);
  };

  const openAIPreview = async () => {
    if (!state.settings?.openaiKey) {
      window.__toast?.('Agrega una API Key en Configuración para usar IA.', 'warn');
      return;
    }
    setAiLoading(true);
    try {
      const missing = Object.entries(contracted).map(([type,qty]) => {
        const done = planned[type] || 0;
        return `${type}: ${Math.max(0, qty - done)} faltantes`;
      }).join(', ');

      const prompt = `Genera sugerencias para el feed mensual de 642MP con estas entradas:
Cliente: ${client?.name || campaign.clientName || 'Cliente'}
Nicho: ${client?.niche || campaign.audience || 'No definido'}
Ciudad/zona: ${client?.city || ''} ${client?.zone || ''}
Estrategia: ${campaign.objective || ''}
Paquete contratado: ${campaign.package || 'Sin paquete'}
Pilares: ${Array.isArray(campaign.contentPillars) ? campaign.contentPillars.join(', ') : (campaign.contentPillars || '')}
Objetivo del mes: ${campaign.objective || ''}
Promoción activa: ${campaign.activePromotion || ''}
Faltantes del paquete: ${missing || 'Sin faltantes'}

Responde SOLO en JSON array. Máximo 12 elementos. Cada elemento con:
{
  "type":"Reel|Post|Carrusel|Historia",
  "title":"...",
  "pillar":"...",
  "hook":"...",
  "objective":"...",
  "cta":"...",
  "description":"...",
  "format":"...",
  "productionNotes":"..."
}`;

      const text = await window.A.callAI(prompt, false);
      const match = text.match(/\[[\s\S]*\]/);
      const parsed = JSON.parse(match ? match[0] : '[]');
      const sanitized = Array.isArray(parsed) ? parsed.slice(0, 20).map((x,idx) => ({
        id: `ai_${idx}_${Date.now()}`,
        selected: true,
        type: FEED_TYPE_OPTIONS.includes(x.type) ? x.type : 'Post',
        title: x.title || `Sugerencia ${idx+1}`,
        pilar: x.pillar || 'Producto',
        hook: x.hook || '',
        objective: x.objective || '',
        cta: x.cta || '',
        description: x.description || '',
        format: x.format || '',
        productionNotes: x.productionNotes || '',
      })) : [];
      setAiPreview(sanitized);
    } catch (e) {
      window.__toast?.(`No se pudo generar sugerencias IA: ${e.message}`, 'error');
    }
    setAiLoading(false);
  };

  const regeneratePreview = async () => {
    setAiPreview(null);
    await openAIPreview();
  };

  const insertPreview = (all=false) => {
    if (!aiPreview || aiPreview.length===0) return;
    const selectedRows = all ? aiPreview : aiPreview.filter(r => r.selected);
    if (!selectedRows.length) {
      window.__toast?.('Selecciona al menos una sugerencia.', 'warn');
      return;
    }

    const projected = {...planned};
    selectedRows.forEach(row => {
      const key = feedNormalizeType(row.type);
      projected[key] = (projected[key] || 0) + 1;
      const contractedQty = contracted[key] || 0;
      const isExtra = contractedQty > 0 ? projected[key] > contractedQty : true;

      window.A.addFeedItem(campaign.id, {
        type: row.type,
        title: row.title,
        pilar: row.pilar,
        hook: row.hook,
        objective: row.objective,
        cta: row.cta,
        copy: row.description,
        format: row.format,
        internalNotes: row.productionNotes,
        owner: campaign.ownerId || 'AM',
        state: 'planned',
        isExtra,
      });
    });

    setAiPreview(null);
    window.__toast?.(`${selectedRows.length} piezas insertadas en el feed.`, 'success');
  };

  return (
    <div style={{display:'grid',gridTemplateColumns:'260px 1fr 390px',gap:14,alignItems:'start'}}>
      {/* A) Inventario paquete */}
      <div className="card" style={{padding:'14px 14px',position:'sticky',top:72}}>
        <div className="uppercase" style={{marginBottom:8}}>Inventario del paquete</div>
        <div className="section-title" style={{fontSize:15,marginBottom:10}}>{pkg?.name || 'Sin paquete'}</div>

        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {Object.keys(contracted).length > 0 ? Object.entries(contracted).map(([type, qty]) => {
            const plan = planned[type] || 0;
            const diff = plan - qty;
            return (
              <div key={type} style={{border:'1px solid var(--border)',borderRadius:8,padding:'9px 10px',background:'#fff'}}>
                <div className="between" style={{marginBottom:4}}>
                  <div style={{fontWeight:500,fontSize:13.2}}>{type}</div>
                  <div className="mono dim" style={{fontSize:11.5}}>{plan}/{qty}</div>
                </div>
                {diff < 0 && <span className="chip red">Faltan {Math.abs(diff)}</span>}
                {diff === 0 && <span className="chip green">Completo</span>}
                {diff > 0 && <span className="chip amber">{diff} extra sugerido</span>}
              </div>
            );
          }) : <div className="dim" style={{fontSize:12.5}}>Asigna un paquete para ver inventario.</div>}
        </div>

        <div className="divider"/>
        <button className="btn sm" style={{width:'100%',justifyContent:'center'}} onClick={openAIPreview} disabled={aiLoading}>
          <Icon.sparkles size={12}/> {aiLoading ? 'Generando…' : 'Generar feed con IA'}
        </button>
      </div>

      {/* B) Grid feed */}
      <div className="card" style={{padding:'12px 12px'}}>
        <div className="between" style={{marginBottom:10,flexWrap:'wrap'}}>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <div className="section-title" style={{fontSize:15}}>Grid del feed</div>
            <span className="chip">{filtered.length} piezas</span>
          </div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <select value={filterType} onChange={e=>setFilterType(e.target.value)} style={{height:30,border:'1px solid var(--border)',borderRadius:6,padding:'0 8px',fontSize:12.5,background:'#fff'}}>
              <option value="all">Todos los tipos</option>
              {FEED_TYPE_OPTIONS.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
            <select value={filterState} onChange={e=>setFilterState(e.target.value)} style={{height:30,border:'1px solid var(--border)',borderRadius:6,padding:'0 8px',fontSize:12.5,background:'#fff'}}>
              <option value="all">Todos los estados</option>
              {FEED_STATE_OPTIONS.map(s=><option key={s} value={s}>{window.STATES?.[s]?.label || s}</option>)}
            </select>
            <button className="btn sm" onClick={()=>onAdd('Post')}><Icon.plus size={12}/> Agregar pieza</button>
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(3, minmax(0,1fr))',gap:10,minHeight:420}}>
          {filtered.map((tile, idx) => (
            <div key={tile.id}
              className={`feed-tile ${selectedId === tile.id ? 'selected' : ''}`}
              draggable
              onDragStart={()=>setDragId(tile.id)}
              onDragOver={(e)=>e.preventDefault()}
              onDrop={()=>{ onReorder(dragId, tile.id); setDragId(null); }}
              onClick={()=>setSelectedId(tile.id)}>
              <div className="thumb">
                <FeedThumb tile={tile} label={tile.title}/>
                <div className="badge-top">
                  <span className="chip">{tile.type}</span>
                  {tile.isExtra && <span className="chip amber">Extra</span>}
                </div>
                <div className="num">{idx+1}</div>
              </div>
              <div className="meta">
                <div style={{fontSize:12.5,fontWeight:500,letterSpacing:'-.1px',lineHeight:1.25,marginBottom:7}}>{tile.title || 'Sin título'}</div>
                <div className="between">
                  <StateChip state={tile.state}/>
                  <span className="mono dim" style={{fontSize:10.5}}>{tile.date || 'sin fecha'}</span>
                </div>
                <div className="between" style={{marginTop:8}}>
                  {tile.owner ? <Avatar id={tile.owner} size={20}/> : <span className="dim" style={{fontSize:12}}>Sin responsable</span>}
                  <div style={{display:'flex',gap:4}}>
                    <button className="btn ghost sm" onClick={(e)=>{e.stopPropagation(); onDuplicate(tile);}} title="Duplicar"><Icon.plus size={11}/></button>
                    <button className="btn ghost sm" onClick={(e)=>{e.stopPropagation(); onDelete(tile.id);}} title="Eliminar"><Icon.x size={11}/></button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div style={{gridColumn:'1/-1',border:'1px dashed var(--border)',borderRadius:10,padding:26,textAlign:'center',color:'var(--ink-3)'}}>
              No hay piezas para este filtro.
            </div>
          )}
        </div>
      </div>

      {/* C) Panel detalle */}
      <div className="card contextual" style={{padding:'12px 14px'}}>
        {!selected && (
          <div style={{paddingTop:12}}>
            <div className="uppercase" style={{marginBottom:8}}>Detalle de pieza</div>
            <div className="dim" style={{fontSize:13}}>Selecciona una tarjeta del grid para editarla.</div>
          </div>
        )}

        {selected && (
          <>
            <div className="between" style={{marginBottom:10}}>
              <div>
                <div className="uppercase">Detalle de pieza</div>
                <div style={{fontFamily:'var(--display)',fontWeight:600,fontSize:18,letterSpacing:'-.3px'}}>{selected.title || `Pieza #${selected.id}`}</div>
              </div>
              <StateChip state={selected.state}/>
            </div>

            <div style={{display:'grid',gap:10,paddingBottom:18}}>
              <div className="field"><label>Tipo de contenido</label>
                <select value={selected.type || ''} onChange={e=>updateSelected({type:e.target.value})}>
                  {FEED_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className="field"><label>Título interno</label><input value={selected.title || ''} onChange={e=>updateSelected({title:e.target.value})}/></div>
              <div className="field"><label>Título público</label><input value={selected.publicTitle || ''} onChange={e=>updateSelected({publicTitle:e.target.value})}/></div>
              <div className="field"><label>Pilar</label><input value={selected.pilar || ''} onChange={e=>updateSelected({pilar:e.target.value})}/></div>
              <div className="field"><label>Objetivo</label><textarea rows={2} value={selected.objective || ''} onChange={e=>updateSelected({objective:e.target.value})}/></div>
              <div className="field"><label>Hook</label><input value={selected.hook || ''} onChange={e=>updateSelected({hook:e.target.value})}/></div>
              <div className="field"><label>Copy base</label><textarea rows={3} value={selected.copy || ''} onChange={e=>updateSelected({copy:e.target.value})}/></div>
              <div className="field"><label>Guion corto</label><textarea rows={3} value={selected.script || ''} onChange={e=>updateSelected({script:e.target.value})}/></div>
              <div className="field"><label>CTA</label><input value={selected.cta || ''} onChange={e=>updateSelected({cta:e.target.value})}/></div>
              <div className="field"><label>Shotlist</label><textarea rows={2} value={selected.shotlist || ''} onChange={e=>updateSelected({shotlist:e.target.value})}/></div>
              <div className="field"><label>Formato</label><input value={selected.format || ''} onChange={e=>updateSelected({format:e.target.value})}/></div>
              <div className="field"><label>Responsable</label>
                <select value={selected.owner || 'AM'} onChange={e=>updateSelected({owner:e.target.value})}>
                  {(window.TEAM||[]).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="field"><label>Fecha tentativa publicación</label><input value={selected.date || ''} onChange={e=>updateSelected({date:e.target.value})} placeholder="ej. Jun 24"/></div>
              <div className="field"><label>Fecha producción</label><input value={selected.productionDate || ''} onChange={e=>updateSelected({productionDate:e.target.value})}/></div>
              <div className="field"><label>Estado</label>
                <select value={selected.state || 'idea'} onChange={e=>updateSelected({state:e.target.value})}>
                  {FEED_STATE_OPTIONS.map(s => <option key={s} value={s}>{window.STATES?.[s]?.label || s}</option>)}
                </select>
              </div>
              <div className="field"><label>Notas de producción</label><textarea rows={2} value={selected.internalNotes || ''} onChange={e=>updateSelected({internalNotes:e.target.value})}/></div>
              <div className="field"><label>Referencias visuales (links)</label><textarea rows={2} value={selected.referenceLinks || ''} onChange={e=>updateSelected({referenceLinks:e.target.value})}/></div>
              <div className="field"><label>Comentarios internos</label><textarea rows={2} value={selected.internalComments || ''} onChange={e=>updateSelected({internalComments:e.target.value})}/></div>
              <div className="field"><label>Comentarios del cliente</label><textarea rows={2} value={selected.clientComments || ''} onChange={e=>updateSelected({clientComments:e.target.value})}/></div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:6}}>
                <button className="btn" onClick={()=>window.__toast?.('Cambios guardados.', 'success')}>Guardar cambios</button>
                <button className="btn" onClick={openAIPreview}><Icon.sparkles size={12}/> Generar con IA</button>
                <button className="btn" onClick={()=>updateSelected({state:'production'})}>Enviar a producción</button>
                <button className="btn" onClick={()=>updateSelected({state:'approved'})}>Marcar aprobado</button>
                <button className="btn primary" style={{gridColumn:'1/-1',justifyContent:'center'}} onClick={()=>updateSelected({state:'published'})}>Marcar publicado</button>
              </div>
            </div>
          </>
        )}
      </div>

      {aiPreview && (
        <Modal onClose={()=>setAiPreview(null)}>
          <div style={{padding:'16px 18px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:10}}>
            <div>
              <div className="uppercase">Generador IA</div>
              <div style={{fontFamily:'var(--display)',fontWeight:600,fontSize:19,letterSpacing:'-.3px'}}>Previsualización de piezas sugeridas</div>
            </div>
            <div style={{marginLeft:'auto',display:'flex',gap:8}}>
              <button className="btn" onClick={regeneratePreview} disabled={aiLoading}>{aiLoading ? 'Regenerando…' : 'Regenerar'}</button>
              <button className="btn" onClick={()=>insertPreview(false)}>Insertar seleccionadas</button>
              <button className="btn primary" onClick={()=>insertPreview(true)}>Insertar todas</button>
            </div>
          </div>
          <div style={{padding:14,maxHeight:'70vh',overflow:'auto'}}>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {aiPreview.map((row, idx) => (
                <div key={row.id} className="card" style={{padding:'12px 13px'}}>
                  <div className="between" style={{marginBottom:8}}>
                    <label style={{display:'inline-flex',alignItems:'center',gap:8,cursor:'pointer'}}>
                      <input type="checkbox" checked={!!row.selected} onChange={e=>setAiPreview(p=>p.map(x=>x.id===row.id?{...x,selected:e.target.checked}:x))}/>
                      <span style={{fontWeight:600}}>#{idx+1}</span>
                    </label>
                    <div style={{display:'flex',gap:8}}>
                      <select value={row.type} onChange={e=>setAiPreview(p=>p.map(x=>x.id===row.id?{...x,type:e.target.value}:x))} style={{height:28,border:'1px solid var(--border)',borderRadius:6,padding:'0 8px'}}>
                        {FEED_TYPE_OPTIONS.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="field" style={{marginBottom:8}}><label>Título</label><input value={row.title} onChange={e=>setAiPreview(p=>p.map(x=>x.id===row.id?{...x,title:e.target.value}:x))}/></div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
                    <div className="field"><label>Pilar</label><input value={row.pilar} onChange={e=>setAiPreview(p=>p.map(x=>x.id===row.id?{...x,pilar:e.target.value}:x))}/></div>
                    <div className="field"><label>CTA</label><input value={row.cta} onChange={e=>setAiPreview(p=>p.map(x=>x.id===row.id?{...x,cta:e.target.value}:x))}/></div>
                  </div>
                  <div className="field"><label>Hook</label><input value={row.hook} onChange={e=>setAiPreview(p=>p.map(x=>x.id===row.id?{...x,hook:e.target.value}:x))}/></div>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

window.FeedPlanner = FeedPlanner;

// Packages — list, create, edit with real store persistence.

const Packages = ({go}) => {
  const [state]   = window.useStore();
  const packages  = state.packages || [];
  const [editing, setEditing] = React.useState(null);
  const [toast, setToast]     = React.useState(null);

  const handleSave = (data) => {
    if (data.id && !data._new) {
      window.A.updatePackage(data.id, data);
      setToast({msg:'Paquete actualizado.', type:'success'});
    } else {
      window.A.createPackage(data);
      setToast({msg:'Paquete creado.', type:'success'});
    }
    setEditing(null);
  };

  return (
    <>
      <Header trail={[{label:'642 Studio'},{label:'Paquetes'}]}
        right={<button className="btn primary" onClick={()=>setEditing({_new:true})}><Icon.plus size={14}/> Crear paquete</button>}/>
      <div className="content">
        <div className="between" style={{marginBottom:18}}>
          <div>
            <h1 className="page-title">Paquetes</h1>
            <p className="page-sub">Define qué se le debe entregar a cada cliente cada mes. Los entregables alimentan el inventario de cada campaña.</p>
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14}}>
          {packages.filter(p=>p.active).map(p=><PackageCard key={p.id} p={p} onEdit={()=>setEditing(p)}/>)}
          <button onClick={()=>setEditing({_new:true})} style={{border:'1.5px dashed var(--border)',borderRadius:'var(--radius)',background:'transparent',cursor:'pointer',display:'grid',placeItems:'center',minHeight:280,color:'var(--ink-3)'}}>
            <div style={{textAlign:'center'}}>
              <Icon.plus size={24}/>
              <div style={{marginTop:8,fontSize:13}}>Crear paquete</div>
            </div>
          </button>
        </div>

        <div style={{marginTop:24}} className="card">
          <div className="hd">
            <div className="section-title">Matriz comparativa</div>
            <span className="chip">{packages.filter(p=>p.active).length} activos</span>
          </div>
          <div style={{padding:0}}>
            <table className="table">
              <thead><tr>
                <th>Entregable</th>
                {packages.filter(p=>p.active).map(p=><th key={p.id}>{p.name}</th>)}
              </tr></thead>
              <tbody>
                {['Reel','Post','Carrusel','Historias','Sesión','Campaña especial'].map(t=>(
                  <tr key={t}><td style={{fontWeight:500}}>{t}</td>
                    {packages.filter(p=>p.active).map(p=>{
                      const d = (p.deliverables||[]).find(x=>x.type===t);
                      return <td key={p.id} className="mono">{d?`${d.qty} / ${(d.period||'').toLowerCase()}`:'—'}</td>;
                    })}
                  </tr>
                ))}
                <tr><td>Incluye 642 Cards</td>{packages.filter(p=>p.active).map(p=><td key={p.id}>{p.extras?.cards?<span className="chip green">Sí</span>:<span className="chip outline">No</span>}</td>)}</tr>
                <tr><td>Dashboard cliente</td>{packages.filter(p=>p.active).map(p=><td key={p.id}>{p.extras?.dashboard?<span className="chip green">Sí</span>:<span className="chip outline">No</span>}</td>)}</tr>
                <tr><td>Reporte</td>{packages.filter(p=>p.active).map(p=><td key={p.id} className="dim">{p.extras?.report||'—'}</td>)}</tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {editing !== null && <PackageEditor pkg={editing._new ? null : editing} onSave={handleSave} onClose={()=>setEditing(null)}/>}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </>
  );
};

const PackageCard = ({p, onEdit}) => {
  const tone = p.id==='starter'?'#666':p.id==='growth'?'#111':'var(--red)';
  return (
    <div className="card" style={{padding:'22px 22px',position:'relative',borderColor:p.id==='growth'?'#111':'var(--border)',...(p.id==='growth'?{borderWidth:1.5}:{})}}>
      <div className="between" style={{marginBottom:14}}>
        <div className="uppercase" style={{color:tone}}>{p.tag}</div>
        <button className="btn ghost sm" onClick={onEdit}><Icon.cog size={12}/></button>
      </div>
      <div style={{fontFamily:'var(--display)',fontSize:28,fontWeight:600,letterSpacing:'-.7px'}}>{p.name}</div>
      <div className="dim" style={{fontSize:13.5,marginTop:2}}>{p.price}</div>
      <div className="divider"/>
      <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:16}}>
        {(p.deliverables||[]).map(d=>(
          <div key={d.type} className="between" style={{fontSize:13}}>
            <span className="dim">{d.type}</span>
            <span style={{display:'flex',alignItems:'center',gap:8}}>
              <span className="mono dim2" style={{fontSize:11}}>{(d.period||'').toLowerCase()}</span>
              <span className="display" style={{fontWeight:600,fontSize:16,minWidth:24,textAlign:'right'}}>{d.qty}</span>
            </span>
          </div>
        ))}
      </div>
      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:16}}>
        {p.extras?.cards    && <span className="chip green"><Icon.check size={11}/> 642 Cards</span>}
        {p.extras?.dashboard&& <span className="chip green"><Icon.check size={11}/> Dashboard</span>}
        {p.extras?.report   && <span className="chip">{p.extras.report}</span>}
      </div>
      <button className="btn" style={{width:'100%',justifyContent:'center'}} onClick={onEdit}>Editar paquete <Icon.chevR size={12}/></button>
    </div>
  );
};

const PackageEditor = ({pkg, onSave, onClose}) => {
  const isNew = !pkg;
  const [name,   setName]   = React.useState(pkg?.name||'');
  const [price,  setPrice]  = React.useState(pkg?.price||'');
  const [tag,    setTag]    = React.useState(pkg?.tag||'');
  const [desc,   setDesc]   = React.useState(pkg?.description||'');
  const [cards,  setCards]  = React.useState(pkg?.extras?.cards||false);
  const [dash,   setDash]   = React.useState(pkg?.extras?.dashboard||false);
  const [report, setReport] = React.useState(pkg?.extras?.report||'Básico');
  const [items,  setItems]  = React.useState(
    pkg ? (pkg.deliverables||[]).map(d=>({...d,prod:true,app:true}))
        : [{type:'Reel',qty:2,period:'Mensual',prod:true,app:true}]
  );

  const addItem = () => setItems([...items, {type:'Post',qty:1,period:'Mensual',prod:false,app:true}]);
  const rm = (i) => setItems(items.filter((_,j)=>j!==i));
  const update = (i, k, v) => setItems(items.map((x,j)=>j===i?{...x,[k]:v}:x));

  const handleSave = () => {
    if (!name.trim()) return alert('El nombre del paquete es obligatorio.');
    onSave({ ...pkg, name, price, tag, description:desc, deliverables:items.map(({prod,app,...d})=>d), extras:{cards,dashboard:dash,report} });
  };

  return (
    <Drawer onClose={onClose} width={760}>
      <div style={{padding:'18px 24px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:14}}>
        <div>
          <div className="uppercase">{isNew?'Crear paquete':'Editar paquete'}</div>
          <div style={{fontFamily:'var(--display)',fontWeight:600,fontSize:20,letterSpacing:'-.4px'}}>{name||'Nuevo paquete'}</div>
        </div>
        <div style={{marginLeft:'auto',display:'flex',gap:8}}>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn primary" onClick={handleSave}>Guardar</button>
        </div>
      </div>

      <div style={{padding:24,display:'flex',flexDirection:'column',gap:20,overflow:'auto',flex:1}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 180px 160px',gap:12}}>
          <div className="field"><label>Nombre del paquete</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="ej. 642 Growth"/></div>
          <div className="field"><label>Precio mensual</label><input value={price} onChange={e=>setPrice(e.target.value)} placeholder="$0 / mes"/></div>
          <div className="field"><label>Etiqueta</label><input value={tag} onChange={e=>setTag(e.target.value)} placeholder="ej. Más contratado"/></div>
        </div>
        <div className="field">
          <label>Descripción interna</label>
          <textarea rows={2} value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Para qué tipo de cliente es este paquete"/>
        </div>

        <div>
          <div className="between" style={{marginBottom:8}}>
            <div className="section-title">Entregables</div>
            <button className="btn sm" onClick={addItem}><Icon.plus size={12}/> Agregar entregable</button>
          </div>
          <div className="card nopad">
            <table className="table">
              <thead><tr><th>Tipo</th><th>Cantidad</th><th>Periodicidad</th><th>Requiere producción</th><th>Requiere aprobación</th><th></th></tr></thead>
              <tbody>
                {items.map((it,i)=>(
                  <tr key={i}>
                    <td>
                      <select value={it.type} onChange={e=>update(i,'type',e.target.value)} style={{height:32,border:'1px solid var(--border)',borderRadius:6,padding:'0 8px',background:'#fff'}}>
                        {['Reel','Post','Carrusel','Historias','Sesión','Campaña especial'].map(t=><option key={t}>{t}</option>)}
                      </select>
                    </td>
                    <td><input type="number" min={1} value={it.qty} onChange={e=>update(i,'qty',Number(e.target.value))} style={{height:32,width:64,border:'1px solid var(--border)',borderRadius:6,padding:'0 8px',background:'#fff'}}/></td>
                    <td>
                      <select value={it.period} onChange={e=>update(i,'period',e.target.value)} style={{height:32,border:'1px solid var(--border)',borderRadius:6,padding:'0 8px',background:'#fff'}}>
                        {['Mensual','Quincenal','Semanal','Trimestral'].map(t=><option key={t}>{t}</option>)}
                      </select>
                    </td>
                    <td><Toggle on={it.prod} onChange={v=>update(i,'prod',v)}/></td>
                    <td><Toggle on={it.app}  onChange={v=>update(i,'app',v)}/></td>
                    <td><button className="btn ghost sm" onClick={()=>rm(i)}><Icon.x size={12}/></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card" style={{padding:'14px 16px',background:'#FAFAFA'}}>
          <div className="uppercase" style={{marginBottom:10}}>Incluye (extras)</div>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            <div className="between"><span style={{fontSize:13.5}}>642 Cards (físicas para cliente)</span><Toggle on={cards} onChange={setCards}/></div>
            <div className="between"><span style={{fontSize:13.5}}>Dashboard de métricas para cliente</span><Toggle on={dash} onChange={setDash}/></div>
            <div className="between">
              <span style={{fontSize:13.5}}>Reporte operativo</span>
              <select value={report} onChange={e=>setReport(e.target.value)} style={{height:32,border:'1px solid var(--border)',borderRadius:6,padding:'0 8px',background:'#fff'}}>
                {['Básico','Mensual','Semanal','Sin reporte'].map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>
    </Drawer>
  );
};

window.Packages = Packages;

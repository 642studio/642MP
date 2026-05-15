// Campaign creation wizard — 5 steps, saves real campaign to store.

const CampaignCreate = ({go, initialClient}) => {
  const [state]    = window.useStore();
  const clients    = (state.clients||[]).filter(c=>c.status!=='prospect'&&c.status!=='finished');
  const packages   = state.packages||[];
  const [step, setStep]       = React.useState(1);
  const [saving, setSaving]   = React.useState(false);
  const [toast, setToast]     = React.useState(null);

  const [form, setForm] = React.useState({
    clientId:     initialClient || (clients[0]?.id || ''),
    month:        'Junio',
    year:         2026,
    name:         'Feed Junio 2026',
    objective:    '',
    audience:     '',
    tone:         '',
    mainCta:      '',
    activePromotion:'',
    insight:      '',
    contentPillars:'',
    competitors:  '',
    differentiator:'',
    ownerId:      'AM',
  });

  const F = (k) => ({
    value: form[k]||'',
    onChange: e => setForm(f=>({...f,[k]:e.target.value})),
  });

  const client = clients.find(c=>c.id===form.clientId);
  const pkg    = packages.find(p=>p.name===client?.package);

  const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  React.useEffect(()=>{
    if(form.month&&form.year&&client) {
      setForm(f=>({...f, name:`Feed ${f.month} ${f.year}`}));
    }
  }, [form.month, form.year, form.clientId]);

  const steps = [
    {n:1, label:'Cliente y paquete'},
    {n:2, label:'Mes y objetivo'},
    {n:3, label:'Estrategia'},
    {n:4, label:'Confirmación'},
  ];

  const handleCreate = async () => {
    if (!form.clientId) { setToast({msg:'Selecciona un cliente.', type:'error'}); return; }
    if (!form.name.trim()) { setToast({msg:'El nombre de la campaña es obligatorio.', type:'error'}); return; }
    setSaving(true);
    const id = window.A.createCampaign({
      ...form,
      clientName: client?.name || '',
      package:    client?.package || '',
      contentPillars: form.contentPillars.split(',').map(s=>s.trim()).filter(Boolean),
      competitors:    form.competitors.split(',').map(s=>s.trim()).filter(Boolean),
    });
    await new Promise(r=>setTimeout(r,400));
    setSaving(false);
    go({section:'campaigns', view:'workspace', client:form.clientId, campaignId:id});
  };

  return (
    <>
      <Header trail={[{label:'Campañas', onClick:()=>go({section:'home'})},{label:'Nueva campaña'}]} go={go}
        right={<button className="btn" onClick={()=>go({section:'home'})}>Cancelar</button>}/>
      <div className="content" style={{maxWidth:1080}}>
        <div className="uppercase" style={{marginBottom:6}}>Asistente · Crear campaña mensual</div>
        <h1 className="page-title">Nueva campaña</h1>
        <p className="page-sub">{steps.length} pasos. Puedes guardar borrador y continuar después.</p>

        {/* Stepper */}
        <div style={{display:'flex',gap:0,marginBottom:24,marginTop:18,border:'1px solid var(--border)',background:'#fff',borderRadius:10,overflow:'hidden'}}>
          {steps.map((s,i)=>{
            const done   = s.n < step;
            const active = s.n === step;
            return (
              <button key={s.n} onClick={()=>setStep(s.n)} style={{
                flex:1,padding:'14px 16px',border:'none',background:active?'#0E0E0E':done?'#FAFAFA':'#fff',
                color:active?'#fff':done?'var(--ink)':'var(--ink-2)',display:'flex',alignItems:'center',gap:10,
                borderRight:i<steps.length-1?'1px solid var(--border)':'none',cursor:'pointer',textAlign:'left'
              }}>
                <span style={{width:22,height:22,borderRadius:'50%',display:'grid',placeItems:'center',background:active?'var(--red)':done?'var(--ink)':'#EEE',color:active||done?'#fff':'var(--ink-2)',fontFamily:'var(--mono)',fontSize:11,fontWeight:600}}>
                  {done?<Icon.check size={11}/>:s.n}
                </span>
                <span style={{fontSize:13,fontWeight:500,letterSpacing:'-.1px'}}>{s.label}</span>
              </button>
            );
          })}
        </div>

        <div className="card" style={{padding:'24px 28px'}}>
          {/* STEP 1 */}
          {step===1 && (
            <div>
              <div className="section-title" style={{marginBottom:14}}>1 · Cliente y paquete</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <div className="field">
                  <label>Cliente</label>
                  <select value={form.clientId} onChange={e=>setForm(f=>({...f,clientId:e.target.value}))}>
                    <option value="">Seleccionar cliente…</option>
                    {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Paquete contratado</label>
                  <input value={client?.package||'Sin paquete'} readOnly style={{background:'#FAFAFA'}}/>
                </div>
              </div>

              {!client?.package && client && (
                <div style={{marginTop:14,padding:14,background:'var(--red-tint)',border:'1px solid #F5C2C6',borderRadius:10,display:'flex',gap:12,alignItems:'center'}}>
                  <Icon.bolt/> <div style={{flex:1}}><b>{client.name}</b> no tiene paquete asignado. Asigna uno antes de crear campaña.</div>
                  <button className="btn red sm" onClick={()=>go({section:'clients', view:'profile', client:client.id})}>Asignar paquete</button>
                </div>
              )}

              {pkg && (
                <>
                  <div className="uppercase" style={{margin:'22px 0 10px'}}>Entregables del paquete</div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10}}>
                    {pkg.deliverables.map(d=>(
                      <div key={d.type} className="card" style={{padding:'14px 16px'}}>
                        <div className="uppercase" style={{marginBottom:6}}>{d.type}</div>
                        <div style={{fontFamily:'var(--display)',fontSize:26,fontWeight:600,letterSpacing:'-.5px'}}>{d.qty}</div>
                        <div className="dim" style={{fontSize:11.5}}>{(d.period||'').toLowerCase()}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* STEP 2 */}
          {step===2 && (
            <div>
              <div className="section-title" style={{marginBottom:14}}>2 · Mes y objetivo</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <div className="field">
                  <label>Mes</label>
                  <select value={form.month} onChange={e=>setForm(f=>({...f,month:e.target.value}))}>
                    {MONTHS.map(m=><option key={m}>{m}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Año</label>
                  <select value={form.year} onChange={e=>setForm(f=>({...f,year:Number(e.target.value)}))}>
                    {[2025,2026,2027].map(y=><option key={y}>{y}</option>)}
                  </select>
                </div>
                <div className="field" style={{gridColumn:'1/-1'}}>
                  <label>Nombre de la campaña</label>
                  <input {...F('name')} placeholder="ej. Feed Junio 2026"/>
                </div>
                <div className="field" style={{gridColumn:'1/-1'}}>
                  <label>Objetivo principal del mes</label>
                  <textarea rows={2} {...F('objective')} placeholder="¿Qué quiere lograr el cliente este mes?"/>
                </div>
                <div className="field"><label>Audiencia objetivo</label><input {...F('audience')} placeholder="ej. Propietarios 35-55, ranchos, hospitality"/></div>
                <div className="field"><label>CTA principal</label><input {...F('mainCta')} placeholder="ej. Agenda un diagnóstico gratuito"/></div>
                <div className="field" style={{gridColumn:'1/-1'}}><label>Promoción activa este mes</label><input {...F('activePromotion')} placeholder="ej. 20% off si reservan antes de fin de mes"/></div>
                <div className="field">
                  <label>Responsable principal</label>
                  <select value={form.ownerId} onChange={e=>setForm(f=>({...f,ownerId:e.target.value}))}>
                    {(window.TEAM||[]).map(t=><option key={t.id} value={t.id}>{t.name} — {t.role}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step===3 && (
            <div>
              <div className="section-title" style={{marginBottom:14}}>3 · Estrategia</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <div className="field">
                  <label>Pilares de contenido (separados por coma)</label>
                  <input {...F('contentPillars')} placeholder="ej. Educativo, Producto, Testimonio, Behind"/>
                </div>
                <div className="field"><label>Tono de comunicación</label><input {...F('tone')} placeholder="ej. Técnico cercano, sin jerga"/></div>
                <div className="field" style={{gridColumn:'1/-1'}}>
                  <label>Insight del mes</label>
                  <textarea rows={2} {...F('insight')} placeholder="¿Qué sabe o cree tu audiencia que quieres aprovechar o desmentir?"/>
                </div>
                <div className="field"><label>Competidores relevantes</label><input {...F('competitors')} placeholder="ej. Enerbatt MX, Solgreen"/></div>
                <div className="field"><label>Diferenciador principal</label><input {...F('differentiator')} placeholder="ej. Garantía 10 años + soporte técnico local"/></div>
              </div>
            </div>
          )}

          {/* STEP 4 — CONFIRM */}
          {step===4 && (
            <div style={{textAlign:'center',padding:'20px 0'}}>
              <div style={{width:60,height:60,borderRadius:14,background:'#111',color:'#fff',display:'grid',placeItems:'center',margin:'0 auto 18px'}}><Icon.briefcase size={26}/></div>
              <div className="section-title" style={{fontSize:22}}>Todo listo para crear la campaña</div>
              <p className="dim" style={{maxWidth:520,margin:'10px auto 0',fontSize:14,lineHeight:1.6}}>
                Se creará la campaña <b style={{color:'var(--ink)'}}>{form.name}</b> para{' '}
                <b style={{color:'var(--ink)'}}>{client?.name}</b> con paquete{' '}
                <b style={{color:'var(--ink)'}}>{client?.package||'sin paquete'}</b>.
                {pkg && <> Total de <b style={{color:'var(--ink)'}}>{pkg.deliverables.reduce((s,d)=>s+d.qty,0)} entregables</b> contratados.</>}
              </p>
              <div style={{display:'inline-flex',gap:8,marginTop:18,padding:'12px 16px',background:'#FAFAFA',border:'1px solid var(--border)',borderRadius:10,alignItems:'center',fontSize:13}}>
                <Icon.check size={14}/> Se creará workspace, feed vacío y rider plantilla.
              </div>
              {form.objective && (
                <div style={{marginTop:18,padding:16,background:'var(--blue-tint)',borderRadius:10,textAlign:'left',maxWidth:480,margin:'18px auto 0'}}>
                  <div className="uppercase" style={{marginBottom:6}}>Objetivo definido</div>
                  <div style={{fontSize:13.5}}>{form.objective}</div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="between" style={{marginTop:18}}>
          <button className="btn" disabled={step===1} onClick={()=>setStep(step-1)}><Icon.arrowL size={12}/> Atrás</button>
          <div style={{display:'flex',gap:8}}>
            <button className="btn">Guardar borrador</button>
            {step<4 && <button className="btn primary" onClick={()=>setStep(step+1)} disabled={step===1&&!form.clientId}>Continuar <Icon.arrow size={12}/></button>}
            {step===4 && (
              <button className="btn red" onClick={handleCreate} disabled={saving}>
                {saving?'Creando…':<><Icon.briefcase size={14}/> Crear campaña y abrir workspace</>}
              </button>
            )}
          </div>
        </div>
      </div>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </>
  );
};

window.CampaignCreate = CampaignCreate;

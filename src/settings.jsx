const Settings = () => {
  const [state] = window.useStore();
  const settings = state.settings || {};

  const [form, setForm] = React.useState({
    openaiKey: settings.openaiKey || '',
    aiModel: settings.aiModel || 'gpt-4o-mini',
    aiModelPremium: settings.aiModelPremium || 'gpt-4o',
    studio: {
      name: settings.studio?.name || '',
      rfc: settings.studio?.rfc || '',
      email: settings.studio?.email || '',
      phone: settings.studio?.phone || '',
      address: settings.studio?.address || '',
    },
    aiFeatures: {
      clientResearch: settings.aiFeatures?.clientResearch ?? true,
      feedGeneration: settings.aiFeatures?.feedGeneration ?? true,
      copyGeneration: settings.aiFeatures?.copyGeneration ?? true,
      strategyImprovement: settings.aiFeatures?.strategyImprovement ?? true,
      riderGeneration: settings.aiFeatures?.riderGeneration ?? false,
    }
  });

  const [showKey, setShowKey] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [testResult, setTestResult] = React.useState(null);

  const save = () => {
    window.A.updateSettings(form);
    window.__toast?.('Configuración guardada.', 'success');
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);

    // Guardamos temporalmente para probar con el valor actual.
    window.A.updateSettings({ openaiKey: form.openaiKey, aiModel: form.aiModel, aiModelPremium: form.aiModelPremium });

    try {
      const resp = await window.A.testAIConnection();
      setTestResult({ok:true, msg:resp || 'Conexión exitosa.'});
    } catch (e) {
      setTestResult({ok:false, msg:e.message === 'NO_API_KEY' ? 'Agrega una API Key para probar.' : e.message});
    }
    setTesting(false);
  };

  return (
    <>
      <Header trail={[{label:'642 Studio'},{label:'Configuración'}]}
        right={<button className="btn primary" onClick={save}><Icon.check size={14}/> Guardar cambios</button>}/>
      <div className="content" style={{maxWidth:1180}}>
        <div className="between" style={{marginBottom:16}}>
          <div>
            <h1 className="page-title">Configuración</h1>
            <p className="page-sub">Datos de estudio, modelos IA, usuarios y parámetros operativos del sistema.</p>
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
          <div className="card" style={{padding:'16px 18px'}}>
            <div className="section-title" style={{marginBottom:10}}>Datos de 642 Studio</div>
            <div className="field"><label>Razón social</label><input value={form.studio.name} onChange={e=>setForm(f=>({...f, studio:{...f.studio,name:e.target.value}}))}/></div>
            <div className="field"><label>RFC</label><input value={form.studio.rfc} onChange={e=>setForm(f=>({...f, studio:{...f.studio,rfc:e.target.value}}))}/></div>
            <div className="field"><label>Correo</label><input value={form.studio.email} onChange={e=>setForm(f=>({...f, studio:{...f.studio,email:e.target.value}}))}/></div>
            <div className="field"><label>Teléfono</label><input value={form.studio.phone} onChange={e=>setForm(f=>({...f, studio:{...f.studio,phone:e.target.value}}))}/></div>
            <div className="field"><label>Dirección</label><textarea rows={2} value={form.studio.address} onChange={e=>setForm(f=>({...f, studio:{...f.studio,address:e.target.value}}))}/></div>
          </div>

          <div className="card" style={{padding:'16px 18px'}}>
            <div className="section-title" style={{marginBottom:10}}>OpenAI / IA</div>
            <div className="field">
              <label>API Key</label>
              <div style={{display:'flex',gap:8}}>
                <input type={showKey ? 'text' : 'password'} value={form.openaiKey} onChange={e=>setForm(f=>({...f, openaiKey:e.target.value}))} placeholder="sk-..." style={{flex:1}}/>
                <button className="btn sm" onClick={()=>setShowKey(v=>!v)}>{showKey ? 'Ocultar' : 'Mostrar'}</button>
              </div>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              <div className="field">
                <label>Modelo económico</label>
                <select value={form.aiModel} onChange={e=>setForm(f=>({...f, aiModel:e.target.value}))}>
                  <option value="gpt-4o-mini">gpt-4o-mini</option>
                  <option value="gpt-4.1-mini">gpt-4.1-mini</option>
                  <option value="gpt-5-mini">gpt-5-mini</option>
                </select>
              </div>
              <div className="field">
                <label>Modelo premium</label>
                <select value={form.aiModelPremium} onChange={e=>setForm(f=>({...f, aiModelPremium:e.target.value}))}>
                  <option value="gpt-4o">gpt-4o</option>
                  <option value="gpt-4.1">gpt-4.1</option>
                  <option value="gpt-5">gpt-5</option>
                </select>
              </div>
            </div>

            <div className="divider"/>
            <div className="uppercase" style={{marginBottom:8}}>Estado conexión</div>
            <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:10}}>
              <span className={`chip ${form.openaiKey ? 'green' : 'red'}`}><span className="dotc"/>{form.openaiKey ? 'API Key capturada' : 'Sin API Key'}</span>
              <button className="btn sm" onClick={testConnection} disabled={testing}>{testing ? 'Probando…' : 'Probar conexión'}</button>
            </div>
            {testResult && (
              <div style={{padding:'10px 12px',borderRadius:8,fontSize:12.8,background:testResult.ok ? 'var(--green-tint)' : 'var(--red-tint)',color:testResult.ok ? 'var(--green)' : 'var(--red)'}}>
                {testResult.ok ? 'Conectado: ' : 'Error: '}{testResult.msg}
              </div>
            )}
          </div>

          <div className="card" style={{padding:'16px 18px'}}>
            <div className="section-title" style={{marginBottom:10}}>Funciones IA</div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {[
                ['clientResearch','Investigación IA de cliente'],
                ['feedGeneration','Generador de feed con IA'],
                ['copyGeneration','Generación de copys'],
                ['strategyImprovement','Mejorar estrategia con IA'],
                ['riderGeneration','Asistencia IA para rider'],
              ].map(([k,label]) => (
                <div key={k} className="between" style={{padding:'6px 0',borderTop:'1px solid var(--border)'}}>
                  <span>{label}</span>
                  <Toggle on={!!form.aiFeatures[k]} onChange={(v)=>setForm(f=>({...f, aiFeatures:{...f.aiFeatures,[k]:v}}))}/>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{padding:'16px 18px'}}>
            <div className="section-title" style={{marginBottom:10}}>Usuarios y roles</div>
            <table className="table">
              <thead><tr><th>Nombre</th><th>Rol</th><th>Estado</th></tr></thead>
              <tbody>
                {(state.users || []).map(u => (
                  <tr key={u.id}>
                    <td style={{fontWeight:500}}>{u.name}</td>
                    <td className="dim">{u.role}</td>
                    <td><span className={`chip ${u.active ? 'green' : 'outline'}`}>{u.active ? 'Activo' : 'Inactivo'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card" style={{padding:'16px 18px',marginTop:14}}>
          <div className="section-title" style={{marginBottom:10}}>Plantillas / respaldos (MVP)</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
            <button className="btn">Plantilla rider</button>
            <button className="btn">Plantilla reporte</button>
            <button className="btn">Ruta de archivos</button>
            <button className="btn" onClick={()=>window.A.resetState()}>Reset demo</button>
          </div>
        </div>
      </div>
    </>
  );
};

window.Settings = Settings;

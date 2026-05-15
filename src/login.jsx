// Login screen — validates credentials against store users.

const Login = ({onEnter}) => {
  const [email, setEmail] = React.useState('ana@642studio.mx');
  const [pwd, setPwd]     = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!email || !pwd) { setError('Ingresa tu correo y contraseña.'); return; }
    setLoading(true);
    setTimeout(() => {
      const user = window.A ? window.A.login(email, pwd) : null;
      if (user) {
        onEnter(user);
      } else {
        setError('Correo o contraseña incorrectos.');
        setLoading(false);
      }
    }, 400);
  };

  return (
    <div style={{minHeight:'100vh',background:'var(--bg)',display:'grid',gridTemplateColumns:'1fr 1fr'}}>
      {/* Left brand block */}
      <div style={{background:'#0E0E0E',color:'#fff',padding:'42px 48px',display:'flex',flexDirection:'column',position:'relative',overflow:'hidden'}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:32,height:32,background:'var(--red)',borderRadius:7,display:'grid',placeItems:'center',fontFamily:'var(--display)',fontWeight:700,fontSize:14}}>642</div>
          <div style={{fontFamily:'var(--display)',fontWeight:600,fontSize:16,letterSpacing:'-.3px'}}>MediaPlanner</div>
          <div style={{marginLeft:'auto',fontFamily:'var(--mono)',fontSize:11,letterSpacing:'.12em',color:'#666'}}>INTERNAL · v1.0</div>
        </div>

        <div style={{margin:'auto 0',maxWidth:480}}>
          <div style={{fontFamily:'var(--mono)',fontSize:11,letterSpacing:'.16em',color:'#888'}}>642 STUDIO / OPERACIÓN</div>
          <h1 style={{fontFamily:'var(--display)',fontWeight:500,fontSize:54,letterSpacing:'-1.5px',lineHeight:1.05,margin:'14px 0 18px'}}>
            Planeación, producción <br/>y entrega de contenido <br/>en <em style={{fontStyle:'normal',color:'var(--red)'}}>un solo lugar.</em>
          </h1>
          <p style={{color:'#999',fontSize:15,maxWidth:420,lineHeight:1.55,margin:0}}>
            La herramienta interna del equipo creativo de 642 Studio. Clientes,
            paquetes, campañas, riders y reportes — sin saltar entre 12 apps.
          </p>
          <div style={{display:'flex',gap:10,marginTop:36,flexWrap:'wrap'}}>
            {['Clientes activos · 8','Campañas en curso · 6','Sesiones esta semana · 4','Riders por aprobar · 3'].map((t,i)=>(
              <div key={i} style={{padding:'6px 10px',border:'1px solid #262626',borderRadius:6,fontFamily:'var(--mono)',fontSize:11,color:'#aaa'}}>{t}</div>
            ))}
          </div>
        </div>

        <div style={{fontFamily:'var(--mono)',fontSize:11,color:'#555',display:'flex',gap:18,letterSpacing:'.04em'}}>
          <span>© 642 Studio 2026</span><span>•</span><span>Monterrey · CDMX · Tulum</span><span style={{marginLeft:'auto'}}>hola@642studio.mx</span>
        </div>

        <div aria-hidden style={{position:'absolute',right:-60,top:60,fontFamily:'var(--display)',fontSize:520,fontWeight:600,color:'rgba(255,255,255,.025)',letterSpacing:'-30px',lineHeight:1,pointerEvents:'none',userSelect:'none'}}>642</div>
      </div>

      {/* Right form */}
      <div style={{display:'grid',placeItems:'center',padding:48}}>
        <div style={{width:380,maxWidth:'100%'}}>
          <div style={{fontFamily:'var(--mono)',fontSize:11,letterSpacing:'.16em',color:'var(--ink-3)',marginBottom:8}}>ACCESO INTERNO</div>
          <h2 style={{fontFamily:'var(--display)',fontWeight:600,fontSize:32,letterSpacing:'-.7px',margin:'0 0 6px'}}>Entrar a 642MediaPlanner</h2>
          <p className="dim" style={{margin:'0 0 28px',fontSize:14}}>Solo para integrantes del equipo de 642 Studio.</p>

          <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:14}}>
            <div className="field">
              <label>Correo</label>
              <input type="email" value={email} onChange={e=>{setEmail(e.target.value);setError('');}} placeholder="tu@642studio.mx"/>
            </div>
            <div className="field">
              <label>Contraseña</label>
              <input type="password" value={pwd} onChange={e=>{setPwd(e.target.value);setError('');}} placeholder="••••••••"/>
            </div>

            {error && (
              <div style={{padding:'10px 14px',background:'var(--red-tint)',border:'1px solid #F5C2C6',borderRadius:8,color:'var(--red)',fontSize:13,display:'flex',gap:8,alignItems:'center'}}>
                <Icon.bolt size={14}/> {error}
              </div>
            )}

            <button type="submit" className="btn lg primary" style={{width:'100%',justifyContent:'center',opacity:loading ? .75 : 1}} disabled={loading}>
              {loading ? 'Verificando…' : <><span>Entrar</span> <Icon.arrow size={14}/></>}
            </button>
          </form>

          <div style={{marginTop:20,padding:12,background:'#FAFAFA',border:'1px solid var(--border)',borderRadius:10,fontSize:12,color:'var(--ink-3)',fontFamily:'var(--mono)'}}>
            Demo rápido: <b style={{color:'var(--ink-2)'}}>ana@642studio.mx</b> / <b style={{color:'var(--ink-2)'}}>admin642</b>
          </div>

          <div style={{marginTop:18,padding:14,border:'1px dashed var(--border)',borderRadius:10,display:'flex',gap:12,alignItems:'flex-start'}}>
            <div style={{width:30,height:30,borderRadius:8,background:'var(--red-tint)',color:'var(--red)',display:'grid',placeItems:'center',flexShrink:0}}>
              <Icon.lock size={14}/>
            </div>
            <div style={{fontSize:12.5,color:'var(--ink-2)',lineHeight:1.5}}>
              Esta es la herramienta operativa del equipo. <span style={{color:'var(--ink)',fontWeight:500}}>No compartir credenciales.</span> Cada acción queda registrada bajo tu usuario.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

window.Login = Login;

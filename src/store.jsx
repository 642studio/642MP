// 642MP — Global state management with localStorage persistence
// All CRUD operations and AI integration live here.

const STORAGE_KEY = '642mp_v1';
const SESSION_KEY = '642mp_session';

// ─── DEFAULT DATA ────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS = {
  openaiKey: '',
  aiModel: 'gpt-4o-mini',
  aiModelPremium: 'gpt-4o',
  aiFeatures: {
    clientResearch: true,
    feedGeneration: true,
    copyGeneration: true,
    strategyImprovement: true,
    riderGeneration: false,
  },
  studio: {
    name: '642 Studio S.A. de C.V.',
    rfc: 'SST842210AB1',
    email: 'hola@642studio.mx',
    phone: '+52 81 1234 5678',
    address: 'Av. del Estado 200, San Pedro, Monterrey, NL',
  }
};

const DEFAULT_USERS = [
  {id:'AM', name:'Ana Mireles',    email:'ana@642studio.mx',    password:'admin642', role:'Dirección Operativa', initials:'AM', active:true, access:'all'},
  {id:'FV', name:'Fernando Villa', email:'fer@642studio.mx',    password:'dir642',   role:'Dirección Operativa', initials:'FV', active:true, access:'all'},
  {id:'DM', name:'Carlos (CM)',    email:'carlos@642studio.mx', password:'cm642',    role:'Community Manager',   initials:'CM', active:true, access:'operation'},
  {id:'JR', name:'Julia Rentería', email:'julia@642studio.mx',  password:'edit642',  role:'Editora',             initials:'JR', active:true, access:'operation'},
  {id:'CM', name:'Keeanu (Foto)',  email:'keeanu@642studio.mx', password:'foto642',  role:'Fotografía',          initials:'KE', active:true, access:'production'},
  {id:'SP', name:'Alejandro',      email:'ale@642studio.mx',    password:'prod642',  role:'Producción',          initials:'AL', active:true, access:'production'},
  {id:'YT', name:'Brandon R.',     email:'brandon@642studio.mx',password:'dev642',   role:'Desarrollo',          initials:'BR', active:true, access:'all'},
];

const SEED_CLIENTS = [
  {id:'hollman',  name:'Hollman BESS',      niche:'Energía / Baterías', city:'Monterrey', contact:'Lucía Treviño',   logo:'HB',  accent:'#0E0E0E', package:'642 Growth',     status:'active',   activeCampaign:'Feed Junio 2026',  owner:'AM', delivered:8, pending:3,  ig:'@hollmanbess',     web:'hollman.energy'},
  {id:'casavera', name:'Casa Vera Tulum',    niche:'Hospitality',         city:'Tulum',     contact:'Rafael Mora',    logo:'CV',  accent:'#2D5F4D', package:'642 Signature',   status:'active',   activeCampaign:'Feed Junio 2026',  owner:'DM', delivered:5, pending:6,  ig:'@casavera.tulum',  web:'casavera.com'},
  {id:'pasarela', name:'Pasarela 24',        niche:'Moda',                city:'CDMX',      contact:'Mariana Quezada',logo:'P24', accent:'#C97B1A', package:'642 Starter',     status:'active',   activeCampaign:'Feed Junio 2026',  owner:'AM', delivered:2, pending:4,  ig:'@pasarela24',      web:'pasarela24.mx'},
  {id:'nordheim', name:'Nordheim Café',      niche:'F&B',                 city:'Querétaro', contact:'Daniel Salas',   logo:'NC',  accent:'#5C3A21', package:'642 Growth',     status:'active',   activeCampaign:'Feed Junio 2026',  owner:'JR', delivered:11,pending:0},
  {id:'orquidea', name:'Orquídea Estética',  niche:'Wellness',            city:'Guadalajara',contact:'Paola Ríos',   logo:'OE',  accent:'#6A4FB8', package:'642 Starter',     status:'paused',   activeCampaign:null,               owner:'—',  delivered:0, pending:0},
  {id:'vento',    name:'Vento Architects',   niche:'Arquitectura',        city:'CDMX',      contact:'Eric Lazo',      logo:'VA',  accent:'#0E0E0E', package:null,              status:'prospect', activeCampaign:null,               owner:'—',  delivered:0, pending:0},
  {id:'salmar',   name:'Salmar Joyería',     niche:'Lujo / Joyería',      city:'Mérida',    contact:'Sofía Béjar',    logo:'SJ',  accent:'#8C6A30', package:'642 Signature',   status:'active',   activeCampaign:'Feed Junio 2026',  owner:'DM', delivered:4, pending:8},
  {id:'kineo',    name:'Kineo Fitness',      niche:'Fitness',             city:'Monterrey', contact:'Andrés Pino',    logo:'KF',  accent:'#1F8A5B', package:'642 Growth',     status:'active',   activeCampaign:'Feed Junio 2026',  owner:'AM', delivered:6, pending:5},
];

const SEED_PACKAGES = [
  {id:'starter', name:'642 Starter', price:'$18,500 / mes', tag:'Entrada',
   deliverables:[
     {type:'Reel', qty:2, period:'Mensual'},
     {type:'Post', qty:4, period:'Mensual'},
     {type:'Carrusel', qty:1, period:'Mensual'},
     {type:'Historias', qty:8, period:'Mensual'},
     {type:'Sesión', qty:1, period:'Mensual'},
   ], extras:{cards:false, dashboard:false, report:'Básico'}, active:true},
  {id:'growth',  name:'642 Growth',  price:'$32,000 / mes', tag:'Más contratado',
   deliverables:[
     {type:'Reel', qty:3, period:'Mensual'},
     {type:'Post', qty:6, period:'Mensual'},
     {type:'Carrusel', qty:2, period:'Mensual'},
     {type:'Historias', qty:16, period:'Mensual'},
     {type:'Sesión', qty:2, period:'Mensual'},
   ], extras:{cards:true, dashboard:true, report:'Mensual'}, active:true},
  {id:'signature', name:'642 Signature', price:'$54,000 / mes', tag:'Premium',
   deliverables:[
     {type:'Reel', qty:5, period:'Mensual'},
     {type:'Post', qty:8, period:'Mensual'},
     {type:'Carrusel', qty:3, period:'Mensual'},
     {type:'Historias', qty:24, period:'Mensual'},
     {type:'Sesión', qty:3, period:'Mensual'},
     {type:'Campaña especial', qty:1, period:'Trimestral'},
   ], extras:{cards:true, dashboard:true, report:'Semanal'}, active:true},
];

const SEED_CAMPAIGNS = [
  {id:'hollman_jun2026',  clientId:'hollman',  clientName:'Hollman BESS',    package:'642 Growth',    name:'Feed Junio 2026', month:'Junio', year:2026, objective:'Posicionar como referente técnico residencial premium. Activar 30 leads al webinar del 24 jun.', audience:'Propietarios 35-55, ranchos, hospitality, arquitectos.', tone:'Técnico cercano, sin jerga.', mainCta:'Agenda un diagnóstico gratuito.', activePromotion:'20% off instalación si reservan antes de fin de mes.', insight:'Los clientes piensan que las baterías de litio son riesgosas; desmitificar con casos reales.', contentPillars:['Educativo · 40%','Producto · 25%','Testimonio · 20%','Behind · 15%'], competitors:['Enerbatt MX','Solgreen','Tesla Powerwall'], differentiator:'Garantía 10 años + soporte técnico local 24/7', status:'planning', ownerId:'AM', createdAt:'2026-05-10T14:00:00Z'},
  {id:'casavera_jun2026', clientId:'casavera', clientName:'Casa Vera Tulum',  package:'642 Signature', name:'Feed Junio 2026', month:'Junio', year:2026, objective:'Posicionar suite como destino premium. Atraer reservas directas.', audience:'Parejas 28-45, viajeros experienciales, lujo asequible.', tone:'Aspiracional, cálido, poético.', mainCta:'Reserva tu estancia.', activePromotion:'Descuento early bird junio.', insight:'', contentPillars:['Ambiente · 35%','Experiencia · 30%','Destino · 20%','Detrás de cámaras · 15%'], competitors:[], differentiator:'Suite frente al mar con servicio personalizado.', status:'production', ownerId:'DM', createdAt:'2026-05-09T10:00:00Z'},
  {id:'pasarela_jun2026', clientId:'pasarela', clientName:'Pasarela 24',      package:'642 Starter',   name:'Feed Junio 2026', month:'Junio', year:2026, objective:'Lanzar colección verano. Generar ventas directas via DM.', audience:'Mujeres 22-35, moda accesible, trendsetters CDMX.', tone:'Fresco, aspiracional, desenfadado.', mainCta:'Compra por DM.', activePromotion:'', insight:'', contentPillars:['Producto · 50%','Lifestyle · 30%','Behind · 20%'], competitors:[], differentiator:'Moda accesible con identidad editorial.', status:'planning', ownerId:'AM', createdAt:'2026-05-11T11:00:00Z'},
  {id:'nordheim_jun2026', clientId:'nordheim', clientName:'Nordheim Café',    package:'642 Growth',    name:'Feed Junio 2026', month:'Junio', year:2026, objective:'Consolidar como tercer lugar premium QRO. Aumentar visitas vespertinas.', audience:'Jóvenes 25-40, profesionales, trabajo remoto.', tone:'Cálido, artesanal, intelectual.', mainCta:'Visítanos.', activePromotion:'', insight:'', contentPillars:['Producto · 40%','Comunidad · 30%','Ambiente · 30%'], competitors:[], differentiator:'Especialidad de origen, espacio de trabajo premium.', status:'approved', ownerId:'JR', createdAt:'2026-05-08T09:00:00Z'},
  {id:'salmar_jun2026',   clientId:'salmar',   clientName:'Salmar Joyería',   package:'642 Signature', name:'Feed Junio 2026', month:'Junio', year:2026, objective:'Posicionar colección aniversario. Generar leads de alta calidad.', audience:'Mujeres 30-55, lujo, regalos significativos.', tone:'Elegante, sutil, aspiracional.', mainCta:'Agenda una cita.', activePromotion:'Edición limitada aniversario.', insight:'', contentPillars:['Producto · 45%','Historia · 30%','Detrás de cámaras · 25%'], competitors:[], differentiator:'Joyería artesanal con historia familiar de 3 generaciones.', status:'planning', ownerId:'DM', createdAt:'2026-05-12T13:00:00Z'},
  {id:'kineo_jun2026',    clientId:'kineo',    clientName:'Kineo Fitness',    package:'642 Growth',    name:'Feed Junio 2026', month:'Junio', year:2026, objective:'Aumentar inscripciones junio. Mostrar comunidad activa.', audience:'Adultos 20-45, fitness, bienestar, Monterrey.', tone:'Energético, motivacional, inclusivo.', mainCta:'Prueba una clase gratis.', activePromotion:'Primera semana gratis.', insight:'', contentPillars:['Motivación · 35%','Clases · 30%','Comunidad · 25%','Resultados · 10%'], competitors:[], differentiator:'Entrenamientos funcionales en estudio boutique.', status:'editing', ownerId:'AM', createdAt:'2026-05-10T08:00:00Z'},
];

const SEED_FEED_ITEMS = {
  hollman_jun2026: [
    {id:1,  type:'Reel',     pilar:'Producto',      title:'Cómo cargar 12h sin red',       state:'editing',    date:'Jun 03', owner:'SP', accent:'#0E0E0E', tone:'dark',  hook:'¿Sabías que un BESS aguanta 12 horas sin red?', cta:'Agenda diagnóstico → link en bio', copy:'Si vives off-grid o en zona con apagones frecuentes, esto es para ti.', script:'0:00 Apertura — silencio total, casa a oscuras.\n0:03 Voz en off: "Es las 9pm y se acaba de ir la luz."\n0:07 Plano cerrado: BESS encendiéndose.\n0:14 Cifras en pantalla: 12h, 5kWh, 0 dB.\n0:25 Cierre — la luz sigue prendida, café en mesa.', internalNotes:'JR: revisar nivel de audio en cierre, está bajo.', clientComments:'(esperando feedback de Lucía)', isExtra:false},
    {id:2,  type:'Post',     pilar:'Testimonio',    title:'Caso: rancho off-grid',          state:'approved',   date:'Jun 04', owner:'DM', accent:'#C97B1A', tone:'photo', hook:null, cta:'Leer caso completo → link en bio', copy:'Una familia en rancho en Sonora eliminó su generador a gasolina por completo.', script:'', internalNotes:'', clientComments:'Aprobado', isExtra:false},
    {id:3,  type:'Carrusel', pilar:'Educativo',     title:'Mitos de litio en 5 slides',    state:'review',     date:'Jun 06', owner:'JR', accent:'#1F8A5B', tone:'mint',  hook:'Spoiler: ninguno explota.', cta:'Aprende más → link en bio', copy:'5 mitos sobre las baterías de litio en hogar — desmentidos con datos.', script:'', internalNotes:'YT: aprobado internamente el 12 may.', clientComments:'', isExtra:false},
    {id:4,  type:'Post',     pilar:'Producto',      title:'BESS 5K — render lateral',      state:'planned',    date:'Jun 09', owner:'CM', accent:'#0E0E0E', tone:'dark',  hook:null, cta:'Ver especificaciones → link en bio', copy:'El BESS 5K de Hollman: silencio, eficiencia y diseño para espacios residenciales.', script:'', internalNotes:'', clientComments:'', isExtra:false},
    {id:5,  type:'Reel',     pilar:'Behind',        title:'Instalación en planta MTY',     state:'production', date:'Jun 11', owner:'SP', accent:'#5C3A21', tone:'photo', hook:'Así se ve una instalación real de BESS.', cta:'Agenda el tuyo → link en bio', copy:'Time-lapse de una instalación completa en la planta de Monterrey.', script:'', internalNotes:'', clientComments:'', isExtra:false},
    {id:6,  type:'Historia', pilar:'Promo',         title:'Webinar 24 jun — countdown',    state:'idea',       date:'Jun 14', owner:'DM', accent:'#E30613', tone:'red',   hook:'24 jun · 8pm', cta:'Regístrate', copy:'4 historias secuenciales de countdown al webinar.', script:'', internalNotes:'', clientComments:'', isExtra:false},
    {id:7,  type:'Post',     pilar:'Diferenciador', title:'Garantía 10 años — claim',      state:'planned',    date:'Jun 17', owner:'DM', accent:'#0E0E0E', tone:'dark',  hook:null, cta:'Ver términos → link en bio', copy:'Garantía 10 años. Sin letra chica. Sin promesas vacías.', script:'', internalNotes:'', clientComments:'', isExtra:false},
    {id:8,  type:'Reel',     pilar:'Educativo',     title:'¿Cuántos kWh necesitas?',       state:'changes',    date:'Jun 20', owner:'JR', accent:'#2A6FDB', tone:'blue',  hook:'Mini guía visual', cta:'Calcular en web', copy:'¿Cuántos kWh necesitas para tu casa? Te lo explicamos en 45 segundos.', script:'', internalNotes:'Reel lleva 5 días en cambios.', clientComments:'', isExtra:false},
    {id:9,  type:'Carrusel', pilar:'Testimonio',    title:'Voces — clientes 2025',         state:'idea',       date:'Jun 24', owner:'DM', accent:'#8C6A30', tone:'photo', hook:null, cta:'Agendar → link en bio', copy:'Lo que dicen nuestros clientes de 2025.', script:'', internalNotes:'', clientComments:'', isExtra:false},
  ],
};

const SEED_SESSIONS = [
  {id:'s1', clientId:'hollman',  client:'Hollman BESS',     campaign:'Feed Junio 2026', date:'Mié 27 May', time:'09:00–13:00', loc:'Planta MTY · Apodaca',         photo:'CM', video:'SP', rider:'sent',     confirmed:'pending',   notes:''},
  {id:'s2', clientId:'casavera', client:'Casa Vera Tulum',  campaign:'Feed Junio 2026', date:'Vie 29 May', time:'07:00–11:00', loc:'Suite frente al mar · Tulum',  photo:'CM', video:'SP', rider:'approved', confirmed:'confirmed', notes:''},
  {id:'s3', clientId:'nordheim', client:'Nordheim Café',    campaign:'Feed Junio 2026', date:'Lun 01 Jun', time:'15:00–18:00', loc:'Sucursal Centro · QRO',         photo:'CM', video:'—',  rider:'draft',    confirmed:'pending',   notes:''},
  {id:'s4', clientId:'salmar',   client:'Salmar Joyería',   campaign:'Feed Junio 2026', date:'Mié 03 Jun', time:'10:00–14:00', loc:'Showroom Mérida',               photo:'YT', video:'SP', rider:'sent',     confirmed:'confirmed', notes:''},
  {id:'s5', clientId:'kineo',    client:'Kineo Fitness',    campaign:'Feed Junio 2026', date:'Jue 04 Jun', time:'06:30–09:30', loc:'Estudio Valle MTY',             photo:'CM', video:'SP', rider:'none',    confirmed:'pending',   notes:''},
];

const SEED_APPROVALS = [
  {id:1,  col:'internal_review', client:'Hollman BESS',  campaign:'Feed Jun', piece:'Reel · Cómo cargar 12h sin red',    type:'Reel',     owner:'JR', due:'Hoy',     comment:'JR: subí v2, mejor audio', tone:'red'},
  {id:2,  col:'internal_review', client:'Salmar Joyería',campaign:'Feed Jun', piece:'Carrusel · Anillos signature',       type:'Carrusel', owner:'YT', due:'Mañana',  comment:'YT: faltan 2 slides finales'},
  {id:3,  col:'internal_changes',client:'Casa Vera Tulum',campaign:'Feed Jun',piece:'Reel · Amanecer suite',              type:'Reel',     owner:'SP', due:'Lun 18',  comment:'AM: pedir corte alterno sin música'},
  {id:4,  col:'ready_client',    client:'Hollman BESS',  campaign:'Feed Jun', piece:'Carrusel · Mitos de litio',          type:'Carrusel', owner:'DM', due:'Hoy',     comment:'AM: enviar a Lucía hoy', tone:'red'},
  {id:5,  col:'ready_client',    client:'Nordheim Café', campaign:'Feed Jun', piece:'Post · Aniversario 3 años',          type:'Post',     owner:'DM', due:'Hoy',     comment:'Listo'},
  {id:6,  col:'sent',            client:'Casa Vera Tulum',campaign:'Feed Jun',piece:'Reel · Tour suite ocean view',       type:'Reel',     owner:'SP', due:'Vie 15',  comment:'Cliente revisa hoy 6pm'},
  {id:7,  col:'sent',            client:'Kineo Fitness', campaign:'Feed Jun', piece:'Reel · HIIT 4 min cardio',           type:'Reel',     owner:'JR', due:'Mar 19',  comment:''},
  {id:8,  col:'approved',        client:'Nordheim Café', campaign:'Feed Jun', piece:'Post · Nuevo pour over',             type:'Post',     owner:'DM', due:'—',       comment:'Aprobado por Daniel'},
  {id:9,  col:'approved',        client:'Hollman BESS',  campaign:'Feed Mayo',piece:'Reel · Webinar mayo',               type:'Reel',     owner:'JR', due:'—',       comment:'Publicado el 8 may'},
  {id:10, col:'client_changes',  client:'Pasarela 24',   campaign:'Feed Jun', piece:'Reel · Lookbook primavera',          type:'Reel',     owner:'JR', due:'Hoy',     comment:'Mariana: cambiar canción + 2 cortes', tone:'red'},
  {id:11, col:'client_changes',  client:'Salmar Joyería',campaign:'Feed Jun', piece:'Post · Collar Aurora',               type:'Post',     owner:'YT', due:'Mañana',  comment:'Sofía: ajustar warmth de la foto'},
];

const ATTENTION = [
  {kind:'rider',      text:'Rider de Casa Vera Tulum espera aprobación del cliente',         meta:'venció hace 1 día',               sev:'red',    client:'Casa Vera Tulum'},
  {kind:'edit',       text:'Reel "Cómo cargar 12h sin red" en edición — entrega hoy',        meta:'Hollman BESS',                    sev:'amber',  client:'Hollman BESS'},
  {kind:'package',    text:'Vento Architects sin paquete asignado',                           meta:'cliente desde hace 3 días',       sev:'amber',  client:'Vento Architects'},
  {kind:'campaign',   text:'Pasarela 24 — campaña Junio incompleta (faltan 2 historias)',     meta:'paquete 642 Starter',             sev:'red',    client:'Pasarela 24'},
  {kind:'production', text:'Producción mañana 07:00 — Casa Vera Tulum',                      meta:'rider aprobado · equipo confirmado',sev:'blue',  client:'Casa Vera Tulum'},
  {kind:'approval',   text:'Carrusel "Mitos de litio" — listo para cliente',                  meta:'esperando envío',                 sev:'purple', client:'Hollman BESS'},
];

const TEAM = [
  {id:'AM', name:'Ana Mireles',    role:'Dirección Operativa', initials:'AM'},
  {id:'DM', name:'Diego Martín',   role:'Community Manager',   initials:'DM'},
  {id:'JR', name:'Julia Rentería', role:'Editora',             initials:'JR'},
  {id:'CM', name:'Camilo Mora',    role:'Fotografía',          initials:'CM'},
  {id:'SP', name:'Sebas Pardo',    role:'Video',               initials:'SP'},
  {id:'YT', name:'Yael Torres',    role:'Dirección Creativa',  initials:'YT'},
];

const STATES = {
  idea:        {label:'Idea',               cls:'gray',   tone:'#999'},
  planned:     {label:'Planeado',           cls:'blue',   tone:'var(--blue)'},
  script:      {label:'Guion listo',        cls:'blue',   tone:'var(--blue)'},
  production:  {label:'En producción',      cls:'amber',  tone:'var(--amber)'},
  shot:        {label:'Grabado',            cls:'amber',  tone:'var(--amber)'},
  editing:     {label:'En edición',         cls:'amber',  tone:'var(--amber)'},
  review:      {label:'Revisión interna',   cls:'purple', tone:'var(--purple)'},
  client_ready:{label:'Listo para cliente', cls:'purple', tone:'var(--purple)'},
  sent:        {label:'Enviado a cliente',  cls:'purple', tone:'var(--purple)'},
  approved:    {label:'Aprobado',           cls:'green',  tone:'var(--green)'},
  published:   {label:'Publicado',          cls:'black',  tone:'#111'},
  changes:     {label:'Cambios',            cls:'red',    tone:'var(--red)'},
};

// ─── STORE ──────────────────────────────────────────────────────────────────

const getInitialState = () => ({
  clients:   SEED_CLIENTS.map(c => ({...c})),
  packages:  SEED_PACKAGES.map(p => ({...p})),
  campaigns: SEED_CAMPAIGNS.map(c => ({...c})),
  feedItems: Object.fromEntries(Object.entries(SEED_FEED_ITEMS).map(([k,v]) => [k, v.map(i => ({...i}))])),
  sessions:  SEED_SESSIONS.map(s => ({...s})),
  approvals: SEED_APPROVALS.map(a => ({...a})),
  riders: [],
  internalReports: [],
  settings: { ...DEFAULT_SETTINGS },
  users: DEFAULT_USERS.map(u => ({...u})),
});

const loadState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...getInitialState(),
        ...parsed,
        settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}), studio: { ...DEFAULT_SETTINGS.studio, ...(parsed.settings?.studio || {}) }, aiFeatures: { ...DEFAULT_SETTINGS.aiFeatures, ...(parsed.settings?.aiFeatures || {}) } },
      };
    }
  } catch(e) { console.warn('642MP load error', e); }
  return getInitialState();
};

const saveState = (s) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }
  catch(e) { console.warn('642MP save error', e); }
};

class MP_Store {
  constructor() {
    this._state = loadState();
    this._listeners = new Set();
  }
  getState() { return this._state; }
  setState(updater) {
    this._state = typeof updater === 'function' ? updater(this._state) : { ...this._state, ...updater };
    saveState(this._state);
    this._listeners.forEach(fn => fn(this._state));
    return this._state;
  }
  subscribe(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }
}

const store = new MP_Store();

const useStore = () => {
  const [state, _set] = React.useState(() => store.getState());
  React.useEffect(() => store.subscribe(_set), []);
  return [state, store.setState.bind(store)];
};

// ─── ACTIONS ─────────────────────────────────────────────────────────────────

const A = {
  // Auth
  login(email, pass) {
    const u = store.getState().users.find(x => x.email.toLowerCase() === email.toLowerCase() && x.password === pass && x.active);
    if (!u) return null;
    const session = {id: u.id, name: u.name, role: u.role, initials: u.initials};
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch(e) {}
    return session;
  },
  logout() {
    try { localStorage.removeItem(SESSION_KEY); } catch(e) {}
  },
  getSession() {
    try { const r = localStorage.getItem(SESSION_KEY); return r ? JSON.parse(r) : null; } catch(e) { return null; }
  },

  // Clients
  createClient(data) {
    const id = 'cl_' + Date.now();
    const c = { id, delivered:0, pending:0, status:'prospect', owner:'—', activeCampaign:null, package:null, ...data };
    store.setState(s => ({ ...s, clients: [...s.clients, c] }));
    return id;
  },
  updateClient(id, data) {
    store.setState(s => ({ ...s, clients: s.clients.map(c => c.id === id ? { ...c, ...data } : c) }));
  },
  deleteClient(id) {
    store.setState(s => ({ ...s, clients: s.clients.filter(c => c.id !== id) }));
  },

  // Packages
  createPackage(data) {
    const id = 'pkg_' + Date.now();
    store.setState(s => ({ ...s, packages: [...s.packages, { id, active:true, ...data }] }));
    return id;
  },
  updatePackage(id, data) {
    store.setState(s => ({ ...s, packages: s.packages.map(p => p.id === id ? { ...p, ...data } : p) }));
  },

  // Campaigns
  createCampaign(data) {
    const id = (data.clientId || 'c') + '_' + Date.now();
    const camp = { id, status:'brief', createdAt: new Date().toISOString(), ...data };
    store.setState(s => ({
      ...s,
      campaigns: [...s.campaigns, camp],
      clients: s.clients.map(c => c.id === data.clientId ? { ...c, activeCampaign: data.name } : c),
      feedItems: { ...s.feedItems, [id]: [] },
    }));
    return id;
  },
  updateCampaign(id, data) {
    store.setState(s => ({ ...s, campaigns: s.campaigns.map(c => c.id === id ? { ...c, ...data } : c) }));
  },

  // Feed items
  setFeedItems(campaignId, items) {
    store.setState(s => ({ ...s, feedItems: { ...s.feedItems, [campaignId]: items } }));
  },
  addFeedItem(campaignId, item) {
    store.setState(s => {
      const cur = s.feedItems[campaignId] || [];
      const maxId = cur.length ? Math.max(...cur.map(x => x.id || 0)) : 0;
      const toneMap = {Reel:'dark', Post:'photo', Carrusel:'mint', Historia:'red', Sesión:'dark'};
      const accentMap = {Reel:'#0E0E0E', Post:'#C97B1A', Carrusel:'#1F8A5B', Historia:'#E30613', Sesión:'#2A6FDB'};
      const t = item.type || 'Post';
      const ni = { id:maxId+1, type:t, pilar:'Producto', title:'Nueva pieza', state:'idea', owner:'AM', date:'', hook:'', cta:'', copy:'', script:'', internalNotes:'', clientComments:'', isExtra:false, accent:accentMap[t]||'#0E0E0E', tone:toneMap[t]||'dark', ...item };
      return { ...s, feedItems: { ...s.feedItems, [campaignId]: [...cur, ni] } };
    });
  },
  updateFeedItem(campaignId, itemId, data) {
    store.setState(s => ({ ...s, feedItems: { ...s.feedItems, [campaignId]: (s.feedItems[campaignId]||[]).map(t => t.id===itemId ? {...t,...data} : t) } }));
  },
  deleteFeedItem(campaignId, itemId) {
    store.setState(s => ({ ...s, feedItems: { ...s.feedItems, [campaignId]: (s.feedItems[campaignId]||[]).filter(t => t.id!==itemId) } }));
  },

  // Sessions
  createSession(data) {
    const id = 'sess_' + Date.now();
    store.setState(s => ({ ...s, sessions: [...s.sessions, { id, rider:'none', confirmed:'pending', notes:'', ...data }] }));
    return id;
  },
  updateSession(id, data) {
    store.setState(s => ({ ...s, sessions: s.sessions.map(x => x.id===id ? {...x,...data} : x) }));
  },

  // Approvals
  moveApproval(cardId, newCol) {
    store.setState(s => ({ ...s, approvals: s.approvals.map(c => c.id===cardId ? {...c, col:newCol} : c) }));
  },
  updateApproval(cardId, data) {
    store.setState(s => ({ ...s, approvals: s.approvals.map(c => c.id===cardId ? {...c, ...data} : c) }));
  },
  addApproval(data) {
    store.setState(s => {
      const maxId = s.approvals.length ? Math.max(...s.approvals.map(x=>x.id)) : 0;
      return { ...s, approvals: [...s.approvals, {id:maxId+1, col:'internal_review', ...data}] };
    });
  },

  // Riders
  createRider(data) {
    const id = 'rider_' + Date.now();
    const rider = {
      id,
      title: 'Rider de Producción',
      status: 'draft',
      content: {},
      sentAt: null,
      approvedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...data
    };
    store.setState(s => ({ ...s, riders: [...(s.riders||[]), rider] }));
    return id;
  },
  updateRider(id, data) {
    store.setState(s => ({
      ...s,
      riders: (s.riders||[]).map(r => r.id === id ? { ...r, ...data, updatedAt: new Date().toISOString() } : r)
    }));
  },

  // Internal reports
  createInternalReport(data) {
    const id = 'report_' + Date.now();
    const report = { id, createdAt: new Date().toISOString(), ...data };
    store.setState(s => ({ ...s, internalReports: [...(s.internalReports||[]), report] }));
    return id;
  },

  // Settings
  updateSettings(data) {
    store.setState(s => ({ ...s, settings: { ...s.settings, ...data } }));
  },

  // AI
  async callAI(prompt, premium = false) {
    const { openaiKey, aiModel, aiModelPremium } = store.getState().settings;
    if (!openaiKey) throw new Error('NO_API_KEY');
    const model = premium ? (aiModelPremium||'gpt-4o') : (aiModel||'gpt-4o-mini');
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':`Bearer ${openaiKey}`},
      body: JSON.stringify({
        model,
        messages:[
          {role:'system', content:'Eres un experto en marketing digital y producción de contenido para redes sociales en México. Trabajas para 642 Studio, una agencia creativa. Responde siempre en español, sé conciso y operativo.'},
          {role:'user', content:prompt}
        ],
        max_tokens:2000, temperature:0.7,
      })
    });
    if (!resp.ok) { const err = await resp.json().catch(()=>{}); throw new Error(`API ${resp.status}: ${err?.error?.message||'Error desconocido'}`); }
    const data = await resp.json();
    return data.choices?.[0]?.message?.content || '';
  },

  async testAIConnection() {
    return A.callAI('Responde únicamente con: "Conexión exitosa con 642MP."');
  },

  // Reset (dev)
  resetState() {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  }
};

// Expose globals
Object.assign(window, { store, useStore, A, TEAM, STATES, ATTENTION, SEED_CLIENTS, SEED_PACKAGES });

// Keep CLIENTS/PACKAGES/etc. in sync for any legacy code
const syncGlobals = (s) => { window.CLIENTS = s.clients; window.PACKAGES = s.packages; window.SESSIONS = s.sessions; window.FEED_HOLLMAN = s.feedItems['hollman_jun2026'] || []; window.APPROVAL_CARDS = s.approvals; };
syncGlobals(store.getState());
store.subscribe(syncGlobals);

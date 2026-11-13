/* Portal de gestión · Yo Me Llamo Marc Anthony */
'use strict';

/* ---------------- Utilidades ---------------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (v) => { const n = parseFloat(String(v ?? '').replace(/[^\d.-]/g, '')); return isFinite(n) ? n : 0; };
const money = (n) => '$ ' + Math.round(num(n)).toLocaleString('es-CO');
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const today = () => new Date().toISOString().slice(0, 10);
const clone = (o) => JSON.parse(JSON.stringify(o));
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
function parseDate(s) { if (!s) return null; const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
function fechaLarga(s, conDia = true) { const d = parseDate(s); if (!d) return ''; return (conDia ? DIAS[d.getDay()] + ' ' : '') + d.getDate() + ' de ' + MESES[d.getMonth()] + ' de ' + d.getFullYear(); }
function fechaCorta(s) { const d = parseDate(s); if (!d) return ''; return d.getDate() + ' ' + MESES[d.getMonth()].slice(0, 3) + ' ' + d.getFullYear(); }
function hora12(t) { if (!t) return ''; let [h, m] = t.split(':').map(Number); const ap = h >= 12 ? 'p. m.' : 'a. m.'; h = h % 12 || 12; return h + ':' + String(m).padStart(2, '0') + ' ' + ap; }
function daysFromToday(s) { const d = parseDate(s); if (!d) return null; const t = parseDate(today()); return Math.round((d - t) / 86400000); }
function getPath(obj, path) { return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj); }
function setPath(obj, path, val) { const ks = path.split('.'); let o = obj; ks.slice(0, -1).forEach((k) => { if (o[k] == null || typeof o[k] !== 'object') o[k] = {}; o = o[k]; }); o[ks[ks.length - 1]] = val; }
function toast(msg, ms = 2600) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), ms); }

/* Número a letras (pesos colombianos) */
function letras(n) {
  n = Math.floor(Math.abs(num(n)));
  if (n === 0) return 'CERO PESOS M/CTE';
  const U = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE', 'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE', 'VEINTE', 'VEINTIÚN', 'VEINTIDÓS', 'VEINTITRÉS', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE'];
  const D = ['', '', '', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const C = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];
  const dec = (x) => (x < 30 ? U[x] : D[Math.floor(x / 10)] + (x % 10 ? ' Y ' + U[x % 10] : ''));
  const cen = (x) => { if (x === 100) return 'CIEN'; const c = Math.floor(x / 100), r = x % 100; return [C[c], dec(r)].filter(Boolean).join(' '); };
  const mil = (x) => { const m = Math.floor(x / 1000), r = x % 1000; const pm = m === 0 ? '' : m === 1 ? 'MIL' : cen(m) + ' MIL'; return [pm, cen(r)].filter(Boolean).join(' '); };
  const millones = Math.floor(n / 1e6), resto = n % 1e6;
  let txt = '';
  if (millones) txt = (millones === 1 ? 'UN MILLÓN' : mil(millones) + ' MILLONES');
  if (resto) txt += (txt ? ' ' : '') + mil(resto);
  const de = !resto && millones ? ' DE' : '';
  return (txt + de + ' PESOS M/CTE').replace(/\s+/g, ' ').trim();
}

/* ---------------- Modelo ---------------- */
const STAGES = [
  { id: 'prospecto', name: 'Prospecto', color: '#7b8197', tip: 'Cliente identificado. Aún no hay contacto real.' },
  { id: 'contactado', name: 'Contactado', color: '#9db4ff', tip: 'Ya hablaste o respondió. Llena el cuestionario.' },
  { id: 'cotizacion', name: 'Cotización enviada', color: '#3d63e0', tip: 'Enviaste precio. Haz seguimiento en 2–3 días.' },
  { id: 'negociacion', name: 'Negociación', color: '#b48ce0', tip: 'Ajustando precio, fecha o condiciones.' },
  { id: 'firmado', name: 'Contrato firmado', color: '#cfae6e', tip: 'Firmado y anticipo recibido. Fecha bloqueada.' },
  { id: 'preproduccion', name: 'Preproducción', color: '#e3a33c', tip: 'Confirma técnica, horarios y hoja de ruta.' },
  { id: 'realizado', name: 'Show realizado', color: '#4fbf8a', tip: 'Cobra el saldo, pide testimonio y sube contenido.' },
  { id: 'cerrado', name: 'Cobrado y cerrado', color: '#2f9c6a', tip: 'Todo pagado. Registra ingresos y gastos.' },
  { id: 'perdido', name: 'Perdido', color: '#e0605a', tip: 'No se dio. Anota por qué y vuelve a intentar.' },
];
const stageIdx = (id) => STAGES.findIndex((s) => s.id === id);
const stageName = (id) => (STAGES.find((s) => s.id === id) || {}).name || id;

const DEFAULT_SETTINGS = {
  contratista: { nombre: '', tipoDoc: 'Cédula de ciudadanía', doc: '', representante: '', repDoc: '', direccion: '', ciudad: 'Itagüí', telefono: '+57 320 763 7015', email: 'contacto@yomellamomarcanthony.com', banco: '', tipoCuenta: 'Ahorros', cuenta: '', titular: '', regimen: 'no_iva' },
  tarifas: { precioBase: 9500000, artista: 0, musico: 0, nMusicos: 9, corista: 0, nCoristas: 2, ingeniero: 0, roadie: 0, nRoadies: 2, video: 0, alimentacion: 25000, kmTransporte: 0 },
  pct: { imprevistos: 5, comision: 15, anticipo: 50, retencion: 0 },
  contrato: { prefijo: 'YMMA', consecutivo: 1, ciudadFirma: 'Itagüí', jurisdiccion: 'Medellín', cancelDias: 30, cancelPct1: 50, cancelPct2: 100, penalPct: 20, plazoSaldo: 'antes de iniciar la presentación', reprogramarMeses: 6 },
};

function teamSize(s = data.settings) { const t = s.tarifas; return 1 + num(t.nMusicos) + num(t.nCoristas) + 1 + num(t.nRoadies) + 1 + 1; }

function defaultItems(s = data.settings) {
  const t = s.tarifas;
  return [
    { id: uid(), c: 'Honorarios del artista', qty: 1, val: num(t.artista) },
    { id: uid(), c: 'Músicos de la orquesta', qty: num(t.nMusicos), val: num(t.musico) },
    { id: uid(), c: 'Coristas', qty: num(t.nCoristas), val: num(t.corista) },
    { id: uid(), c: 'Ingeniero de sonido', qty: 1, val: num(t.ingeniero), tec: 1 },
    { id: uid(), c: 'Roadie', qty: num(t.nRoadies), val: num(t.roadie), tec: 1 },
    { id: uid(), c: 'Persona que graba el evento (video y foto)', qty: 1, val: num(t.video), tec: 1 },
    { id: uid(), c: 'Transporte del equipo', qty: 1, val: 0 },
    { id: uid(), c: 'Alimentación del equipo', qty: 0, val: num(t.alimentacion) },
    { id: uid(), c: 'Hospedaje', qty: 0, val: 0 },
    { id: uid(), c: 'Alquiler de sonido o backline', qty: 0, val: 0 },
  ];
}

function newEvent(stage = 'prospecto') {
  return {
    id: uid(), stage, created: new Date().toISOString(), updated: new Date().toISOString(),
    q: { departamento: 'Antioquia', duracion: 90 },
    bud: { items: defaultItems(), venta: num(data.settings.tarifas.precioBase), iva: false },
    cobros: { anticipo: false, anticipoFecha: '', saldo: false, saldoFecha: '' },
    contrato: { numero: '', fechaFirma: '' },
    seg: { accion: 'Primer contacto', fecha: today() }, notas: '', perdidoMotivo: '',
  };
}

/* Cuestionario: cada campo es una pregunta que le haces al cliente */
const Q = [
  { id: 'contacto', t: 'Contacto y cliente', intro: 'Empieza por saber con quién hablas y si esa persona decide.', f: [
    { k: 'tipoCliente', l: 'Tipo de cliente', q: '¿El evento es de una alcaldía, una empresa, un operador, un salón o un particular?', type: 'select', o: ['Alcaldía o entidad pública', 'Empresa', 'Operador de eventos', 'Salón o discoteca', 'Particular'] },
    { k: 'contactoNombre', l: 'Nombre del contacto', q: '¿Con quién tengo el gusto?' },
    { k: 'contactoCargo', l: 'Cargo', q: '¿Qué cargo tiene? ¿Usted es quien toma la decisión?', why: 'Si no decide, pregunta quién decide y cuándo.' },
    { k: 'contactoTel', l: 'Celular / WhatsApp', q: '¿A qué número le escribo por WhatsApp?', type: 'tel' },
    { k: 'contactoEmail', l: 'Correo', q: '¿A qué correo le envío la propuesta?', type: 'email' },
    { k: 'origen', l: 'Cómo nos conoció', q: '¿Cómo se enteró del show?', type: 'select', o: ['Campaña de email', 'Página web', 'Instagram', 'TikTok', 'WhatsApp', 'Referido', 'Ya nos conocía', 'Otro'] },
  ] },
  { id: 'evento', t: 'El evento', intro: 'Con esto ya puedes revisar la agenda y empezar a calcular.', f: [
    { k: 'nombreEvento', l: 'Nombre o motivo del evento', q: '¿Cómo se llama el evento o qué se celebra?', req: 1 },
    { k: 'fecha', l: 'Fecha', q: '¿Qué fecha tienen pensada?', type: 'date', req: 1, why: 'Revisa en Agenda que no esté ocupada antes de confirmar.' },
    { k: 'horaShow', l: 'Hora del show', q: '¿A qué hora sería la presentación?', type: 'time', req: 1 },
    { k: 'duracion', l: 'Duración (minutos)', q: '¿Cuánto tiempo de show necesitan?', type: 'number', req: 1, why: 'El formato estándar es 1 h 30 min (90 minutos).' },
    { k: 'municipio', l: 'Municipio', q: '¿En qué municipio es?', req: 1 },
    { k: 'departamento', l: 'Departamento', q: '¿Departamento?' },
    { k: 'lugar', l: 'Lugar', q: '¿En qué sitio exacto sería? (coliseo, salón, plaza, finca…)', req: 1 },
    { k: 'direccion', l: 'Dirección del lugar', q: '¿Cuál es la dirección?', req: 1 },
    { k: 'espacio', l: 'Tipo de espacio', q: '¿Es un lugar cerrado o al aire libre?', type: 'select', o: ['Cerrado (salón, coliseo, discoteca)', 'Abierto con tarima cubierta', 'Abierto sin cubierta'], why: 'Al aire libre la tarima debe estar cubierta (lo exige el rider).' },
    { k: 'aforo', l: 'Aforo esperado', q: '¿Cuántas personas esperan?', type: 'number' },
    { k: 'publico', l: 'Tipo de público', q: '¿Qué tipo de público asistirá?', type: 'select', o: ['Familiar', 'Adultos', 'Corporativo / empleados', 'Mixto'] },
    { k: 'entrada', l: 'Tipo de entrada', q: '¿El evento es privado, gratuito al público o con boletería?', type: 'select', o: ['Privado (con invitación)', 'Gratuito al público', 'Con boletería'], why: 'Con boletería el organizador debe registrar el evento en el PULEP del Ministerio de Cultura.' },
    { k: 'lineup', l: 'Otros artistas y orden', q: '¿Habrá otros artistas? ¿En qué orden y a qué hora sale cada uno?', type: 'textarea' },
  ] },
  { id: 'tecnica', t: 'Parte técnica', intro: 'Aquí se evitan los problemas del día del show. Envía siempre el rider.', f: [
    { k: 'sonido', l: '¿Quién pone sonido, tarima y luces?', q: '¿Ustedes tienen sonido, tarima y luces profesionales, o debemos ponerlos nosotros?', type: 'select', o: [['cliente', 'El cliente, según nuestro rider'], ['nosotros', 'Nosotros (se cotiza aparte)'], ['pendiente', 'Por definir']], req: 1 },
    { k: 'empresaSonido', l: 'Empresa de sonido y contacto técnico', q: '¿Qué empresa pone el sonido y quién es el técnico? (nombre y celular)' },
    { k: 'riderEnviado', l: 'Rider técnico', q: '¿Ya les llegó nuestro rider técnico?', type: 'select', o: ['Pendiente enviarlo', 'Enviado', 'Enviado y aprobado por el técnico'] },
    { k: 'tarima', l: 'Medidas de la tarima', q: '¿Qué medidas tiene la tarima?', why: 'Mínimo 7 m de ancho × 6 m de fondo.' },
    { k: 'energia', l: 'Energía eléctrica', q: '¿Hay tomas eléctricas o planta cerca de la tarima?', why: 'Se necesitan al menos 6 tomas a menos de 5 m de la orquesta.' },
    { k: 'pruebaSonido', l: 'Hora de prueba de sonido', q: '¿A qué hora podemos hacer prueba de sonido?', type: 'time', why: 'Se necesitan 60 minutos con toda la orquesta.' },
  ] },
  { id: 'logistica', t: 'Logística y hospitalidad', intro: 'Lo que hay que tener claro para llegar, comer y estar cómodos.', f: [
    { k: 'horaLlegada', l: 'Hora de llegada al lugar', q: '¿A qué hora debemos llegar?', type: 'time' },
    { k: 'camerino', l: 'Camerino', q: '¿Hay camerino privado para el artista y la orquesta?', type: 'select', o: ['Sí, camerino privado', 'Espacio compartido', 'No hay camerino'] },
    { k: 'alimentacion', l: 'Alimentación', q: () => `¿Ustedes dan alimentación al equipo? Somos ${teamSize()} personas.`, type: 'select', o: [['cliente', 'La pone el cliente'], ['incluida', 'Incluida en nuestro valor'], ['na', 'No aplica']] },
    { k: 'transporte', l: 'Transporte', q: '¿El transporte del equipo lo ponen ustedes o lo incluimos en el valor?', type: 'select', o: [['incluido', 'Incluido en nuestro valor'], ['cliente', 'Lo pone el cliente']] },
    { k: 'hospedaje', l: 'Hospedaje', q: '¿Se necesita hospedaje? ¿Quién lo pone?', type: 'select', o: [['na', 'No aplica'], ['cliente', 'Lo pone el cliente'], ['incluido', 'Incluido en nuestro valor']] },
    { k: 'distanciaKm', l: 'Distancia desde Medellín (km)', q: '¿Qué tan lejos está de Medellín?', type: 'number' },
    { k: 'parqueadero', l: 'Parqueadero', q: '¿Hay parqueadero para el bus y los carros del equipo?', type: 'select', o: ['Sí', 'No', 'Por confirmar'] },
    { k: 'contactoDia', l: 'Contacto el día del evento', q: '¿Quién nos recibe el día del evento? (nombre y celular)' },
  ] },
  { id: 'comercial', t: 'Negociación y pago', intro: 'Pregunta el presupuesto antes de dar tu precio.', f: [
    { k: 'presupuestoCliente', l: 'Presupuesto del cliente', q: '¿Qué presupuesto tienen destinado para el artista?', type: 'number', why: 'Si lo dicen primero, negocias desde una mejor posición.' },
    { k: 'formaPago', l: 'Forma de pago', q: '¿Cómo manejan los pagos?', type: 'select', o: ['Anticipo y saldo antes del show', 'Anticipo y saldo al terminar el show', 'Pago total anticipado', 'Pago contra factura (entidad pública)'] },
    { k: 'fechaAnticipo', l: 'Fecha del anticipo', q: '¿Para cuándo pueden girar el anticipo?', type: 'date' },
    { k: 'factura', l: 'Facturación', q: '¿Necesitan factura electrónica o cuenta de cobro?', type: 'select', o: ['Factura electrónica', 'Cuenta de cobro', 'No requieren'] },
    { k: 'documentos', l: 'Documentos que piden', q: '¿Qué documentos necesitan de nosotros? (RUT, Cámara de Comercio, seguridad social, certificación bancaria, póliza…)', type: 'textarea' },
    { k: 'grabacion', l: 'Grabación', q: '¿Podemos grabar el show para nuestras redes? ¿Ustedes van a grabar o transmitir?', type: 'select', o: [['show', 'Sí, el show graba para sus redes'], ['ambos', 'Sí, y el cliente también graba o transmite'], ['no', 'No se permite grabar']] },
    { k: 'decision', l: 'Fecha de decisión', q: '¿Para cuándo toman la decisión?', type: 'date', why: 'Ese día pon tu próxima acción de seguimiento.' },
  ] },
  { id: 'contratante', t: 'Datos para el contrato', intro: 'Pídelos cuando el cliente diga que sí. Sin estos datos el contrato no es válido.', f: [
    { k: 'contratanteNombre', l: 'Contratante (persona o empresa)', q: '¿A nombre de quién se hace el contrato?', req: 1 },
    { k: 'contratanteTipoDoc', l: 'Tipo de documento', q: '¿Con NIT o con cédula?', type: 'select', o: ['NIT', 'Cédula de ciudadanía', 'Cédula de extranjería'], req: 1 },
    { k: 'contratanteDoc', l: 'Número de NIT o cédula', q: '¿Cuál es el número? (con dígito de verificación si es NIT)', req: 1 },
    { k: 'representante', l: 'Representante legal', q: 'Si es empresa o entidad: ¿quién es el representante legal?', why: 'Obligatorio si el contratante es empresa o entidad (NIT).' },
    { k: 'representanteDoc', l: 'Cédula del representante legal', q: '¿Cuál es la cédula del representante legal?' },
    { k: 'contratanteDireccion', l: 'Dirección del contratante', q: '¿Cuál es la dirección para notificaciones?', req: 1 },
    { k: 'contratanteCiudad', l: 'Ciudad del contratante', q: '¿En qué ciudad?', req: 1 },
    { k: 'contratanteEmail', l: 'Correo para notificaciones', q: '¿A qué correo llegan las notificaciones del contrato?', type: 'email' },
    { k: 'contratanteTel', l: 'Teléfono del contratante', q: '¿Teléfono de contacto?', type: 'tel' },
  ] },
];
const QF = Object.fromEntries(Q.flatMap((s) => s.f.map((f) => [f.k, f])));
function optLabel(k, v) { const f = QF[k]; if (!f || !f.o) return v || ''; const o = f.o.find((x) => (Array.isArray(x) ? x[0] : x) === v); return o ? (Array.isArray(o) ? o[1] : o) : v || ''; }

/* ---------------- Estado y servidor ---------------- */
let data = { settings: clone(DEFAULT_SETTINGS), events: [] };
let rev = 0;
let curId = null;
let curTab = 'tablero';
let saveTimer = null;
let saving = false;

async function api(a, body) {
  const r = await fetch('api.php?a=' + a, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', 'X-Portal': '1' }, body: body ? JSON.stringify(body) : undefined, credentials: 'same-origin' });
  let j = {};
  try { j = await r.json(); } catch (e) { j = { error: 'Respuesta inválida del servidor.' }; }
  if (r.status === 401 && a !== 'login') { showLogin(false); throw new Error(j.error); }
  return { status: r.status, ...j };
}

function mergeSettings(s) {
  const out = clone(DEFAULT_SETTINGS);
  if (s) for (const k of Object.keys(out)) Object.assign(out[k], s[k] || {});
  return out;
}

function setSaveState(txt, cls = '') { const el = $('#saveState'); el.textContent = txt; el.className = 'save-state ' + cls; }

function persist() {
  setSaveState('Guardando…', 'saving');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(doSave, 700);
}

async function doSave(force = false) {
  if (saving) { saveTimer = setTimeout(doSave, 400); return; }
  saving = true;
  try {
    const r = await api('save', { rev, data, force });
    if (r.status === 200) { rev = r.rev; setSaveState('Guardado'); }
    else if (r.status === 409) {
      if (confirm('Los datos cambiaron desde otro dispositivo.\n\nAceptar: cargar la versión del servidor (pierdes el último cambio de aquí).\nCancelar: guardar la versión de este dispositivo encima.')) {
        rev = r.rev; data = { settings: mergeSettings(r.data && r.data.settings), events: (r.data && r.data.events) || [] }; renderAll(); setSaveState('Actualizado');
      } else { saving = false; return doSave(true); }
    } else { setSaveState('Error al guardar', 'error'); toast(r.error || 'No se pudo guardar.'); }
  } catch (e) { setSaveState('Sin conexión', 'error'); }
  saving = false;
}

window.addEventListener('beforeunload', (e) => { if ($('#saveState').classList.contains('saving')) { e.preventDefault(); e.returnValue = ''; } });

/* ---------------- Ingreso ---------------- */
let setupMode = false;
function showLogin(setup) {
  setupMode = setup;
  $('#app').hidden = true; $('#login').hidden = false;
  $('#loginTitle').textContent = setup ? 'Crea tu contraseña' : 'Portal de gestión';
  $('#loginHint').textContent = setup ? 'Es el primer ingreso. Elige una contraseña de al menos 8 caracteres; solo tú la tendrás.' : 'Ingresa tu contraseña.';
  $('#pw2wrap').hidden = !setup; $('#pw2').required = setup;
  $('#pw1').autocomplete = setup ? 'new-password' : 'current-password';
  $('#loginBtn').textContent = setup ? 'Crear y entrar' : 'Entrar';
  setTimeout(() => $('#pw1').focus(), 50);
}

$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const p1 = $('#pw1').value, p2 = $('#pw2').value;
  $('#loginErr').textContent = '';
  if (setupMode && p1 !== p2) { $('#loginErr').textContent = 'Las contraseñas no coinciden.'; return; }
  $('#loginBtn').disabled = true;
  const r = await api(setupMode ? 'setup' : 'login', { password: p1 }).catch(() => ({ status: 0, error: 'Sin conexión.' }));
  $('#loginBtn').disabled = false;
  if (r.status === 200) { $('#pw1').value = ''; $('#pw2').value = ''; await boot(); }
  else $('#loginErr').textContent = r.error || 'No se pudo ingresar.';
});

$('#logoutBtn').addEventListener('click', async () => { await doSave(); await api('logout', {}); location.reload(); });

async function boot() {
  const r = await api('load');
  rev = r.rev || 0;
  if (r.data) data = { settings: mergeSettings(r.data.settings), events: r.data.events || [] };
  $('#login').hidden = true; $('#app').hidden = false;
  const saved = (() => { try { return JSON.parse(localStorage.getItem('ymma_ui') || '{}'); } catch (e) { return {}; } })();
  curId = data.events.some((e) => e.id === saved.ev) ? saved.ev : (data.events[0] || {}).id || null;
  renderAll();
  showTab(saved.tab || 'tablero');
}

async function start() {
  try {
    const s = await api('status');
    if (s.status !== 200) throw new Error(s.error);
    if (s.logged) await boot(); else showLogin(!!s.setup);
  } catch (e) { showLogin(false); $('#loginErr').textContent = 'No hay conexión con el servidor.'; }
}

/* ---------------- Navegación ---------------- */
function remember() { try { localStorage.setItem('ymma_ui', JSON.stringify({ tab: curTab, ev: curId })); } catch (e) { /* sin almacenamiento */ } }
function showTab(tab) {
  curTab = tab;
  $$('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
  $$('.panel').forEach((p) => p.classList.toggle('on', p.dataset.panel === tab));
  $('#evbar').hidden = !['cuestionario', 'presupuesto', 'contrato'].includes(tab);
  renderPanel(tab);
  remember();
  window.scrollTo({ top: 0 });
}
$('#tabs').addEventListener('click', (e) => { const b = e.target.closest('button[data-tab]'); if (b) showTab(b.dataset.tab); });

const cur = () => data.events.find((e) => e.id === curId) || null;
function evTitle(e) { return e.q.nombreEvento || e.q.contratanteNombre || e.q.contactoNombre || 'Evento sin nombre'; }
function touch(e) { if (e) e.updated = new Date().toISOString(); }

function renderEvBar() {
  const sel = $('#evSelect');
  const evs = [...data.events].sort((a, b) => (a.q.fecha || '9999').localeCompare(b.q.fecha || '9999'));
  sel.innerHTML = evs.length ? evs.map((e) => `<option value="${e.id}" ${e.id === curId ? 'selected' : ''}>${esc(evTitle(e))}${e.q.fecha ? ' · ' + fechaCorta(e.q.fecha) : ''}${e.q.municipio ? ' · ' + esc(e.q.municipio) : ''}</option>`).join('') : '<option>No hay eventos</option>';
  const e = cur();
  $('#evStage').innerHTML = STAGES.map((s) => `<option value="${s.id}" ${e && e.stage === s.id ? 'selected' : ''}>${s.name}</option>`).join('');
  $('#evStage').disabled = !e; $('#evDel').disabled = !e;
}
$('#evSelect').addEventListener('change', (e) => { curId = e.target.value; renderEvBar(); renderPanel(curTab); remember(); });
$('#evStage').addEventListener('change', (e) => { const ev = cur(); if (!ev) return; ev.stage = e.target.value; touch(ev); persist(); toast('Movido a ' + stageName(ev.stage)); });
$('#evNew').addEventListener('click', () => { addEvent(); showTab('cuestionario'); });
$('#evDel').addEventListener('click', () => {
  const e = cur(); if (!e) return;
  if (!confirm(`¿Eliminar "${evTitle(e)}"? Esta acción no se puede deshacer.`)) return;
  data.events = data.events.filter((x) => x.id !== e.id); curId = (data.events[0] || {}).id || null; persist(); renderEvBar(); renderPanel(curTab); toast('Evento eliminado');
});
function addEvent(stage) { const e = newEvent(stage); data.events.push(e); curId = e.id; persist(); renderEvBar(); return e; }

function renderAll() { renderEvBar(); renderPanel(curTab); }
function renderPanel(tab) {
  ({ tablero: renderBoard, cuestionario: renderQ, presupuesto: renderBudget, contrato: renderContract, agenda: renderAgenda, guia: renderGuide, ajustes: renderSettings })[tab]();
}

/* Enlace genérico de campos: data-b="e.q.fecha" (evento actual) o "s.tarifas.musico" (ajustes) */
document.addEventListener('input', onBind);
document.addEventListener('change', onBind);
function onBind(ev) {
  const el = ev.target; const path = el.dataset && el.dataset.b; if (!path) return;
  if (ev.type === 'input' && (el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'date' || el.type === 'time')) return;
  let val = el.type === 'checkbox' ? el.checked : el.value;
  if (el.dataset.num !== undefined) val = el.value === '' ? '' : num(el.value);
  const root = path[0] === 'e' ? cur() : data.settings;
  if (!root) return;
  setPath(root, path.slice(2), val);
  if (path[0] === 'e') touch(root);
  persist();
  if (el.dataset.after) AFTER[el.dataset.after] && AFTER[el.dataset.after](el);
}
const AFTER = {
  qprog: () => updateQProgress(),
  bud: () => updateBudgetTotals(),
  evbar: () => renderEvBar(),
  agenda: () => renderAgenda(),
};

function fieldHtml(prefix, f, val, after) {
  const id = 'f_' + prefix.replace(/\W/g, '_') + f.k;
  const b = `data-b="${prefix}${f.k}" data-after="${after || ''}"`;
  const q = typeof f.q === 'function' ? f.q() : f.q;
  let input;
  if (f.type === 'select') {
    input = `<select id="${id}" ${b}><option value="">—</option>${f.o.map((o) => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${val === v ? 'selected' : ''}>${esc(l)}</option>`; }).join('')}</select>`;
  } else if (f.type === 'textarea') {
    input = `<textarea id="${id}" ${b}>${esc(val)}</textarea>`;
  } else {
    const t = f.type === 'number' ? 'text' : f.type || 'text';
    const im = f.type === 'number' ? 'inputmode="numeric" data-num' : '';
    input = `<input id="${id}" type="${t}" ${im} ${b} value="${esc(val)}">`;
  }
  return `<label class="fld" for="${id}"><span class="q">${esc(q)}${f.req ? ' <span class="pill gold" title="Necesario para el contrato">contrato</span>' : ''}</span><span>${esc(f.l)}</span>${input}${f.why ? `<span class="why">${esc(f.why)}</span>` : ''}</label>`;
}

/* ---------------- Tablero (kanban) ---------------- */
function evTotals(e) { return budgetCalc(e); }
function renderBoard() {
  const p = $('#pTablero');
  const act = data.events.filter((e) => !['perdido', 'cerrado'].includes(e.stage));
  const pipeline = data.events.filter((e) => ['contactado', 'cotizacion', 'negociacion'].includes(e.stage)).reduce((a, e) => a + evTotals(e).total, 0);
  const confirmados = data.events.filter((e) => ['firmado', 'preproduccion', 'realizado', 'cerrado'].includes(e.stage));
  const porCobrar = confirmados.reduce((a, e) => a + pendiente(e), 0);
  const vencidas = act.filter((e) => e.seg && e.seg.fecha && daysFromToday(e.seg.fecha) < 0).length;
  p.innerHTML = `
  <div class="kb-head">
    <div><h2>Tablero de eventos</h2><p class="muted small" style="margin:0">Arrastra cada tarjeta a la etapa en la que va. En el celular usa las flechas ◀ ▶.</p></div>
    <button class="btn primary" id="kbNew">+ Nuevo evento</button>
  </div>
  <div class="kb-stats">
    <div class="stat"><b>${act.length}</b><span>Eventos activos</span></div>
    <div class="stat"><b>${money(pipeline)}</b><span>En negociación</span></div>
    <div class="stat"><b>${confirmados.length}</b><span>Confirmados</span></div>
    <div class="stat"><b>${money(porCobrar)}</b><span>Por cobrar</span></div>
    <div class="stat"><b style="color:${vencidas ? 'var(--warn)' : ''}">${vencidas}</b><span>Seguimientos vencidos</span></div>
  </div>
  <div class="kanban" id="kanban" style="margin-top:14px">
    ${STAGES.map((s) => {
      const evs = data.events.filter((e) => e.stage === s.id).sort((a, b) => (a.q.fecha || '9999').localeCompare(b.q.fecha || '9999'));
      return `<div class="col" data-stage="${s.id}">
        <div class="col-h"><h3><span><span class="col-dot" style="background:${s.color}"></span>${s.name}</span><span class="n">${evs.length}</span></h3><p>${s.tip}</p></div>
        <div class="col-b">${evs.map(cardHtml).join('') || ''}</div>
      </div>`;
    }).join('')}
  </div>`;
  $('#kbNew').onclick = () => { addEvent('prospecto'); showTab('cuestionario'); };
  bindKanban();
}

function cardHtml(e) {
  const t = budgetCalc(e);
  const d = daysFromToday(e.q.fecha);
  const alerts = [];
  if (e.seg && e.seg.fecha && daysFromToday(e.seg.fecha) < 0 && !['cerrado', 'perdido'].includes(e.stage)) alerts.push('⏰ Seguimiento vencido: ' + esc(e.seg.accion || ''));
  else if (e.seg && e.seg.accion && !['cerrado', 'perdido'].includes(e.stage)) alerts.push('→ ' + esc(e.seg.accion) + (e.seg.fecha ? ' (' + fechaCorta(e.seg.fecha) + ')' : ''));
  if (d !== null && d < 0 && stageIdx(e.stage) < stageIdx('realizado') && e.stage !== 'perdido') alerts.push('⚠ La fecha ya pasó');
  if (['realizado', 'cerrado'].includes(e.stage) && pendiente(e) > 0) alerts.push('💰 Falta cobrar ' + money(pendiente(e)));
  const i = stageIdx(e.stage);
  return `<article class="kc" draggable="true" data-id="${e.id}">
    <h4>${esc(evTitle(e))}</h4>
    <div class="meta">
      ${e.q.tipoCliente ? `<span>${esc(e.q.tipoCliente)}</span>` : ''}
      <span>${e.q.fecha ? '📅 ' + fechaCorta(e.q.fecha) + (e.q.horaShow ? ' · ' + hora12(e.q.horaShow) : '') : 'Sin fecha'}</span>
      ${e.q.municipio ? `<span>📍 ${esc(e.q.municipio)}${e.q.lugar ? ' · ' + esc(e.q.lugar) : ''}</span>` : ''}
    </div>
    ${alerts.map((a) => `<div class="alert">${a}</div>`).join('')}
    <div class="foot"><span class="price">${t.venta ? money(t.total) : ''}</span>
      <span class="mv"><button data-mv="-1" title="Etapa anterior" ${i <= 0 ? 'disabled' : ''}>◀</button><button data-mv="1" title="Etapa siguiente" ${i >= STAGES.length - 1 ? 'disabled' : ''}>▶</button></span>
    </div>
  </article>`;
}

function moveEvent(id, stage) {
  const e = data.events.find((x) => x.id === id); if (!e || e.stage === stage) return;
  e.stage = stage; touch(e);
  if (stage === 'firmado' && !e.cobros.anticipo) toast('Recuerda marcar el anticipo como recibido en Agenda y cobros.');
  else toast('Movido a ' + stageName(stage));
  persist(); renderBoard(); renderEvBar();
}

function bindKanban() {
  const k = $('#kanban');
  k.addEventListener('dragstart', (ev) => { const c = ev.target.closest('.kc'); if (!c) return; ev.dataTransfer.setData('text/plain', c.dataset.id); ev.dataTransfer.effectAllowed = 'move'; c.classList.add('dragging'); });
  k.addEventListener('dragend', (ev) => { const c = ev.target.closest('.kc'); if (c) c.classList.remove('dragging'); $$('.col.drop').forEach((x) => x.classList.remove('drop')); });
  k.addEventListener('dragover', (ev) => { const col = ev.target.closest('.col'); if (!col) return; ev.preventDefault(); $$('.col.drop').forEach((x) => x !== col && x.classList.remove('drop')); col.classList.add('drop'); });
  k.addEventListener('drop', (ev) => { const col = ev.target.closest('.col'); if (!col) return; ev.preventDefault(); moveEvent(ev.dataTransfer.getData('text/plain'), col.dataset.stage); });
  k.addEventListener('click', (ev) => {
    const c = ev.target.closest('.kc'); if (!c) return;
    const mv = ev.target.closest('button[data-mv]');
    if (mv) { const e = data.events.find((x) => x.id === c.dataset.id); const i = stageIdx(e.stage) + Number(mv.dataset.mv); if (STAGES[i]) moveEvent(e.id, STAGES[i].id); return; }
    curId = c.dataset.id; renderEvBar(); showTab('cuestionario');
  });
}

/* ---------------- Cuestionario ---------------- */
function noEvent(p) { p.innerHTML = `<div class="empty"><p>No hay ningún evento todavía.</p><button class="btn primary" onclick="document.getElementById('evNew').click()">+ Crear el primer evento</button></div>`; }

function renderQ() {
  const p = $('#pCuestionario'); const e = cur();
  if (!e) return noEvent(p);
  const pub = e.q.tipoCliente === 'Alcaldía o entidad pública';
  p.innerHTML = `
  <div class="card">
    <div class="card-h"><h2>Cuestionario para el cliente</h2><span class="muted small" id="qProgTxt"></span></div>
    <div class="progress"><i id="qProg" style="width:0"></i></div>
    <p class="muted small">Ten esta pantalla abierta mientras hablas con el cliente: cada campo trae la pregunta tal como se la puedes hacer. Lo que marca <span class="pill gold">contrato</span> es obligatorio para generar el contrato. Todo se guarda solo.</p>
    <div class="qnav">${Q.map((s) => `<a class="btn ghost sm" href="#q_${s.id}">${s.t}</a>`).join('')}<a class="btn ghost sm" href="#q_seg">Seguimiento</a></div>
  </div>
  <div class="card" id="q_seg">
    <h3>Seguimiento</h3>
    <div class="grid">
      <label class="fld"><span>Próxima acción</span><input data-b="e.seg.accion" value="${esc(e.seg.accion)}" placeholder="Ej.: Llamar para confirmar fecha"></label>
      <label class="fld"><span>Fecha de la próxima acción</span><input type="date" data-b="e.seg.fecha" value="${esc(e.seg.fecha)}"></label>
      ${e.stage === 'perdido' ? `<label class="fld"><span>¿Por qué se perdió?</span><input data-b="e.perdidoMotivo" value="${esc(e.perdidoMotivo)}" placeholder="Precio, fecha ocupada, eligieron otro artista…"></label>` : ''}
    </div>
  </div>
  ${pub ? `<div class="note warn"><b>Entidad pública:</b> las alcaldías contratan bajo la Ley 80 de 1993 y la Ley 1150 de 2007 (contratación directa de servicios artísticos, art. 2 num. 4 lit. h) y casi siempre elaboran su propia minuta. Ten listos RUT, Cámara de Comercio (si aplica), cédula, certificación bancaria, planilla de seguridad social, antecedentes (Procuraduría, Contraloría, Policía) y hoja de vida de la función pública (SIGEP). El contrato de este portal te sirve como propuesta y minuta de referencia.</div>` : ''}
  ${Q.map((s) => `
  <div class="card qsec" id="q_${s.id}">
    <h2>${s.t} <span class="pill" data-secprog="${s.id}"></span></h2>
    <p class="muted small">${s.intro}</p>
    <div class="grid">${s.f.map((f) => fieldHtml('e.q.', f, e.q[f.k] ?? '', f.k === 'tipoCliente' ? 'qprog' : 'qprog')).join('')}</div>
  </div>`).join('')}
  <div class="card"><h3>Notas y observaciones</h3><textarea data-b="e.notas" style="min-height:110px" placeholder="Todo lo que el cliente dijo y no cabe arriba.">${esc(e.notas)}</textarea></div>
  <div class="row"><button class="btn primary" onclick="showTab('presupuesto')">Siguiente: presupuesto →</button></div>`;
  updateQProgress();
  // Al cambiar el tipo de cliente se vuelve a pintar (aviso de entidad pública)
  const tc = $('[data-b="e.q.tipoCliente"]', p); if (tc) tc.addEventListener('change', () => setTimeout(renderQ, 0));
  $$('[data-b="e.q.nombreEvento"],[data-b="e.q.fecha"],[data-b="e.q.municipio"],[data-b="e.q.contactoNombre"]', p).forEach((el) => el.addEventListener('change', renderEvBar));
}

function updateQProgress() {
  const e = cur(); if (!e) return;
  let tot = 0, ok = 0;
  Q.forEach((s) => {
    const done = s.f.filter((f) => String(e.q[f.k] ?? '').trim() !== '').length;
    tot += s.f.length; ok += done;
    const pill = $(`[data-secprog="${s.id}"]`); if (pill) { pill.textContent = done + '/' + s.f.length; pill.className = 'pill ' + (done === s.f.length ? 'ok' : done ? 'gold' : ''); }
  });
  const pct = Math.round((ok / tot) * 100);
  const bar = $('#qProg'); if (bar) bar.style.width = pct + '%';
  const t = $('#qProgTxt'); if (t) t.textContent = pct + '% respondido';
}

/* ---------------- Presupuesto ---------------- */
function budgetCalc(e) {
  const s = data.settings; const b = e.bud || { items: [] };
  const costos = b.items.reduce((a, it) => a + num(it.qty) * num(it.val), 0);
  const imprev = costos * num(s.pct.imprevistos) / 100;
  const costoTotal = costos + imprev;
  const venta = num(b.venta);
  const comision = venta * num(s.pct.comision) / 100;
  const utilidad = venta - costoTotal - comision;
  const ivaOn = s.contratista.regimen === 'iva' && b.iva;
  const iva = ivaOn ? venta * 0.19 : 0;
  const total = venta + iva;
  const retencion = venta * num(s.pct.retencion) / 100;
  const anticipo = Math.round(total * num(s.pct.anticipo) / 100);
  const saldo = total - anticipo;
  const equilibrio = (1 - num(s.pct.comision) / 100) > 0 ? costoTotal / (1 - num(s.pct.comision) / 100) : costoTotal;
  return { costos, imprev, costoTotal, venta, comision, utilidad, iva, ivaOn, total, retencion, neto: total - retencion, anticipo, saldo, equilibrio, margen: venta ? utilidad / venta * 100 : 0 };
}
function pendiente(e) { const t = budgetCalc(e); return (e.cobros.anticipo ? 0 : t.anticipo) + (e.cobros.saldo ? 0 : t.saldo); }

function renderBudget() {
  const p = $('#pPresupuesto'); const e = cur();
  if (!e) return noEvent(p);
  const s = data.settings;
  const tips = [];
  if (e.q.sonido === 'nosotros') tips.push('El cliente pidió que pongamos el sonido: llena "Alquiler de sonido o backline".');
  if (e.q.alimentacion === 'incluida') tips.push(`La alimentación va por nuestra cuenta: pon la cantidad de personas (${teamSize()}) en "Alimentación del equipo".`);
  if (e.q.hospedaje === 'incluido') tips.push('El hospedaje va incluido: agrégalo en "Hospedaje".');
  if (e.q.transporte === 'incluido' || !e.q.transporte) tips.push('Revisa el costo del transporte del equipo' + (e.q.distanciaKm ? ` (${e.q.distanciaKm} km desde Medellín).` : '.'));
  if (num(e.q.presupuestoCliente)) tips.push('El cliente dijo tener ' + money(e.q.presupuestoCliente) + ' de presupuesto.');
  p.innerHTML = `
  <div class="card">
    <div class="card-h"><h2>Presupuesto del show</h2>
      <div class="row"><button class="btn ghost sm" id="budReset" title="Vuelve a poner las tarifas de Ajustes">Restablecer con tarifas de Ajustes</button></div></div>
    <p class="muted small">Pon cuánto le pagas a cada persona o servicio. Las tarifas por defecto se cambian en <a href="#" onclick="showTab('ajustes');return false">Ajustes</a>. Lo marcado como <span class="pill gold">equipo técnico</span> es el ingeniero de sonido, el roadie y la persona que graba.</p>
    ${tips.length ? `<div class="note">${tips.map((t) => '• ' + esc(t)).join('<br>')}</div>` : ''}
    <div class="tbl-wrap"><table class="bud-items">
      <thead><tr><th>Concepto</th><th class="num">Cantidad</th><th class="num">Valor unitario</th><th class="num">Total</th><th></th></tr></thead>
      <tbody id="budRows">${e.bud.items.map((it, i) => budRow(it, i)).join('')}</tbody>
    </table></div>
    <div class="row" style="margin-top:10px"><button class="btn ghost sm" id="budAdd">+ Agregar concepto</button></div>
  </div>
  <div class="card">
    <h3>Precio al cliente</h3>
    <div class="grid">
      <label class="fld"><span class="q">Valor del show que vas a cobrar</span><span>Tarifa base en Ajustes: ${money(s.tarifas.precioBase)}</span><input inputmode="numeric" data-num data-b="e.bud.venta" data-after="bud" value="${esc(e.bud.venta)}"></label>
      ${s.contratista.regimen === 'iva' ? `<label class="fld"><span class="q">¿Cobrar IVA (19%)?</span><span>Solo si eres responsable de IVA y el servicio no está excluido.</span><span class="row"><input type="checkbox" data-b="e.bud.iva" data-after="bud" ${e.bud.iva ? 'checked' : ''}> Sumar IVA</span></label>` : ''}
    </div>
    <div class="totals" id="budTotals"></div>
  </div>
  <div class="row"><button class="btn ghost" onclick="showTab('cuestionario')">← Cuestionario</button><button class="btn" id="pdfQuote">Descargar cotización PDF</button><button class="btn primary" onclick="showTab('contrato')">Siguiente: contrato →</button></div>`;
  updateBudgetTotals();
  $('#budAdd').onclick = () => { e.bud.items.push({ id: uid(), c: '', qty: 1, val: 0 }); touch(e); persist(); renderBudget(); const ins = $$('#budRows input[data-f="c"]'); ins[ins.length - 1].focus(); };
  $('#budReset').onclick = () => { if (!confirm('¿Reemplazar los conceptos con las tarifas de Ajustes?')) return; e.bud.items = defaultItems(); touch(e); persist(); renderBudget(); };
  $('#budRows').addEventListener('input', onBudInput);
  $('#budRows').addEventListener('click', (ev) => { const x = ev.target.closest('[data-del]'); if (!x) return; e.bud.items.splice(Number(x.dataset.del), 1); touch(e); persist(); renderBudget(); });
  $('#pdfQuote').onclick = () => pdfQuote(e);
}
function budRow(it, i) {
  return `<tr data-i="${i}"><td><input data-f="c" value="${esc(it.c)}" placeholder="Concepto">${it.tec ? ' <span class="pill gold">equipo técnico</span>' : ''}</td>
    <td class="num"><input class="qty" data-f="qty" inputmode="decimal" value="${esc(it.qty)}"></td>
    <td class="num"><input class="val" data-f="val" inputmode="numeric" value="${esc(it.val)}"></td>
    <td class="num" data-tot>${money(num(it.qty) * num(it.val))}</td>
    <td><button class="x" data-del="${i}" title="Quitar">×</button></td></tr>`;
}
function onBudInput(ev) {
  const e = cur(); const tr = ev.target.closest('tr'); if (!tr || !e) return;
  const it = e.bud.items[Number(tr.dataset.i)]; const f = ev.target.dataset.f;
  it[f] = f === 'c' ? ev.target.value : num(ev.target.value);
  $('[data-tot]', tr).textContent = money(num(it.qty) * num(it.val));
  touch(e); persist(); updateBudgetTotals();
}
function updateBudgetTotals() {
  const e = cur(); const el = $('#budTotals'); if (!e || !el) return;
  const t = budgetCalc(e); const s = data.settings;
  el.innerHTML = `
    <div class="tot"><span>Costos del show</span><b>${money(t.costos)}</b></div>
    <div class="tot"><span>Imprevistos (${s.pct.imprevistos}%)</span><b>${money(t.imprev)}</b></div>
    <div class="tot"><span>Mínimo para no perder</span><b>${money(t.equilibrio)}</b></div>
    <div class="tot"><span>Comisión del manager (${s.pct.comision}%)</span><b>${money(t.comision)}</b></div>
    <div class="tot ${t.utilidad < 0 ? 'neg' : ''}"><span>Utilidad del show (${t.margen.toFixed(0)}%)</span><b>${money(t.utilidad)}</b></div>
    ${t.ivaOn ? `<div class="tot"><span>IVA 19%</span><b>${money(t.iva)}</b></div>` : ''}
    <div class="tot hl"><span>Total a cobrar al cliente</span><b>${money(t.total)}</b></div>
    <div class="tot"><span>Anticipo (${s.pct.anticipo}%)</span><b>${money(t.anticipo)}</b></div>
    <div class="tot"><span>Saldo</span><b>${money(t.saldo)}</b></div>
    ${num(s.pct.retencion) ? `<div class="tot"><span>Neto si retienen ${s.pct.retencion}%</span><b>${money(t.neto)}</b></div>` : ''}`;
  if (t.utilidad < 0) el.insertAdjacentHTML('beforeend', '<div class="note warn" style="grid-column:1/-1">Con este precio el show pierde plata. Sube el valor o baja costos.</div>');
}

/* ---------------- Contrato ---------------- */
function contractChecks(e) {
  const s = data.settings.contratista; const q = e.q; const t = budgetCalc(e);
  const nit = q.contratanteTipoDoc === 'NIT';
  return [
    ['Datos del contratista (tú) en Ajustes: nombre y documento', s.nombre && s.doc],
    ['Cuenta bancaria para pagos en Ajustes', s.banco && s.cuenta],
    ['Nombre y documento del contratante', q.contratanteNombre && q.contratanteTipoDoc && q.contratanteDoc],
    ['Representante legal (contratante con NIT)', !nit || (q.representante && q.representanteDoc)],
    ['Dirección y ciudad del contratante', q.contratanteDireccion && q.contratanteCiudad],
    ['Fecha, hora y duración del show', q.fecha && q.horaShow && q.duracion],
    ['Lugar, dirección y municipio del evento', q.lugar && q.direccion && q.municipio],
    ['Quién pone sonido, tarima y luces', q.sonido && q.sonido !== 'pendiente'],
    ['Valor del show en Presupuesto', t.venta > 0],
    ['Alimentación, transporte y hospedaje definidos', q.alimentacion && q.transporte && q.hospedaje],
  ];
}

function renderContract() {
  const p = $('#pContrato'); const e = cur();
  if (!e) return noEvent(p);
  const checks = contractChecks(e); const missing = checks.filter((c) => !c[1]).length;
  const c = data.settings.contrato; const t = budgetCalc(e);
  const pub = e.q.tipoCliente === 'Alcaldía o entidad pública';
  let fresh = false;
  if (!e.contrato.numero) { e.contrato.numero = `${c.prefijo}-${new Date().getFullYear()}-${String(c.consecutivo).padStart(3, '0')}`; fresh = true; }
  if (!e.contrato.fechaFirma) { e.contrato.fechaFirma = today(); fresh = true; }
  p.innerHTML = `
  <div class="card">
    <div class="card-h"><h2>Contrato de prestación de servicios artísticos</h2><span class="pill ${missing ? 'warn' : 'ok'}">${missing ? missing + ' dato(s) pendiente(s)' : 'Listo para generar'}</span></div>
    <p class="muted small">El contrato se arma con lo que llenaste en el cuestionario, el presupuesto y tus datos de Ajustes. Sale en PDF listo para imprimir y firmar (o firmar electrónicamente).</p>
    <ul class="checklist">${checks.map(([l, ok]) => `<li><span class="ic">${ok ? '✅' : '⬜'}</span><span>${l}</span></li>`).join('')}</ul>
  </div>
  ${pub ? `<div class="note warn"><b>Alcaldía o entidad pública:</b> la entidad normalmente hace su propia minuta bajo la Ley 80 de 1993. El PDF incluye una cláusula que lo reconoce; úsalo como propuesta o cuando la entidad acepte tu formato.</div>` : ''}
  <div class="card">
    <h3>Datos del documento</h3>
    <div class="grid">
      <label class="fld"><span>Número de contrato</span><input data-b="e.contrato.numero" value="${esc(e.contrato.numero)}"></label>
      <label class="fld"><span>Fecha de firma</span><input type="date" data-b="e.contrato.fechaFirma" value="${esc(e.contrato.fechaFirma)}"></label>
      <label class="fld"><span>Ciudad de firma</span><input data-b="s.contrato.ciudadFirma" value="${esc(c.ciudadFirma)}"></label>
    </div>
    <div class="totals">
      <div class="tot hl"><span>Valor total</span><b>${money(t.total)}</b></div>
      <div class="tot"><span>Anticipo a la firma (${data.settings.pct.anticipo}%)</span><b>${money(t.anticipo)}</b></div>
      <div class="tot"><span>Saldo (${esc(c.plazoSaldo)})</span><b>${money(t.saldo)}</b></div>
    </div>
    <p class="muted small" style="margin-top:12px">Cancelación: con ${c.cancelDias}+ días de aviso el contratante paga el ${c.cancelPct1}%; con menos días, el ${c.cancelPct2}%. Cláusula penal: ${c.penalPct}%. Estas condiciones se cambian en Ajustes.</p>
  </div>
  <div class="doc-actions">
    <button class="btn primary" id="pdfContract">Generar contrato en PDF</button>
    <button class="btn" id="pdfQuote2">Cotización PDF</button>
    <button class="btn" id="pdfRoute">Hoja de ruta PDF</button>
  </div>
  <div class="note" style="margin-top:16px"><b>Importante:</b> esta minuta sigue el Código Civil, el Código de Comercio y las normas colombianas de espectáculos (Ley 1493 de 2011), derechos de autor (Ley 23 de 1982), datos personales (Ley 1581 de 2012) y firma electrónica (Ley 527 de 1999). Es una plantilla general: hazla revisar una vez por un abogado antes de usarla en contratos grandes y vuelve a revisarla si cambian las normas.</div>`;
  if (fresh) persist();
  $('#pdfContract').onclick = () => {
    if (missing && !confirm(`Faltan ${missing} dato(s). Se dejarán espacios en blanco para llenarlos a mano. ¿Generar de todas formas?`)) return;
    pdfContract(e);
  };
  $('#pdfQuote2').onclick = () => pdfQuote(e);
  $('#pdfRoute').onclick = () => pdfRoute(e);
}

/* ---------------- PDF ---------------- */
const GOLD = '#a8843f', NAVY = '#0a1020';
function pdfReady() { if (!window.pdfMake) { toast('El generador de PDF aún está cargando, intenta en un segundo.'); return false; } return true; }
const blank = (v, n = 28) => (v && String(v).trim()) ? String(v) : '_'.repeat(n);
function pdfBase(title, content, extra = {}) {
  return {
    pageSize: 'LETTER', pageMargins: [60, 70, 60, 60],
    info: { title, author: 'Yo Me Llamo Marc Anthony' },
    header: (page) => ({ margin: [60, 28, 60, 0], columns: [{ text: 'YO ME LLAMO MARC ANTHONY', style: 'brand' }, { text: title, alignment: 'right', style: 'hdr' }] }),
    footer: (page, pages) => ({ margin: [60, 0, 60, 0], columns: [{ text: 'contacto@yomellamomarcanthony.com · yomellamomarcanthony.com', style: 'hdr' }, { text: `Página ${page} de ${pages}`, alignment: 'right', style: 'hdr' }] }),
    content,
    defaultStyle: { font: 'Roboto', fontSize: 10, lineHeight: 1.3, color: '#1d1d1f' },
    styles: {
      brand: { fontSize: 8, bold: true, color: GOLD, characterSpacing: 1.5 },
      hdr: { fontSize: 7.5, color: '#888' },
      h1: { fontSize: 15, bold: true, color: NAVY, alignment: 'center', margin: [0, 0, 0, 4] },
      sub: { fontSize: 10, color: '#555', alignment: 'center', margin: [0, 0, 0, 14] },
      h2: { fontSize: 11, bold: true, color: NAVY, margin: [0, 12, 0, 4] },
      cl: { alignment: 'justify', margin: [0, 0, 0, 7] },
      th: { bold: true, fontSize: 9, color: '#fff', fillColor: NAVY },
      small: { fontSize: 8.5, color: '#555' },
    },
    ...extra,
  };
}
function fileName(prefix, e) { return `${prefix}-${(evTitle(e) || 'evento').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 40)}${e.q.fecha ? '-' + e.q.fecha : ''}.pdf`; }

function pdfContract(e) {
  if (!pdfReady()) return;
  const S = data.settings, k = S.contratista, C = S.contrato, q = e.q, t = budgetCalc(e);
  const nit = q.contratanteTipoDoc === 'NIT';
  const pub = q.tipoCliente === 'Alcaldía o entidad pública';
  const contratante = nit
    ? [{ text: blank(q.contratanteNombre).toUpperCase(), bold: true }, `, identificada con NIT ${blank(q.contratanteDoc, 14)}, con domicilio en ${blank(q.contratanteDireccion)} de ${blank(q.contratanteCiudad, 14)}, representada legalmente por ${blank(q.representante)}, mayor de edad, identificado(a) con cédula de ciudadanía No. ${blank(q.representanteDoc, 14)}`]
    : [{ text: blank(q.contratanteNombre).toUpperCase(), bold: true }, `, mayor de edad, identificado(a) con ${(q.contratanteTipoDoc || 'cédula de ciudadanía').toLowerCase()} No. ${blank(q.contratanteDoc, 14)}, con domicilio en ${blank(q.contratanteDireccion)} de ${blank(q.contratanteCiudad, 14)}`];
  const kNit = k.tipoDoc === 'NIT';
  const contratista = kNit
    ? [{ text: blank(k.nombre).toUpperCase(), bold: true }, `, identificada con NIT ${blank(k.doc, 14)}, con domicilio en ${blank(k.direccion)} de ${blank(k.ciudad, 14)}, representada legalmente por ${blank(k.representante)}, identificado(a) con cédula de ciudadanía No. ${blank(k.repDoc, 14)}`]
    : [{ text: blank(k.nombre).toUpperCase(), bold: true }, `, mayor de edad, identificado(a) con ${(k.tipoDoc || 'cédula de ciudadanía').toLowerCase()} No. ${blank(k.doc, 14)}, con domicilio en ${blank(k.direccion)} de ${blank(k.ciudad, 14)}`];
  const dur = num(q.duracion) || 90;
  const durTxt = `${dur} minutos`;
  const pagoSaldo = C.plazoSaldo || 'antes de iniciar la presentación';
  const cuentaTxt = `cuenta de ${(k.tipoCuenta || 'ahorros').toLowerCase()} No. ${blank(k.cuenta, 16)} del banco ${blank(k.banco, 16)}, a nombre de ${blank(k.titular || k.nombre)}`;
  const ivaTxt = k.regimen === 'iva'
    ? (t.ivaOn ? `El valor incluye IVA del diecinueve por ciento (19%) por ${money(t.iva)}.` : 'Las partes dejan constancia de que el servicio no causa IVA o que este no se cobra por estar excluido conforme al Estatuto Tributario.')
    : 'EL CONTRATISTA declara que no es responsable del impuesto sobre las ventas (IVA), por lo cual el valor no incluye IVA.';
  const sonidoTxt = q.sonido === 'nosotros'
    ? 'EL CONTRATISTA suministrará el sistema de sonido conforme a lo cotizado. EL CONTRATANTE suministrará la tarima o escenario, la acometida eléctrica suficiente y la iluminación, en las condiciones del rider técnico anexo.'
    : 'EL CONTRATANTE suministrará, a su costo, el sistema de sonido profesional, la tarima o escenario, la iluminación, la energía eléctrica y el personal técnico, en las condiciones del rider técnico anexo, el cual forma parte integral de este contrato.';
  const prov = (v, cosa) => v === 'cliente' ? `${cosa} del equipo de EL CONTRATISTA estará a cargo de EL CONTRATANTE.` : (v === 'incluido' || v === 'incluida') ? `${cosa} está incluido(a) en el valor del contrato.` : null;
  const hosp = [prov(q.alimentacion, 'La alimentación'), prov(q.transporte, 'El transporte'), prov(q.hospedaje, 'El hospedaje')].filter(Boolean);
  const grab = q.grabacion === 'no'
    ? 'Ninguna de las partes grabará ni transmitirá la presentación, salvo acuerdo escrito.'
    : q.grabacion === 'ambos'
      ? 'Las partes podrán grabar y fotografiar la presentación para la promoción de sus propias marcas y del evento. Cualquier transmisión en vivo, uso comercial o venta de las grabaciones requerirá autorización previa y escrita de EL CONTRATISTA.'
      : 'EL CONTRATISTA podrá grabar y fotografiar la presentación para la promoción del espectáculo. EL CONTRATANTE no podrá transmitir, grabar con fines comerciales ni explotar la presentación sin autorización previa y escrita de EL CONTRATISTA.';

  let n = 0;
  const ORD = ['PRIMERA', 'SEGUNDA', 'TERCERA', 'CUARTA', 'QUINTA', 'SEXTA', 'SÉPTIMA', 'OCTAVA', 'NOVENA', 'DÉCIMA', 'DÉCIMA PRIMERA', 'DÉCIMA SEGUNDA', 'DÉCIMA TERCERA', 'DÉCIMA CUARTA', 'DÉCIMA QUINTA', 'DÉCIMA SEXTA', 'DÉCIMA SÉPTIMA', 'DÉCIMA OCTAVA', 'DÉCIMA NOVENA', 'VIGÉSIMA', 'VIGÉSIMA PRIMERA'];
  const cl = (title, body) => ({ text: [{ text: `CLÁUSULA ${ORD[n++]}. ${title}. `, bold: true }, ...(Array.isArray(body) ? body : [body])], style: 'cl' });
  const lst = (items) => ({ ol: items, type: 'lower-alpha', margin: [14, -3, 0, 8], style: 'cl' });

  const content = [
    { text: 'CONTRATO DE PRESTACIÓN DE SERVICIOS ARTÍSTICOS', style: 'h1' },
    { text: `No. ${e.contrato.numero}`, style: 'sub' },
    { text: ['Entre los suscritos, ', ...contratante, ', quien en adelante se denominará ', { text: 'EL CONTRATANTE', bold: true }, '; y ', ...contratista, ', quien en adelante se denominará ', { text: 'EL CONTRATISTA', bold: true }, ', hemos acordado celebrar el presente contrato de prestación de servicios artísticos, que se regirá por las normas civiles y comerciales de la República de Colombia y por las siguientes cláusulas:'], style: 'cl' },
    cl('OBJETO', `EL CONTRATISTA se obliga a realizar, con plena autonomía técnica y artística, la presentación del espectáculo musical tributo denominado "Yo Me Llamo Marc Anthony", en formato de gran gala con orquesta (cantante principal, coristas y músicos), en el evento "${blank(q.nombreEvento)}" organizado por EL CONTRATANTE.`),
    cl('NATURALEZA DEL ESPECTÁCULO', 'EL CONTRATANTE declara conocer que se trata de un espectáculo de homenaje o tributo que interpreta el repertorio del artista Marc Anthony, y que el cantante principal NO es Marc Anthony ni tiene vínculo, patrocinio o afiliación con él, su equipo o sus disqueras. EL CONTRATANTE se obliga a promocionar el evento como "tributo" o "Yo Me Llamo Marc Anthony", sin inducir al público a error sobre la identidad del artista.'),
    cl('FECHA, LUGAR Y DURACIÓN', [`La presentación se realizará el día ${blank(fechaLarga(q.fecha))}, a las ${blank(hora12(q.horaShow), 10)}, en ${blank(q.lugar)}, ubicado en ${blank(q.direccion)}, municipio de ${blank(q.municipio, 14)} (${q.departamento || 'Antioquia'}), con una duración de ${durTxt} de show. `, q.pruebaSonido ? `La prueba de sonido se hará a las ${hora12(q.pruebaSonido)}. ` : 'La hora de prueba de sonido se acordará con al menos tres (3) días de anticipación. ', 'Los retrasos imputables a EL CONTRATANTE o a otros artistas del evento no ampliarán la obligación de EL CONTRATISTA más allá de una (1) hora de espera, cumplida la cual podrá retirarse sin perder el derecho al pago total.']),
    cl('VALOR', [`El valor total del presente contrato es de `, { text: `${letras(t.total)} (${money(t.total)})`, bold: true }, `. ${ivaTxt} Sobre este valor EL CONTRATANTE practicará únicamente las retenciones que ordene la ley, y entregará el certificado correspondiente.`]),
    cl('FORMA DE PAGO', [`EL CONTRATANTE pagará el valor así: (i) un anticipo del ${S.pct.anticipo}% por ${letras(t.anticipo)} (${money(t.anticipo)}) a la firma del contrato, el cual es requisito para reservar la fecha; y (ii) el saldo del ${100 - num(S.pct.anticipo)}% por ${letras(t.saldo)} (${money(t.saldo)}) ${pagoSaldo}. Los pagos se harán mediante transferencia o consignación a la ${cuentaTxt}. `, pub ? 'Tratándose de una entidad pública, los pagos se sujetarán además a sus trámites presupuestales y a la presentación de la factura o cuenta de cobro y de la constancia de pago de seguridad social.' : 'Si el saldo no se ha pagado en el plazo indicado, EL CONTRATISTA podrá abstenerse de iniciar la presentación sin que ello constituya incumplimiento de su parte.']),
    cl('OBLIGACIONES DE EL CONTRATISTA', 'Son obligaciones de EL CONTRATISTA:'),
    lst(['Presentarse puntualmente en el lugar con el cantante principal, coristas y músicos en el formato contratado.', 'Realizar la presentación con calidad profesional y por el tiempo pactado.', 'Asumir el pago de los honorarios de su personal artístico y técnico, así como sus aportes al Sistema de Seguridad Social Integral como trabajador independiente (Ley 100 de 1993 y normas que la modifican).', 'Enviar el rider técnico con la debida anticipación y coordinar con el personal técnico de EL CONTRATANTE.', 'Cumplir las normas de seguridad y convivencia del lugar del evento.']),
    cl('OBLIGACIONES DE EL CONTRATANTE', 'Son obligaciones de EL CONTRATANTE:'),
    lst([
      'Pagar el valor del contrato en la forma y plazos pactados.',
      sonidoTxt,
      'Suministrar un camerino privado, limpio y seguro, con acceso a baño, agua e hidratación, de acuerdo con el rider de hospitalidad.',
      'Garantizar la seguridad del artista, de su equipo, de sus instrumentos y pertenencias desde la llegada hasta la salida del lugar, así como el acceso y la salida seguros del escenario.',
      'Obtener a su costo todos los permisos y licencias que requiera el evento, incluyendo cuando aplique el registro en el Portal Único de Espectáculos Públicos (PULEP) del Ministerio de Cultura (Ley 1493 de 2011), los permisos de la autoridad municipal y el plan de emergencias y contingencias (Ley 1523 de 2012 y Ley 1801 de 2016).',
      'Pagar los derechos de autor y conexos por la comunicación pública de las obras musicales ante las sociedades de gestión colectiva o entidades recaudadoras correspondientes (Ley 23 de 1982 y Ley 1493 de 2011), por ser el organizador del evento.',
      'En eventos al aire libre, garantizar un escenario cubierto que proteja a los músicos y los equipos de la lluvia y el sol.',
      ...hosp,
    ]),
    cl('RIDER TÉCNICO Y CONDICIONES MÍNIMAS', 'El rider técnico y de hospitalidad anexo forma parte integral de este contrato. Si el día del evento no se cumplen las condiciones técnicas o de seguridad mínimas, y ello impide la presentación o pone en riesgo a las personas o los equipos, EL CONTRATISTA podrá abstenerse de presentarse, caso en el cual se entenderá que el incumplimiento es de EL CONTRATANTE y se deberá el valor total del contrato.'),
    cl('AUTONOMÍA E INEXISTENCIA DE RELACIÓN LABORAL', 'EL CONTRATISTA actúa con plena autonomía técnica, artística, administrativa y financiera. Este contrato es de naturaleza civil y comercial y no genera relación laboral alguna entre EL CONTRATANTE y EL CONTRATISTA ni entre aquel y el personal de este, por lo cual no habrá lugar al pago de salarios ni prestaciones sociales por parte de EL CONTRATANTE.'),
    cl('CANCELACIÓN Y APLAZAMIENTO', `Si EL CONTRATANTE cancela la presentación con ${C.cancelDias} días calendario o más de anticipación, pagará a EL CONTRATISTA el ${C.cancelPct1}% del valor total a título de indemnización, que podrá imputarse al anticipo recibido. Si cancela con menos de ${C.cancelDias} días, pagará el ${C.cancelPct2}% del valor total. Si EL CONTRATANTE solicita aplazar la fecha, el anticipo se abonará a una nueva fecha que se acuerde por escrito dentro de los ${C.reprogramarMeses} meses siguientes, sujeta a la disponibilidad de EL CONTRATISTA; de no acordarse, se aplicarán las reglas de cancelación.`),
    cl('FUERZA MAYOR O CASO FORTUITO', 'Ninguna de las partes será responsable por el incumplimiento debido a fuerza mayor o caso fortuito en los términos del artículo 64 del Código Civil, debidamente comprobados, como desastres naturales, órdenes de autoridad, alteraciones graves del orden público o calamidad pública que impidan el evento. En ese caso las partes reprogramarán la presentación de buena fe y el anticipo se abonará a la nueva fecha. Las condiciones climáticas previsibles, como la lluvia, no se consideran fuerza mayor cuando el escenario debía estar cubierto.'),
    cl('CLÁUSULA PENAL', `En caso de incumplimiento de cualquiera de las obligaciones de este contrato, la parte incumplida pagará a la otra, a título de pena, una suma equivalente al ${C.penalPct}% del valor total del contrato, sin perjuicio de la obligación principal y de la indemnización de los perjuicios que se prueben, conforme a los artículos 1592 y siguientes del Código Civil.`),
    cl('IMAGEN, MARCA Y GRABACIONES', `EL CONTRATANTE podrá usar el nombre, el logo y las fotografías oficiales del espectáculo únicamente para promocionar este evento. ${grab}`),
    cl('PROTECCIÓN DE DATOS PERSONALES', 'Las partes autorizan el tratamiento de los datos personales contenidos en este contrato solo para su ejecución, de acuerdo con la Ley 1581 de 2012 y sus decretos reglamentarios, y se obligan a protegerlos.'),
    cl('CESIÓN', 'Ninguna de las partes podrá ceder este contrato total o parcialmente sin la autorización previa y escrita de la otra.'),
    ...(pub ? [cl('ENTIDADES PÚBLICAS', 'Cuando EL CONTRATANTE sea una entidad estatal, este contrato se sujetará a lo dispuesto en la Ley 80 de 1993, la Ley 1150 de 2007 y el Decreto 1082 de 2015, y prevalecerán las cláusulas obligatorias que dichas normas exijan. La disponibilidad y el registro presupuestal serán requisitos para su ejecución.')] : []),
    cl('SOLUCIÓN DE CONTROVERSIAS', `Las diferencias que surjan se intentarán resolver primero por arreglo directo dentro de los quince (15) días hábiles siguientes a la notificación escrita de una parte a la otra. Si no hay acuerdo, podrán acudir a la conciliación ante un centro de conciliación de ${C.jurisdiccion} (Ley 2220 de 2022) y, en su defecto, a la jurisdicción ordinaria colombiana.`),
    cl('MÉRITO EJECUTIVO', 'Este contrato presta mérito ejecutivo para el cobro de las sumas de dinero en él pactadas, conforme al artículo 422 del Código General del Proceso, sin necesidad de requerimiento previo, a lo cual las partes renuncian expresamente.'),
    cl('PERFECCIONAMIENTO, FIRMA Y DOMICILIO', `Este contrato se perfecciona con la firma de las partes, que podrá ser manuscrita o electrónica, con plena validez conforme a la Ley 527 de 1999 y sus decretos reglamentarios. Para todos los efectos el domicilio contractual será la ciudad de ${C.jurisdiccion}. Las notificaciones se enviarán a: EL CONTRATANTE, ${blank(q.contratanteEmail || q.contactoEmail)}; EL CONTRATISTA, ${k.email}.`),
    cl('ANEXOS', 'Forman parte de este contrato: (1) el rider técnico y de hospitalidad; (2) la cotización aceptada; (3) copia de los documentos de identificación y RUT de las partes.'),
    { unbreakable: true, stack: [
    { text: `Para constancia se firma en ${C.ciudadFirma}, el ${fechaLarga(e.contrato.fechaFirma, false) || '____ de __________ de ______'}, en dos (2) ejemplares del mismo valor.`, style: 'cl', margin: [0, 8, 0, 40] },
    {
      columns: [
        sig('EL CONTRATANTE', nit ? q.representante : q.contratanteNombre, nit ? 'C.C. ' + blank(q.representanteDoc, 12) : (q.contratanteTipoDoc || 'C.C.') + ' ' + blank(q.contratanteDoc, 12), nit ? `Representante legal de ${q.contratanteNombre || '____'} · NIT ${blank(q.contratanteDoc, 12)}` : ''),
        sig('EL CONTRATISTA', kNit ? k.representante : k.nombre, kNit ? 'C.C. ' + blank(k.repDoc, 12) : (k.tipoDoc === 'Cédula de ciudadanía' ? 'C.C.' : k.tipoDoc) + ' ' + blank(k.doc, 12), kNit ? `Representante legal de ${k.nombre} · NIT ${k.doc}` : ''),
      ], columnGap: 40,
    }] },
    { text: 'ANEXO 1. RIDER TÉCNICO Y DE HOSPITALIDAD', style: 'h2', pageBreak: 'before' },
    { text: 'El rider técnico completo (lista de canales, mezclas de monitores, backline y plano de tarima) se entrega en documento aparte y se puede descargar en yomellamomarcanthony.com/rider/. Resumen de condiciones mínimas:', style: 'cl' },
    { ul: RIDER_RESUMEN, style: 'cl' },
    { text: 'ANEXO 2. RESUMEN DEL SERVICIO', style: 'h2' },
    summaryTable(e),
  ];
  pdfMake.createPdf(pdfBase('Contrato ' + e.contrato.numero, content)).download(fileName('contrato', e));
  e.contrato.generado = new Date().toISOString();
  if (stageIdx(e.stage) < stageIdx('negociacion')) toast('Contrato generado. Cuando lo firmen, mueve el evento a "Contrato firmado".', 4000); else toast('Contrato generado');
  persist();
}
function sig(rol, nombre, doc, extra) {
  return { stack: [
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 0.8 }] },
    { text: rol, bold: true, margin: [0, 4, 0, 0] },
    { text: blank(nombre, 26) },
    { text: doc, style: 'small' },
    extra ? { text: extra, style: 'small' } : '',
    { text: 'Huella:', style: 'small', margin: [0, 6, 0, 0] },
    { canvas: [{ type: 'rect', x: 0, y: 2, w: 46, h: 56, lineWidth: 0.6, lineColor: '#999' }] },
  ] };
}
const RIDER_RESUMEN = [
  'Escenario de mínimo 7 m de ancho × 6 m de fondo; cubierto si el evento es al aire libre.',
  'Sistema de sonido profesional (line array) acorde al aforo y consola digital de mínimo 24 canales.',
  '18 canales de entrada y 11 mezclas de monitores, incluidos 3 sistemas in-ear inalámbricos.',
  'Backline: amplificador y cabina de bajo, teclados, 8 atriles y 2 sillas de batería.',
  'Al menos 6 tomas eléctricas reguladas a menos de 5 m de la orquesta.',
  'Prueba de sonido de 60 minutos con toda la orquesta; escenario libre 15 minutos antes del show.',
  'Camerino privado con espejo, luz, sillas y baño cercano; agua, bebidas hidratantes y café.',
];
function summaryTable(e) {
  const q = e.q; const t = budgetCalc(e);
  const rows = [
    ['Evento', q.nombreEvento], ['Fecha', fechaLarga(q.fecha)], ['Hora del show', hora12(q.horaShow)], ['Duración', (q.duracion || 90) + ' minutos'],
    ['Lugar', [q.lugar, q.direccion, q.municipio].filter(Boolean).join(', ')], ['Tipo de espacio', q.espacio], ['Aforo esperado', q.aforo],
    ['Sonido, tarima y luces', optLabel('sonido', q.sonido)], ['Alimentación', optLabel('alimentacion', q.alimentacion)], ['Transporte', optLabel('transporte', q.transporte)], ['Hospedaje', optLabel('hospedaje', q.hospedaje)],
    ['Formato', 'Gran gala con orquesta: cantante principal, 2 coristas y 9 músicos'], ['Valor total', money(t.total)],
  ].filter((r) => r[1] !== undefined && r[1] !== '');
  return { table: { widths: [150, '*'], body: rows.map(([a, b]) => [{ text: a, bold: true }, String(b)]) }, layout: 'lightHorizontalLines' };
}

function pdfQuote(e) {
  if (!pdfReady()) return;
  const q = e.q, t = budgetCalc(e), S = data.settings;
  const content = [
    { text: 'COTIZACIÓN', style: 'h1' },
    { text: `Show tributo "Yo Me Llamo Marc Anthony" · ${fechaLarga(today(), false)}`, style: 'sub' },
    { text: [{ text: 'Para: ', bold: true }, q.contratanteNombre || q.contactoNombre || '—', q.contactoCargo ? ` (${q.contactoCargo})` : ''], margin: [0, 0, 0, 2] },
    q.contactoEmail ? { text: q.contactoEmail, style: 'small', margin: [0, 0, 0, 12] } : { text: '', margin: [0, 0, 0, 10] },
    { text: 'El show', style: 'h2' },
    { text: 'Una gran gala de salsa con orquesta en vivo que recorre los éxitos de Marc Anthony: cantante principal finalista de Yo Me Llamo, dos coristas y nueve músicos (piano, bajo, trompetas, trombones y percusión). Es un espectáculo tributo, sin afiliación con el artista original.', style: 'cl' },
    { text: 'Detalles del evento', style: 'h2' },
    summaryTable(e),
    { text: 'Inversión', style: 'h2' },
    { table: { widths: ['*', 120], body: [
      [{ text: 'Concepto', style: 'th' }, { text: 'Valor', style: 'th', alignment: 'right' }],
      ['Presentación del show "Yo Me Llamo Marc Anthony" en formato gran gala con orquesta' + (q.sonido === 'nosotros' ? ', incluye sonido' : ''), { text: money(t.venta), alignment: 'right' }],
      ...(t.ivaOn ? [['IVA 19%', { text: money(t.iva), alignment: 'right' }]] : []),
      [{ text: 'Total', bold: true }, { text: money(t.total), bold: true, alignment: 'right' }],
    ] }, layout: 'lightHorizontalLines' },
    { text: 'Condiciones', style: 'h2' },
    { ul: [
      `Anticipo del ${S.pct.anticipo}% (${money(t.anticipo)}) para reservar la fecha; saldo ${S.contrato.plazoSaldo}.`,
      q.sonido === 'nosotros' ? 'El sonido lo suministra la producción del show; el cliente pone tarima, energía e iluminación.' : 'El cliente suministra sonido, tarima, luces y energía según nuestro rider técnico.',
      'La fecha queda reservada solo con la firma del contrato y el pago del anticipo.',
      'Cotización válida por 15 días.',
    ], style: 'cl' },
    { text: 'Contacto', style: 'h2' },
    { text: `${S.contratista.telefono} · ${S.contratista.email} · yomellamomarcanthony.com`, style: 'cl' },
  ];
  pdfMake.createPdf(pdfBase('Cotización', content)).download(fileName('cotizacion', e));
  if (['prospecto', 'contactado'].includes(e.stage)) { e.stage = 'cotizacion'; e.seg = { accion: 'Hacer seguimiento a la cotización', fecha: addDays(today(), 3) }; touch(e); persist(); renderEvBar(); toast('Cotización descargada. El evento pasó a "Cotización enviada" con seguimiento en 3 días.', 4500); }
}
function addDays(s, n) { const d = parseDate(s); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }

function pdfRoute(e) {
  if (!pdfReady()) return;
  const q = e.q, S = data.settings;
  const rows = [
    ['Evento', q.nombreEvento], ['Fecha', fechaLarga(q.fecha)], ['Lugar', [q.lugar, q.direccion, q.municipio].filter(Boolean).join(', ')],
    ['Hora de llegada', hora12(q.horaLlegada)], ['Prueba de sonido', hora12(q.pruebaSonido)], ['Hora del show', hora12(q.horaShow)], ['Duración', (q.duracion || 90) + ' minutos'],
    ['Otros artistas / orden', q.lineup], ['Contacto en el lugar', q.contactoDia], ['Empresa de sonido', q.empresaSonido], ['Tarima', q.tarima], ['Energía', q.energia],
    ['Camerino', q.camerino], ['Alimentación', optLabel('alimentacion', q.alimentacion)], ['Transporte', optLabel('transporte', q.transporte)], ['Hospedaje', optLabel('hospedaje', q.hospedaje)], ['Parqueadero', q.parqueadero],
    ['Grabación', optLabel('grabacion', q.grabacion)], ['Notas', e.notas],
  ].filter((r) => r[1]);
  const team = e.bud.items.filter((i) => num(i.qty) > 0 && /artista|músic|corist|ingenier|roadie|graba/i.test(i.c)).map((i) => `${i.c}: ${i.qty}`);
  const content = [
    { text: 'HOJA DE RUTA', style: 'h1' },
    { text: (q.nombreEvento || '') + (q.fecha ? ' · ' + fechaLarga(q.fecha) : ''), style: 'sub' },
    { table: { widths: [140, '*'], body: rows.map(([a, b]) => [{ text: a, bold: true }, String(b)]) }, layout: 'lightHorizontalLines' },
    { text: 'Equipo', style: 'h2' }, { ul: team.length ? team : ['Por definir'] },
    { text: 'Contacto de la producción del show', style: 'h2' }, { text: `${S.contratista.telefono} · ${S.contratista.email}` },
    { text: 'Lista antes de salir', style: 'h2' },
    { ul: ['Confirmar horario con el contacto del lugar el día anterior.', 'Instrumentos, in-ears, cables y vestuario revisados.', 'Saldo pagado o confirmado antes de subir a tarima.', 'Cargar celulares y llevar trípode para grabar contenido.'] },
  ];
  pdfMake.createPdf(pdfBase('Hoja de ruta', content)).download(fileName('hoja-de-ruta', e));
}

/* ---------------- Agenda y cobros ---------------- */
function renderAgenda() {
  const p = $('#pAgenda');
  const evs = data.events.filter((e) => e.stage !== 'perdido').sort((a, b) => (a.q.fecha || '9999').localeCompare(b.q.fecha || '9999'));
  const conf = evs.filter((e) => stageIdx(e.stage) >= stageIdx('firmado'));
  const facturado = conf.reduce((a, e) => a + budgetCalc(e).total, 0);
  const cobrado = conf.reduce((a, e) => { const t = budgetCalc(e); return a + (e.cobros.anticipo ? t.anticipo : 0) + (e.cobros.saldo ? t.saldo : 0); }, 0);
  const comision = conf.reduce((a, e) => a + budgetCalc(e).comision, 0);
  const segs = data.events.filter((e) => e.seg && e.seg.accion && !['cerrado', 'perdido'].includes(e.stage)).sort((a, b) => (a.seg.fecha || '9999').localeCompare(b.seg.fecha || '9999'));
  const dup = {}; evs.forEach((e) => { if (e.q.fecha && stageIdx(e.stage) >= stageIdx('negociacion')) dup[e.q.fecha] = (dup[e.q.fecha] || 0) + 1; });
  p.innerHTML = `
  <h2>Agenda y cobros</h2>
  <div class="kb-stats" style="margin-bottom:16px">
    <div class="stat"><b>${conf.length}</b><span>Shows confirmados</span></div>
    <div class="stat"><b>${money(facturado)}</b><span>Valor confirmado</span></div>
    <div class="stat"><b>${money(cobrado)}</b><span>Cobrado</span></div>
    <div class="stat"><b>${money(facturado - cobrado)}</b><span>Por cobrar</span></div>
    <div class="stat"><b>${money(comision)}</b><span>Tu comisión</span></div>
  </div>
  <div class="card"><h3>Próximas acciones</h3>
    ${segs.length ? `<div class="tbl-wrap"><table><thead><tr><th>Fecha</th><th>Acción</th><th>Evento</th><th>Etapa</th></tr></thead><tbody>
      ${segs.map((e) => { const d = daysFromToday(e.seg.fecha); return `<tr><td>${e.seg.fecha ? fechaCorta(e.seg.fecha) : '—'} ${d !== null && d < 0 ? '<span class="pill bad">vencida</span>' : d === 0 ? '<span class="pill warn">hoy</span>' : ''}</td><td>${esc(e.seg.accion)}</td><td><a href="#" data-open="${e.id}">${esc(evTitle(e))}</a></td><td>${stageName(e.stage)}</td></tr>`; }).join('')}
    </tbody></table></div>` : '<p class="muted">No hay acciones pendientes.</p>'}
  </div>
  <div class="card"><h3>Calendario de shows</h3>
    ${evs.length ? `<div class="tbl-wrap"><table><thead><tr><th>Fecha</th><th>Evento</th><th>Municipio</th><th>Etapa</th><th class="num">Valor</th><th>Anticipo</th><th>Saldo</th><th class="num">Pendiente</th></tr></thead><tbody>
      ${evs.map((e) => { const t = budgetCalc(e); const c = stageIdx(e.stage) >= stageIdx('firmado'); return `<tr class="ag-row">
        <td>${e.q.fecha ? fechaCorta(e.q.fecha) + (e.q.horaShow ? '<br><span class="muted small">' + hora12(e.q.horaShow) + '</span>' : '') : '<span class="muted">Sin fecha</span>'}${dup[e.q.fecha] > 1 ? ' <span class="pill bad" title="Hay más de un evento avanzado esa fecha">choque</span>' : ''}</td>
        <td><a href="#" data-open="${e.id}">${esc(evTitle(e))}</a></td><td>${esc(e.q.municipio || '')}</td><td><span class="pill ${c ? 'ok' : ''}">${stageName(e.stage)}</span></td>
        <td class="num">${t.venta ? money(t.total) : '—'}</td>
        <td>${c ? `<label class="row small"><input type="checkbox" data-pay="anticipo" data-id="${e.id}" ${e.cobros.anticipo ? 'checked' : ''}> ${money(t.anticipo)}</label>` : '—'}</td>
        <td>${c ? `<label class="row small"><input type="checkbox" data-pay="saldo" data-id="${e.id}" ${e.cobros.saldo ? 'checked' : ''}> ${money(t.saldo)}</label>` : '—'}</td>
        <td class="num">${c ? money(pendiente(e)) : '—'}</td></tr>`; }).join('')}
    </tbody></table></div>` : '<p class="muted">Aún no hay eventos.</p>'}
  </div>`;
  p.onclick = (ev) => { const a = ev.target.closest('[data-open]'); if (a) { ev.preventDefault(); curId = a.dataset.open; renderEvBar(); showTab('cuestionario'); } };
  $$('[data-pay]', p).forEach((cb) => cb.addEventListener('change', () => {
    const e = data.events.find((x) => x.id === cb.dataset.id); e.cobros[cb.dataset.pay] = cb.checked; e.cobros[cb.dataset.pay + 'Fecha'] = cb.checked ? today() : '';
    if (cb.checked && e.cobros.anticipo && e.cobros.saldo && e.stage === 'realizado') { e.stage = 'cerrado'; toast('Todo cobrado: el evento pasó a "Cobrado y cerrado".'); }
    touch(e); persist(); renderAgenda();
  }));
}

/* ---------------- Guía del manager ---------------- */
const GUIDE = [
  ['1. Ventas y agenda', ['Buscar clientes, cotizar, negociar y cerrar fechas. En tu caso también eres el agente de booking.', 'Alcaldías: fiestas patronales y presupuesto de cultura. Llega meses antes; necesitan aprobar el gasto.', 'Empresas: las fiestas de fin de año se deciden entre septiembre y octubre.', 'Operadores de eventos: aliados que repiten. Cuídalos con buen trato y tarifa especial.', 'Salones y discotecas: al principio cobra tarifa fija, no porcentaje de la puerta.', 'El email abre la puerta; la venta se cierra por llamada o WhatsApp. Haz seguimiento siempre.']],
  ['2. Precios', ['Ten una tarifa base y súmale distancia, duración, sonido, transporte y hospedaje.', 'Nunca cotices sin saber fecha, lugar, hora, duración y quién pone la parte técnica.', 'Pregunta el presupuesto del cliente antes de dar tu precio.', 'Pide 50% de anticipo para separar la fecha.']],
  ['3. Contratos y documentos', ['Todo show con contrato firmado, con el rider como anexo.', 'Ten en una carpeta: RUT, cédula, Cámara de Comercio (si aplica), certificación bancaria, planilla de seguridad social.', 'Las alcaldías hacen su propia minuta (Ley 80 de 1993) y piden antecedentes y hoja de vida SIGEP.', 'Revisa una vez con un contador cómo facturar (factura electrónica o cuenta de cobro).']],
  ['4. Producción y logística', ['Una semana antes llama al contacto del evento: horario, sonido, camerino, transporte.', 'Arma la hoja de ruta (botón en Contrato) y envíala a artista y músicos.', 'El día del show: prueba de sonido, hora de salida a tarima y cobro del saldo.']],
  ['5. Cobros y finanzas', ['Anticipo antes; saldo antes de subir a tarima o al terminar.', 'Las alcaldías pagan a 30, 60 o 90 días: tenlo en cuenta en tu flujo de caja.', 'Registra cada show: ingresos, gastos y pagos a músicos. Usa una cuenta separada.', 'La comisión de un manager suele estar entre 10% y 20%.']],
  ['6. Marca y comunicación', ['Web, redes, brochure, portafolio y rider: ya los tienes.', 'Graba clips verticales cortos de cada show y pide testimonio a cada cliente contento.', 'Un video del público bailando vende más que cualquier brochure.']],
  ['7. Carrera y relación con el artista', ['Define metas del año, mercados nuevos y qué shows aceptar o rechazar.', 'Deja por escrito con el artista tu rol y tu comisión: protege la relación.', 'Cuida al artista: descanso, voz y ánimo también son parte del negocio.']],
];
const STAGE_TODO = {
  prospecto: ['Encuentra el contacto de quien decide.', 'Envía el email de presentación o escribe por WhatsApp.'],
  contactado: ['Llena el cuestionario mientras hablas.', 'Pregunta fecha, lugar y presupuesto.', 'Envía brochure y rider.'],
  cotizacion: ['Llama 2 o 3 días después de enviarla.', 'Resuelve dudas; no bajes el precio de una.'],
  negociacion: ['Si bajas precio, quita algo (tiempo, sonido, transporte).', 'Pide los datos para el contrato.'],
  firmado: ['Confirma el anticipo en Agenda y cobros.', 'Bloquea la fecha y avisa a músicos y equipo técnico.'],
  preproduccion: ['Llama al contacto una semana antes.', 'Confirma que el técnico aprobó el rider.', 'Envía la hoja de ruta al equipo.'],
  realizado: ['Cobra el saldo.', 'Pide testimonio y fotos; publica clips en redes.', 'Paga a músicos y equipo técnico.'],
  cerrado: ['Registra ingresos y gastos.', 'Agenda un contacto para la próxima temporada.'],
  perdido: ['Anota por qué se perdió.', 'Vuelve a contactar en la siguiente temporada.'],
};
function renderGuide() {
  $('#pGuia').innerHTML = `
  <h2>Guía del manager</h2>
  <p class="muted">El manager se encarga del negocio para que el artista solo se preocupe por cantar. Estas son tus siete áreas de trabajo.</p>
  <div class="guide">${GUIDE.map(([t, l]) => `<div class="card"><h3>${t}</h3><ul>${l.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`).join('')}</div>
  <div class="card"><h3>Qué hacer en cada etapa del tablero</h3>
    <div class="stage-tips">${STAGES.map((s) => `<div class="stage-tip" style="border-color:${s.color}"><b>${s.name}</b><ul>${STAGE_TODO[s.id].map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`).join('')}</div>
  </div>
  <div class="card"><h3>Rutina semanal</h3>
    <ul><li><b>Lunes:</b> revisa el tablero, la agenda y los cobros pendientes.</li><li><b>Martes a jueves:</b> seguimiento a prospectos y envío de cotizaciones.</li><li><b>Viernes:</b> confirma los shows de la semana siguiente y publica contenido.</li></ul>
  </div>`;
}

/* ---------------- Ajustes ---------------- */
function renderSettings() {
  const s = data.settings; const k = s.contratista, t = s.tarifas, P = s.pct, C = s.contrato;
  const inp = (path, val, label, opt = {}) => `<label class="fld"><span>${label}</span><input ${opt.num ? 'inputmode="numeric" data-num' : ''} ${opt.type ? `type="${opt.type}"` : ''} data-b="s.${path}" value="${esc(val)}" ${opt.ph ? `placeholder="${esc(opt.ph)}"` : ''}>${opt.why ? `<span class="why">${esc(opt.why)}</span>` : ''}</label>`;
  const sel = (path, val, label, opts) => `<label class="fld"><span>${label}</span><select data-b="s.${path}">${opts.map((o) => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${val === v ? 'selected' : ''}>${esc(l)}</option>`; }).join('')}</select></label>`;
  $('#pAjustes').innerHTML = `
  <h2>Ajustes</h2>
  <div class="card"><h3>Datos del contratista (quien firma y cobra)</h3>
    <p class="muted small">Si firmas tú como persona natural pon tu nombre y cédula. Si existe una empresa, pon la razón social, el NIT y el representante legal.</p>
    <div class="grid">
      ${inp('contratista.nombre', k.nombre, 'Nombre completo o razón social')}
      ${sel('contratista.tipoDoc', k.tipoDoc, 'Tipo de documento', ['Cédula de ciudadanía', 'NIT', 'Cédula de extranjería'])}
      ${inp('contratista.doc', k.doc, 'Número de documento')}
      ${inp('contratista.representante', k.representante, 'Representante legal (si es empresa)')}
      ${inp('contratista.repDoc', k.repDoc, 'Cédula del representante legal')}
      ${inp('contratista.direccion', k.direccion, 'Dirección')}
      ${inp('contratista.ciudad', k.ciudad, 'Ciudad')}
      ${inp('contratista.telefono', k.telefono, 'Teléfono')}
      ${inp('contratista.email', k.email, 'Correo')}
      ${sel('contratista.regimen', k.regimen, 'Régimen de IVA', [['no_iva', 'No responsable de IVA'], ['iva', 'Responsable de IVA']])}
    </div>
    <h3 style="margin-top:8px">Cuenta para pagos</h3>
    <div class="grid">
      ${inp('contratista.banco', k.banco, 'Banco')}
      ${sel('contratista.tipoCuenta', k.tipoCuenta, 'Tipo de cuenta', ['Ahorros', 'Corriente'])}
      ${inp('contratista.cuenta', k.cuenta, 'Número de cuenta')}
      ${inp('contratista.titular', k.titular, 'Titular de la cuenta', { ph: 'Si es distinto al contratista' })}
    </div>
  </div>
  <div class="card"><h3>Tarifas por defecto (lo que pagas a cada persona por show)</h3>
    <p class="muted small">Se usan al crear un evento nuevo. Cada evento se puede ajustar en su presupuesto.</p>
    <div class="grid">
      ${inp('tarifas.precioBase', t.precioBase, 'Precio base del show al cliente', { num: 1 })}
      ${inp('tarifas.artista', t.artista, 'Honorarios del artista', { num: 1 })}
      ${inp('tarifas.musico', t.musico, 'Pago por músico', { num: 1 })}
      ${inp('tarifas.nMusicos', t.nMusicos, 'Número de músicos', { num: 1 })}
      ${inp('tarifas.corista', t.corista, 'Pago por corista', { num: 1 })}
      ${inp('tarifas.nCoristas', t.nCoristas, 'Número de coristas', { num: 1 })}
      ${inp('tarifas.ingeniero', t.ingeniero, 'Ingeniero de sonido', { num: 1 })}
      ${inp('tarifas.roadie', t.roadie, 'Pago por roadie', { num: 1 })}
      ${inp('tarifas.nRoadies', t.nRoadies, 'Número de roadies', { num: 1 })}
      ${inp('tarifas.video', t.video, 'Persona que graba el evento', { num: 1 })}
      ${inp('tarifas.alimentacion', t.alimentacion, 'Alimentación por persona', { num: 1 })}
    </div>
  </div>
  <div class="card"><h3>Porcentajes</h3>
    <div class="grid">
      ${inp('pct.comision', P.comision, 'Comisión del manager (%)', { num: 1, why: 'Normalmente entre 10% y 20% del valor del show.' })}
      ${inp('pct.anticipo', P.anticipo, 'Anticipo (%)', { num: 1 })}
      ${inp('pct.imprevistos', P.imprevistos, 'Imprevistos (%)', { num: 1 })}
      ${inp('pct.retencion', P.retencion, 'Retención en la fuente estimada (%)', { num: 1, why: 'Lo que suele descontar el cliente. Pregúntale a tu contador; 0 para no mostrarla.' })}
    </div>
  </div>
  <div class="card"><h3>Condiciones del contrato</h3>
    <div class="grid">
      ${inp('contrato.prefijo', C.prefijo, 'Prefijo del número de contrato')}
      ${inp('contrato.consecutivo', C.consecutivo, 'Siguiente consecutivo', { num: 1 })}
      ${inp('contrato.ciudadFirma', C.ciudadFirma, 'Ciudad de firma')}
      ${inp('contrato.jurisdiccion', C.jurisdiccion, 'Domicilio contractual y conciliación')}
      ${inp('contrato.plazoSaldo', C.plazoSaldo, 'Cuándo se paga el saldo')}
      ${inp('contrato.cancelDias', C.cancelDias, 'Días de aviso para cancelar', { num: 1 })}
      ${inp('contrato.cancelPct1', C.cancelPct1, '% a pagar si cancelan con aviso', { num: 1 })}
      ${inp('contrato.cancelPct2', C.cancelPct2, '% a pagar si cancelan sin aviso', { num: 1 })}
      ${inp('contrato.penalPct', C.penalPct, 'Cláusula penal (%)', { num: 1 })}
      ${inp('contrato.reprogramarMeses', C.reprogramarMeses, 'Meses para reprogramar un aplazamiento', { num: 1 })}
    </div>
  </div>
  <div class="card"><h3>Copia de seguridad</h3>
    <p class="muted small">El servidor guarda copias automáticas cada hora. También puedes descargar todo en un archivo.</p>
    <div class="row"><button class="btn" id="bkExport">Descargar copia (.json)</button><label class="btn ghost">Restaurar copia<input type="file" id="bkImport" accept=".json,application/json" hidden></label></div>
  </div>
  <div class="card"><h3>Cambiar contraseña</h3>
    <div class="grid">
      <label class="fld"><span>Contraseña actual</span><input type="password" id="pwCur" autocomplete="current-password"></label>
      <label class="fld"><span>Nueva contraseña</span><input type="password" id="pwNew" autocomplete="new-password" minlength="8"></label>
    </div>
    <button class="btn" id="pwSave">Cambiar contraseña</button>
  </div>`;
  $('#bkExport').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); a.download = `respaldo-portal-${today()}.json`; a.click(); };
  $('#bkImport').onchange = async (ev) => {
    const f = ev.target.files[0]; if (!f) return;
    try { const j = JSON.parse(await f.text()); if (!Array.isArray(j.events)) throw new Error(); if (!confirm(`¿Reemplazar todo con la copia (${j.events.length} eventos)?`)) return; data = { settings: mergeSettings(j.settings), events: j.events }; curId = (data.events[0] || {}).id || null; persist(); renderAll(); toast('Copia restaurada'); }
    catch (e) { toast('El archivo no es una copia válida.'); }
  };
  $('#pwSave').onclick = async () => { const r = await api('password', { current: $('#pwCur').value, password: $('#pwNew').value }); toast(r.status === 200 ? 'Contraseña cambiada' : r.error); if (r.status === 200) { $('#pwCur').value = ''; $('#pwNew').value = ''; } };
}

/* Al generar un contrato nuevo se avanza el consecutivo */
const _pdfContract = pdfContract;
pdfContract = function (e) {
  const c = data.settings.contrato; const expected = `${c.prefijo}-${new Date().getFullYear()}-${String(c.consecutivo).padStart(3, '0')}`;
  _pdfContract(e);
  if (e.contrato.numero === expected) { c.consecutivo = num(c.consecutivo) + 1; persist(); }
};

start();

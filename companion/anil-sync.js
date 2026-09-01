'use strict';
/* ============================================================
   Añil Sync — companion de Pokémon Añil Super Randomlocke
   Vigila la partida y sube tu ficha (equipo, caja, cementerio,
   medallas, vidas) a la web automáticamente.
   ============================================================ */
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const { extract } = require('./extract.js');

const IS_PKG = !!process.pkg;
const BASE_DIR = IS_PKG ? path.dirname(process.execPath) : __dirname;
const CONFIG_PATH = path.join(BASE_DIR, 'config.json');
const VERSION = '1.2.3';

function log(...a) { const t = new Date().toLocaleTimeString('es'); console.log(`[${t}]`, ...a); }
function err(...a) { const t = new Date().toLocaleTimeString('es'); console.error(`[${t}] ⚠`, ...a); }

function pauseExit(code) {
  try {
    console.log('\nPulsa Enter para cerrar…');
    const fd = fs.openSync('/dev/stdin', 'rs');
    const b = Buffer.alloc(1);
    try { fs.readSync(fd, b, 0, 1, null); } catch (e) {}
  } catch (e) {}
  process.exit(code || 0);
}

const CONFIG_TEMPLATE = {
  playerId: "tu_id",
  saveFolder: "",
  saveSlot: "ask",
  github: { owner: "usuario", repo: "anil-randomlocke", branch: "main", token: "github_pat_XXXXXXXX", pathTemplate: "data/players/{id}.json" },
  watch: true,
  dryRun: false
};

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(CONFIG_TEMPLATE, null, 2));
    err('No había config.json. Creé una plantilla en:\n   ' + CONFIG_PATH +
        '\n\nÁbrela con el Bloc de notas y rellena: playerId, github.owner, github.repo y github.token.\nLuego vuelve a ejecutar este programa.');
    pauseExit(1);
  }
  let cfg;
  try { cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); }
  catch (e) { err('config.json tiene un error de formato: ' + e.message); pauseExit(1); }
  if (!cfg.saveFolder) cfg.saveFolder = path.join(process.env.APPDATA || '', 'Pokemon Anil');
  cfg.github = cfg.github || {};
  cfg.github.branch = cfg.github.branch || 'main';
  cfg.github.pathTemplate = cfg.github.pathTemplate || 'data/players/{id}.json';
  return cfg;
}

function findSave(cfg) {
  const dir = cfg.saveFolder;
  if (!fs.existsSync(dir)) throw new Error('No existe la carpeta de saves:\n   ' + dir + '\n(ajusta "saveFolder" en config.json)');
  const files = fs.readdirSync(dir).filter(f => /\.rxdata$/i.test(f) && !/\.bak$/i.test(f));
  if (!files.length) throw new Error('No hay archivos .rxdata en ' + dir);
  if (cfg.saveSlot && String(cfg.saveSlot).toLowerCase() !== 'auto') {
    const target = 'Partida ' + cfg.saveSlot + '.rxdata';
    if (files.includes(target)) return path.join(dir, target);
    // permite nombre exacto también
    if (files.includes(cfg.saveSlot)) return path.join(dir, cfg.saveSlot);
    throw new Error('No encontré el slot "' + cfg.saveSlot + '" en ' + dir);
  }
  // más reciente
  let newest = null, nt = -1;
  for (const f of files) {
    const st = fs.statSync(path.join(dir, f));
    if (st.mtimeMs > nt) { nt = st.mtimeMs; newest = f; }
  }
  return path.join(dir, newest);
}

// Pregunta interactiva por consola
function ask(q) {
  return new Promise(res => {
    const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout });
    rl.question(q, a => { rl.close(); res((a || '').trim()); });
  });
}
// Guarda solo saveSlot en config.json, conservando lo demás tal cual lo escribió el usuario
function saveSlotToFile(value) {
  try {
    const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    raw.saveSlot = value;
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(raw, null, 2));
  } catch (e) { err('No pude guardar la elección en config.json: ' + e.message); }
}
// Primera vez: elegir slot y recordarlo
async function chooseSlot(cfg) {
  const dir = cfg.saveFolder;
  let files = [];
  try { files = fs.readdirSync(dir).filter(f => /\.rxdata$/i.test(f) && !/\.bak$/i.test(f)); } catch (e) {}
  if (!files.length) { err('No encontré partidas en ' + dir + '. Usaré "auto".'); cfg.saveSlot = 'auto'; saveSlotToFile('auto'); return; }
  files.sort();
  console.log('\n¿Qué partida quieres seguir? (esto solo se pregunta una vez)\n');
  files.forEach((f, i) => {
    let m = ''; try { m = new Date(fs.statSync(path.join(dir, f)).mtime).toLocaleString('es'); } catch (e) {}
    console.log('   [' + (i + 1) + ']  ' + f + '   (último guardado: ' + m + ')');
  });
  console.log('   [0]  Automático — usar siempre la partida más reciente\n');
  let choice = null;
  while (choice === null) {
    const a = await ask('Escribe el número y pulsa Enter: ');
    if (a === '0') choice = 'auto';
    else { const n = parseInt(a, 10); if (n >= 1 && n <= files.length) choice = files[n - 1]; else console.log('   Opción no válida, inténtalo de nuevo.'); }
  }
  cfg.saveSlot = choice;
  saveSlotToFile(choice);
  log('Slot elegido: ' + (choice === 'auto' ? 'automático (más reciente)' : choice) + '  → guardado en config.json (no volveré a preguntar).');
}

// Espera a que el archivo deje de crecer (el juego termina de escribir)
function readStable(file) {
  return new Promise((resolve, reject) => {
    let lastSize = -1, stableCount = 0, tries = 0;
    const tick = () => {
      let st;
      try { st = fs.statSync(file); } catch (e) { if (++tries > 40) return reject(e); return setTimeout(tick, 250); }
      if (st.size === lastSize && st.size > 0) {
        if (++stableCount >= 2) { try { return resolve(fs.readFileSync(file)); } catch (e) { return reject(e); } }
      } else { stableCount = 0; lastSize = st.size; }
      if (++tries > 60) return reject(new Error('el archivo no se estabilizó'));
      setTimeout(tick, 250);
    };
    tick();
  });
}

function apiRequest(method, apiPath, token, body) {
  return new Promise((resolve, reject) => {
    const data = body ? Buffer.from(JSON.stringify(body)) : null;
    const req = https.request({
      hostname: 'api.github.com', path: apiPath, method,
      headers: {
        'User-Agent': 'anil-sync', 'Authorization': 'Bearer ' + token,
        'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28',
        ...(data ? { 'Content-Type': 'application/json', 'Content-Length': data.length } : {})
      }
    }, r => {
      let b = ''; r.on('data', c => b += c);
      r.on('end', () => { let j = null; try { j = b ? JSON.parse(b) : null; } catch (e) {} resolve({ status: r.statusCode, body: j }); });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function upload(cfg, jsonStr) {
  const rel = cfg.github.pathTemplate.replace('{id}', cfg.playerId);
  const apiPath = `/repos/${cfg.github.owner}/${cfg.github.repo}/contents/${rel}`;
  let sha;
  const get = await apiRequest('GET', apiPath + '?ref=' + encodeURIComponent(cfg.github.branch), cfg.github.token);
  if (get.status === 200 && get.body && get.body.sha) sha = get.body.sha;
  else if (get.status === 401) throw new Error('Token inválido o sin permisos (401). Revisa github.token.');
  else if (get.status === 404 && get.body && /Not Found/i.test(get.body.message || '') && !sha) { /* archivo nuevo, ok */ }
  const put = await apiRequest('PUT', apiPath, cfg.github.token, {
    message: `sync ${cfg.playerId} (auto)`,
    content: Buffer.from(jsonStr, 'utf8').toString('base64'),
    branch: cfg.github.branch,
    ...(sha ? { sha } : {})
  });
  if (put.status === 200 || put.status === 201) return true;
  throw new Error('GitHub respondió ' + put.status + ': ' + (put.body && put.body.message || ''));
}

// map-names.json opcional (id de mapa -> nombre de ruta), junto al .exe
let _mapNames = undefined;
function loadMapNames() {
  if (_mapNames !== undefined) return _mapNames;
  const p = path.join(BASE_DIR, 'map-names.json');
  try { _mapNames = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null; }
  catch (e) { err('map-names.json inválido, se ignora: ' + e.message); _mapNames = null; }
  if (_mapNames) log('Usando nombres de mapa de map-names.json (' + Object.keys(_mapNames).length + ' rutas).');
  return _mapNames;
}

// Auto-registro: añade al jugador a la lista de config.json si no está (una sola vez).
let registered = false;
async function ensureRegistered(cfg, data) {
  if (registered) return;
  const rel = (cfg.github.configPath) || 'data/config.json';
  const apiPath = `/repos/${cfg.github.owner}/${cfg.github.repo}/contents/${rel}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    const get = await apiRequest('GET', apiPath + '?ref=' + encodeURIComponent(cfg.github.branch), cfg.github.token);
    if (get.status !== 200 || !get.body || !get.body.content) { err('No pude leer config.json para el alta automática (' + get.status + ').'); return; }
    let cj;
    try { cj = JSON.parse(Buffer.from(get.body.content, 'base64').toString('utf8')); }
    catch (e) { err('config.json remoto ilegible, omito el alta automática.'); return; }
    cj.players = cj.players || [];
    if (cj.players.some(p => p.id === cfg.playerId)) { registered = true; return; }
    const used = new Set(cj.players.map(p => p.avatar).filter(Boolean));
    const pool = cj._avatarsDisponibles || [];
    const avatar = pool.find(a => !used.has(a)) || (pool.length ? pool[cj.players.length % pool.length] : '');
    cj.players.push({ id: cfg.playerId, name: data.name || cfg.playerId, avatar });
    const put = await apiRequest('PUT', apiPath, cfg.github.token, {
      message: `alta jugador ${cfg.playerId}`,
      content: Buffer.from(JSON.stringify(cj, null, 2), 'utf8').toString('base64'),
      branch: cfg.github.branch, sha: get.body.sha
    });
    if (put.status === 200 || put.status === 201) { registered = true; log('✓ Jugador "' + cfg.playerId + '" añadido a la lista de la web.'); return; }
    if (put.status === 409 || put.status === 422) continue; // conflicto con otra alta: reintenta
    err('No pude registrar al jugador (' + put.status + ': ' + (put.body && put.body.message || '') + ').'); return;
  }
  err('No pude registrar al jugador tras varios intentos (conflictos simultáneos).');
}

// ---------- Auto-actualización ----------
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const go = (u, depth) => {
      if (depth > 6) return reject(new Error('demasiados redirects'));
      https.get(u, { headers: { 'User-Agent': 'anil-sync' } }, (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          res.resume(); return go(new URL(res.headers.location, u).toString(), depth + 1);
        }
        const chunks = []; res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }));
      }).on('error', reject);
    };
    go(url, 0);
  });
}
function cmpVer(a, b) {
  const pa = String(a).split('.').map(Number), pb = String(b).split('.').map(Number);
  for (let i = 0; i < 3; i++) { const d = (pa[i] || 0) - (pb[i] || 0); if (d) return d; }
  return 0;
}
async function checkForUpdate(cfg) {
  try {
    const r = cfg.github; if (!r || !r.owner || !r.repo) return;
    const branch = r.branch || 'main';
    const vurl = `https://raw.githubusercontent.com/${r.owner}/${r.repo}/${branch}/companion/latest-version.json?t=` + Date.now();
    const resp = await httpsGet(vurl);
    if (resp.status !== 200) return;
    let info; try { info = JSON.parse(resp.body.toString('utf8')); } catch (e) { return; }
    if (!info.version || cmpVer(info.version, VERSION) <= 0) { log('AnilSync v' + VERSION + ' (al día).'); return; }
    log('★ Nueva versión ' + info.version + ' disponible (tienes ' + VERSION + ').' + (info.notes ? ' ' + info.notes : ''));
    if (!IS_PKG) { log('  (modo dev: actualiza el exe a mano)'); return; }
    log('  Descargando actualización…');
    const exeUrl = info.exeUrl || `https://github.com/${r.owner}/${r.repo}/releases/latest/download/AnilSync.exe`;
    const dl = await httpsGet(exeUrl);
    if (dl.status !== 200 || dl.body.length < 1000000) { log('  No pude descargar. Actualiza a mano: https://github.com/' + r.owner + '/' + r.repo + '/releases'); return; }
    const newPath = process.execPath + '.new';
    fs.writeFileSync(newPath, dl.body);
    const bat = path.join(BASE_DIR, '_anil_update.bat');
    fs.writeFileSync(bat,
      '@echo off\r\n:wait\r\nping 127.0.0.1 -n 2 >nul\r\ndel "' + process.execPath + '" 2>nul\r\n' +
      'if exist "' + process.execPath + '" goto wait\r\nmove /Y "' + newPath + '" "' + process.execPath + '" >nul\r\n' +
      'start "" "' + process.execPath + '"\r\ndel "%~f0"\r\n');
    log('  ✓ Actualización lista. Reiniciando AnilSync…');
    require('child_process').spawn('cmd.exe', ['/c', bat], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
    process.exit(0);
  } catch (e) { /* silencioso: seguimos con la versión actual */ }
}

let lastHash = null;

async function syncOnce(cfg, reason) {
  const file = findSave(cfg);
  let buf;
  try { buf = await readStable(file); } catch (e) { err('No pude leer el save (' + e.message + '), reintento luego.'); return; }
  let data;
  try { data = extract(buf, cfg.playerId, { mapNames: loadMapNames() }); }
  catch (e) { err('No pude interpretar el save: ' + e.message); return; }
  const jsonStr = JSON.stringify(data, null, 2);
  const hash = crypto.createHash('sha1').update(jsonStr).digest('hex');
  if (hash === lastHash) { log('Sin cambios (' + path.basename(file) + ').'); return; }

  const summary = `equipo ${data.team.length} · caja ${data.box.length} · cementerio ${data.graveyard.length} · ${Object.keys(data.progress.gyms).length}/8 medallas`;
  // guarda copia local siempre
  const outLocal = path.join(BASE_DIR, cfg.playerId + '.json');
  fs.writeFileSync(outLocal, jsonStr);

  if (cfg.dryRun) { lastHash = hash; log('[PRUEBA] Generado ' + outLocal + '  (' + summary + '). No se sube (dryRun).'); return; }

  try {
    await upload(cfg, jsonStr);
    await ensureRegistered(cfg, data);
    lastHash = hash;
    log('✓ Subido a GitHub (' + reason + '): ' + summary);
  } catch (e) { err('Falló la subida: ' + e.message); }
}

function watchLoop(cfg) {
  const dir = cfg.saveFolder;
  log('Vigilando: ' + dir);
  let timer = null;
  const trigger = () => { clearTimeout(timer); timer = setTimeout(() => syncOnce(cfg, 'guardado'), 4000); };
  try {
    fs.watch(dir, { persistent: true }, (ev, fname) => {
      if (fname && /\.rxdata$/i.test(fname) && !/\.bak$/i.test(fname)) trigger();
    });
  } catch (e) { err('No pude vigilar la carpeta: ' + e.message); }
  // reintento de seguridad cada 90s por si fs.watch se pierde
  setInterval(() => syncOnce(cfg, 'chequeo'), 90000);
  setInterval(() => checkForUpdate(cfg), 6 * 3600 * 1000); // busca actualización cada 6 h
}

async function main() {
  console.log('====================================');
  console.log('  Añil Sync — Super Randomlocke');
  console.log('====================================\n');
  const cfg = loadConfig();
  if (!cfg.playerId || cfg.playerId === 'tu_id') { err('Falta "playerId" en config.json.'); pauseExit(1); }
  if (!cfg.dryRun && (!cfg.github.token || /XXXX/.test(cfg.github.token))) { err('Falta el token de GitHub en config.json (github.token).'); pauseExit(1); }
  log('Jugador: ' + cfg.playerId + '  |  Repo: ' + cfg.github.owner + '/' + cfg.github.repo + '  |  v' + VERSION + (cfg.dryRun ? '  |  MODO PRUEBA' : ''));
  await checkForUpdate(cfg);

  // Primera vez: preguntar qué slot de guardado usar (se recuerda en config.json)
  const slot = String(cfg.saveSlot || '').toLowerCase();
  if (!slot || slot === 'ask' || slot === 'preguntar') await chooseSlot(cfg);

  try { log('Save detectado: ' + path.basename(findSave(cfg))); }
  catch (e) { err(e.message); pauseExit(1); }

  await syncOnce(cfg, 'inicio');

  if (cfg.watch === false) { log('watch=false → hecho.'); return; }
  watchLoop(cfg);
  log('Listo. Deja esta ventana abierta mientras juegas. Al guardar en el juego, tu ficha se actualiza sola.');
}

main().catch(e => { err('Error inesperado: ' + (e && e.stack || e)); pauseExit(1); });

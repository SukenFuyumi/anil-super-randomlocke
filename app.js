/* ============================================================
   Pokémon Añil — Super Randomlocke · núcleo compartido
   ============================================================ */

/* ---------- Tema claro/oscuro ---------- */
(function initTheme() {
  const saved = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = saved || (prefersDark ? "dark" : "light");
  document.documentElement.setAttribute("data-theme", theme);
})();

function toggleTheme() {
  const cur = document.documentElement.getAttribute("data-theme");
  const next = cur === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
  const btn = document.getElementById("theme-toggle");
  if (btn) btn.innerHTML = themeIcon(next);
}
function themeIcon(theme) {
  return theme === "dark"
    ? `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>`
    : `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.3"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.2 5.2l1.5 1.5M17.3 17.3l1.5 1.5M18.8 5.2l-1.5 1.5M6.7 17.3l-1.5 1.5"/></svg>`;
}

/* ---------- Favicon ---------- */
(function () {
  if (!document.querySelector('link[rel="icon"]')) {
    const l = document.createElement("link");
    l.rel = "icon"; l.href = "favicon.svg"; l.type = "image/svg+xml";
    document.head.appendChild(l);
  }
})();

/* ---------- Cabecera ---------- */
const NAV = [
  { href: "index.html", label: "Inicio" },
  { href: "progresion.html", label: "Progresión" },
  { href: "objetos.html", label: "Objetos" },
  { href: "pokedex.html", label: "Pokédex" },
  { href: "movimientos.html", label: "Movimientos" },
  { href: "habilidades.html", label: "Habilidades" },
  { href: "torneos.html", label: "Torneos" },
  { href: "reglas.html", label: "Reglas" },
];

function renderHeader(active) {
  const theme = document.documentElement.getAttribute("data-theme");
  const links = NAV.map(
    (n) => `<a href="${n.href}"${n.href === active ? ' class="active"' : ""}>${n.label}</a>`
  ).join("");
  const discordBtn = active === "index.html"
    ? `<button id="btnDiscord" class="theme-toggle" type="button" title="Copiar imagen de las fichas para Discord">
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
      </button>`
    : "";
  const html = `
    <div class="bar">
      <a class="brand" href="index.html">${pokeball("#ee1515", 26)} <span>Añil</span> <span class="muted" style="font-weight:600;font-size:.8rem;color:#8b95a5">Randomlocke</span></a>
      <nav>${links}</nav>
      <div class="header-actions">
        ${discordBtn}
        <button id="theme-toggle" class="theme-toggle" type="button" title="Cambiar tema" onclick="toggleTheme()">${themeIcon(theme)}</button>
      </div>
    </div>`;
  const header = document.createElement("header");
  header.className = "site-header";
  header.innerHTML = html;
  document.body.prepend(header);
}

function renderFooter() {
  const f = document.createElement("footer");
  f.className = "site-footer";
  f.innerHTML = `Pokémon Añil — Super Randomlocke · 2026.`;
  document.body.appendChild(f);
}

/* ---------- Carga de datos ---------- */
async function loadJSON(path) {
  try {
    // Cache-busting para datos que cambian (config y fichas de jugador),
    // así se ve siempre lo último sin esperar a la caché de la CDN.
    let url = path;
    if (/config\.json|\/players\//.test(path)) {
      url += (path.includes("?") ? "&" : "?") + "t=" + Date.now();
    }
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(res.status);
    return await res.json();
  } catch (e) {
    console.warn("No se pudo cargar", path, e);
    return null;
  }
}

async function loadConfig() {
  await loadPokedex();
  await loadMoves();
  return (await loadJSON("data/config.json")) || { title: "Randomlocke", players: [], gyms: [], bosses: [], npcs: [], routes: [] };
}

/* ---------- Movimientos (nombre español/inglés -> tipo) ---------- */
let MOVES = null;
async function loadMoves() {
  if (MOVES) return MOVES;
  MOVES = (await loadJSON("data/moves-es.json")) || {};
  return MOVES;
}
/* devuelve la clave de tipo (css) de un movimiento por su nombre, o null */
function moveTypeKey(name) {
  if (!MOVES) return null;
  return MOVES[normName(name)] || null;
}

/* ---------- Pokédex (nombre español/inglés -> nº nacional) ---------- */
let DEX = null;
async function loadPokedex() {
  if (DEX) return DEX;
  DEX = (await loadJSON("data/pokedex-es.json")) || {};
  return DEX;
}
function normName(s) {
  return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
}
function speciesDexId(species) {
  if (!species) return null;
  const clean = String(species).replace(/\(.*?\)/g, ""); // quita "(inicial)" etc.
  const key = normName(clean);
  if (!key) return null;
  if (DEX && DEX[key]) return DEX[key];
  if (/^\d+$/.test(key)) return +key;
  return null;
}
function speciesSprite(species) {
  const id = speciesDexId(species);
  return id ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png` : null;
}

/* ---------- Wikidex ---------- */
let PDEX = null;
async function loadPokedexFull() {
  if (PDEX) return PDEX;
  PDEX = (await loadJSON("data/pokedex.json")) || {};
  return PDEX;
}
/* enlace a la ficha de un Pokémon (por especie o nº); null si no se resuelve */
function pokemonHref(speciesOrId) {
  const id = typeof speciesOrId === "number" ? speciesOrId : speciesDexId(speciesOrId);
  return id ? "pokemon.html?id=" + id : null;
}

/* ---------- Wiki de movimientos / habilidades / formas ---------- */
let MOVESF = null, ABILITIES = null, FORMSD = null;
async function loadMovesFull() { if (!MOVESF) MOVESF = (await loadJSON("data/moves.json")) || {}; return MOVESF; }
async function loadAbilities() { if (!ABILITIES) ABILITIES = (await loadJSON("data/abilities.json")) || {}; return ABILITIES; }
async function loadForms() { if (!FORMSD) FORMSD = (await loadJSON("data/forms.json")) || {}; return FORMSD; }
let TCHART = null;
async function loadTypesChart() { if (!TCHART) TCHART = (await loadJSON("data/types-chart.json")) || {}; return TCHART; }
/* Los 18 tipos (clave css -> nombre ES) en orden de tabla */
const TYPES_CSS_ES = {
  normal: "Normal", fire: "Fuego", water: "Agua", grass: "Planta", electric: "Eléctrico", ice: "Hielo",
  fighting: "Lucha", poison: "Veneno", ground: "Tierra", flying: "Volador", psychic: "Psíquico", bug: "Bicho",
  rock: "Roca", ghost: "Fantasma", dragon: "Dragón", dark: "Siniestro", steel: "Acero", fairy: "Hada",
};
/* multiplicador defensivo de un tipo atacante (css) contra los tipos defensores (css array) */
function typeMult(defKeys, atk) {
  let m = 1;
  for (const d of defKeys) {
    const c = TCHART && TCHART[d];
    if (!c) continue;
    if (c.immune.includes(atk)) m *= 0;
    else if (c.weak.includes(atk)) m *= 2;
    else if (c.resist.includes(atk)) m *= 0.5;
  }
  return m;
}
/* {x4,x2,half,quarter,immune} — cada uno lista de {key, mult} para los tipos del Pokémon */
function typeMatchups(typesEs) {
  const def = (typesEs || []).map(typeKey).filter((k) => k && k !== "unknown");
  const out = { weak: [], resist: [], immune: [] };
  for (const atk of Object.keys(TYPES_CSS_ES)) {
    const m = typeMult(def, atk);
    if (m === 0) out.immune.push({ key: atk, m });
    else if (m > 1) out.weak.push({ key: atk, m });
    else if (m < 1) out.resist.push({ key: atk, m });
  }
  out.weak.sort((a, b) => b.m - a.m);
  out.resist.sort((a, b) => a.m - b.m);
  return out;
}
function multLabel(m) { return m === 0.25 ? "×¼" : m === 0.5 ? "×½" : m === 0 ? "×0" : "×" + m; }
/* datos completos de un movimiento por su nombre (es) */
function moveInfo(name) { return MOVESF ? MOVESF[normName(name)] || null : null; }
function abilityInfo(name) { return ABILITIES ? ABILITIES[normName(name)] || null : null; }

/* Naturaleza -> {up, down} en el orden [PS, Ataque, Defensa, At.Esp, Def.Esp, Velocidad]. null = neutra. */
const NATURE_FX = {
  Fuerte: null, Dócil: null, Seria: null, Tímida: null, Rara: null,
  Huraña: { up: 1, down: 2 }, Audaz: { up: 1, down: 5 }, Firme: { up: 1, down: 3 }, Pícara: { up: 1, down: 4 },
  Osada: { up: 2, down: 1 }, Plácida: { up: 2, down: 5 }, Agitada: { up: 2, down: 3 }, Floja: { up: 2, down: 4 },
  Miedosa: { up: 5, down: 1 }, Activa: { up: 5, down: 2 }, Alegre: { up: 5, down: 3 }, Ingenua: { up: 5, down: 4 },
  Modesta: { up: 3, down: 1 }, Afable: { up: 3, down: 2 }, Mansa: { up: 3, down: 5 }, Alocada: { up: 3, down: 4 },
  Serena: { up: 4, down: 1 }, Amable: { up: 4, down: 2 }, Grosera: { up: 4, down: 5 }, Cauta: { up: 4, down: 3 },
};

async function loadPlayer(id) {
  // Prioriza datos locales guardados en el editor (borradores no publicados)
  const local = localStorage.getItem("player:" + id);
  if (local) {
    try { return { ...JSON.parse(local), _local: true }; } catch (e) {}
  }
  return await loadJSON(`data/players/${id}.json`);
}

async function loadAllPlayers(config) {
  const out = [];
  for (const p of config.players) {
    if (p.hidden) continue; // jugadores ocultados por el organizador
    const data = await loadPlayer(p.id);
    out.push({ ...p, data: data || emptyPlayerData(p) });
  }
  return out;
}

function emptyPlayerData(p) {
  return {
    id: p.id, name: p.name, lives: 30, livesUsed: 0, champion: false,
    team: [], box: [], graveyard: [], captures: [],
    progress: { gyms: {}, bosses: {}, npcs: {}, routes: {} },
  };
}

/* ---------- Tipos ---------- */
const TYPE_MAP = {
  normal: "normal", fuego: "fire", agua: "water", planta: "grass", electrico: "electric",
  eléctrico: "electric", hielo: "ice", lucha: "fighting", veneno: "poison", tierra: "ground",
  volador: "flying", psiquico: "psychic", psíquico: "psychic", bicho: "bug", roca: "rock",
  fantasma: "ghost", dragon: "dragon", dragón: "dragon", siniestro: "dark", acero: "steel",
  hada: "fairy", "???": "unknown",
  // inglés también válido
  fire: "fire", water: "water", grass: "grass", electric: "electric", ice: "ice",
  fighting: "fighting", poison: "poison", ground: "ground", flying: "flying",
  psychic: "psychic", bug: "bug", rock: "rock", ghost: "ghost", dragon_en: "dragon",
  dark: "dark", steel: "steel", fairy: "fairy",
};
function typeKey(t) {
  if (!t) return "unknown";
  return TYPE_MAP[t.toLowerCase().trim()] || "unknown";
}
function typeBadge(t, small) {
  const k = typeKey(t);
  return `<span class="type-badge${small ? " sm" : ""}" style="background:var(--type-${k})">${escapeHtml(t)}</span>`;
}

/* ---------- Utilidades ---------- */
function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function initials(name) {
  return (name || "?").trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

/* ---------- Iconos Pokémon (SVG en línea) ---------- */
function pokeball(top, size, outline) {
  size = size || 18; outline = outline || "#1b1f24";
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" style="vertical-align:-.18em;flex:none" aria-hidden="true">
    <path d="M5 50a45 45 0 0 1 90 0Z" fill="${top}"/>
    <path d="M5 50a45 45 0 0 0 90 0Z" fill="#f7f7f7"/>
    <circle cx="50" cy="50" r="45" fill="none" stroke="${outline}" stroke-width="7"/>
    <line x1="5" y1="50" x2="95" y2="50" stroke="${outline}" stroke-width="7"/>
    <circle cx="50" cy="50" r="15" fill="#fff" stroke="${outline}" stroke-width="7"/></svg>`;
}
function faintIcon(size) {
  size = size || 18;
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" style="vertical-align:-.18em;flex:none" aria-hidden="true">
    <path d="M5 50a45 45 0 0 1 90 0Z" fill="#aeb6c2"/>
    <path d="M5 50a45 45 0 0 0 90 0Z" fill="#dfe3e9"/>
    <circle cx="50" cy="50" r="45" fill="none" stroke="#5b6472" stroke-width="7"/>
    <line x1="5" y1="50" x2="95" y2="50" stroke="#5b6472" stroke-width="7"/>
    <circle cx="50" cy="50" r="16" fill="#fff" stroke="#5b6472" stroke-width="6"/>
    <path d="M44 44l12 12M56 44l-12 12" stroke="#5b6472" stroke-width="6" stroke-linecap="round"/></svg>`;
}
function championBadge(size) {
  size = size || 16;
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" style="vertical-align:-.15em;flex:none" aria-hidden="true">
    <path d="M12 2l2.9 5.9 6.5.95-4.7 4.58 1.1 6.47L12 17.4 6.1 20.9l1.1-6.47L2.5 8.85l6.5-.95z" fill="#e8b62c" stroke="#a97e10" stroke-width="1"/></svg>`;
}
function shinyStar(size) {
  size = size || 12;
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" style="vertical-align:-.12em;flex:none" aria-hidden="true">
    <path d="M12 1.8l2.2 6.9 7 .1-5.6 4.3 2.1 6.8L12 15.8 6.3 19.9l2.1-6.8L2.8 8.8l7-.1z" fill="#f4d03f"/></svg>`;
}
function param(name) {
  return new URLSearchParams(location.search).get(name);
}
function toast(msg) {
  let t = document.querySelector(".toast");
  if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove("show"), 2200);
}
function download(filename, text) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------- Render de un Pokémon ---------- */
/* GIF animado (Gen 5) por nº de Pokédex — existe para ~Gen 1-5; si no, cae al estático */
function speciesAniSprite(species) {
  const id = speciesDexId(species);
  return id ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${id}.gif` : null;
}

/* onerror encadenado: prueba la siguiente URL de data-fb; si no quedan, muestra iniciales */
function imgFallback(img) {
  let list = [];
  try { list = JSON.parse(img.dataset.fb || "[]"); } catch (e) {}
  if (list.length) { const next = list.shift(); img.dataset.fb = JSON.stringify(list); img.src = next; }
  else {
    const d = document.createElement("div");
    d.className = img.dataset.fbclass || img.className;
    d.textContent = img.dataset.ini || "?";
    img.replaceWith(d);
  }
}

function spriteEl(mon, cls = "mon-sprite") {
  const ini = initials(mon.species || mon.nickname);
  const ani = speciesAniSprite(mon.species), stat = speciesSprite(mon.species);
  let primary, fb;
  if (mon.sprite) { primary = mon.sprite; fb = [ani, stat]; }
  else if (ani) { primary = ani; fb = [stat]; }
  else { return `<div class="${cls}">${escapeHtml(ini)}</div>`; }
  fb = JSON.stringify(fb.filter((u) => u && u !== primary));
  // envuelto en un círculo que NO recorta el sprite (overflow visible)
  return `<span class="${cls}"><img src="${escapeHtml(primary)}" alt="${escapeHtml(mon.species || "")}" loading="lazy" data-fb='${fb}' data-ini="${escapeHtml(ini)}" onerror="imgFallback(this)"></span>`;
}

/* Fila de mini-sprites del equipo (para tarjetas de jugador).
   opts.labels = muestra mote + especie bajo cada sprite. */
function teamSpritesRow(team, opts = {}) {
  if (!team || !team.length) return `<div class="team-mini muted" style="font-size:.72rem">Sin equipo</div>`;
  const labels = !!opts.labels;
  return `<div class="team-mini${labels ? " labeled" : ""}">${team.slice(0, 6).map((m) => {
    const ini = initials(m.species || m.nickname);
    const ani = speciesAniSprite(m.species), stat = speciesSprite(m.species);
    const primary = m.sprite || ani || stat;
    const title = escapeHtml((m.nickname || "") + (m.species ? " (" + m.species + ")" : ""));
    const fb = JSON.stringify([m.sprite ? ani : null, stat].filter((u) => u && u !== primary));
    const img = primary
      ? `<img src="${escapeHtml(primary)}" alt="" title="${title}" loading="lazy" data-fb='${fb}' data-ini="${escapeHtml(ini)}" data-fbclass="team-mini-x" onerror="imgFallback(this)">`
      : `<span class="team-mini-x" title="${escapeHtml(m.nickname || "")}">${escapeHtml(ini)}</span>`;
    if (!labels) return img;
    return `<span class="tm-cell">${img}<span class="tm-nick">${escapeHtml(m.nickname || m.species || "?")}${m.shiny ? " " + shinyStar(9) : ""}</span><span class="tm-sp">${escapeHtml(m.species || "")}</span></span>`;
  }).join("")}</div>`;
}

/* Medalla de gimnasio (SVG). earned=false -> gris. */
function badgeIcon(color, earned, size) {
  size = size || 22;
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" style="display:block"${earned ? "" : ' opacity="0.4"'}>
    <polygon points="12,1.5 21,6.75 21,17.25 12,22.5 3,17.25 3,6.75" fill="${color}" stroke="#00000055" stroke-width="1"/>
    <circle cx="12" cy="12" r="3.1" fill="#ffffffcc"/></svg>`;
}
/* Fila de las 8 medallas: color por tipo si conseguida, gris si no. */
function medalsRow(cfg, gymsProgress) {
  const gyms = (cfg.gyms || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  if (!gyms.length) return "";
  return `<div class="medals">${gyms.map((g) => {
    const earned = !!(gymsProgress && gymsProgress[g.id]);
    const color = earned ? `var(--type-${typeKey(g.type)})` : "#4a515c";
    return `<span class="medal" title="${escapeHtml((g.leader || g.name) + (earned ? " ✓" : " — pendiente"))}">${badgeIcon(color, earned, 22)}</span>`;
  }).join("")}</div>`;
}

/* Capturas extra ganadas (shiny y duplicados de especie dan captura extra). */
function extraCaptures(pdata) {
  const all = [...(pdata.team || []), ...(pdata.box || []), ...(pdata.graveyard || [])];
  const shiny = all.filter((m) => m.shiny).length;
  const counts = {};
  all.forEach((m) => { const k = normName(m.species); if (k) counts[k] = (counts[k] || 0) + 1; });
  const dups = Object.values(counts).reduce((s, c) => s + Math.max(0, c - 1), 0);
  return { shiny, dups, total: shiny + dups };
}

/* Checklist de retos con imagen de entrenador (gimnasios / bosses / npcs) */
function trainerChecklist(items, doneMap) {
  if (!items || !items.length) return `<p class="muted" style="font-size:.85rem">— nada configurado —</p>`;
  return `<div class="trainer-check-grid">${items.map((it) => {
    const done = !!doneMap?.[it.id];
    const img = it.image
      ? `<img class="tc-img" src="${escapeHtml(it.image)}" alt="" loading="lazy">`
      : `<div class="tc-img tc-img-empty">?</div>`;
    const sub = [it.leader, it.city || it.location].filter(Boolean).join(" · ");
    return `<div class="trainer-check${done ? " done" : ""}">
      ${img}
      <div class="tc-body">
        <div class="tc-name">${escapeHtml(it.name)}</div>
        ${sub ? `<div class="tc-sub">${escapeHtml(sub)}</div>` : ""}
        ${it.type ? typeBadge(it.type, true) : ""}
      </div>
      <div class="tc-status">${done ? "✓" : ""}</div>
    </div>`;
  }).join("")}</div>`;
}

/* ---------- Popup de ficha de un Pokémon del jugador ---------- */
const STAT_LBL6 = ["PS", "Ataque", "Defensa", "At. Esp.", "Def. Esp.", "Velocidad"];
function pkBarColor(v) { return v >= 100 ? "var(--ok)" : v >= 60 ? "var(--accent)" : v >= 35 ? "var(--warn)" : "var(--bad)"; }

/* localiza los datos de forma regional (abilities/tipos) a partir de "Nombre (Región)" */
function formDataFor(species) {
  if (!FORMSD || !species) return null;
  const m = String(species).match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (!m) return null;
  const base = normName(m[1]), region = normName(m[2]);
  for (const k in FORMSD) {
    const f = FORMSD[k];
    if (normName(k.split("_")[0]) === base && normName(f.region) === region) return f;
  }
  return null;
}

async function openMonPopup(mon, ctx = {}) {
  await Promise.all([loadPokedex(), loadPokedexFull(), loadMovesFull(), loadAbilities(), loadForms()]);
  const id = speciesDexId(mon.species);
  const dex = (PDEX && PDEX[id]) || null;
  const fd = formDataFor(mon.species);

  // Estadísticas base + IV/EV
  let statsHtml = "";
  if (dex && dex.st) {
    const hasIV = Array.isArray(mon.iv), hasEV = Array.isArray(mon.ev);
    const total = dex.st.reduce((a, b) => a + (b || 0), 0);
    const rows = STAT_LBL6.map((l, i) => {
      const v = dex.st[i] || 0;
      return `<tr><td class="pm-slbl">${l}</td><td class="pm-sval">${v}</td>
        <td class="pm-sbarcell"><span class="pm-bar"><span style="width:${Math.min(100, v / 2)}%;background:${pkBarColor(v)}"></span></span></td>
        ${hasIV ? `<td class="pm-iv">${mon.iv[i]}</td>` : ""}${hasEV ? `<td class="pm-ev">${mon.ev[i]}</td>` : ""}</tr>`;
    }).join("");
    statsHtml = `<table class="pm-stats"><thead><tr><th></th><th>Base</th><th></th>${hasIV ? "<th>IVs</th>" : ""}${hasEV ? "<th>EVs</th>" : ""}</tr></thead>
      <tbody>${rows}<tr class="pm-total"><td class="pm-slbl">Total</td><td class="pm-sval">${total}</td><td></td>${hasIV ? "<td></td>" : ""}${hasEV ? "<td></td>" : ""}</tr></tbody></table>`;
  }

  // Naturaleza
  const fx = NATURE_FX[mon.nature];
  const natHtml = mon.nature
    ? `<b>${escapeHtml(mon.nature)}</b>` + (fx
        ? ` <span class="pm-up">▲ ${STAT_LBL6[fx.up]}</span> <span class="pm-down">▼ ${STAT_LBL6[fx.down]}</span>`
        : ` <span class="muted">(sin efecto en stats)</span>`)
    : "—";

  // Habilidades randomizadas reales del save (abilPool/abilHidden); si no, cae al pool vanilla
  const pool = Array.isArray(mon.abilPool) ? mon.abilPool
    : (fd ? (fd.ab || []) : (dex ? (dex.ab || []) : []));
  const hidden = Array.isArray(mon.abilHidden) ? mon.abilHidden
    : (fd ? (fd.abh || []) : (dex ? (Array.isArray(dex.abh) ? dex.abh : dex.abh ? [dex.abh] : []) : []));
  const seen = new Set(), abilList = [];
  const push = (name, isHidden) => { const k = normName(name); if (!name || seen.has(k)) return; seen.add(k); abilList.push({ name, isHidden }); };
  if (mon.ability) push(mon.ability, false);
  pool.forEach((a) => push(a, false));
  hidden.forEach((a) => push(a, true));
  const abilHtml = abilList.map((a) => {
    const cur = normName(a.name) === normName(mon.ability);
    const info = abilityInfo(a.name);
    return `<button type="button" class="pm-abil${cur ? " cur" : ""}" data-abil="${escapeHtml(a.name)}"${info ? "" : " disabled"}>
      <span class="pm-abil-dot"></span><span class="pm-abil-nm">${escapeHtml(a.name)}</span>${a.isHidden ? '<span class="pm-hid">oculta</span>' : ""}${cur ? '<span class="pm-cur-tag">activa</span>' : ""}</button>`;
  }).join("");

  // Movimientos: píldoras coloreadas por tipo (mismo lenguaje que las fichas); clic -> descripción
  const movesHtml = (mon.moves || []).filter(Boolean).map((m) => {
    const nm = String(m).split("|")[0].trim();
    const info = moveInfo(nm);
    const k = info ? typeKey(info.t) : (moveTypeKey(nm) || "unknown");
    const typed = k && k !== "unknown";
    return `<button type="button" class="pm-move${typed ? " typed" : ""}" data-move="${escapeHtml(nm)}"${typed ? ` style="background:var(--type-${k})"` : ""}>
      <span class="pm-move-nm">${escapeHtml(nm)}</span>${info ? `<span class="pm-move-cat">${escapeHtml(info.cat)}</span>` : ""}</button>`;
  }).join("");

  const typesArr = fd ? fd.types : (mon.types || []);
  const t0 = typeKey(typesArr[0] || "");
  const types = typesArr.map((t) => typeBadge(t, true)).join(" ");
  const href = pokemonHref(mon.species);
  const recuerdaHref = (ctx.player && Array.isArray(mon.learnset))
    ? `jugador.html?id=${encodeURIComponent(ctx.player)}&mon=${encodeURIComponent((mon.nickname || "") + "|" + (mon.species || ""))}#recuerda`
    : null;
  const region = (String(mon.species || "").match(/\(([^)]+)\)/) || [])[1] || null;
  const evoHtml = evoChainHtml(id, region);

  const html = `<div class="pm-modal" role="dialog" aria-modal="true" style="border-top:5px solid var(--type-${t0})">
    <button type="button" class="pm-close" aria-label="Cerrar" onclick="closeMonPopup()">✕</button>
    <div class="pm-head" style="background:linear-gradient(180deg, color-mix(in srgb, var(--type-${t0}) 20%, var(--panel)), var(--panel))">
      ${spriteEl(mon, "mon-sprite pm-sprite")}
      <div class="pm-headinfo">
        <div class="pm-nick">${escapeHtml(mon.nickname || mon.species || "?")}${mon.shiny ? " " + shinyStar(14) : ""}</div>
        <div class="pm-species">${escapeHtml(mon.species || "")} <span class="pm-lvl">Nv. ${escapeHtml(mon.level ?? "?")}</span></div>
        <div class="pm-types">${types}</div>
      </div>
    </div>
    <div class="pm-grid">
      <div class="pm-col">
        <div class="pm-k">Estadísticas base</div>
        ${statsHtml || '<p class="muted">Sin datos de estadísticas.</p>'}
        ${evoHtml ? `<div class="pm-evo"><div class="pm-k">Evolución</div>${evoHtml}</div>` : ""}
      </div>
      <div class="pm-col">
        <div class="pm-tworow">
          <div class="pm-field"><div class="pm-k">Naturaleza</div><div class="pm-val">${natHtml}</div></div>
          <div class="pm-field"><div class="pm-k">Objeto</div><div class="pm-val">${mon.item ? escapeHtml(mon.item) : "—"}</div></div>
        </div>
        <div class="pm-field"><div class="pm-k">Habilidad <span class="muted">· ${mon.abilCapsule ? "randomizada con item (individual), la activa resaltada" : "aleatoria, la activa resaltada"}</span></div>
          <div class="pm-abils">${abilHtml || '<span class="muted">—</span>'}</div></div>
        <div class="pm-field"><div class="pm-k">Movimientos <span class="muted">· clic para ver qué hacen</span></div>
          <div class="pm-moves">${movesHtml || '<span class="muted">—</span>'}</div></div>
        <div class="pm-detail show" id="pmDetail"><p class="pm-detail-hint">Toca una habilidad o un movimiento para ver qué hace.</p></div>
      </div>
    </div>
    ${(recuerdaHref || href) ? `<div class="pm-foot">${recuerdaHref ? `<a href="${recuerdaHref}">Ver recuerda movimientos →</a>` : ""}${href ? `<a href="${href}">Ver ficha completa en la Pokédex →</a>` : ""}</div>` : ""}
  </div>`;

  let ov = document.getElementById("pmOverlay");
  if (!ov) { ov = document.createElement("div"); ov.id = "pmOverlay"; ov.className = "pm-overlay"; document.body.appendChild(ov); }
  ov.innerHTML = html;
  ov.classList.add("show");
  ov.onclick = (e) => { if (e.target === ov) closeMonPopup(); };
  document.addEventListener("keydown", pmEsc);

  // interacción: movimientos y habilidades muestran descripción
  const detail = ov.querySelector("#pmDetail");
  ov.querySelectorAll(".pm-move").forEach((b) => b.addEventListener("click", () => {
    ov.querySelectorAll(".pm-move,.pm-abil").forEach((x) => x.classList.remove("sel"));
    b.classList.add("sel");
    const info = moveInfo(b.dataset.move);
    if (!info) { detail.innerHTML = `<b>${escapeHtml(b.dataset.move)}</b><p class="muted">Sin datos del movimiento.</p>`; detail.classList.add("show"); return; }
    const k = typeKey(info.t);
    detail.innerHTML = `<div class="pm-detail-head"><b>${escapeHtml(info.n)}</b>
      <span class="type-badge sm" style="background:var(--type-${k})">${escapeHtml(info.t)}</span>
      <span class="pm-chip">${escapeHtml(info.cat)}</span></div>
      <div class="pm-detail-stats"><span>Poder <b>${info.pow ?? "—"}</b></span><span>Precisión <b>${info.acc ?? "—"}</b></span><span>PP <b>${info.pp ?? "—"}</b></span></div>
      <p class="pm-detail-desc">${escapeHtml(info.fl || "")}</p>`;
    detail.classList.add("show");
  }));
  ov.querySelectorAll(".pm-abil:not([disabled])").forEach((b) => b.addEventListener("click", () => {
    ov.querySelectorAll(".pm-move,.pm-abil").forEach((x) => x.classList.remove("sel"));
    b.classList.add("sel");
    const info = abilityInfo(b.dataset.abil);
    detail.innerHTML = `<div class="pm-detail-head"><b>${escapeHtml(b.dataset.abil)}</b></div>
      <p class="pm-detail-desc">${escapeHtml(info ? info.fl : "")}</p>`;
    detail.classList.add("show");
  }));
}
function closeMonPopup() {
  const ov = document.getElementById("pmOverlay");
  if (ov) ov.classList.remove("show");
  document.removeEventListener("keydown", pmEsc);
}
function pmEsc(e) { if (e.key === "Escape") closeMonPopup(); }

/* Registro de mons para abrir el popup por índice (evita serializar en el DOM) */
const MON_REG = [];
function registerMon(mon, ctx) { MON_REG.push({ mon, ctx: ctx || {} }); return MON_REG.length - 1; }
document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-monopen]");
  if (!t) return;
  e.preventDefault();
  const r = MON_REG[+t.dataset.monopen];
  if (r) openMonPopup(r.mon, r.ctx);
});

/* spriteId de la forma regional de una especie (por nombre + región), o null */
function formSpriteFor(baseName, region) {
  if (!FORMSD || !region) return null;
  const b = normName(baseName), r = normName(region);
  for (const k in FORMSD) { const f = FORMSD[k]; if (f.spriteId && normName(k.split("_")[0]) === b && normName(f.region) === r) return f.spriteId; }
  return null;
}

/* Cadena evolutiva completa (misma lógica que pokemon.html) usando PDEX; "" si no hay.
   region = forma regional del Pokémon actual, para mostrar los sprites correctos. */
function evoChainHtml(id, region) {
  const dex = PDEX; if (!dex || !dex[id]) return "";
  const p = dex[id];
  if (!p.pe && !(p.em && p.em.length)) return "";
  const spr = (eid, name) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${formSpriteFor(name, region) || eid}.png`;
  const evoMon = (eid, name, how, cur) => {
    const inner = `${eid ? `<img src="${spr(eid, name)}" alt="" loading="lazy">` : `<div class="evo-q">?</div>`}<div class="evo-nm">${escapeHtml(name)}</div>${how ? `<div class="evo-how">${escapeHtml(how)}</div>` : ""}`;
    return eid ? `<a class="evo-mon${cur ? " cur" : ""}" href="pokemon.html?id=${eid}">${inner}</a>` : `<span class="evo-mon">${inner}</span>`;
  };
  const evosOf = (pid) => {
    const q = dex[pid]; if (!q || !q.em) return [];
    const map = new Map();
    for (const e of q.em) { const k = e.toId || ("n:" + e.to); if (!map.has(k)) map.set(k, { toId: e.toId, to: e.to, hows: [] }); const g = map.get(k); if (!g.hows.includes(e.how)) g.hows.push(e.how); }
    return [...map.values()].map((x) => ({ toId: x.toId, to: x.to, how: x.hows.join(" / ") }));
  };
  let root = id, guard = 0;
  while (dex[root] && dex[root].pe && guard++ < 12) root = dex[root].pe.id;
  const stages = []; let frontier = [{ id: root, name: dex[root] ? dex[root].n : p.n, how: "" }];
  const seen = new Set(); let depth = 0;
  while (frontier.length && depth++ < 8) {
    stages.push(frontier);
    const next = [];
    for (const node of frontier) { if (node.id == null || seen.has(node.id)) continue; seen.add(node.id); for (const e of evosOf(node.id)) next.push({ id: e.toId, name: e.to, how: e.how }); }
    frontier = next;
  }
  const col = (st) => `<span class="evo-col">${st.map((n) => evoMon(n.id, n.name, n.how, n.id === id)).join("")}</span>`;
  return `<div class="evo-line">${stages.map(col).join(`<span class="evo-arrow">→</span>`)}</div>`;
}

/* Modal ligero con la info completa de un movimiento */
async function openMoveInfo(name) {
  await loadMovesFull();
  const info = moveInfo(name);
  const k = info ? typeKey(info.t) : "unknown";
  const body = info
    ? `<div class="mi-tags"><span class="type-badge sm" style="background:var(--type-${k})">${escapeHtml(info.t)}</span><span class="pm-chip">${escapeHtml(info.cat)}</span></div>
       <div class="mi-stats"><span>Poder <b>${info.pow ?? "—"}</b></span><span>Precisión <b>${info.acc ?? "—"}</b></span><span>PP <b>${info.pp ?? "—"}</b></span></div>
       <p class="mi-desc">${escapeHtml(info.fl || "")}</p>`
    : `<p class="muted">Sin datos del movimiento.</p>`;
  const html = `<div class="mi-modal" role="dialog" aria-modal="true" style="border-top:5px solid var(--type-${k})">
    <button type="button" class="pm-close" aria-label="Cerrar" onclick="closeMoveInfo()">✕</button>
    <div class="mi-name">${escapeHtml(info ? info.n : name)}</div>
    ${body}</div>`;
  let ov = document.getElementById("miOverlay");
  if (!ov) { ov = document.createElement("div"); ov.id = "miOverlay"; ov.className = "pm-overlay"; document.body.appendChild(ov); }
  ov.innerHTML = html;
  ov.classList.add("show");
  ov.onclick = (e) => { if (e.target === ov) closeMoveInfo(); };
  document.addEventListener("keydown", miEsc);
}
function closeMoveInfo() { const ov = document.getElementById("miOverlay"); if (ov) ov.classList.remove("show"); document.removeEventListener("keydown", miEsc); }
function miEsc(e) { if (e.key === "Escape") closeMoveInfo(); }

function monCard(mon, opts = {}) {
  const dead = opts.dead;
  const types = (mon.types || []).map((t) => typeBadge(t, true)).join("");
  const moves = (mon.moves || []).filter(Boolean).slice(0, 4)
    .map((m) => {
      const parts = String(m).split("|");
      const nm = parts[0].trim();
      // tipo: explícito "Nombre|Tipo" tiene prioridad; si no, se busca automáticamente
      const key = parts[1] ? typeKey(parts[1].trim()) : moveTypeKey(nm);
      if (key && key !== "unknown") return `<span class="mon-move typed" style="background:var(--type-${key})" title="${escapeHtml(nm)}">${escapeHtml(nm)}</span>`;
      return `<span class="mon-move" title="${escapeHtml(nm)}">${escapeHtml(nm)}</span>`;
    }).join("");
  const shiny = mon.shiny ? `<span class="pill shiny" style="padding:.02rem .45rem;font-size:.58rem">${shinyStar(11)} SHINY</span>` : "";
  const owner = opts.owner ? `<div class="mon-owner">de ${escapeHtml(opts.owner)}</div>` : "";
  const mi = registerMon(mon, { player: opts.player });
  const sprite = `<a href="#" class="mon-open" data-monopen="${mi}" title="Ver ficha detallada">${spriteEl(mon)}</a>`;
  const speciesHtml = `<a href="#" class="mon-open" data-monopen="${mi}" style="color:inherit">${escapeHtml(mon.species || "?")}</a>`;
  return `
    <div class="mon-card${dead ? " dead" : ""}">
      ${dead ? `<span class="mon-dead-badge" title="Debilitado">${faintIcon(22)}</span>` : ""}
      <div class="mon-top">
        ${sprite}
        <div class="mon-id grow">
          <div class="mon-nick">${escapeHtml(mon.nickname || "—")} ${shiny}</div>
          <div class="mon-species">${speciesHtml}</div>
          ${owner}
          <div class="mon-types">${types}</div>
        </div>
        <div class="mon-lvl">Nv.${escapeHtml(mon.level ?? "?")}</div>
      </div>
      <dl class="mon-meta">
        ${mon.ability ? `<div><dt>Habilidad</dt><dd>${escapeHtml(mon.ability)}</dd></div>` : ""}
        ${mon.nature ? `<div><dt>Natur.</dt><dd>${escapeHtml(mon.nature)}</dd></div>` : ""}
        ${mon.item ? `<div><dt>Objeto</dt><dd>${escapeHtml(mon.item)}</dd></div>` : ""}
      </dl>
      ${moves ? `<div class="mon-moves">${moves}</div>` : ""}
      ${dead && (mon.cause || mon.route) ? `<div class="muted" style="font-size:.72rem;border-top:1px solid var(--border);padding-top:.35rem;display:flex;align-items:center;gap:.3rem">${faintIcon(13)}<span>${escapeHtml(mon.cause || "Debilitado")}${mon.route ? " · " + escapeHtml(mon.route) : ""}${mon.date ? " · " + escapeHtml(mon.date) : ""}</span></div>` : ""}
    </div>`;
}

/* ---------- Cálculos de estado ---------- */
/* extraDeaths = muertes que ya no están en el cementerio porque el Pokémon fue
   revivido con Ceniza Sagrada; la vida sigue consumida aunque el juego borre el rastro. */
function playerStats(pdata, extraDeaths = 0) {
  const alive = (pdata.team || []).length + (pdata.box || []).length;
  const dead = (pdata.graveyard || []).length; // los que están en el cementerio ahora
  const extra = Number(extraDeaths) || 0;       // revividos con ceniza (la vida sigue gastada)
  const used = (pdata.livesUsed ?? dead) + extra;
  const livesLeft = Math.max(0, (pdata.lives ?? 30) - used);
  return { alive, dead, revived: extra, used, livesLeft, lives: pdata.lives ?? 30, eliminated: livesLeft <= 0 && used > 0 };
}

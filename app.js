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
  { href: "torneos.html", label: "Torneos" },
  { href: "reglas.html", label: "Reglas" },
];

function renderHeader(active) {
  const theme = document.documentElement.getAttribute("data-theme");
  const links = NAV.map(
    (n) => `<a href="${n.href}"${n.href === active ? ' class="active"' : ""}>${n.label}</a>`
  ).join("");
  const html = `
    <div class="bar">
      <a class="brand" href="index.html">${pokeball("#ee1515", 26)} <span>Añil</span> <span class="muted" style="font-weight:600;font-size:.8rem;color:#8b95a5">Randomlocke</span></a>
      <nav>${links}</nav>
      <button id="theme-toggle" class="theme-toggle" type="button" title="Cambiar tema" onclick="toggleTheme()">${themeIcon(theme)}</button>
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

/* Fila de mini-sprites del equipo (para tarjetas de jugador) */
function teamSpritesRow(team) {
  if (!team || !team.length) return `<div class="team-mini muted" style="font-size:.72rem">Sin equipo</div>`;
  return `<div class="team-mini">${team.slice(0, 6).map((m) => {
    const ini = initials(m.species || m.nickname);
    const ani = speciesAniSprite(m.species), stat = speciesSprite(m.species);
    const primary = m.sprite || ani || stat;
    if (!primary) return `<span class="team-mini-x" title="${escapeHtml(m.nickname || "")}">${escapeHtml(ini)}</span>`;
    const fb = JSON.stringify([m.sprite ? ani : null, stat].filter((u) => u && u !== primary));
    const title = escapeHtml((m.nickname || "") + (m.species ? " (" + m.species + ")" : ""));
    return `<img src="${escapeHtml(primary)}" alt="" title="${title}" loading="lazy" data-fb='${fb}' data-ini="${escapeHtml(ini)}" data-fbclass="team-mini-x" onerror="imgFallback(this)">`;
  }).join("")}</div>`;
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
  return `
    <div class="mon-card${dead ? " dead" : ""}">
      ${dead ? `<span class="mon-dead-badge" title="Debilitado">${faintIcon(22)}</span>` : ""}
      <div class="mon-top">
        ${spriteEl(mon)}
        <div class="mon-id grow">
          <div class="mon-nick">${escapeHtml(mon.nickname || "—")} ${shiny}</div>
          <div class="mon-species">${escapeHtml(mon.species || "?")}</div>
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
function playerStats(pdata) {
  const alive = (pdata.team || []).length + (pdata.box || []).length;
  const dead = (pdata.graveyard || []).length;
  const livesLeft = Math.max(0, (pdata.lives ?? 30) - (pdata.livesUsed ?? dead));
  return { alive, dead, livesLeft, lives: pdata.lives ?? 30, eliminated: livesLeft <= 0 && (pdata.livesUsed ?? dead) > 0 };
}

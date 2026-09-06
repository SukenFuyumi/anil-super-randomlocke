'use strict';
/*
 * anil-roster.js — Reúne el "pool" jugable de un participante del Super Randomlocke
 * y lo deja listo para armar equipo de torneo (singles 6v6, nivel 50, carta abierta).
 *
 * Une dos fuentes:
 *   1) El save .rxdata (fuente más fresca; sólo disponible para TU partida local), o
 *   2) data/players/<id>.json (lo que ya está sincronizado en la web; sirve para
 *      cualquier participante).
 * y lo cruza con los datos del repo (pokedex, formas, movimientos, habilidades, tipos).
 *
 * Para cada Pokémon VIVO (equipo + cajas, se excluye el cementerio) calcula:
 *   - identidad, tipos, y si puede Mega-evolucionar (por la piedra que lleva).
 *   - estadísticas a NIVEL 50 con sus IVs/EVs/naturaleza reales (base y, si aplica, mega).
 *   - el movepool CONSTRUIBLE (movimientos actuales ∪ learnset randomizado ∪ MTs),
 *     anotado con tipo/categoría/poder/precisión — porque en randomlocke los sets NO son
 *     los estándar: sólo importa lo que ESE Pokémon puede aprender en ESTA partida.
 *   - las habilidades posibles (el juego randomiza una; con el item Randomizador es individual).
 *
 * Uso:
 *   node scripts/anil-roster.js [--player suken] [--save "ruta/Partida 5.rxdata"] [--slot 5]
 *                               [--source save|json] [--out roster.json]
 * Sin argumentos: intenta el save local más reciente para --player suken; si no hay, cae al JSON.
 * Salida: JSON por stdout (o a --out). El modelo lo lee para razonar el equipo.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

// ---- localizar la raíz del repo (sube hasta encontrar data/config.json) ----
function findRepo(start) {
  let d = start;
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(d, 'data', 'config.json')) && fs.existsSync(path.join(d, 'companion'))) return d;
    const up = path.dirname(d);
    if (up === d) break; d = up;
  }
  return process.cwd();
}
const REPO = findRepo(process.cwd());
const load = p => JSON.parse(fs.readFileSync(path.join(REPO, p), 'utf8'));

// ---- args ----
const args = process.argv.slice(2);
const arg = (name, def) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : def; };
const playerId = arg('player', 'suken');
const source = arg('source', 'auto');       // auto | save | json
const explicitSave = arg('save', null);
const slot = arg('slot', null);
const outPath = arg('out', null);

// ---- datos del repo ----
const PDEX = load('data/pokedex.json');       // { id: {n,t,st,ab,abh,...} }
const FORMS = load('data/forms-dex.json');     // { id: [ {n,k,t,st,ab,abh,spr,stone,region} ] }
const MOVES = load('data/moves.json');         // { norm名: {n,id,t,cat,pow,acc,pp,fl} }
const TYPECHART = load('data/types-chart.json'); // { typekeyEN: {weak,resist,immune} }

const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

// nombre visible de especie -> id nacional
const NAME2ID = {};
for (const id in PDEX) NAME2ID[norm(PDEX[id].n)] = +id;

// movimiento (nombre visible) -> objeto de datos
const MOVE_BY_NAME = {};
for (const k in MOVES) MOVE_BY_NAME[norm(MOVES[k].n)] = MOVES[k];
const moveData = nm => MOVE_BY_NAME[norm(String(nm).split('|')[0])] || null;

// naturalezas: qué stat sube (+10%) y baja (-10%). índice 0..5 = [PS,Atk,Def,SpA,SpD,Vel]
const NATURE_FX = {
  'Huraña': [1, 2], 'Audaz': [1, 5], 'Firme': [1, 3], 'Pícara': [1, 4],
  'Osada': [2, 1], 'Plácida': [2, 5], 'Agitada': [2, 3], 'Floja': [2, 4],
  'Miedosa': [5, 1], 'Activa': [5, 2], 'Alegre': [5, 3], 'Ingenua': [5, 4],
  'Modesta': [3, 1], 'Afable': [3, 2], 'Mansa': [3, 4], 'Alocada': [3, 5],
  'Serena': [4, 1], 'Amable': [4, 2], 'Grosera': [4, 5], 'Cauta': [4, 3],
  // sin efecto: Fuerte, Dócil, Seria, Tímida, Rara
};
const STAT_LBL = ['PS', 'Ataque', 'Defensa', 'At.Esp', 'Def.Esp', 'Velocidad'];

const LEVEL = 50;
function statsAtLevel(base, iv, ev, natureName, level = LEVEL) {
  iv = iv || [0, 0, 0, 0, 0, 0]; ev = ev || [0, 0, 0, 0, 0, 0];
  const fx = NATURE_FX[natureName]; // [upIdx, downIdx]
  return base.map((b, i) => {
    const core = Math.floor((2 * b + (iv[i] || 0) + Math.floor((ev[i] || 0) / 4)) * level / 100);
    if (i === 0) return core + level + 10; // PS
    let v = core + 5;
    if (fx) { if (i === fx[0]) v = Math.floor(v * 1.1); else if (i === fx[1]) v = Math.floor(v * 0.9); }
    return v;
  });
}

// tipos ES -> clave EN (para types-chart.json)
const TYPE_EN = { normal: 'normal', fuego: 'fire', agua: 'water', planta: 'grass', electrico: 'electric', hielo: 'ice', lucha: 'fighting', veneno: 'poison', tierra: 'ground', volador: 'flying', psiquico: 'psychic', bicho: 'bug', roca: 'rock', fantasma: 'ghost', dragon: 'dragon', siniestro: 'dark', acero: 'steel', hada: 'fairy' };
const typeEn = t => TYPE_EN[norm(t)] || norm(t);
const EN2ES = { normal: 'Normal', fire: 'Fuego', water: 'Agua', grass: 'Planta', electric: 'Eléctrico', ice: 'Hielo', fighting: 'Lucha', poison: 'Veneno', ground: 'Tierra', flying: 'Volador', psychic: 'Psíquico', bug: 'Bicho', rock: 'Roca', ghost: 'Fantasma', dragon: 'Dragón', dark: 'Siniestro', steel: 'Acero', fairy: 'Hada' };
const esType = en => EN2ES[en] || en;

// debilidades combinadas de un conjunto de tipos (etiquetas en español + multiplicador)
function defensiveProfile(typesEs) {
  const mult = {};
  for (const atkEn of Object.keys(TYPECHART)) mult[atkEn] = 1;
  for (const defEs of typesEs) {
    const row = TYPECHART[typeEn(defEs)]; if (!row) continue;
    for (const a of (row.weak || [])) mult[a] *= 2;
    for (const a of (row.resist || [])) mult[a] *= 0.5;
    for (const a of (row.immune || [])) mult[a] *= 0;
  }
  const weak = [], resist = [], immune = [];
  for (const a in mult) { if (mult[a] === 0) immune.push(esType(a)); else if (mult[a] > 1) weak.push([esType(a), mult[a]]); else if (mult[a] < 1) resist.push([esType(a), mult[a]]); }
  return { weak: weak.sort((x, y) => y[1] - x[1]), resist, immune };
}

// resolver especie visible ("Ninetales (Alola)") -> {id, view: base|regional, formData?}
function resolveSpecies(speciesStr) {
  const m = String(speciesStr).match(/^(.*?)\s*(?:\(([^)]+)\))?$/);
  const baseName = (m ? m[1] : speciesStr).trim();
  const region = m && m[2] ? m[2].trim() : null;
  const id = NAME2ID[norm(baseName)] || null;
  let formData = null;
  if (id && region && FORMS[id]) formData = FORMS[id].find(f => f.k === 'regional' && norm(f.region) === norm(region)) || null;
  return { id, baseName, region, formData };
}

// mega que habilita una piedra (item) para una especie dada
function megaFor(id, itemName) {
  if (!id || !itemName || !FORMS[id]) return null;
  const it = norm(itemName);
  return FORMS[id].find(f => f.k === 'mega' && f.stone && norm(f.stone) === it) || null;
}

// ---- obtener el roster crudo (save o json) ----
function readFromSave(buf) {
  const { extract } = require(path.join(REPO, 'companion', 'extract.js'));
  let mapNames = null; try { mapNames = require(path.join(REPO, 'companion', 'map-names.json')); } catch (e) {}
  return extract(buf, playerId, { mapNames });
}
function findSaveFile() {
  if (explicitSave) return explicitSave;
  const folder = path.join(os.homedir(), 'AppData', 'Roaming', 'Pokemon Anil');
  if (!fs.existsSync(folder)) return null;
  if (slot) { const p = path.join(folder, `Partida ${slot}.rxdata`); return fs.existsSync(p) ? p : null; }
  const cands = fs.readdirSync(folder).filter(f => /^Partida \d+\.rxdata$/.test(f))
    .map(f => ({ f, m: fs.statSync(path.join(folder, f)).mtimeMs })).sort((a, b) => b.m - a.m);
  return cands.length ? path.join(folder, cands[0].f) : null;
}

let raw, usedSource;
if (source !== 'json') {
  const sf = findSaveFile();
  if (sf && fs.existsSync(sf)) { try { raw = readFromSave(fs.readFileSync(sf)); usedSource = 'save:' + path.basename(sf); } catch (e) { if (source === 'save') { console.error('Error leyendo save:', e.message); process.exit(1); } } }
  else if (source === 'save') { console.error('No encontré el save. Usa --save "ruta" o --slot N.'); process.exit(1); }
}
if (!raw) { raw = load(`data/players/${playerId}.json`); usedSource = `json:data/players/${playerId}.json`; }

// ---- enriquecer cada Pokémon vivo ----
function enrich(mon) {
  const { id, baseName, region, formData } = resolveSpecies(mon.species);
  const dex = id ? PDEX[id] : null;
  // stats/tipos/habilidades base efectivos (forma regional sobreescribe)
  const baseSt = formData ? formData.st : (dex ? dex.st : null);
  const typesEs = mon.types && mon.types.length ? mon.types : (formData ? formData.t : (dex ? dex.t : []));
  const lvl50 = baseSt ? statsAtLevel(baseSt, mon.iv, mon.ev, mon.nature) : null;

  // mega (si lleva la piedra)
  const mega = megaFor(id, mon.item);
  const megaBlock = mega ? {
    name: mega.n, types: mega.t, ability: (mega.ab && mega.ab[0]) || null,
    baseStats: mega.st, lvl50Stats: statsAtLevel(mega.st, mon.iv, mon.ev, mon.nature),
    defense: defensiveProfile(mega.t),
  } : null;

  // movepool construible: actuales ∪ learnset ∪ MTs (únicos), anotados
  const names = new Set();
  (mon.moves || []).forEach(x => names.add(String(x).split('|')[0].trim()));
  (mon.learnset || []).forEach(x => names.add(x.m));
  (mon.tmMoves || []).forEach(x => names.add(x));
  const movepool = [...names].filter(Boolean).map(nm => {
    const d = moveData(nm);
    return d ? { n: d.n, t: d.t, cat: d.cat, pow: d.pow, acc: d.acc, pp: d.pp } : { n: nm, t: null, cat: null, pow: null, acc: null, pp: null };
  }).sort((a, b) => (b.pow || 0) - (a.pow || 0));

  // habilidades posibles
  const abilPool = (mon.abilPool && mon.abilPool.length) ? mon.abilPool : (dex ? (dex.ab || []) : []);
  const abilHidden = (mon.abilHidden && mon.abilHidden.length) ? mon.abilHidden : (dex ? (Array.isArray(dex.abh) ? dex.abh : dex.abh ? [dex.abh] : []) : []);

  return {
    nickname: mon.nickname, species: mon.species, id,
    types: typesEs, nature: mon.nature, item: mon.item || null,
    activeAbility: mon.ability || null,
    abilityOptions: { normal: abilPool, hidden: abilHidden, individualRandomized: !!mon.abilCapsule },
    baseStats: baseSt, lvl50Stats: lvl50, statLabels: STAT_LBL,
    bst: baseSt ? baseSt.reduce((a, b) => a + b, 0) : null,
    speed50: lvl50 ? lvl50[5] : null,
    defense: defensiveProfile(typesEs),
    canMega: !!mega, mega: megaBlock,
    ivs: mon.iv || null, evs: mon.ev || null,
    movepool,
  };
}

const alive = [...(raw.team || []), ...(raw.box || [])];
const pool = alive.map(enrich);

const out = {
  player: raw.name || playerId,
  playerId,
  source: usedSource,
  format: 'Singles 6v6 · Nivel 50 · Carta abierta (open team sheet)',
  generatedAt: new Date().toISOString(),
  poolSize: pool.length,
  graveyardCount: (raw.graveyard || []).length,
  note: 'Randomlocke: habilidades, learnsets y compatibilidad de MTs son aleatorios en esta partida. El movepool listado es lo REALMENTE construible para cada Pokémon (elige 4). Stats calculadas a nivel 50 con IV/EV/naturaleza reales.',
  pool,
};

const json = JSON.stringify(out, null, 2);
if (outPath) { fs.writeFileSync(outPath, json); console.error(`Roster de ${out.player} (${pool.length} Pokémon vivos) -> ${outPath} [${usedSource}]`); }
else process.stdout.write(json);

'use strict';
// Convierte un save .rxdata de Pokémon Añil (Essentials v21) al formato JSON de la web.
const { parse, RSymbol } = require('./marshal.js');
const MOVES_ES = require('./move-es.json');
const TYPES = require('./pokemon-types.json');
const ABILITIES_ES = require('./ability-es.json');
const ITEMS_ES = require('./item-es.json');

const NATURES = { HARDY:'Fuerte',LONELY:'Huraña',BRAVE:'Audaz',ADAMANT:'Firme',NAUGHTY:'Pícara',BOLD:'Osada',DOCILE:'Dócil',RELAXED:'Plácida',IMPISH:'Agitada',LAX:'Floja',TIMID:'Miedosa',HASTY:'Activa',SERIOUS:'Seria',JOLLY:'Alegre',NAIVE:'Ingenua',MODEST:'Modesta',MILD:'Afable',QUIET:'Mansa',BASHFUL:'Tímida',RASH:'Alocada',CALM:'Serena',GENTLE:'Amable',SASSY:'Grosera',CAREFUL:'Cauta',QUIRKY:'Rara' };

const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
const hget = (h, key) => { if (!h || !h.__isHash) return undefined; for (const [k, v] of h.entries()) { const kn = (k instanceof RSymbol) ? k.name : (Buffer.isBuffer(k) ? k.toString('utf8') : String(k)); if (kn === key) return v; } };
const iv = (o, n) => o && o.ivars ? o.ivars[n] : undefined;
const sname = s => s instanceof RSymbol ? s.name : (Buffer.isBuffer(s) ? s.toString('utf8') : (s == null ? null : String(s)));

function pretty(sym) {
  if (!sym) return '';
  return String(sym).toLowerCase().split(/[_\s]+/).map(w => w ? w[0].toUpperCase() + w.slice(1) : '').join(' ');
}
const moveName = sym => sym ? (MOVES_ES[norm(sym)] || pretty(sym)) : null;
const speciesTypes = sym => TYPES[norm(sym)] || [];
const abilityName = sym => sym ? (ABILITIES_ES[norm(sym)] || pretty(sym)) : '';
const itemName = sym => sym ? (ITEMS_ES[norm(sym)] || pretty(sym)) : '';

function mon(p) {
  const species = sname(iv(p, '@species'));
  const nick = sname(iv(p, '@name'));
  const moves = (iv(p, '@moves') || []).map(m => moveName(m && m.ivars ? sname(m.ivars['@id']) : sname(m))).filter(Boolean);
  return {
    nickname: nick || pretty(species),
    species: pretty(species),
    level: iv(p, '@level') ?? null,
    types: speciesTypes(species),
    ability: abilityName(sname(iv(p, '@ability'))),
    nature: NATURES[sname(iv(p, '@nature'))] || pretty(sname(iv(p, '@nature'))),
    item: itemName(sname(iv(p, '@item'))),
    shiny: !!iv(p, '@shiny'),
    moves,
  };
}

// zonas de captura (mismas reglas que gen-routes.js / config.routes)
const SLUG = n => n.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const ENC_RE = /(ruta|bosque|monte|cueva|t[uú]nel|zona safari|safari|isla|caminos|catarata|central energ|roca|mansi[oó]n|torre|calle victoria|meseta|volc[aá]n|islas espuma|ciudad|pueblo)/i;
const ENC_INT = /(casa|gimnasio|centro pok|tienda|laboratorio|liga|barco|guarida|museo|club|intro|ss anne|s\.s\.)/i;
const CITY_RE = /(ciudad|pueblo|isla canela)/i;

function extract(buf, playerId, opts = {}) {
  const mapNames = opts.mapNames || null; // { "3": "Ruta 3", ... } opcional
  const mapName = id => (mapNames && id != null && mapNames[String(id)]) || '';
  const routeSlug = id => { const n = mapName(id); if (!n) return null; return (ENC_RE.test(n) && !ENC_INT.test(n)) ? SLUG(n) : null; };
  const { root } = parse(buf);
  const player = hget(root, 'player');
  const gm = hget(root, 'global_metadata');
  const storage = hget(root, 'storage_system');
  const stats = hget(root, 'stats');

  const party = iv(player, '@party') || [];
  const boxes = iv(storage, '@boxes') || [];

  const team = [], box = [], graveyard = [];
  const captures = [];       // lista COMPLETA de todo lo obtenido
  const routesVisited = {};
  // categoría de obtención
  const categoryOf = (p) => {
    const method = iv(p, '@obtain_method'); // 0 met, 1 huevo, 2 intercambio, 4 evento
    if (method === 1) return 'huevo';
    if (method === 2) return 'intercambio';
    if (method === 4) return 'don_prodigio';
    const name = mapName(iv(p, '@obtain_map'));
    if (name && ENC_RE.test(name) && !ENC_INT.test(name)) return CITY_RE.test(name) ? 'ciudad' : 'salvaje';
    return 'estatico_regalo'; // método 0 en interior/mapa especial
  };
  const recordCapture = (p, dead) => {
    const oid = iv(p, '@obtain_map');
    const slug = routeSlug(oid);
    if (slug) routesVisited[slug] = true;
    captures.push({
      route: slug || '',
      where: mapName(oid) || '',
      species: pretty(sname(iv(p, '@species'))),
      nickname: sname(iv(p, '@name')) || '',
      shiny: !!iv(p, '@shiny'),
      status: dead ? 'dead' : 'captured',
      category: categoryOf(p),
      level: iv(p, '@obtain_level') ?? iv(p, '@level') ?? null,
      mon: pretty(sname(iv(p, '@species'))), // compat con web/matriz antiguos
    });
  };
  const pushMon = (p, where) => {
    if (!p) return;
    const dead = iv(p, '@perma_faint') === true;
    recordCapture(p, dead);
    if (dead) {
      const m = mon(p); m.cause = ''; m.route = mapName(iv(p, '@obtain_map')); m.date = '';
      graveyard.push(m);
    } else if (where === 'party') team.push(mon(p));
    else box.push(mon(p));
  };
  party.forEach(p => pushMon(p, 'party'));
  boxes.forEach(b => (iv(b, '@pokemon') || []).forEach(p => pushMon(p, 'box')));

  // rutas visitadas desde visitedMaps (índice = id de mapa, valor true)
  const vm = iv(gm, '@visitedMaps');
  if (Array.isArray(vm)) vm.forEach((v, id) => { if (v) { const s = routeSlug(id); if (s) routesVisited[s] = true; } });

  const badges = iv(player, '@badges') || [];
  const gyms = {};
  badges.forEach((b, i) => { if (b) gyms['gym' + (i + 1)] = true; });

  const money = iv(player, '@money') || 0;
  const playSecs = Math.round(iv(stats, '@play_time') || 0);
  const gameLives = iv(gm, '@challenge_lives');
  const hh = Math.floor(playSecs / 3600), mm = Math.floor((playSecs % 3600) / 60);

  return {
    id: playerId,
    name: sname(iv(player, '@name')) || playerId,
    lives: 30,
    livesUsed: graveyard.length,
    champion: badges.filter(Boolean).length >= 8,
    notes: `Importado del save · ${hh}h ${mm}m jugadas · ${money.toLocaleString('es')}₽ · vidas en el juego: ${gameLives ?? '?'}`,
    team, box, graveyard,
    captures,
    progress: { gyms, bosses: {}, npcs: {}, routes: routesVisited, items: {} },
  };
}

module.exports = { extract };

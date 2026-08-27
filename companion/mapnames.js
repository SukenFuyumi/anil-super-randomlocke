'use strict';
/* Genera map-names.json (id de mapa -> nombre) a partir del MapInfos.rxdata del juego.
   Uso:  node mapnames.js "ruta\al\Data\MapInfos.rxdata"  [salida.json]
   El MapInfos de RPG Maker XP es un Hash { id => RPG::MapInfo(@name, @parent_id, @order) }. */
const fs = require('fs');
const { parse, RSymbol } = require('./marshal.js');

const src = process.argv[2];
const out = process.argv[3] || 'map-names.json';
if (!src) { console.error('Uso: node mapnames.js <MapInfos.rxdata> [salida.json]'); process.exit(1); }

const { root } = parse(fs.readFileSync(src));
if (!root || !root.__isHash) { console.error('No es un MapInfos válido (se esperaba un Hash).'); process.exit(1); }

const iv = (o, n) => o && o.ivars ? o.ivars[n] : undefined;
const str = v => Buffer.isBuffer(v) ? v.toString('utf8') : (v instanceof RSymbol ? v.name : (v == null ? '' : String(v)));

const map = {};
for (const [k, info] of root.entries()) {
  const id = typeof k === 'number' ? k : parseInt(str(k), 10);
  const name = str(iv(info, '@name'));
  if (!isNaN(id) && name) map[id] = name;
}
fs.writeFileSync(out, JSON.stringify(map, null, 0));
console.log('Escrito ' + out + ' con ' + Object.keys(map).length + ' mapas.');
const sample = Object.entries(map).slice(0, 12).map(([k, v]) => k + '=' + v).join('  |  ');
console.log('Ejemplos: ' + sample);

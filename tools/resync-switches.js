'use strict';
/* ============================================================================
   Re-sincroniza los switches de bosses/NPCs de data/config.json con el juego.

   ¿Para qué? Cada boss/NPC del tracker se detecta por un SWITCH GLOBAL del juego
   (p. ej. "Giovanni vencido"). En config.json guardamos su NÚMERO (`switch`) y su
   NOMBRE (`switchName`). Si Eric publica una update oficial y añade/quita/reordena
   switches en System.rxdata, los NÚMEROS se desplazan y el mapeo se rompe.

   Este script vuelve a leer System.rxdata de la versión nueva, busca cada boss/NPC
   por su `switchName` (el nombre humano, que no cambia) y reescribe el `switch`
   con el índice correcto. Así, tras una update oficial, un solo comando re-alinea
   todo — no hay que revisar números a mano.

   Uso:
     node tools/resync-switches.js                 # usa la ruta por defecto del juego
     node tools/resync-switches.js --game "RUTA"   # apunta a otra instalación
     node tools/resync-switches.js --dry           # solo muestra cambios, no escribe
     ANIL_GAME_DIR=... node tools/resync-switches.js

   La primera vez (bootstrap): si un boss/NPC tiene `switch` pero no `switchName`,
   toma el nombre del switch actual y lo guarda, dejándolo listo para el futuro.
   ============================================================================ */
const fs = require('fs');
const path = require('path');
const { parse, RSymbol } = require('../companion/marshal.js');

const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const gi = args.indexOf('--game');
const GAME_DIR = (gi >= 0 && args[gi + 1]) || process.env.ANIL_GAME_DIR ||
  'E:/Pokemon Super añil randomlocke/Pokemon Anil V4.13';
const SYSTEM = path.join(GAME_DIR, 'Data', 'System.rxdata');
const CONFIG = path.join(__dirname, '..', 'data', 'config.json');

const norm = s => String(s || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function readSwitchNames() {
  if (!fs.existsSync(SYSTEM)) {
    console.error('No encuentro System.rxdata en:\n  ' + SYSTEM +
      '\nApunta al juego con --game "RUTA" o la variable ANIL_GAME_DIR.');
    process.exit(1);
  }
  const { root } = parse(fs.readFileSync(SYSTEM));
  const arr = root && root.ivars ? root.ivars['@switches'] : null;
  if (!Array.isArray(arr)) { console.error('System.rxdata no tiene @switches (¿versión rara?).'); process.exit(1); }
  const byIndex = {};      // idx -> nombre
  const byName = new Map(); // nombre normalizado -> idx (primer match)
  arr.forEach((n, i) => {
    const s = Buffer.isBuffer(n) ? n.toString('utf8') : (n == null ? '' : String(n));
    if (!s.trim()) return;
    byIndex[i] = s;
    const k = norm(s);
    if (!byName.has(k)) byName.set(k, i);
  });
  return { byIndex, byName };
}

function main() {
  const { byIndex, byName } = readSwitchNames();
  const raw = fs.readFileSync(CONFIG, 'utf8');
  const cfg = JSON.parse(raw);

  let changed = 0, filled = 0;
  const warns = [];

  const process1 = (entry, group) => {
    if (entry.switch == null && entry.switchName == null) return; // no usa switch
    // bootstrap: rellena switchName desde el índice actual
    if (!entry.switchName && entry.switch != null) {
      const nm = byIndex[entry.switch];
      if (nm) { entry.switchName = nm; filled++; console.log(`  + ${group} ${entry.id}: switchName = "${nm}" (bootstrap)`); }
      else warns.push(`${group} ${entry.id}: switch ${entry.switch} no tiene nombre en esta versión.`);
      return;
    }
    // re-sync por nombre
    const idx = byName.get(norm(entry.switchName));
    if (idx == null) {
      warns.push(`${group} ${entry.id}: no encuentro un switch llamado "${entry.switchName}" en esta versión (¿renombrado/eliminado?). Se deja en ${entry.switch}.`);
      return;
    }
    if (idx !== entry.switch) {
      console.log(`  ~ ${group} ${entry.id}: "${entry.switchName}"  ${entry.switch} -> ${idx}`);
      entry.switch = idx;
      changed++;
    }
  };

  (cfg.bosses || []).forEach(e => process1(e, 'boss'));
  (cfg.npcs || []).forEach(e => process1(e, 'npc'));

  console.log(`\nResumen: ${changed} switch(es) re-alineados, ${filled} switchName rellenados, ${warns.length} aviso(s).`);
  warns.forEach(w => console.log('  ! ' + w));

  if (changed === 0 && filled === 0) { console.log('Nada que cambiar: config.json ya está al día.'); return; }
  if (DRY) { console.log('\n(--dry) No se escribió nada.'); return; }

  // Reescribe SOLO los arrays bosses y npcs, preservando el resto del archivo y su formato.
  const NL = raw.includes('\r\n') ? '\r\n' : '\n';
  const I2 = '  ', I4 = '    ', I6 = '      ';
  const block = (key, arr) => {
    const items = arr.map(o => I4 + '{' + NL +
      Object.entries(o).map(([k, v]) => `${I6}${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(',' + NL) +
      NL + I4 + '}').join(',' + NL);
    return `${JSON.stringify(key)}: [${NL}${items}${NL}${I2}]`;
  };
  let out = raw
    .replace(/"bosses":\s*\[[\s\S]*?\r?\n {2}\]/, block('bosses', cfg.bosses))
    .replace(/"npcs":\s*\[[\s\S]*?\r?\n {2}\]/, block('npcs', cfg.npcs));
  JSON.parse(out); // valida antes de guardar
  fs.writeFileSync(CONFIG, out);
  console.log('\nconfig.json actualizado. Revisa el diff y haz commit + push.');
}

main();

// Generador de data/forms-dex.json (megas, megas custom/gmax-como-mega y formas regionales/de batalla).
// Herramienta de mantenimiento: reejecutar sólo si cambian las formas en el PBS de Añil.
// Dependencias (rutas locales, ajústalas si mueves las carpetas):
//   PBS      = carpeta PBS del juego (types.txt, abilities.txt, pokemon_forms.txt)
//   REPO     = raíz de este repo
//   CSVPATH  = pokemon.csv de PokeAPI (id,identifier,species_id,...,is_default en col 7) para mapear sprites de formas.
//              Descárgalo de https://github.com/PokeAPI/pokeapi (data/v2/csv/pokemon.csv) y apunta CSVPATH ahí.
// Uso: node companion/build-formsdex.js
const fs=require('fs');
const PBS="E:/Pokemon Super añil randomlocke/Pokemon Anil V4.13/PBS";
const REPO="D:/POKEMON AÑIL SUPER RANDOMLOCKE";
const CSVPATH=process.env.POKEAPI_CSV || "E:/Pokemon Super añil randomlocke/Pokemon Anil V4.13/PBS/pokemon.csv";
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
const TYPE_ES={}; { let cur=null; for(const l of fs.readFileSync(PBS+'/types.txt','utf8').split(/\r?\n/)){const h=l.match(/^\[(.+?)\]/);if(h){cur=h[1];continue;}const m=l.match(/^Name\s*=\s*(.+)/);if(m&&cur)TYPE_ES[cur]=m[1].trim();}}
const typeEs=t=>TYPE_ES[t]||t;
const ABIL_ES={}; { let cur=null; for(const l of fs.readFileSync(PBS+'/abilities.txt','utf8').split(/\r?\n/)){const h=l.match(/^\[(.+?)\]/);if(h){cur=h[1];continue;}const m=l.match(/^Name\s*=\s*(.+)/);if(m&&cur)ABIL_ES[cur]=m[1].trim();}}
const abEs=id=>ABIL_ES[id]||id;
const baseName={}, pforms={}, megaSprite={};
const rows=fs.readFileSync(CSVPATH,'utf8').split(/\r?\n/).slice(1);
for(const line of rows){ const c=line.split(','); const ident=c[1], sid=+c[2]; if(ident&&c[7]==='1') baseName[sid]=ident; }
for(const line of rows){ const c=line.split(','); const id=+c[0], ident=c[1], sid=+c[2]; if(!ident||c[7]==='1') continue;
  const bn=baseName[sid]; if(!bn) continue;
  (pforms[sid]=pforms[sid]||[]).push({ident,id});
  if(/-mega-x$/.test(ident))(megaSprite[sid]=megaSprite[sid]||{}).x=id;
  else if(/-mega-y$/.test(ident))(megaSprite[sid]=megaSprite[sid]||{}).y=id;
  else if(/-mega$/.test(ident))(megaSprite[sid]=megaSprite[sid]||{}).plain=id;
  else if(/-gmax$/.test(ident))(megaSprite[sid]=megaSprite[sid]||{}).gmax=id;
}
const DEX=JSON.parse(fs.readFileSync(REPO+'/data/pokedex-es.json','utf8'));
const PDEX=JSON.parse(fs.readFileSync(REPO+'/data/pokedex.json','utf8'));
const FORMS=JSON.parse(fs.readFileSync(REPO+'/companion/forms.json','utf8'));
const TOK={calor:'heat',lavado:'wash',frio:'frost',ventilador:'fan',corte:'mow',ataque:'attack',defensa:'defense',velocidad:'speed',sol:'sunny',lluvia:'rainy',nieve:'snowy',cielo:'sky',origen:'origin',blanca:'white',negra:'black',blanco:'white',negro:'black',daruma:'zen',galar:'galar',danza:'pirouette',primigenia:'primal',mega:'mega',ash:'ash',eterna:'eternal',totem:'therian',desatado:'unbound',brio:'resolute',lucha:'fighting',volador:'flying',veneno:'poison',tierra:'ground',roca:'rock',bicho:'bug',fantasma:'ghost',acero:'steel',fuego:'fire',agua:'water',planta:'grass',electrico:'electric',psiquico:'psychic',hielo:'ice',dragon:'dragon',siniestro:'dark',hada:'fairy',arena:'sandy',basura:'trash',corazon:'heart',completo:'complete',melena:'dusk',alas:'dawn',alba:'wings',ultra:'ultra'};
const STOP=new Set(['forma','tipo','de','del','la','el','los','las','y']);
function otherSprite(sid,formName){ const list=pforms[sid]; if(!list)return null;
  const toks=(formName.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').match(/[a-z]+/g))||[];
  const eng=toks.filter(t=>!STOP.has(t)).map(t=>TOK[t]).filter(Boolean);
  if(!eng.length)return null;
  const cands=[eng.join('-'),eng.slice().reverse().join('-'),...eng];
  for(const c of cands){ const hit=list.find(f=>f.ident.endsWith('-'+c)); if(hit)return hit.id; }
  for(const c of cands){ const hit=list.find(f=>f.ident.split('-').includes(c)); if(hit)return hit.id; }
  return null;
}
const blocks=[]; { let cur=null; for(const l of fs.readFileSync(PBS+'/pokemon_forms.txt','utf8').split(/\r?\n/)){const h=l.match(/^\[(.+?),(\d+)\]\s*$/);if(h){cur={sp:h[1],form:+h[2],f:{}};blocks.push(cur);continue;}if(!cur)continue;const m=l.match(/^([A-Za-z0-9_]+)\s*=\s*(.*)$/);if(m)cur.f[m[1]]=m[2];}}
const out={}; let nM=0,nR=0,nO=0,noSpr=0;
for(const b of blocks){
  const isMega=!!b.f.MegaStone, isReg=!!b.f.Region;
  const isOther=!isMega&&!isReg&&(b.f.Types||b.f.BaseStats||b.f.Abilities);
  if(!isMega&&!isReg&&!isOther)continue;
  const dexId=DEX[norm(b.sp)]; if(!dexId||!PDEX[dexId])continue;
  const base=PDEX[dexId];
  const types=b.f.Types?b.f.Types.split(',').map(x=>typeEs(x.trim())).filter(Boolean):base.t;
  const stats=b.f.BaseStats?b.f.BaseStats.split(',').map(Number):base.st;
  const ab=b.f.Abilities?[...new Set(b.f.Abilities.split(',').map(x=>abEs(x.trim())).filter(Boolean))]:base.ab;
  const abh=b.f.HiddenAbilities?[...new Set(b.f.HiddenAbilities.split(',').map(x=>abEs(x.trim())).filter(Boolean))]:(Array.isArray(base.abh)?base.abh:base.abh?[base.abh]:[]);
  const name=(b.f.FormName||'').trim()||(isReg?('Forma '+b.f.Region):'Forma');
  let spr=null,kind;
  if(isMega){kind='mega';const ms=megaSprite[dexId];const nm=name.toLowerCase();if(ms){if(/\bx\b/.test(nm)&&ms.x)spr=ms.x;else if(/\by\b/.test(nm)&&ms.y)spr=ms.y;else spr=ms.plain||ms.x||ms.y||ms.gmax||null;}nM++;}
  else if(isReg){kind='regional';const fd=FORMS[b.sp+'_'+b.form];if(fd&&fd.spriteId)spr=fd.spriteId;nR++;}
  else{kind='forma';spr=otherSprite(dexId,name);nO++;}
  if(!spr)noSpr++;
  (out[dexId]=out[dexId]||[]).push({n:name,k:kind,t:types,st:stats,ab,abh,spr,stone:b.f.MegaStone||undefined,region:b.f.Region||undefined});
}
fs.writeFileSync(REPO+'/data/forms-dex.json',JSON.stringify(out));
console.log('especies:',Object.keys(out).length,'| mega:',nM,'reg:',nR,'otras:',nO,'| sin sprite:',noSpr);
console.log('Rotom(479):',JSON.stringify((out[479]||[]).map(x=>x.n+' '+x.t.join('/')+' spr='+x.spr)));
console.log('Deoxys(386):',JSON.stringify((out[386]||[]).map(x=>x.n+' spr='+x.spr)));
console.log('Arceus(493):',(out[493]||[]).length,'formas; ej',JSON.stringify((out[493]||[]).slice(0,2).map(x=>x.n+' spr='+x.spr)));

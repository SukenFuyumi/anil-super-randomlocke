const fs=require('fs');
const m=require('./map-names.json');
const slug=n=>n.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
const RE=/(ruta|bosque|monte|cueva|t[uú]nel|zona safari|safari|isla|caminos|catarata|central energ|roca|mansi[oó]n|torre|calle victoria|meseta|volc[aá]n|islas espuma|ciudad|pueblo)/i;
const INT=/(casa|gimnasio|centro pok|tienda|laboratorio|liga|barco|guarida|museo|club|intro|ss anne|s\.s\.)/i;
const ents=Object.entries(m).map(([k,v])=>[+k,v]).sort((a,b)=>a[0]-b[0]);
const seen=new Set(); const routes=[]; const mapToSlug={};
for(const [id,name] of ents){
  if(!(RE.test(name)&&!INT.test(name))) continue;
  const s=slug(name);
  mapToSlug[id]=s;
  if(!seen.has(s)){ seen.add(s); routes.push({id:s,name}); }
}
fs.writeFileSync('routes-config.json',JSON.stringify(routes,null,2));
console.log('rutas únicas:',routes.length);
console.log(routes.map(r=>r.name).join(' · '));

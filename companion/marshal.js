// Lector minimalista de Ruby Marshal 4.8 -> objetos JS
// Objetos Ruby se representan como { __class: "Nombre", ivars: {...} } o valores nativos.
'use strict';
const fs = require('fs');

class RSymbol { constructor(name){ this.name = name; } toString(){ return this.name; } }
class RObject { constructor(cls){ this.__class = cls; this.ivars = {}; } }
class RUserDef { constructor(cls, data){ this.__class = cls; this.__userdef = data; } }
class RUserMarshal { constructor(cls, data){ this.__class = cls; this.__data = data; } }

function parse(buf) {
  let pos = 0;
  const symbols = [];
  const objects = [];

  function u8(){ return buf[pos++]; }
  function s8(){ const v = buf[pos++]; return v < 128 ? v : v - 256; }

  function long(){ // fixnum de Marshal
    const c = s8();
    if (c === 0) return 0;
    if (c > 0) {
      if (c > 4) return c - 5;
      let n = 0;
      for (let i = 0; i < c; i++) n += u8() * 2 ** (8 * i);
      return n;
    } else {
      if (c < -4) return c + 5;
      const cc = -c;
      let n = -1;
      for (let i = 0; i < cc; i++) {
        n -= (0xff - u8()) * 2 ** (8 * i);
      }
      return n;
    }
  }

  function rawstr(){ const len = long(); const s = buf.slice(pos, pos + len); pos += len; return s; }

  function sym(){
    const t = u8();
    if (t === 0x3a) { // ':' símbolo nuevo
      const s = rawstr().toString('utf8');
      const sy = new RSymbol(s); symbols.push(sy); return sy;
    } else if (t === 0x3b) { // ';' symlink
      const idx = long(); return symbols[idx];
    } else { throw new Error('symbol esperado, byte=' + t.toString(16) + ' pos=' + pos); }
  }

  function readobj(){
    const t = u8();
    switch (t) {
      case 0x30: return null;               // '0' nil
      case 0x54: return true;               // 'T'
      case 0x46: return false;              // 'F'
      case 0x69: return long();             // 'i' fixnum
      case 0x66: { const o = rawstr().toString('utf8'); objects.push(o); return parseFloat(o); } // 'f' float
      case 0x6c: { // 'l' bignum
        const sign = u8(); const len = long() * 2; const bytes = buf.slice(pos, pos+len); pos += len;
        let v = 0n; for (let i = len-1; i>=0; i--) v = (v<<8n) + BigInt(bytes[i]);
        if (sign === 0x2d) v = -v; const r = v.toString(); objects.push(r); return r;
      }
      case 0x3a: { const s = rawstr().toString('utf8'); const sy = new RSymbol(s); symbols.push(sy); return sy; } // ':' symbol
      case 0x3b: { const idx = long(); return symbols[idx]; } // ';' symlink
      case 0x40: { const idx = long(); return objects[idx]; } // '@' object link
      case 0x22: { const s = rawstr(); objects.push(s); return s; } // '"' string (bytes)
      case 0x49: { // 'I' ivar-wrapped (string/regexp con encoding)
        const inner = readobj();
        const n = long();
        for (let i = 0; i < n; i++) { sym(); readobj(); } // ignoramos ivars de encoding
        return inner;
      }
      case 0x5b: { // '[' array
        const n = long(); const a = []; objects.push(a);
        for (let i = 0; i < n; i++) a.push(readobj());
        return a;
      }
      case 0x7b: case 0x7d: { // '{' hash, '}' hash con default
        const n = long(); const h = new Map(); objects.push(h);
        for (let i = 0; i < n; i++) { const k = readobj(); const v = readobj(); h.set(k, v); }
        if (t === 0x7d) readobj(); // default
        h.__isHash = true; return h;
      }
      case 0x6f: { // 'o' object
        const cls = sym().name; const o = new RObject(cls); objects.push(o);
        const n = long();
        for (let i = 0; i < n; i++) { const k = sym().name; const v = readobj(); o.ivars[k] = v; }
        return o;
      }
      case 0x75: { // 'u' userdef (_dump)
        const cls = sym().name; const data = rawstr(); const o = new RUserDef(cls, data); objects.push(o); return o;
      }
      case 0x55: { // 'U' usrmarshal (marshal_dump)
        const cls = sym().name; const o = new RUserMarshal(cls, null); objects.push(o); o.__data = readobj(); return o;
      }
      case 0x65: { // 'e' extended -> modulo + objeto
        sym(); return readobj();
      }
      case 0x43: { // 'C' uclass (String/Array/Hash subclass)
        const cls = sym().name; const inner = readobj();
        if (inner && typeof inner === 'object') inner.__uclass = cls; return inner;
      }
      case 0x2f: { const s = rawstr(); const opt = u8(); const r = { __regexp: s.toString(), opt }; objects.push(r); return r; } // '/' regexp
      default:
        throw new Error('tipo Marshal no soportado: 0x' + t.toString(16) + ' en pos ' + (pos-1));
    }
  }

  if (u8() !== 4 || u8() !== 8) throw new Error('cabecera Marshal inválida');
  const root = readobj();
  return { root, pos, symbolsCount: symbols.length, objectsCount: objects.length };
}

module.exports = { parse, RSymbol, RObject, RUserDef, RUserMarshal };

// --- si se ejecuta directo: vuelca el nivel superior ---
if (require.main === module) {
  const file = process.argv[2];
  const buf = fs.readFileSync(file);
  const { root, pos } = parse(buf);
  console.log('bytes leídos:', pos, 'de', buf.length);
  if (root && root.__isHash) {
    console.log('TOP-LEVEL: Hash con', root.size, 'claves:\n');
    for (const [k, v] of root.entries()) {
      const key = (k instanceof RSymbol) ? k.name : String(k);
      console.log('  ' + key + '  ->  ' + describe(v));
    }
  } else {
    console.log('root:', describe(root));
  }
}

function describe(v) {
  if (v === null) return 'nil';
  if (v === true || v === false) return String(v);
  if (typeof v === 'number') return 'num(' + v + ')';
  if (typeof v === 'string') return 'str';
  if (Buffer.isBuffer(v)) return 'String("' + v.slice(0, 40).toString('utf8').replace(/\n/g,' ') + (v.length>40?'…':'') + '")';
  if (v && v.__isHash) return 'Hash(' + v.size + ')';
  if (Array.isArray(v)) return 'Array(' + v.length + ')';
  if (v && v.__class) {
    const iv = v.ivars ? Object.keys(v.ivars) : [];
    return v.__class + (iv.length ? ' {ivars: ' + iv.join(', ') + '}' : (v.__userdef?' (userdef '+v.__userdef.length+'b)':'') + (v.__data!==undefined?' (usrmarshal)':''));
  }
  return typeof v;
}

// Sinkronisasi: dokumen JSON dienkripsi di browser (AES-GCM) lalu disimpan di Gist rahasia milik akun GitHub pengguna.
const GH = 'https://api.github.com';
const BIN = 'https://json.extendsclass.com/bin'; // penyimpanan JSON tanpa akun, mendukung CORS
const bin = (c) => c.kind === 'bin';
async function binReq(url, opt) {
  const r = await fetch(url, { ...opt, cache: 'no-store', headers: { 'Content-Type': 'application/json' } });
  if (!r.ok) throw new Error('http ' + r.status);
  return r.json();
}
const FILE = 'perencana.json';
const enc = new TextEncoder();
const b64 = (u) => { let s = ''; new Uint8Array(u).forEach((c) => (s += String.fromCharCode(c))); return btoa(s); };
const ub = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const keys = {};
async function key(pw) {
  if (keys[pw]) return keys[pw];
  const m = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveKey']);
  return (keys[pw] = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: enc.encode('perencana:v1'), iterations: 150000, hash: 'SHA-256' }, m, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']));
}
async function seal(pw, doc) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await key(pw), enc.encode(JSON.stringify(doc)));
  return { v: 1, i: b64(iv), c: b64(ct) };
}
async function gh(cfg, path, opt = {}) {
  const r = await fetch(GH + path, { ...opt, cache: 'no-store', headers: { Authorization: 'Bearer ' + cfg.token, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' } });
  if (!r.ok) throw new Error('http ' + r.status);
  return r.json();
}
// Cari Gist perencana.json milik akun; kalau belum ada, buat baru. Mengembalikan id Gist.
export async function connect(cfg) {
  if (bin(cfg)) {
    const d = await binReq(BIN, { method: 'POST', body: JSON.stringify(await seal(cfg.pw, { plans: [], del: {} })) });
    if (!d || !d.id) throw new Error('id tidak diterima');
    return d.id;
  }
  for (let page = 1; ; page++) {
    const l = await gh(cfg, '/gists?per_page=100&page=' + page);
    const g = l.find((x) => x.files && x.files[FILE]);
    if (g) return g.id;
    if (l.length < 100) break;
  }
  const g = await gh(cfg, '/gists', { method: 'POST', body: JSON.stringify({ description: 'Perencana (data terenkripsi)', public: false, files: { [FILE]: { content: JSON.stringify(await seal(cfg.pw, { plans: [], del: {} })) } } }) });
  return g.id;
}
export async function pull(cfg) {
  if (bin(cfg)) return open(cfg.pw, await binReq(BIN + '/' + cfg.id));
  const g = await gh(cfg, '/gists/' + cfg.id);
  const f = g.files && g.files[FILE];
  if (!f) return null;
  let t = f.content;
  if (f.truncated || t == null) t = await (await fetch(f.raw_url)).text();
  let box;
  try { box = JSON.parse(t); } catch (e) { return null; }
  return open(cfg.pw, box);
}
async function open(pw, box) {
  if (!box || !box.c) return null;
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ub(box.i) }, await key(pw), ub(box.c));
  return JSON.parse(new TextDecoder().decode(pt));
}
export async function push(cfg, doc) {
  if (bin(cfg)) { await binReq(BIN + '/' + cfg.id, { method: 'PUT', body: JSON.stringify(await seal(cfg.pw, doc)) }); return; }
  await gh(cfg, '/gists/' + cfg.id, { method: 'PATCH', body: JSON.stringify({ files: { [FILE]: { content: JSON.stringify(await seal(cfg.pw, doc)) } } }) });
}
export function merge(a, b) {
  const del = { ...(a.del || {}) };
  Object.entries(b.del || {}).forEach(([k, v]) => { del[k] = Math.max(del[k] || 0, v); });
  const m = {};
  [...(a.plans || []), ...(b.plans || [])].forEach((p) => { if (!m[p.id] || (p.u || 0) > (m[p.id].u || 0)) m[p.id] = p; });
  const plans = Object.values(m).filter((p) => (del[p.id] || 0) <= (p.u || 0))
    .sort((x, y) => (x.ord || 0) - (y.ord || 0) || String(x.title).localeCompare(String(y.title)));
  return { plans, del };
}
export const sig = (d) => JSON.stringify([(d.plans || []).map((p) => [p.id, p.u || 0]), Object.entries(d.del || {}).sort()]);
export const loadCfg = () => { try { return JSON.parse(localStorage.getItem('perencana:sync')) || {}; } catch (e) { return {}; } };
export const saveCfg = (c) => { try { if (c && c.id) localStorage.setItem('perencana:sync', JSON.stringify(c)); else localStorage.removeItem('perencana:sync'); } catch (e) {} };
// Tautan sinkron: token + kata sandi dibawa di bagian # URL (tidak dikirim ke server mana pun).
export const packLink = (c) => btoa(unescape(encodeURIComponent(JSON.stringify({ k: c.kind, t: c.token, p: c.pw, i: bin(c) ? c.id : undefined })))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export const unpackLink = (s) => { try { const o = JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))))); return o && o.p && (o.t || o.i) ? o : null; } catch (e) { return null; } };

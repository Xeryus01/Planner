// Sinkronisasi: dokumen JSON dienkripsi di browser (AES-GCM) lalu disimpan di JSONBlob (jsonblob.com).
const API = 'https://jsonblob.com/api/jsonBlob';
const H = { 'Content-Type': 'application/json', Accept: 'application/json' };
const enc = new TextEncoder();
const b64 = (u) => { let s = ''; new Uint8Array(u).forEach((c) => (s += String.fromCharCode(c))); return btoa(s); };
const ub = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const keys = {};
async function key(id, pw) {
  const k = id + '|' + pw;
  if (keys[k]) return keys[k];
  const m = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveKey']);
  return (keys[k] = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: enc.encode('perencana:' + id), iterations: 150000, hash: 'SHA-256' }, m, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']));
}
async function seal(id, pw, doc) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await key(id, pw), enc.encode(JSON.stringify(doc)));
  return { v: 1, i: b64(iv), c: b64(ct) };
}
export async function pull(cfg) {
  const r = await fetch(API + '/' + cfg.id, { headers: H, cache: 'no-store' });
  if (!r.ok) throw new Error('http ' + r.status);
  const box = await r.json();
  if (!box || !box.c) return null;
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ub(box.i) }, await key(cfg.id, cfg.pw), ub(box.c));
  return JSON.parse(new TextDecoder().decode(pt));
}
export async function push(cfg, doc) {
  const r = await fetch(API + '/' + cfg.id, { method: 'PUT', headers: H, body: JSON.stringify(await seal(cfg.id, cfg.pw, doc)) });
  if (!r.ok) throw new Error('http ' + r.status);
}
export async function create(pw) {
  const r = await fetch(API, { method: 'POST', headers: H, body: JSON.stringify({}) });
  const loc = r.ok && r.headers.get('Location');
  if (!loc) throw new Error('noloc');
  const id = loc.split('/').pop();
  await push({ id, pw }, { plans: [], del: {} });
  return id;
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

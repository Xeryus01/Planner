(function () {
'use strict';
var C = Object.assign({ SECRET: '' }, window.CONFIG || {});
var KEY = 'perencana:v2', PW = 'perencana:sync-password', API = '/api/data';
var $ = function (s) { return document.querySelector(s); }, app = $('#app');
var COL = { teal: '#0e7490', blue: '#2563eb', indigo: '#4f46e5', violet: '#7c3aed', fuchsia: '#c026d3', rose: '#e11d48', orange: '#ea580c', amber: '#d99a06', lime: '#65a30d', green: '#16a34a', emerald: '#059669', slate: '#475569' };
var NAMES = { teal: 'Laut', blue: 'Biru', indigo: 'Indigo', violet: 'Ungu', fuchsia: 'Magenta', rose: 'Mawar', orange: 'Jingga', amber: 'Kuning', lime: 'Limau', green: 'Hijau', emerald: 'Zamrud', slate: 'Abu' };
var EMOJIS = ['🧳', '✈️', '🏖️', '🎉', '🎂', '💍', '🏠', '📦', '🎓', '💼', '🛒', '🍽️', '🏃', '📚', '🎁', '🌴', '⛰️', '🚗', '🏥', '⭐'];
var STYLES = [['gradient', 'Gradasi'], ['solid', 'Polos'], ['aurora', 'Aurora'], ['stripe', 'Garis']];
var TPL = {
  kosong: [],
  liburan: [['Dokumen', 'Paspor, tiket, asuransi', 'Penginapan dan transportasi dipesan'], ['Bawaan', 'Baju, obat, charger', 'Uang dan kartu'], ['Hari H', 'Cek dokumen dan kunci rumah']],
  acara: [['Persiapan', 'Tentukan tanggal dan tempat', 'Anggaran dan penanggung jawab'], ['Tamu dan undangan', 'Daftar tamu', 'Kirim undangan'], ['Hari H', 'Cek perlengkapan', 'Dokumentasi'], ['Setelah acara', 'Ucapan terima kasih', 'Bayar sisa tagihan']],
  pindahan: [['Sebelum pindah', 'Cari jasa angkut', 'Ubah alamat (bank, kantor, langganan)'], ['Packing', 'Kemas per ruangan dan beri label', 'Barang berharga dibawa sendiri'], ['Hari pindah', 'Cek meteran listrik dan air', 'Serah terima kunci'], ['Setelah pindah', 'Bongkar barang penting dulu', 'Lapor alamat baru']]
};
var LBL = { off: 'Lokal', busy: 'Menyinkronkan…', ok: 'Tersinkron', err: 'Gagal sinkron' };
var S = { plans: [], del: {} }, cur = null, tab = 'c', edit = false, st = 'off', serr = '', undo = null, sure = false, msg = '', panel = false, timer = null, snT = null, sT = null;
var syncPassword = localStorage.getItem(PW) || '';
var hideDone = false, lastFocus = null, gotoTop = false, booting = true;
var planDrag = null, touchPlanDrag = null, suppressCardClick = false;

function uid() { return Math.random().toString(36).slice(2, 9); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function oneEmoji(s) {
  s = String(s || '📌').trim();
  if (window.Intl && Intl.Segmenter) {
    var first = new Intl.Segmenter('id', { granularity: 'grapheme' }).segment(s)[Symbol.iterator]().next();
    return first.done ? '📌' : first.value.segment;
  }
  return Array.from(s)[0] || '📌';
}
function clone(x) { return JSON.parse(JSON.stringify(x)); }
function item(i, stop) {
  if (typeof i === 'string') { var q = i.split('|'); i = stop ? (q.length > 1 ? { tm: q[0], x: q[1] } : { tm: '', x: q[0] }) : { x: q[0], n: q[1] || '' }; }
  i.id = i.id || uid(); i.d = i.d ? 1 : 0; return i;
}
function norm(p) {
  p.id = p.id || uid(); p.color = p.color || 'teal'; p.emoji = oneEmoji(p.emoji); p.title = p.title || 'Rencana'; p.note = p.note || '';
  p.sections = (p.sections || []).map(function (s) { s.id = s.id || uid(); s.items = (s.items || []).map(function (i) { return item(i, 0); }); return s; });
  p.days = (p.days || []).map(function (y) { y.id = y.id || uid(); y.stops = (y.stops || []).map(function (i) { return item(i, 1); }); return y; });
  return p;
}
function prog(p) { var a = 0, d = 0; p.sections.forEach(function (s) { s.items.forEach(function (i) { a++; d += i.d; }); }); p.days.forEach(function (y) { y.stops.forEach(function (i) { a++; d += i.d; }); }); return [d, a, a ? Math.round(d / a * 100) : 0]; }
function cd(p) {
  if (!p.start) return ''; var t = new Date(); t.setHours(0, 0, 0, 0);
  var s = new Date(p.start), e = new Date(p.end || p.start), n = Math.round((s - t) / 864e5);
  return n > 0 ? 'H-' + n : t <= e ? (n === 0 ? 'Hari ini' : 'Sedang berlangsung') : 'Selesai';
}
function fd(d) { return d ? new Date(d + 'T00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }) : ''; }
function ring(v, size) {
  var r = size / 2 - 6, c = 2 * Math.PI * r, h = size / 2;
  return '<svg class="ring" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" role="img" aria-label="' + v + ' persen selesai"><circle cx="' + h + '" cy="' + h + '" r="' + r + '" fill="none" stroke="var(--ring-track)" stroke-width="5"/><circle cx="' + h + '" cy="' + h + '" r="' + r + '" fill="none" stroke="var(--ring-line)" stroke-width="5" stroke-linecap="round" stroke-dasharray="' + c + '" stroke-dashoffset="' + c * (1 - v / 100) + '" transform="rotate(-90 ' + h + ' ' + h + ')"/><text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" fill="var(--ring-ink)" font-size="' + size / 3.7 + '" font-weight="700">' + v + '%</text></svg>';
}

/* ---------- penyimpanan lokal + enkripsi + sinkron ---------- */
var enc = new TextEncoder(), K = null;
function b64(u) { var s = ''; new Uint8Array(u).forEach(function (c) { s += String.fromCharCode(c); }); return btoa(s); }
function ub(s) { return Uint8Array.from(atob(s), function (c) { return c.charCodeAt(0); }); }
async function key() {
  if (K) return K;
  var m = await crypto.subtle.importKey('raw', enc.encode(C.SECRET), 'PBKDF2', false, ['deriveKey']);
  return (K = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: enc.encode('perencana:v2'), iterations: 100000, hash: 'SHA-256' }, m, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']));
}
async function seal(d) {
  if (!C.SECRET) return d;
  var iv = crypto.getRandomValues(new Uint8Array(12));
  return { v: 1, i: b64(iv), c: b64(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, await key(), enc.encode(JSON.stringify(d)))) };
}
async function open(b) {
  if (!b) return null;
  if (b.c) return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ub(b.i) }, await key(), ub(b.c))));
  return b.plans ? b : null;
}
async function req(url, o) {
  var options = Object.assign({ cache: 'no-store', headers: { 'Content-Type': 'application/json' } }, o);
  if (options.method === 'PUT' && syncPassword) options.headers.Authorization = 'Bearer ' + syncPassword;
  var r = await fetch(url, options);
  if (!r.ok) {
    var detail = '';
    try { var body = await r.json(); detail = body.message || ''; } catch (e) {}
    throw new Error('http ' + r.status + (detail ? ': ' + detail : ''));
  }
  return r.json();
}
function merge(a, b) {
  var del = Object.assign({}, a.del || {});
  Object.keys(b.del || {}).forEach(function (k) { del[k] = Math.max(del[k] || 0, b.del[k]); });
  var m = {};
  (a.plans || []).concat(b.plans || []).forEach(function (p) { if (!m[p.id] || (p.u || 0) > (m[p.id].u || 0)) m[p.id] = p; });
  var plans = Object.keys(m).map(function (k) { return m[k]; }).filter(function (p) { return (del[p.id] || 0) <= (p.u || 0); })
    .sort(function (x, y) { return (x.ord || 0) - (y.ord || 0) || String(x.title).localeCompare(String(y.title)); });
  return { plans: plans, del: del };
}
function sig(d) { return JSON.stringify([(d.plans || []).map(function (p) { return [p.id, p.u || 0]; }), Object.keys(d.del || {}).sort().map(function (k) { return [k, d.del[k]]; })]); }
function saveLocal() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
function pill() { document.querySelectorAll('.pill').forEach(function (e) { e.className = 'pill ' + st; e.textContent = LBL[st]; }); if (panel) { var sb = document.getElementById('sh-st'); if (sb) sb.textContent = LBL[st] + (st === 'err' ? ': ' + serr : ''); } }
async function sync() {
  st = 'busy'; pill();
  try {
    for (var attempt = 0; attempt < 3; attempt++) {
      var rem = null;
      try { rem = await open(await req(API)); }
      catch (e) {
        if (e.name === 'OperationError') throw new Error('SECRET di config.js tidak cocok dengan data di GitHub');
        throw e;
      }
      var m = merge(S, rem || { plans: [], del: {} });
      if (sig(m) !== sig(S)) { S = m; saveLocal(); var a = document.activeElement; if (!(a && /INPUT|SELECT/.test(a.tagName))) render(); }
      if (!rem || sig(m) !== sig(rem)) {
        try { await req(API, { method: 'PUT', body: JSON.stringify(await seal(m)) }); }
        catch (e) { if (e.message.indexOf('http 409') === 0 && attempt < 2) continue; throw e; }
      }
      st = 'ok'; serr = '';
      break;
    }
  } catch (e) {
    st = 'err';
    var errorMessage = e.message || String(e);
    if (errorMessage.indexOf('http 401') === 0) serr = 'Kata sandi sinkronisasi salah atau belum diatur pada perangkat ini.';
    else if (errorMessage.indexOf('GITHUB_TOKEN is not configured') !== -1) serr = 'GITHUB_TOKEN belum tersedia pada deployment Vercel. Atur untuk Production lalu redeploy.';
    else serr = errorMessage;
  }
  pill();
}
function later() { clearTimeout(sT); sT = setTimeout(sync, 1200); }
function touch(p) { p.u = Date.now(); saveLocal(); later(); }

/* ---------- tampilan ---------- */
var IC = {
  c: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h9"/></svg>',
  j: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
  e: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  ok: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>'
};
function col(p) { return COL[p.color] || (/^#[0-9a-f]{6}$/i.test(p.color || '') ? p.color : COL.teal); }
function rgb(h) { var n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function hex(a) { return '#' + a.map(function (v) { return ('0' + Math.round(Math.max(0, Math.min(255, v))).toString(16)).slice(-2); }).join(''); }
function mix(h, t, w) { var a = rgb(h), b = rgb(t); return hex(a.map(function (v, i) { return v + (b[i] - v) * w; })); }
function lum(h) { var a = rgb(h).map(function (v) { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * a[0] + .7152 * a[1] + .0722 * a[2]; }
function cover(p) {
  var c = col(p), light = lum(c) > .26;
  return '--c:' + c + ';--c1:' + mix(c, '#ffffff', light ? .4 : .1) + ';--c2:' + mix(c, '#000000', light ? .12 : .5) + ';--on:' + (light ? '#17180f' : '#ffffff');
}
function applyTheme(p) {
  var b = document.body.style, ks = ['--tint', '--accent', '--accent-strong', '--on-accent'];
  if (!p) { ks.forEach(function (k) { b.removeProperty(k); }); return; }
  var c = col(p), dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  var a = dark ? mix(c, '#ffffff', .3) : c, st2 = dark ? mix(c, '#ffffff', .15) : mix(c, '#000000', .2);
  b.setProperty('--tint', c); b.setProperty('--accent', a); b.setProperty('--accent-strong', st2); b.setProperty('--on-accent', lum(st2) > .35 ? '#10130d' : '#ffffff');
}
function remaining() { var n = 0; S.plans.forEach(function (p) { var q = prog(p); n += q[1] - q[0]; }); return n; }
function featured() {
  var t = new Date(); t.setHours(0, 0, 0, 0); var best = null;
  if (S.plans.some(function (p) { return p.orderManual; })) {
    var first = S.plans[0];
    return first && first.start && new Date(first.end || first.start) >= t ? first : null;
  }
  S.plans.forEach(function (p) { if (!p.start) return; if (new Date(p.end || p.start) < t) return; if (!best || p.start < best.start) best = p; });
  return best;
}
function visiblePlanOrder() {
  var pinned = featured();
  return pinned ? [pinned].concat(S.plans.filter(function (p) { return p !== pinned; })) : S.plans.slice();
}
function reorderPlan(fromId, toId, after) {
  var original = visiblePlanOrder(), ordered = original.slice();
  var from = ordered.findIndex(function (p) { return p.id === fromId; });
  var target = ordered.find(function (p) { return p.id === toId; });
  if (from < 0 || !target || fromId === toId) return;
  var moved = ordered.splice(from, 1)[0], targetIndex = ordered.indexOf(target);
  ordered.splice(targetIndex + (after ? 1 : 0), 0, moved);
  if (ordered.every(function (p, i) { return p === original[i]; })) return;
  var stamp = Date.now();
  S.plans.forEach(function (p) { stamp = Math.max(stamp, (Number(p.u) || 0) + 1); });
  ordered.forEach(function (p, i) { p.ord = i; p.u = stamp; p.orderManual = true; });
  S.plans = ordered;
  saveLocal(); later(); render();
  var card = document.querySelector('.home-plan[data-p="' + fromId + '"]');
  if (card && document.activeElement === document.body) card.focus();
  snack('Urutan rencana diperbarui');
}
function cardHtml(p, q, reorderable) {
  var drag = reorderable ? ' draggable="true" aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown" aria-description="Seret untuk mengubah urutan. Gunakan Alt dan tombol panah atas atau bawah saat kartu fokus."' : '';
  return '<button class="home-plan card"' + drag + ' data-a="open" data-p="' + p.id + '" data-style="' + esc(p.style || 'gradient') + '" style="' + cover(p) + '"><div class="cover"><span class="em">' + esc(p.emoji) + '</span>' + (reorderable ? '<span class="drag-hint" aria-hidden="true">⠿</span>' : '') + '<span class="cd">' + esc(cd(p) || 'Tanpa tanggal') + '</span><div class="cring">' + ring(q[2], 56) + '</div></div><div class="card-main"><h3>' + esc(p.title) + '</h3>' + (p.note ? '<p class="card-note">' + esc(p.note) + '</p>' : '') + (nextItem(p) ? '<p class="card-next"><span>Berikutnya</span>' + esc(nextItem(p)) + '</p>' : (q[1] ? '<p class="card-next done"><span>Semua langkah selesai</span></p>' : '')) + '</div><div class="card-bottom"><span class="progress-label"><b>' + q[0] + '</b><span> dari ' + q[1] + ' selesai</span></span><span class="progress-track"><i style="width:' + q[2] + '%"></i></span></div></button>';
}
function featHtml(p, reorderable) {
  var q = prog(p), t = new Date(); t.setHours(0, 0, 0, 0);
  var n = Math.round((new Date(p.start) - t) / 864e5), big, unit;
  if (n > 0) { big = n; unit = 'hari lagi'; } else if (n === 0) { big = 'Hari'; unit = 'ini'; } else { big = n * -1 + 1; unit = 'hari berjalan'; }
  var drag = reorderable ? ' draggable="true" aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown" aria-description="Seret untuk mengubah urutan. Gunakan Alt dan tombol panah atas atau bawah saat kartu fokus."' : '';
  return '<button class="home-plan feat"' + drag + ' data-a="open" data-p="' + p.id + '" data-style="' + esc(p.style || 'gradient') + '" style="' + cover(p) + '"><div class="fl"><span class="fnum">' + big + '</span><span class="funit">' + unit + '</span></div><div class="fr"><span class="em">' + esc(p.emoji) + '</span><h2>' + esc(p.title) + '</h2>' + (p.note ? '<p>' + esc(p.note) + '</p>' : '') + '<p class="fprog">' + q[0] + ' dari ' + q[1] + ' selesai</p></div><div class="cring">' + ring(q[2], 64) + '</div>' + (reorderable ? '<span class="drag-hint" aria-hidden="true">⠿</span>' : '') + '</button>';
}
function styler(p) {
  var c = col(p), isKey = Object.keys(COL).some(function (k) { return COL[k] === c; });
  var h = '<section class="styler" aria-label="Tampilan rencana"><h2>Tampilan</h2><div class="srow"><span class="slabel" id="sl-col">Warna</span><div class="swatches" role="group" aria-labelledby="sl-col">';
  Object.keys(NAMES).forEach(function (k) { h += '<button class="sw' + (COL[k] === c ? ' on' : '') + '" data-a="color" data-v="' + k + '" style="--sw:' + COL[k] + '" aria-label="' + NAMES[k] + '" aria-pressed="' + (COL[k] === c) + '"></button>'; });
  h += '<label class="sw custom' + (isKey ? '' : ' on') + '"><input type="color" data-f="color" value="' + c + '" aria-label="Warna sendiri"><span>Pilih</span></label></div></div>';
  h += '<div class="srow"><span class="slabel" id="sl-sty">Gaya sampul</span><div class="chips" role="group" aria-labelledby="sl-sty">';
  STYLES.forEach(function (x) { h += '<button class="chip-btn" data-a="style" data-v="' + x[0] + '" aria-pressed="' + ((p.style || 'gradient') === x[0]) + '">' + x[1] + '</button>'; });
  h += '</div></div><div class="srow"><span class="slabel" id="sl-ico">Ikon</span><div class="emojis" role="group" aria-labelledby="sl-ico">';
  EMOJIS.forEach(function (e) { h += '<button class="eb' + (p.emoji === e ? ' on' : '') + '" data-a="emoji" data-v="' + e + '" aria-label="Ikon ' + e + '" aria-pressed="' + (p.emoji === e) + '">' + e + '</button>'; });
  return h + '<input type="text" class="eb-in" data-f="emoji" value="' + esc(p.emoji) + '" maxlength="4" aria-label="Ikon sendiri"></div></div></section>';
}
function nextItem(p) {
  for (var i = 0; i < p.sections.length; i++) for (var j = 0; j < p.sections[i].items.length; j++) if (!p.sections[i].items[j].d) return p.sections[i].items[j].x;
  return '';
}
function dayHead(y) {
  var d = y.date ? new Date(y.date + 'T00:00') : null, t = new Date(); t.setHours(0, 0, 0, 0);
  var now = d && d.getTime() === t.getTime();
  return '<div class="dnum' + (now ? ' now' : '') + '"><b>' + (d ? d.getDate() : '–') + '</b><span>' + (d ? d.toLocaleDateString('id-ID', { month: 'short' }) : '') + '</span></div><div><span class="dd">' + (d ? d.toLocaleDateString('id-ID', { weekday: 'long' }) : '') + (now ? ', hari ini' : '') + '</span><h2>' + esc(y.t) + '</h2></div>';
}
function P() { return S.plans.filter(function (p) { return p.id === cur; })[0]; }
function Sx(p, id) { return p.sections.filter(function (s) { return s.id === id; })[0]; }
function Yx(p, id) { return p.days.filter(function (s) { return s.id === id; })[0]; }
function pillHtml() { return '<button class="pill ' + st + '" data-a="panel">' + LBL[st] + '</button>'; }
function reorderAttrs(type, id, parent) {
  return ' data-reorder-item data-reorder-type="' + type + '" data-reorder-id="' + esc(id) + '" data-reorder-parent="' + esc(parent || '') + '"';
}
function reorderHandle(label) {
  return edit ? '<span class="reorder-handle" draggable="true" tabindex="0" aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown" aria-label="Seret untuk mengurutkan: ' + esc(label) + '">⠿</span>' : '';
}
function home() {
  var h = '<header class="home-head"><div class="home-top"><a class="wordmark" href="./" aria-label="Perencana"><span class="brand-mark">P</span><span>Perencana</span></a>' + pillHtml() + '</div><div class="home-intro"><h1>Rencana Anda<span>.</span></h1><p class="sub">Satu tempat untuk hal-hal yang ingin Anda tuntaskan.</p><div class="stats"><span><b>' + S.plans.length + '</b> rencana</span><span><b>' + remaining() + '</b> langkah tersisa</span></div></div></header>';
  var ft = featured(); if (ft) h += featHtml(ft, S.plans.length > 1);
  h += '<section class="plans"' + (ft && S.plans.length < 2 ? ' hidden' : '') + ' aria-label="Daftar rencana"><div class="section-title"><h2>' + (ft ? 'Rencana lainnya' : 'Daftar rencana') + '</h2><span class="plan-count">' + (S.plans.length - (ft ? 1 : 0)) + '</span></div>';
  if (booting && !S.plans.length) h += '<p class="loading" role="status">Memuat rencana…</p>'; else if (!S.plans.length) h += '<div class="empty"><span class="empty-mark">—</span><p>Belum ada rencana.</p><small>Buat satu di bawah untuk mulai menyusun langkah.</small></div>';
  var cards = S.plans.length - (ft ? 1 : 0);
  h += '<div class="grid' + (cards > 1 ? ' tiles' : '') + '">';
  S.plans.forEach(function (p) {
    if (p === ft) return;
    var q = prog(p);
    h += cardHtml(p, q, S.plans.length > 1);
  });
  return h + '</div></section><section class="new"><div class="new-copy"><h2>Buat rencana baru</h2><p>Pilih template atau mulai dengan halaman kosong.</p></div><div class="new-form"><input type="text" id="nt" placeholder="Contoh: Liburan akhir tahun" aria-label="Judul rencana"><select id="tp" aria-label="Template rencana"><option value="kosong">Kosong</option><option value="liburan">Liburan</option><option value="acara">Acara</option><option value="pindahan">Pindahan</option></select><button class="btn pri" data-a="newplan">Buat rencana</button></div></section>';
}
function lists(p) {
  var h = '<div class="reorder-list">';
  p.sections.forEach(function (s) {
    var c = s.items.filter(function (i) { return i.d; }).length;
    h += '<details' + reorderAttrs('section', s.id) + ' data-s="' + s.id + '"' + (s.o ? ' open' : '') + '><summary><span><b>' + esc(s.t) + '</b><small>' + esc(s.w) + '</small></span>' + reorderHandle('bagian ' + s.t) + '<span class="cnt' + (s.items.length && c === s.items.length ? ' ok' : '') + '" id="c' + s.id + '">' + c + '/' + s.items.length + '</span></summary><ul>';
    s.items.forEach(function (i) {
      if (hideDone && !edit && i.d) return;
      h += '<li' + reorderAttrs('item', i.id, s.id) + (edit ? ' class="sortable-row"' : '') + '>' + reorderHandle('item ' + i.x) + (edit
        ? '<div class="row"><input type="text" data-f="x" data-s="' + s.id + '" data-i="' + i.id + '" value="' + esc(i.x) + '"><button class="x" data-a="deli" data-s="' + s.id + '" data-i="' + i.id + '" aria-label="Hapus">×</button></div>'
        : '<label><input type="checkbox" data-f="chk" data-s="' + s.id + '" data-i="' + i.id + '"' + (i.d ? ' checked' : '') + '><span>' + esc(i.x) + (i.n ? '<small class="nt">' + esc(i.n) + '</small>' : '') + '</span></label>') + '</li>';
    });
    h += '</ul>';
    if (!edit) h += '<form class="qa" data-qa="' + s.id + '"><input type="text" name="q" placeholder="Tambah item" aria-label="Tambah item ke ' + esc(s.t) + '" autocomplete="off"><button class="btn" type="submit">Tambah</button></form>';
    if (edit) h += '<div class="foot"><div class="row" style="padding:0"><input type="text" id="a' + s.id + '" placeholder="Tambah item"><button class="btn pri" data-a="addi" data-s="' + s.id + '">Tambah</button></div><div class="row" style="padding:0"><input type="text" data-f="st" data-s="' + s.id + '" value="' + esc(s.t) + '"><input type="text" data-f="sw" data-s="' + s.id + '" value="' + esc(s.w) + '" placeholder="Waktu" style="max-width:38%"></div><button class="btn dng" data-a="dels" data-s="' + s.id + '">Hapus bagian</button></div>';
    h += '</details>';
  });
  h += '</div>';
  if (edit) h += '<div class="new"><div class="row" style="padding:0"><input type="text" id="ns" placeholder="Bagian baru"><button class="btn pri" data-a="adds">Tambah</button></div></div>';
  return h;
}
function days(p) {
  var h = '<div class="reorder-list">';
  p.days.forEach(function (y) {
    h += '<div class="day"' + reorderAttrs('day', y.id) + '><header>' + reorderHandle('hari ' + y.t) + (edit
      ? '<div class="row" style="padding:0"><input type="date" data-f="dd" data-y="' + y.id + '" value="' + esc(y.date) + '"><input type="text" data-f="dt" data-y="' + y.id + '" value="' + esc(y.t) + '"></div>'
      : dayHead(y)) + '</header><ul>';
    y.stops.forEach(function (i) {
      h += '<li' + reorderAttrs('stop', i.id, y.id) + (edit ? ' class="sortable-row"' : '') + '>' + reorderHandle('kegiatan ' + i.x) + (edit
        ? '<div class="row"><input type="time" data-f="tm" data-y="' + y.id + '" data-i="' + i.id + '" value="' + esc(i.tm) + '" style="max-width:110px"><input type="text" data-f="sx" data-y="' + y.id + '" data-i="' + i.id + '" value="' + esc(i.x) + '"><button class="x" data-a="delt" data-y="' + y.id + '" data-i="' + i.id + '" aria-label="Hapus">×</button></div>'
        : '<label><input type="checkbox" data-f="schk" data-y="' + y.id + '" data-i="' + i.id + '"' + (i.d ? ' checked' : '') + '><span>' + (i.tm ? '<span class="tm">' + esc(i.tm) + '</span>' : '') + esc(i.x) + '</span></label>') + '</li>';
    });
    h += '</ul>';
    if (edit) h += '<div class="foot"><div class="row" style="padding:0"><input type="text" id="t' + y.id + '" placeholder="Tambah kegiatan"><button class="btn pri" data-a="addt" data-y="' + y.id + '">Tambah</button></div><button class="btn dng" data-a="deld" data-y="' + y.id + '">Hapus hari</button></div>';
    h += '</div>';
  });
  h += '</div>';
  if (!p.days.length) h += '<p style="color:var(--mu)">Belum ada jadwal.</p>';
  if (edit) h += '<button class="btn pri" data-a="addd" style="width:100%;margin-top:10px">Tambah hari</button>';
  return h;
}
function plan(p) {
  var r = prog(p), h = '<section class="hero" data-style="' + esc(p.style || 'gradient') + '" style="' + cover(p) + '"><div class="hr"><button class="ghost" data-a="home">‹ Semua rencana</button>' + pillHtml() + '</div><div class="hm"><div><div class="em">' + esc(p.emoji) + '</div>';
  if (edit) {
    h += '<input type="text" data-f="title" value="' + esc(p.title) + '"><input type="text" data-f="note" value="' + esc(p.note) + '" placeholder="Keterangan"><div class="row" style="padding:0"><input type="date" data-f="start" value="' + esc(p.start) + '"><input type="date" data-f="end" value="' + esc(p.end) + '"></div>';
  } else h += '<h1>' + esc(p.title) + '</h1><p>' + esc(p.note) + '</p>' + (cd(p) ? '<span class="chip">' + cd(p) + '</span>' : '');
  h += '</div><div id="hr">' + ring(r[2], 88) + '</div></div><div class="st" id="st" aria-live="polite">' + r[0] + ' dari ' + r[1] + ' selesai</div></section>';
  if (edit) h += styler(p);
  if (edit) h += '<p class="reorder-help">Seret pegangan untuk mengurutkan bagian, hari, dan item. Dengan keyboard, fokuskan pegangan lalu tekan Alt + panah atas/bawah.</p>';
  if (tab === 'c' && !edit) h += '<div class="toolbar"><button class="chip-btn" data-a="hide" aria-pressed="' + hideDone + '">Sembunyikan yang selesai</button></div>';
  h += tab === 'c' ? lists(p) : days(p);
  if (edit) h += '<button class="btn dng" data-a="delplan" style="margin-top:18px;width:100%">' + 'Hapus rencana ini' + '</button>';
  h += '<nav class="nav" aria-label="Navigasi rencana"><div>' +
    '<button class="tabbtn' + (tab === 'c' ? ' on' : '') + '" aria-pressed="' + (tab === 'c') + '" data-a="tab" data-v="c">' + IC.c + '<span>Checklist</span></button>' +
    '<button class="tabbtn' + (tab === 'j' ? ' on' : '') + '" aria-pressed="' + (tab === 'j') + '" data-a="tab" data-v="j">' + IC.j + '<span>Jadwal</span></button>' +
    '<button class="tabbtn edit' + (edit ? ' editing' : '') + '" aria-pressed="' + edit + '" data-a="edit">' + (edit ? IC.ok : IC.e) + '<span>' + (edit ? 'Selesai' : 'Ubah') + '</span></button></div></nav>';
  return h;
}
function render() { var p = cur && P(); if (cur && !p) cur = null; applyTheme(p); app.innerHTML = p ? plan(p) : home(); }
function upd() {
  var p = P(), r = prog(p); $('#hr').innerHTML = ring(r[2], 88); $('#st').textContent = r[0] + ' dari ' + r[1] + ' selesai';
  p.sections.forEach(function (s) { var e = document.getElementById('c' + s.id), c = s.items.filter(function (i) { return i.d; }).length; if (e) { e.textContent = c + '/' + s.items.length; e.className = 'cnt' + (s.items.length && c === s.items.length ? ' ok' : ''); } });
}
function snack(m, f) { undo = f || null; $('#snt').textContent = m; $('#sn button').style.display = f ? '' : 'none'; $('#sn').style.display = 'flex'; clearTimeout(snT); snT = setTimeout(function () { $('#sn').style.display = 'none'; undo = null; }, 6000); }
function reorderList(p, type, parent) {
  if (type === 'section') return p.sections;
  if (type === 'day') return p.days;
  if (type === 'item') { var section = Sx(p, parent); return section && section.items; }
  if (type === 'stop') { var day = Yx(p, parent); return day && day.stops; }
  return null;
}
function reorderContent(type, parent, fromId, toId, after) {
  var p = P(), list = p && reorderList(p, type, parent);
  if (!list) return;
  var from = list.findIndex(function (x) { return x.id === fromId; });
  var target = list.filter(function (x) { return x.id === toId; })[0];
  if (from < 0 || !target || fromId === toId) return;
  var original = list.map(function (x) { return x.id; });
  var focused = document.activeElement.closest && document.activeElement.closest('.reorder-handle');
  var moved = list.splice(from, 1)[0], targetIndex = list.indexOf(target);
  list.splice(targetIndex + (after ? 1 : 0), 0, moved);
  if (list.every(function (x, i) { return x.id === original[i]; })) return;
  touch(p); render();
  if (focused) {
    var handle = document.querySelector('[data-reorder-type="' + type + '"][data-reorder-id="' + fromId + '"] .reorder-handle');
    if (handle) handle.focus();
  }
  snack('Urutan diperbarui');
}
function sheet() {
  var el = $('#sheet'); if (!panel) { el.innerHTML = ''; return; }
  var h = '<div class="sheet" data-a="close"><div class="box" role="dialog" aria-modal="true" aria-labelledby="sh-t"><h2 id="sh-t">Sinkronisasi</h2><p role="status">Status: <b id="sh-st">' + LBL[st] + (st === 'err' ? ': ' + esc(serr) : '') + '</b></p><p>Data bersama dibaca dari <code>data.json</code> di GitHub. Perubahan disimpan ke repo, lalu bisa dibaca semua perangkat.</p><p>Masukkan kata sandi yang sama dengan nilai <code>SYNC_PASSWORD</code> di pengaturan Vercel:</p><form id="sync-form" autocomplete="on"><div class="row"><input type="password" name="syncpw" autocomplete="current-password" placeholder="' + (syncPassword ? 'Kata sandi tersimpan di perangkat ini' : 'Kata sandi sinkronisasi') + '"><button class="btn pri" type="submit">Simpan &amp; sinkron</button></div></form><p>Kata sandi hanya disimpan di perangkat ini, bukan di <code>config.js</code>.</p><div class="tools"><button class="btn" data-a="sync">Sinkron sekarang</button></div>';
  if (msg) h += '<div class="m">' + esc(msg) + '</div>';
  h += '<div class="tools"><button class="btn" data-a="exp">Ekspor JSON</button><button class="btn" data-a="imp">Impor JSON</button></div><button class="btn" data-a="close">Tutup</button></div></div>';
  el.innerHTML = h;
}

function closeSheet() { panel = false; msg = ''; sheet(); if (lastFocus && lastFocus.focus) lastFocus.focus(); }
document.addEventListener('keydown', function (e) {
  var t = e.target;
  if (e.key === 'Escape' && panel) return closeSheet();
  if (e.key === 'Tab' && panel) {
    var f = Array.prototype.slice.call(document.querySelectorAll('#sheet button, #sheet input')); if (!f.length) return;
    if (e.shiftKey && t === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && t === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  }
  if (e.key === 'Enter' && t.tagName === 'INPUT' && t.type === 'text' && t.id) {
    var btn = t.id === 'nt' ? document.querySelector('[data-a="newplan"]') : (/^(a|t|ns)/.test(t.id) && t.nextElementSibling && t.nextElementSibling.tagName === 'BUTTON' ? t.nextElementSibling : null);
    if (btn) { e.preventDefault(); btn.click(); }
  }
});

function clearPlanDropTargets() {
  document.querySelectorAll('.home-plan.drop-target').forEach(function (card) { card.classList.remove('drop-target'); });
}
function suppressNextCardClick() {
  suppressCardClick = true;
  setTimeout(function () { suppressCardClick = false; }, 0);
}
document.addEventListener('click', function (e) {
  if (!suppressCardClick) return;
  var card = e.target.closest && e.target.closest('.home-plan');
  if (card) { e.preventDefault(); e.stopImmediatePropagation(); }
}, true);
document.addEventListener('dragstart', function (e) {
  var card = e.target.closest && e.target.closest('.home-plan[draggable="true"]');
  if (!card) return;
  planDrag = { id: card.dataset.p, targetId: null, after: false };
  card.classList.add('dragging');
  if (e.dataTransfer) { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', card.dataset.p); }
});
document.addEventListener('dragover', function (e) {
  var card = e.target.closest && e.target.closest('.home-plan[draggable="true"]');
  if (!planDrag || !card || card.dataset.p === planDrag.id) return;
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
  clearPlanDropTargets();
  card.classList.add('drop-target');
  var rect = card.getBoundingClientRect();
  planDrag.targetId = card.dataset.p;
  planDrag.after = e.clientY > rect.top + rect.height / 2;
});
document.addEventListener('drop', function (e) {
  var card = e.target.closest && e.target.closest('.home-plan[draggable="true"]');
  if (!planDrag || !card || card.dataset.p === planDrag.id) return;
  e.preventDefault();
  var drag = planDrag, rect = card.getBoundingClientRect();
  drag.after = e.clientY > rect.top + rect.height / 2;
  planDrag = null;
  clearPlanDropTargets();
  suppressNextCardClick();
  reorderPlan(drag.id, card.dataset.p, drag.after);
});
document.addEventListener('dragend', function () {
  planDrag = null;
  clearPlanDropTargets();
  document.querySelectorAll('.home-plan.dragging').forEach(function (card) { card.classList.remove('dragging'); });
  suppressNextCardClick();
});
document.addEventListener('pointerdown', function (e) {
  if (e.pointerType === 'mouse' || e.button !== 0) return;
  var handle = e.target.closest && e.target.closest('.drag-hint');
  var card = handle && handle.closest('.home-plan[draggable="true"]');
  if (!card) return;
  e.preventDefault();
  touchPlanDrag = { id: card.dataset.p, card: card, pointerId: e.pointerId, x: e.clientX, y: e.clientY, dragging: false, targetId: null, after: false };
  if (card.setPointerCapture) card.setPointerCapture(e.pointerId);
});
document.addEventListener('pointermove', function (e) {
  var drag = touchPlanDrag;
  if (!drag || e.pointerId !== drag.pointerId) return;
  if (!drag.dragging && Math.max(Math.abs(e.clientX - drag.x), Math.abs(e.clientY - drag.y)) < 8) return;
  drag.dragging = true;
  e.preventDefault();
  drag.card.classList.add('dragging');
  var target = document.elementFromPoint(e.clientX, e.clientY);
  target = target && target.closest('.home-plan[draggable="true"]');
  clearPlanDropTargets();
  if (!target || target.dataset.p === drag.id) { drag.targetId = null; return; }
  target.classList.add('drop-target');
  var rect = target.getBoundingClientRect();
  drag.targetId = target.dataset.p;
  drag.after = e.clientY > rect.top + rect.height / 2;
});
document.addEventListener('pointerup', function (e) {
  var drag = touchPlanDrag;
  if (!drag || e.pointerId !== drag.pointerId) return;
  touchPlanDrag = null;
  clearPlanDropTargets();
  drag.card.classList.remove('dragging');
  if (drag.dragging) {
    suppressNextCardClick();
    if (drag.targetId) reorderPlan(drag.id, drag.targetId, drag.after);
  }
});
document.addEventListener('pointercancel', function () {
  if (!touchPlanDrag) return;
  touchPlanDrag.card.classList.remove('dragging');
  touchPlanDrag = null;
  clearPlanDropTargets();
});
document.addEventListener('keydown', function (e) {
  if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
  var card = e.target.closest && e.target.closest('.home-plan[draggable="true"]');
  if (!card) return;
  var cards = Array.prototype.slice.call(document.querySelectorAll('.home-plan[draggable="true"]'));
  var index = cards.indexOf(card), direction = e.key === 'ArrowUp' ? -1 : 1, target = cards[index + direction];
  e.preventDefault();
  if (target) reorderPlan(card.dataset.p, target.dataset.p, direction > 0);
});

var contentDrag = null, touchContentDrag = null, suppressContentClick = false;
function clearContentDropTargets() {
  document.querySelectorAll('[data-reorder-item].drop-target').forEach(function (item) { item.classList.remove('drop-target'); });
}
function sameContentList(a, b) {
  return a && b && a.type === b.dataset.reorderType && a.parent === b.dataset.reorderParent;
}
function contentDropRect(item) {
  var header = item.dataset.reorderType === 'section' ? item.querySelector('summary') : (item.dataset.reorderType === 'day' ? item.querySelector('header') : null);
  return (header || item).getBoundingClientRect();
}
function contentDragTarget(e) {
  var handle = e.target.closest && e.target.closest('.reorder-handle[draggable="true"]');
  return handle && handle.closest('[data-reorder-item]');
}
document.addEventListener('click', function (e) {
  if (!suppressContentClick) return;
  var item = e.target.closest && e.target.closest('[data-reorder-item]');
  if (item) { e.preventDefault(); e.stopImmediatePropagation(); }
}, true);
document.addEventListener('dragstart', function (e) {
  var item = contentDragTarget(e);
  if (!item) return;
  contentDrag = { type: item.dataset.reorderType, parent: item.dataset.reorderParent, id: item.dataset.reorderId };
  item.classList.add('dragging');
  if (e.dataTransfer) { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', contentDrag.id); }
});
document.addEventListener('dragover', function (e) {
  if (!contentDrag) return;
  var target = e.target.closest && e.target.closest('[data-reorder-item]');
  clearContentDropTargets();
  if (!sameContentList(contentDrag, target) || target.dataset.reorderId === contentDrag.id) return;
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
  target.classList.add('drop-target');
  var rect = contentDropRect(target);
  contentDrag.targetId = target.dataset.reorderId;
  contentDrag.after = e.clientY > rect.top + rect.height / 2;
});
document.addEventListener('drop', function (e) {
  if (!contentDrag) return;
  var target = e.target.closest && e.target.closest('[data-reorder-item]');
  if (!sameContentList(contentDrag, target) || target.dataset.reorderId === contentDrag.id) return;
  e.preventDefault();
  var drag = contentDrag, rect = contentDropRect(target);
  drag.after = e.clientY > rect.top + rect.height / 2;
  contentDrag = null;
  clearContentDropTargets();
  suppressContentClick = true;
  setTimeout(function () { suppressContentClick = false; }, 0);
  reorderContent(drag.type, drag.parent, drag.id, target.dataset.reorderId, drag.after);
});
document.addEventListener('dragend', function () {
  contentDrag = null;
  clearContentDropTargets();
  document.querySelectorAll('[data-reorder-item].dragging').forEach(function (item) { item.classList.remove('dragging'); });
  suppressContentClick = true;
  setTimeout(function () { suppressContentClick = false; }, 0);
});
document.addEventListener('pointerdown', function (e) {
  if (e.pointerType === 'mouse' || e.button !== 0) return;
  var handle = e.target.closest && e.target.closest('.reorder-handle[draggable="true"]');
  var item = handle && handle.closest('[data-reorder-item]');
  if (!item) return;
  e.preventDefault();
  touchContentDrag = { type: item.dataset.reorderType, parent: item.dataset.reorderParent, id: item.dataset.reorderId, item: item, pointerId: e.pointerId, x: e.clientX, y: e.clientY, dragging: false, targetId: null, after: false };
  if (item.setPointerCapture) item.setPointerCapture(e.pointerId);
});
document.addEventListener('pointermove', function (e) {
  var drag = touchContentDrag;
  if (!drag || e.pointerId !== drag.pointerId) return;
  if (!drag.dragging && Math.max(Math.abs(e.clientX - drag.x), Math.abs(e.clientY - drag.y)) < 8) return;
  drag.dragging = true;
  e.preventDefault();
  drag.item.classList.add('dragging');
  var target = document.elementFromPoint(e.clientX, e.clientY);
  target = target && target.closest('[data-reorder-item]');
  clearContentDropTargets();
  if (!sameContentList(drag, target) || target.dataset.reorderId === drag.id) { drag.targetId = null; return; }
  target.classList.add('drop-target');
  var rect = contentDropRect(target);
  drag.targetId = target.dataset.reorderId;
  drag.after = e.clientY > rect.top + rect.height / 2;
});
document.addEventListener('pointerup', function (e) {
  var drag = touchContentDrag;
  if (!drag || e.pointerId !== drag.pointerId) return;
  touchContentDrag = null;
  clearContentDropTargets();
  drag.item.classList.remove('dragging');
  if (!drag.dragging) return;
  suppressContentClick = true;
  setTimeout(function () { suppressContentClick = false; }, 0);
  if (drag.targetId) reorderContent(drag.type, drag.parent, drag.id, drag.targetId, drag.after);
});
document.addEventListener('pointercancel', function () {
  if (!touchContentDrag) return;
  touchContentDrag.item.classList.remove('dragging');
  touchContentDrag = null;
  clearContentDropTargets();
});
document.addEventListener('keydown', function (e) {
  if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
  var handle = e.target.closest && e.target.closest('.reorder-handle[draggable="true"]');
  var item = handle && handle.closest('[data-reorder-item]');
  if (!item) return;
  var type = item.dataset.reorderType, parent = item.dataset.reorderParent;
  var list = reorderList(P(), type, parent), index = list ? list.findIndex(function (x) { return x.id === item.dataset.reorderId; }) : -1;
  var direction = e.key === 'ArrowUp' ? -1 : 1, target = list && list[index + direction];
  e.preventDefault();
  if (target) reorderContent(type, parent, item.dataset.reorderId, target.id, direction > 0);
});

/* ---------- aksi ---------- */
function rm(arr, id, m, p) {
  var k = arr.findIndex(function (x) { return x.id === id; }), o = arr.splice(k, 1)[0];
  touch(p); snack(m, function () { arr.splice(k, 0, o); touch(p); render(); }); render();
}
document.addEventListener('submit', function (e) {
  var qa = e.target.dataset && e.target.dataset.qa;
  if (qa) {
    e.preventDefault();
    var p0 = P(), v0 = e.target.elements.q.value.trim(); if (!p0 || !v0) return;
    Sx(p0, qa).items.push(item(v0, 0)); touch(p0); render();
    var nf = document.querySelector('[data-qa="' + qa + '"] input'); if (nf) nf.focus();
    return;
  }
  if (e.target.id !== 'sync-form') return;
  e.preventDefault();
  var pw = e.target.querySelector('[name="syncpw"]').value;
  if (!pw.trim()) { msg = 'Masukkan kata sandi sinkronisasi.'; return sheet(); }
  syncPassword = pw; localStorage.setItem(PW, syncPassword); msg = 'Kata sandi tersimpan di perangkat ini.'; sheet(); sync();
});
document.addEventListener('click', function (e) {
  var b = e.target.closest('[data-a]'); if (!b) return;
  var a = b.dataset.a, d = b.dataset, p = cur && P();
  if (a === 'close') { if (e.target !== b) return; return closeSheet(); }
  if (a === 'panel') { lastFocus = document.activeElement; panel = true; sheet(); var f0 = $('#sheet input'); if (f0) f0.focus(); return; }
  if (a === 'undo') { if (undo) { undo(); undo = null; $('#sn').style.display = 'none'; } return; }
  if (a === 'sync') { return sync(); }
  if (a === 'exp') { var l = document.createElement('a'); l.href = URL.createObjectURL(new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' })); l.download = 'perencana-' + new Date().toISOString().slice(0, 10) + '.json'; l.click(); return; }
  if (a === 'imp') { return $('#file').click(); }
  if (a === 'open') { cur = d.p; tab = 'c'; edit = false; sure = false; gotoTop = true; }
  else if (a === 'home') { cur = null; edit = false; }
  else if (a === 'newplan') {
    var t2 = $('#nt').value.trim(); if (!t2) return;
    var n = norm({ title: t2, ord: Date.now(), sections: TPL[$('#tp').value].map(function (x) { return { t: x[0], w: '', o: true, items: x.slice(1) }; }) });
    S.plans.push(n); touch(n); cur = n.id; edit = true; tab = 'c';
  }
  else if (a === 'tab') { tab = d.v; gotoTop = true; }
  else if (a === 'hide') hideDone = !hideDone;
  else if (a === 'edit') edit = !edit;
  else if (a === 'color') { p.color = d.v; touch(p); }
  else if (a === 'style') { p.style = d.v; touch(p); }
  else if (a === 'emoji') { p.emoji = d.v; touch(p); }
  else if (a === 'addi') { var i = document.getElementById('a' + d.s), v = i.value.trim(); if (!v) return; Sx(p, d.s).items.push(item(v, 0)); touch(p); render(); document.getElementById('a' + d.s).focus(); return; }
  else if (a === 'deli') return rm(Sx(p, d.s).items, d.i, 'Item dihapus', p);
  else if (a === 'adds') { var v2 = $('#ns').value.trim(); if (!v2) return; p.sections.push({ id: uid(), t: v2, w: '', o: true, items: [] }); touch(p); }
  else if (a === 'dels') return rm(p.sections, d.s, 'Bagian dihapus', p);
  else if (a === 'addt') { var v3 = document.getElementById('t' + d.y).value.trim(); if (!v3) return; Yx(p, d.y).stops.push(item(v3, 1)); touch(p); render(); document.getElementById('t' + d.y).focus(); return; }
  else if (a === 'delt') return rm(Yx(p, d.y).stops, d.i, 'Kegiatan dihapus', p);
  else if (a === 'addd') { var lst = p.days[p.days.length - 1], dt = lst && lst.date ? new Date(lst.date + 'T00:00') : new Date(p.start || Date.now()); if (lst) dt.setDate(dt.getDate() + 1); p.days.push({ id: uid(), date: dt.toISOString().slice(0, 10), t: 'Hari baru', stops: [] }); touch(p); }
  else if (a === 'deld') return rm(p.days, d.y, 'Hari dihapus', p);
  else if (a === 'delplan') {
    var gone = p, gi = S.plans.indexOf(p);
    S.plans.splice(gi, 1); S.del[p.id] = Date.now(); saveLocal(); later(); cur = null; edit = false;
    snack('Rencana “' + gone.title + '” dihapus', function () { gone.u = Date.now(); S.plans.splice(gi, 0, gone); saveLocal(); later(); render(); });
  }
  render();
  if (gotoTop) { window.scrollTo(0, 0); gotoTop = false; }
});
document.addEventListener('change', function (e) {
  var t = e.target;
  if (t.id === 'file') {
    var f = t.files[0]; t.value = ''; if (!f) return;
    f.text().then(function (x) {
      var o = JSON.parse(x); if (!Array.isArray(o.plans)) throw 0;
      var inc = o.plans.map(norm); inc.forEach(function (q) { q.u = Date.now(); });
      S = merge({ plans: inc, del: {} }, S); saveLocal(); later(); render(); snack(inc.length + ' rencana diimpor');
    }).catch(function () { snack('File tidak valid'); });
    return;
  }
  var f2 = t.dataset.f; if (!f2 || !cur) return;
  var p = P(), v = t.value, s = t.dataset.s && Sx(p, t.dataset.s), y = t.dataset.y && Yx(p, t.dataset.y), id = t.dataset.i;
  var g = function (a) { return a.filter(function (x) { return x.id === id; })[0]; };
  if (f2 === 'chk') g(s.items).d = t.checked ? 1 : 0;
  else if (f2 === 'schk') g(y.stops).d = t.checked ? 1 : 0;
  else if (f2 === 'x') g(s.items).x = v || g(s.items).x;
  else if (f2 === 'sx') g(y.stops).x = v || g(y.stops).x;
  else if (f2 === 'tm') g(y.stops).tm = v;
  else if (f2 === 'st') s.t = v || s.t;
  else if (f2 === 'sw') s.w = v;
  else if (f2 === 'dd') y.date = v;
  else if (f2 === 'dt') y.t = v;
  else if (f2 === 'title') p.title = v.trim() || p.title;
  else p[f2] = v;
  touch(p);
  if (f2 === 'chk' || f2 === 'schk') upd();
  if (f2 === 'color' || f2 === 'emoji') render();
});
document.addEventListener('toggle', function (e) {
  var d = e.target, p = cur && P();
  if (p && d.dataset && d.dataset.s) { var s = Sx(p, d.dataset.s); if (s && !!s.o !== d.open) { s.o = d.open; saveLocal(); } }
}, true);
function again() { if (!document.hidden) sync(); }
setInterval(again, 20000); document.addEventListener('visibilitychange', again); window.addEventListener('focus', again);

/* ---------- mulai ---------- */
(async function boot() {
  var d = null; try { d = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
  var cached = d && Array.isArray(d.plans);
  if (!cached) { try { d = await open(await (await fetch('data.json', { cache: 'no-store' })).json()); } catch (e) { d = null; } }
  S = { plans: ((d && d.plans) || []).map(norm), del: (d && d.del) || {} };
  render(); document.body.classList.add('intro'); setTimeout(function () { document.body.classList.remove('intro'); }, 1400);
  sync().then(function () { booting = false; render(); });
})();
})();

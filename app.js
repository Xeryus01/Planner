(function () {
'use strict';
var C = Object.assign({ SECRET: '' }, window.CONFIG || {});
var KEY = 'perencana:v2', PW = 'perencana:sync-password', API = '/api/data';
var $ = function (s) { return document.querySelector(s); }, app = $('#app');
var COL = { teal: '#0e7c86', indigo: '#4f46e5', amber: '#c77d00', rose: '#d6336c', green: '#2f9e44' };
var TPL = {
  kosong: [],
  liburan: [['Dokumen', 'Paspor, tiket, asuransi', 'Penginapan dan transportasi dipesan'], ['Bawaan', 'Baju, obat, charger', 'Uang dan kartu'], ['Hari H', 'Cek dokumen dan kunci rumah']],
  acara: [['Persiapan', 'Tentukan tanggal dan tempat', 'Anggaran dan penanggung jawab'], ['Tamu dan undangan', 'Daftar tamu', 'Kirim undangan'], ['Hari H', 'Cek perlengkapan', 'Dokumentasi'], ['Setelah acara', 'Ucapan terima kasih', 'Bayar sisa tagihan']],
  pindahan: [['Sebelum pindah', 'Cari jasa angkut', 'Ubah alamat (bank, kantor, langganan)'], ['Packing', 'Kemas per ruangan dan beri label', 'Barang berharga dibawa sendiri'], ['Hari pindah', 'Cek meteran listrik dan air', 'Serah terima kunci'], ['Setelah pindah', 'Bongkar barang penting dulu', 'Lapor alamat baru']]
};
var LBL = { off: 'Lokal', busy: 'Menyinkronkan…', ok: 'Tersinkron', err: 'Gagal sinkron' };
var S = { plans: [], del: {} }, cur = null, tab = 'c', edit = false, st = 'off', serr = '', undo = null, sure = false, msg = '', panel = false, timer = null, snT = null, sT = null;
var syncPassword = localStorage.getItem(PW) || '';

function uid() { return Math.random().toString(36).slice(2, 9); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function clone(x) { return JSON.parse(JSON.stringify(x)); }
function item(i, stop) {
  if (typeof i === 'string') { var q = i.split('|'); i = stop ? (q.length > 1 ? { tm: q[0], x: q[1] } : { tm: '', x: q[0] }) : { x: q[0], n: q[1] || '' }; }
  i.id = i.id || uid(); i.d = i.d ? 1 : 0; return i;
}
function norm(p) {
  p.id = p.id || uid(); p.color = p.color || 'teal'; p.emoji = p.emoji || '📌'; p.title = p.title || 'Rencana'; p.note = p.note || '';
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
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" aria-label="' + v + ' persen selesai"><circle cx="' + h + '" cy="' + h + '" r="' + r + '" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="7"/><circle cx="' + h + '" cy="' + h + '" r="' + r + '" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-dasharray="' + c + '" stroke-dashoffset="' + c * (1 - v / 100) + '" transform="rotate(-90 ' + h + ' ' + h + ')"/><text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" fill="#fff" font-size="' + size / 3.6 + '" font-weight="700">' + v + '%</text></svg>';
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
function pill() { document.querySelectorAll('.pill').forEach(function (e) { e.className = 'pill ' + st; e.textContent = LBL[st]; }); if (panel) sheet(); }
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
    serr = errorMessage.indexOf('http 401') === 0 ? 'Kata sandi sinkronisasi salah atau belum diatur pada perangkat ini.' : errorMessage;
  }
  pill();
}
function later() { clearTimeout(sT); sT = setTimeout(sync, 1200); }
function touch(p) { p.u = Date.now(); saveLocal(); later(); }

/* ---------- tampilan ---------- */
function P() { return S.plans.filter(function (p) { return p.id === cur; })[0]; }
function Sx(p, id) { return p.sections.filter(function (s) { return s.id === id; })[0]; }
function Yx(p, id) { return p.days.filter(function (s) { return s.id === id; })[0]; }
function pillHtml() { return '<button class="pill ' + st + '" data-a="panel">' + LBL[st] + '</button>'; }
function home() {
  var h = '<header class="hd"><div><h1>Perencana</h1><p class="sub">Checklist dan jadwal untuk kegiatan apa pun</p></div>' + pillHtml() + '</header><div class="grid">';
  S.plans.forEach(function (p) {
    var q = prog(p);
    h += '<button class="card" data-a="open" data-p="' + p.id + '" style="--c:' + (COL[p.color] || COL.teal) + '"><div class="ct"><span class="em">' + esc(p.emoji) + '</span>' + ring(q[2], 58) + '</div><h2>' + esc(p.title) + '</h2><small>' + esc(cd(p) || p.note) + '</small><small>' + q[0] + ' dari ' + q[1] + ' selesai</small></button>';
  });
  return h + '</div><div class="new"><b>Rencana baru</b><input type="text" id="nt" placeholder="Judul, misalnya Pernikahan Sari"><select id="tp"><option value="kosong">Kosong</option><option value="liburan">Liburan</option><option value="acara">Acara</option><option value="pindahan">Pindahan</option></select><button class="btn pri" data-a="newplan">Buat rencana</button></div>';
}
function lists(p) {
  var h = '';
  p.sections.forEach(function (s) {
    var c = s.items.filter(function (i) { return i.d; }).length;
    h += '<details data-s="' + s.id + '"' + (s.o ? ' open' : '') + '><summary><span><b>' + esc(s.t) + '</b><small>' + esc(s.w) + '</small></span><span class="cnt' + (s.items.length && c === s.items.length ? ' ok' : '') + '" id="c' + s.id + '">' + c + '/' + s.items.length + '</span></summary><ul>';
    s.items.forEach(function (i) {
      h += '<li>' + (edit
        ? '<div class="row"><input type="text" data-f="x" data-s="' + s.id + '" data-i="' + i.id + '" value="' + esc(i.x) + '"><button class="x" data-a="deli" data-s="' + s.id + '" data-i="' + i.id + '" aria-label="Hapus">×</button></div>'
        : '<label><input type="checkbox" data-f="chk" data-s="' + s.id + '" data-i="' + i.id + '"' + (i.d ? ' checked' : '') + '><span>' + esc(i.x) + (i.n ? '<small class="nt">' + esc(i.n) + '</small>' : '') + '</span></label>') + '</li>';
    });
    h += '</ul>';
    if (edit) h += '<div class="foot"><div class="row" style="padding:0"><input type="text" id="a' + s.id + '" placeholder="Tambah item"><button class="btn pri" data-a="addi" data-s="' + s.id + '">Tambah</button></div><div class="row" style="padding:0"><input type="text" data-f="st" data-s="' + s.id + '" value="' + esc(s.t) + '"><input type="text" data-f="sw" data-s="' + s.id + '" value="' + esc(s.w) + '" placeholder="Waktu" style="max-width:38%"></div><button class="btn dng" data-a="dels" data-s="' + s.id + '">Hapus bagian</button></div>';
    h += '</details>';
  });
  if (edit) h += '<div class="new"><div class="row" style="padding:0"><input type="text" id="ns" placeholder="Bagian baru"><button class="btn pri" data-a="adds">Tambah</button></div></div>';
  return h;
}
function days(p) {
  var h = '';
  p.days.forEach(function (y) {
    h += '<div class="day"><header>' + (edit
      ? '<div class="row" style="padding:0"><input type="date" data-f="dd" data-y="' + y.id + '" value="' + esc(y.date) + '"><input type="text" data-f="dt" data-y="' + y.id + '" value="' + esc(y.t) + '"></div>'
      : '<span class="dd">' + esc(fd(y.date)) + '</span><h2>' + esc(y.t) + '</h2>') + '</header><ul>';
    y.stops.forEach(function (i) {
      h += '<li>' + (edit
        ? '<div class="row"><input type="time" data-f="tm" data-y="' + y.id + '" data-i="' + i.id + '" value="' + esc(i.tm) + '" style="max-width:110px"><input type="text" data-f="sx" data-y="' + y.id + '" data-i="' + i.id + '" value="' + esc(i.x) + '"><button class="x" data-a="delt" data-y="' + y.id + '" data-i="' + i.id + '" aria-label="Hapus">×</button></div>'
        : '<label><input type="checkbox" data-f="schk" data-y="' + y.id + '" data-i="' + i.id + '"' + (i.d ? ' checked' : '') + '><span>' + (i.tm ? '<span class="tm">' + esc(i.tm) + '</span>' : '') + esc(i.x) + '</span></label>') + '</li>';
    });
    h += '</ul>';
    if (edit) h += '<div class="foot"><div class="row" style="padding:0"><input type="text" id="t' + y.id + '" placeholder="Tambah kegiatan"><button class="btn pri" data-a="addt" data-y="' + y.id + '">Tambah</button></div><button class="btn dng" data-a="deld" data-y="' + y.id + '">Hapus hari</button></div>';
    h += '</div>';
  });
  if (!p.days.length) h += '<p style="color:var(--mu)">Belum ada jadwal.</p>';
  if (edit) h += '<button class="btn pri" data-a="addd" style="width:100%;margin-top:10px">Tambah hari</button>';
  return h;
}
function plan(p) {
  var r = prog(p), h = '<section class="hero" style="--c:' + (COL[p.color] || COL.teal) + '"><div class="hr"><button class="ghost" data-a="home">‹ Semua rencana</button>' + pillHtml() + '</div><div class="hm"><div><div class="em">' + esc(p.emoji) + '</div>';
  if (edit) {
    h += '<input type="text" data-f="title" value="' + esc(p.title) + '"><input type="text" data-f="note" value="' + esc(p.note) + '" placeholder="Keterangan"><div class="row" style="padding:0"><input type="date" data-f="start" value="' + esc(p.start) + '"><input type="date" data-f="end" value="' + esc(p.end) + '"></div><div class="row" style="padding:4px 0;flex-wrap:wrap"><input type="text" data-f="emoji" value="' + esc(p.emoji) + '" style="max-width:70px;width:70px">';
    Object.keys(COL).forEach(function (k) { h += '<span class="dot" data-a="color" data-v="' + k + '" style="background:' + COL[k] + '"></span>'; });
    h += '</div>';
  } else h += '<h1>' + esc(p.title) + '</h1><p>' + esc(p.note) + '</p>' + (cd(p) ? '<span class="chip">' + cd(p) + '</span>' : '');
  h += '</div><div id="hr">' + ring(r[2], 88) + '</div></div><div class="st" id="st">' + r[0] + ' dari ' + r[1] + ' selesai</div></section>';
  h += tab === 'c' ? lists(p) : days(p);
  if (edit) h += '<button class="btn dng" data-a="delplan" style="margin-top:18px;width:100%">' + (sure ? 'Ketuk lagi untuk menghapus permanen' : 'Hapus rencana ini') + '</button>';
  h += '<nav class="nav"><div><button class="btn ' + (tab === 'c' ? 'on' : '') + '" data-a="tab" data-v="c"><span>✅</span>Checklist</button><button class="btn ' + (tab === 'j' ? 'on' : '') + '" data-a="tab" data-v="j"><span>🗓️</span>Jadwal</button><button class="btn ' + (edit ? 'pri' : '') + '" data-a="edit"><span>' + (edit ? '✔️' : '✏️') + '</span>' + (edit ? 'Selesai' : 'Ubah') + '</button></div></nav>';
  return h;
}
function render() { var p = cur && P(); if (cur && !p) cur = null; app.innerHTML = p ? plan(p) : home(); }
function upd() {
  var p = P(), r = prog(p); $('#hr').innerHTML = ring(r[2], 88); $('#st').textContent = r[0] + ' dari ' + r[1] + ' selesai';
  p.sections.forEach(function (s) { var e = document.getElementById('c' + s.id), c = s.items.filter(function (i) { return i.d; }).length; if (e) { e.textContent = c + '/' + s.items.length; e.className = 'cnt' + (s.items.length && c === s.items.length ? ' ok' : ''); } });
}
function snack(m, f) { undo = f || null; $('#snt').textContent = m; $('#sn button').style.display = f ? '' : 'none'; $('#sn').style.display = 'flex'; clearTimeout(snT); snT = setTimeout(function () { $('#sn').style.display = 'none'; undo = null; }, 6000); }
function sheet() {
  var el = $('#sheet'); if (!panel) { el.innerHTML = ''; return; }
  var h = '<div class="sheet" data-a="close"><div class="box"><h2>Sinkronisasi</h2><p>Status: <b>' + LBL[st] + '</b>' + (st === 'err' ? ' · ' + esc(serr) : '') + '</p><p>Data bersama dibaca dari <code>data.json</code> di GitHub. Perubahan disimpan ke repo, lalu bisa dibaca semua perangkat.</p><p>Masukkan kata sandi yang sama dengan nilai <code>SYNC_PASSWORD</code> di pengaturan Vercel:</p><div class="row"><input type="password" id="syncpw" autocomplete="current-password" placeholder="' + (syncPassword ? 'Kata sandi tersimpan di perangkat ini' : 'Kata sandi sinkronisasi') + '"><button class="btn pri" data-a="savepw">Simpan &amp; sinkron</button></div><p>Kata sandi hanya disimpan di perangkat ini, bukan di <code>config.js</code>.</p><div class="tools"><button class="btn" data-a="sync">Sinkron sekarang</button></div>';
  if (msg) h += '<div class="m">' + esc(msg) + '</div>';
  h += '<div class="tools"><button class="btn" data-a="exp">Ekspor JSON</button><button class="btn" data-a="imp">Impor JSON</button></div><button class="btn" data-a="close">Tutup</button></div></div>';
  el.innerHTML = h;
}

/* ---------- aksi ---------- */
function rm(arr, id, m, p) {
  var k = arr.findIndex(function (x) { return x.id === id; }), o = arr.splice(k, 1)[0];
  touch(p); snack(m, function () { arr.splice(k, 0, o); touch(p); render(); }); render();
}
document.addEventListener('click', function (e) {
  var b = e.target.closest('[data-a]'); if (!b) return;
  var a = b.dataset.a, d = b.dataset, p = cur && P();
  if (a === 'close') { if (e.target !== b) return; panel = false; msg = ''; return sheet(); }
  if (a === 'panel') { panel = true; return sheet(); }
  if (a === 'undo') { if (undo) { undo(); undo = null; $('#sn').style.display = 'none'; } return; }
  if (a === 'sync') { return sync(); }
  if (a === 'savepw') {
    var pw = $('#syncpw').value;
    if (!pw.trim()) { msg = 'Masukkan kata sandi sinkronisasi.'; return sheet(); }
    syncPassword = pw; localStorage.setItem(PW, syncPassword); msg = 'Kata sandi tersimpan di perangkat ini.'; sheet(); sync();
    return;
  }
  if (a === 'exp') { var l = document.createElement('a'); l.href = URL.createObjectURL(new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' })); l.download = 'perencana-' + new Date().toISOString().slice(0, 10) + '.json'; l.click(); return; }
  if (a === 'imp') { return $('#file').click(); }
  if (a === 'open') { cur = d.p; tab = 'c'; edit = false; sure = false; }
  else if (a === 'home') { cur = null; edit = false; }
  else if (a === 'newplan') {
    var t2 = $('#nt').value.trim(); if (!t2) return;
    var n = norm({ title: t2, ord: Date.now(), sections: TPL[$('#tp').value].map(function (x) { return { t: x[0], w: '', o: true, items: x.slice(1) }; }) });
    S.plans.push(n); touch(n); cur = n.id; edit = true; tab = 'c';
  }
  else if (a === 'tab') tab = d.v;
  else if (a === 'edit') edit = !edit;
  else if (a === 'color') { p.color = d.v; touch(p); }
  else if (a === 'addi') { var i = document.getElementById('a' + d.s), v = i.value.trim(); if (!v) return; Sx(p, d.s).items.push(item(v, 0)); touch(p); render(); document.getElementById('a' + d.s).focus(); return; }
  else if (a === 'deli') return rm(Sx(p, d.s).items, d.i, 'Item dihapus', p);
  else if (a === 'adds') { var v2 = $('#ns').value.trim(); if (!v2) return; p.sections.push({ id: uid(), t: v2, w: '', o: true, items: [] }); touch(p); }
  else if (a === 'dels') return rm(p.sections, d.s, 'Bagian dihapus', p);
  else if (a === 'addt') { var v3 = document.getElementById('t' + d.y).value.trim(); if (!v3) return; Yx(p, d.y).stops.push(item(v3, 1)); touch(p); render(); document.getElementById('t' + d.y).focus(); return; }
  else if (a === 'delt') return rm(Yx(p, d.y).stops, d.i, 'Kegiatan dihapus', p);
  else if (a === 'addd') { var lst = p.days[p.days.length - 1], dt = lst && lst.date ? new Date(lst.date + 'T00:00') : new Date(p.start || Date.now()); if (lst) dt.setDate(dt.getDate() + 1); p.days.push({ id: uid(), date: dt.toISOString().slice(0, 10), t: 'Hari baru', stops: [] }); touch(p); }
  else if (a === 'deld') return rm(p.days, d.y, 'Hari dihapus', p);
  else if (a === 'delplan') {
    if (!sure) { sure = true; b.textContent = 'Ketuk lagi untuk menghapus permanen'; return; }
    S.plans = S.plans.filter(function (x) { return x.id !== p.id; }); S.del[p.id] = Date.now(); saveLocal(); later(); cur = null; edit = false; sure = false;
  }
  render();
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
  if (!cached) { try { d = await (await fetch('data.json', { cache: 'no-store' })).json(); } catch (e) { d = { plans: [] }; } }
  S = { plans: d.plans.map(norm), del: d.del || {} };
  render(); sync();
})();
})();

'use client';
import { useEffect, useRef, useState } from 'react';
import seed from './seed.json';

const KEY = 'perencana:v1';
const COL = { teal: '#0e7c86', indigo: '#4f46e5', amber: '#c77d00', rose: '#d6336c', green: '#2f9e44' };
const TPL = {
  kosong: [],
  liburan: [['Dokumen', 'Paspor, tiket, asuransi', 'Penginapan dan transportasi dipesan'], ['Bawaan', 'Baju, obat, charger', 'Uang dan kartu'], ['Hari H', 'Cek dokumen dan kunci rumah']],
  acara: [['Persiapan', 'Tentukan tanggal dan tempat', 'Anggaran dan penanggung jawab'], ['Tamu dan undangan', 'Daftar tamu', 'Kirim undangan'], ['Hari H', 'Cek perlengkapan', 'Dokumentasi'], ['Setelah acara', 'Ucapan terima kasih', 'Bayar sisa tagihan']],
  pindahan: [['Sebelum pindah', 'Cari jasa angkut', 'Ubah alamat (bank, kantor, langganan)'], ['Packing', 'Kemas per ruangan dan beri label', 'Barang berharga dibawa sendiri'], ['Hari pindah', 'Cek meteran listrik dan air', 'Serah terima kunci'], ['Setelah pindah', 'Bongkar barang penting dulu', 'Lapor alamat baru']],
};
const uid = () => Math.random().toString(36).slice(2, 9);
const clone = (x) => JSON.parse(JSON.stringify(x));
function item(i, stop) {
  if (typeof i === 'string') { const q = i.split('|'); i = stop ? (q.length > 1 ? { tm: q[0], x: q[1] } : { tm: '', x: q[0] }) : { x: q[0], n: q[1] || '' }; }
  return { ...i, id: i.id || uid(), d: i.d ? 1 : 0 };
}
function norm(p) {
  return {
    ...p, id: p.id || uid(), color: p.color || 'teal', emoji: p.emoji || '📌', title: p.title || 'Rencana', note: p.note || '',
    sections: (p.sections || []).map((s) => ({ ...s, id: s.id || uid(), items: (s.items || []).map((i) => item(i, 0)) })),
    days: (p.days || []).map((y) => ({ ...y, id: y.id || uid(), stops: (y.stops || []).map((i) => item(i, 1)) })),
  };
}
function prog(p) {
  let a = 0, d = 0;
  p.sections.forEach((s) => s.items.forEach((i) => { a++; d += i.d; }));
  p.days.forEach((y) => y.stops.forEach((i) => { a++; d += i.d; }));
  return [d, a, a ? Math.round((d / a) * 100) : 0];
}
function cd(p) {
  if (!p.start) return '';
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const s = new Date(p.start), e = new Date(p.end || p.start), n = Math.round((s - t) / 864e5);
  return n > 0 ? 'H-' + n : t <= e ? (n === 0 ? 'Hari ini' : 'Sedang berlangsung') : 'Selesai';
}
const fd = (d) => (d ? new Date(d + 'T00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }) : '');

export default function App() {
  const [plans, setPlans] = useState(null);
  const [cur, setCur] = useState(null);
  const [tab, setTab] = useState('c');
  const [edit, setEdit] = useState(false);
  const [sn, setSn] = useState(null);
  const [adds, setAdds] = useState({});
  const [nt, setNt] = useState('');
  const [tp, setTp] = useState('kosong');
  const [sure, setSure] = useState(false);
  const file = useRef(null);

  useEffect(() => {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
    setPlans((d && Array.isArray(d.plans) ? d.plans : seed.plans).map(norm));
  }, []);
  useEffect(() => { if (plans) try { localStorage.setItem(KEY, JSON.stringify({ plans })); } catch (e) {} }, [plans]);
  useEffect(() => { if (sn) { const t = setTimeout(() => setSn(null), 6000); return () => clearTimeout(t); } }, [sn]);

  if (!plans) return null;
  const p = cur && plans.find((x) => x.id === cur);
  const mut = (fn) => setPlans((prev) => { const n = clone(prev); fn(n); return n; });
  const ed = (fn) => mut((n) => fn(n.find((x) => x.id === cur)));
  const sec = (q, id) => q.sections.find((s) => s.id === id);
  const day = (q, id) => q.days.find((s) => s.id === id);
  const rm = (get, id, msg) => {
    const arr = get(p), k = arr.findIndex((x) => x.id === id), o = clone(arr[k]), pid = cur;
    ed((q) => get(q).splice(k, 1));
    setSn({ msg, undo: () => mut((n) => get(n.find((x) => x.id === pid)).splice(k, 0, o)) });
  };
  const setAdd = (k, v) => setAdds((a) => ({ ...a, [k]: v }));
  const open = (id) => { setCur(id); setTab('c'); setEdit(false); setSure(false); };

  const create = () => {
    const t = nt.trim(); if (!t) return;
    const n = norm({ title: t, ord: Date.now(), sections: TPL[tp].map((x) => ({ t: x[0], w: '', o: true, items: x.slice(1) })) });
    setPlans((pl) => [...pl, n]); setNt(''); setCur(n.id); setEdit(true); setTab('c');
  };
  const exportJson = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify({ plans }, null, 2)], { type: 'application/json' }));
    a.download = 'perencana-' + new Date().toISOString().slice(0, 10) + '.json'; a.click();
  };
  const importJson = async (e) => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try {
      const d = JSON.parse(await f.text()); if (!Array.isArray(d.plans)) throw 0;
      const inc = d.plans.map(norm);
      setPlans((prev) => { const m = [...prev]; inc.forEach((x) => { const k = m.findIndex((y) => y.id === x.id); if (k < 0) m.push(x); else m[k] = x; }); return m; });
      setSn({ msg: inc.length + ' rencana diimpor' });
    } catch (err) { setSn({ msg: 'File tidak valid' }); }
  };

  const r = p && prog(p);
  return (
    <main>
      {!p && (
        <>
          <h1>Perencana</h1>
          <p style={{ color: 'var(--mu)', margin: '4px 0 0' }}>Checklist dan jadwal untuk liburan, acara, atau kegiatan apa pun.</p>
          <div className="grid">
            {plans.map((x) => { const q = prog(x); return (
              <button key={x.id} className="card" style={{ '--c': COL[x.color] || COL.teal }} onClick={() => open(x.id)}>
                <span className="em">{x.emoji}</span><h2>{x.title}</h2><small>{cd(x) || x.note}</small>
                <div className="bar"><i style={{ width: q[2] + '%' }} /></div><small>{q[0]} dari {q[1]} selesai</small>
              </button>); })}
          </div>
          <div className="new">
            <b>Rencana baru</b>
            <input type="text" value={nt} onChange={(e) => setNt(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && create()} placeholder="Judul, misalnya Pernikahan Sari" />
            <select value={tp} onChange={(e) => setTp(e.target.value)}>
              <option value="kosong">Kosong</option><option value="liburan">Liburan</option><option value="acara">Acara</option><option value="pindahan">Pindahan</option>
            </select>
            <button className="btn pri" onClick={create}>Buat rencana</button>
          </div>
          <div className="tools">
            <button className="btn" onClick={exportJson}>Ekspor JSON</button>
            <button className="btn" onClick={() => file.current.click()}>Impor JSON</button>
            <input ref={file} type="file" accept="application/json,.json" hidden onChange={importJson} />
          </div>
          <p style={{ color: 'var(--mu)', fontSize: 13 }}>Data tersimpan di browser perangkat ini. Pakai Ekspor dan Impor untuk cadangan atau memindahkan ke perangkat lain.</p>
        </>
      )}
      {p && (
        <>
          <section className="hero" style={{ '--c': COL[p.color] || COL.teal }}>
            <button className="ghost" onClick={() => { setCur(null); setEdit(false); }}>‹ Semua rencana</button>
            <div className="em">{p.emoji}</div>
            {edit ? (
              <>
                <input type="text" defaultValue={p.title} onBlur={(e) => ed((q) => { q.title = e.target.value.trim() || q.title; })} />
                <input type="text" defaultValue={p.note} placeholder="Keterangan" onBlur={(e) => ed((q) => { q.note = e.target.value; })} />
                <div className="row" style={{ padding: 0 }}>
                  <input type="date" defaultValue={p.start} onBlur={(e) => ed((q) => { q.start = e.target.value; })} />
                  <input type="date" defaultValue={p.end} onBlur={(e) => ed((q) => { q.end = e.target.value; })} />
                </div>
                <div className="row" style={{ padding: '4px 0' }}>
                  <input type="text" defaultValue={p.emoji} style={{ maxWidth: 70 }} onBlur={(e) => ed((q) => { q.emoji = e.target.value || q.emoji; })} />
                  {Object.keys(COL).map((k) => <span key={k} className="dot" style={{ background: COL[k] }} onClick={() => ed((q) => { q.color = k; })} />)}
                </div>
              </>
            ) : (
              <>
                <h1>{p.title}</h1><p>{p.note}</p>
                {cd(p) && <span className="chip">{cd(p)}</span>}
              </>
            )}
            <div className="bar"><i style={{ width: r[2] + '%' }} /></div>
            <div className="st"><span>{r[2]}%</span><span>{r[0]} dari {r[1]} selesai</span></div>
          </section>
          <div className="tabs">
            <button className={'btn ' + (tab === 'c' ? 'on' : '')} onClick={() => setTab('c')}>Checklist</button>
            <button className={'btn ' + (tab === 'j' ? 'on' : '')} onClick={() => setTab('j')}>Jadwal</button>
            <button className={'btn ' + (edit ? 'pri' : '')} onClick={() => setEdit(!edit)}>{edit ? 'Selesai' : 'Ubah'}</button>
          </div>

          {tab === 'c' && (
            <>
              {p.sections.map((s) => {
                const c = s.items.filter((i) => i.d).length;
                return (
                  <details key={s.id} open={!!s.o} onToggle={(e) => { if (e.target.open !== !!s.o) ed((q) => { sec(q, s.id).o = e.target.open; }); }}>
                    <summary>
                      <span><b>{s.t}</b><small>{s.w}</small></span>
                      <span className={'cnt' + (s.items.length && c === s.items.length ? ' ok' : '')}>{c}/{s.items.length}</span>
                    </summary>
                    <ul>
                      {s.items.map((i) => (
                        <li key={i.id}>
                          {edit ? (
                            <div className="row">
                              <input type="text" defaultValue={i.x} onBlur={(e) => ed((q) => { sec(q, s.id).items.find((z) => z.id === i.id).x = e.target.value || i.x; })} />
                              <button className="x" aria-label="Hapus" onClick={() => rm((q) => sec(q, s.id).items, i.id, 'Item dihapus')}>×</button>
                            </div>
                          ) : (
                            <label>
                              <input type="checkbox" checked={!!i.d} onChange={(e) => ed((q) => { sec(q, s.id).items.find((z) => z.id === i.id).d = e.target.checked ? 1 : 0; })} />
                              <span>{i.x}{i.n && <small className="nt">{i.n}</small>}</span>
                            </label>
                          )}
                        </li>
                      ))}
                    </ul>
                    {edit && (
                      <div className="foot">
                        <div className="row" style={{ padding: 0 }}>
                          <input type="text" value={adds['i' + s.id] || ''} placeholder="Tambah item" onChange={(e) => setAdd('i' + s.id, e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (adds['i' + s.id] || '').trim() && (ed((q) => sec(q, s.id).items.push(item(adds['i' + s.id].trim(), 0))), setAdd('i' + s.id, ''))} />
                          <button className="btn pri" onClick={() => { const v = (adds['i' + s.id] || '').trim(); if (v) { ed((q) => sec(q, s.id).items.push(item(v, 0))); setAdd('i' + s.id, ''); } }}>Tambah</button>
                        </div>
                        <div className="row" style={{ padding: 0 }}>
                          <input type="text" defaultValue={s.t} onBlur={(e) => ed((q) => { sec(q, s.id).t = e.target.value || s.t; })} />
                          <input type="text" defaultValue={s.w} placeholder="Waktu" style={{ maxWidth: '38%' }} onBlur={(e) => ed((q) => { sec(q, s.id).w = e.target.value; })} />
                        </div>
                        <button className="btn dng" onClick={() => rm((q) => q.sections, s.id, 'Bagian dihapus')}>Hapus bagian</button>
                      </div>
                    )}
                  </details>
                );
              })}
              {edit && (
                <div className="new">
                  <div className="row" style={{ padding: 0 }}>
                    <input type="text" value={adds.ns || ''} placeholder="Bagian baru" onChange={(e) => setAdd('ns', e.target.value)} />
                    <button className="btn pri" onClick={() => { const v = (adds.ns || '').trim(); if (v) { ed((q) => q.sections.push({ id: uid(), t: v, w: '', o: true, items: [] })); setAdd('ns', ''); } }}>Tambah</button>
                  </div>
                </div>
              )}
            </>
          )}

          {tab === 'j' && (
            <>
              {!p.days.length && <p style={{ color: 'var(--mu)' }}>Belum ada jadwal.</p>}
              {p.days.map((y) => (
                <div className="day" key={y.id}>
                  <header>
                    {edit ? (
                      <div className="row" style={{ padding: 0 }}>
                        <input type="date" defaultValue={y.date} onBlur={(e) => ed((q) => { day(q, y.id).date = e.target.value; })} />
                        <input type="text" defaultValue={y.t} onBlur={(e) => ed((q) => { day(q, y.id).t = e.target.value; })} />
                      </div>
                    ) : (<><span className="dd">{fd(y.date)}</span><h2>{y.t}</h2></>)}
                  </header>
                  <ul>
                    {y.stops.map((i) => (
                      <li key={i.id}>
                        {edit ? (
                          <div className="row">
                            <input type="time" defaultValue={i.tm} style={{ maxWidth: 110 }} onBlur={(e) => ed((q) => { day(q, y.id).stops.find((z) => z.id === i.id).tm = e.target.value; })} />
                            <input type="text" defaultValue={i.x} onBlur={(e) => ed((q) => { day(q, y.id).stops.find((z) => z.id === i.id).x = e.target.value || i.x; })} />
                            <button className="x" aria-label="Hapus" onClick={() => rm((q) => day(q, y.id).stops, i.id, 'Kegiatan dihapus')}>×</button>
                          </div>
                        ) : (
                          <label>
                            <input type="checkbox" checked={!!i.d} onChange={(e) => ed((q) => { day(q, y.id).stops.find((z) => z.id === i.id).d = e.target.checked ? 1 : 0; })} />
                            <span>{i.tm && <span className="tm">{i.tm}</span>}{i.x}</span>
                          </label>
                        )}
                      </li>
                    ))}
                  </ul>
                  {edit && (
                    <div className="foot">
                      <div className="row" style={{ padding: 0 }}>
                        <input type="text" value={adds['t' + y.id] || ''} placeholder="Tambah kegiatan" onChange={(e) => setAdd('t' + y.id, e.target.value)} />
                        <button className="btn pri" onClick={() => { const v = (adds['t' + y.id] || '').trim(); if (v) { ed((q) => day(q, y.id).stops.push(item(v, 1))); setAdd('t' + y.id, ''); } }}>Tambah</button>
                      </div>
                      <button className="btn dng" onClick={() => rm((q) => q.days, y.id, 'Hari dihapus')}>Hapus hari</button>
                    </div>
                  )}
                </div>
              ))}
              {edit && (
                <button className="btn pri" style={{ width: '100%', marginTop: 10 }} onClick={() => ed((q) => {
                  const l = q.days[q.days.length - 1], dt = l && l.date ? new Date(l.date + 'T00:00') : new Date(q.start || Date.now());
                  if (l) dt.setDate(dt.getDate() + 1);
                  q.days.push({ id: uid(), date: dt.toISOString().slice(0, 10), t: 'Hari baru', stops: [] });
                })}>Tambah hari</button>
              )}
            </>
          )}

          {edit && (
            <button className="btn dng" style={{ marginTop: 18, width: '100%' }} onClick={() => {
              if (!sure) { setSure(true); return; }
              mut((n) => { n.splice(n.findIndex((x) => x.id === cur), 1); }); setCur(null); setEdit(false); setSure(false);
            }}>{sure ? 'Ketuk lagi untuk menghapus permanen' : 'Hapus rencana ini'}</button>
          )}
        </>
      )}
      {sn && (
        <div className="sn" role="status" style={{ display: 'flex' }}>
          <span>{sn.msg}</span>
          {sn.undo && <button onClick={() => { sn.undo(); setSn(null); }}>Urungkan</button>}
        </div>
      )}
    </main>
  );
}

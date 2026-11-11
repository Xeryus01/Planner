# Perencana

Checklist + jadwal untuk liburan, acara, pindahan, atau kegiatan apa pun. Next.js (App Router) sisi klien: tanpa API route, database, atau environment variable.

## Deploy ke Vercel (tanpa pengaturan)
Push folder ini ke GitHub (atau `npx vercel`), import di Vercel, Deploy.

## Lokal
`npm install` lalu `npm run dev`.

## Data dan sinkronisasi
- Data berupa JSON, disimpan di `localStorage` perangkat (jalan offline).
- Sinkron antar perangkat: ketuk status di pojok kanan atas, isi kata sandi, **Buat kode baru**. Di perangkat lain pilih **Hubungkan** dengan kode dan kata sandi yang sama.
- Dokumen JSON dienkripsi di browser (AES-GCM, kunci dari kata sandi) sebelum dikirim ke layanan JSONBlob (jsonblob.com, gratis tanpa akun). Layanan hanya melihat data terenkripsi. Kata sandi tidak dikirim, dan jika lupa, data di server tidak bisa dipulihkan.
- Penggabungan per rencana berdasarkan waktu ubah terbaru, dengan penanda untuk rencana yang dihapus. Dua orang mengubah rencana yang sama bersamaan: perubahan terbaru menang.
- Ketergantungan pada layanan pihak ketiga. Untuk mengganti, ubah `API` di `app/sync.js` ke layanan yang punya GET/PUT JSON dengan CORS.
- Cadangan: **Ekspor JSON** dan **Impor JSON**.
- Rencana awal "Liburan Malaysia" ada di `app/seed.json` dan ikut ke bundel publik; kosongkan `plans` jika URL dibagikan.

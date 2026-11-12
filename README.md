# Perencana

Checklist + jadwal untuk liburan, acara, pindahan, atau kegiatan apa pun. Next.js (App Router) sisi klien: tanpa API route, database, atau environment variable.

## Deploy ke Vercel (tanpa pengaturan)
Push folder ini ke GitHub (atau `npx vercel`), import di Vercel, Deploy.

## Lokal
`npm install` lalu `npm run dev`.

## Data dan sinkronisasi
- Data berupa JSON, disimpan di `localStorage` perangkat (jalan offline).
- Sinkron tanpa akun (bawaan): di panel sinkron isi kata sandi lalu **Aktifkan sinkron**. Data terenkripsi disimpan di json.extendsclass.com (publik, maks. 100 KB, bisa dihapus layanan jika lama tidak dipakai). Perangkat lain: buka tautan dari **Bagikan tautan sinkron** sekali.
- Opsi GitHub Gist (lebih awet):  ketuk status di pojok kanan atas, buat token GitHub (klasik, izin `gist`, tanpa kedaluwarsa), tempel token dan isi kata sandi, lalu **Hubungkan**. Lakukan hal yang sama di perangkat lain dengan token dan kata sandi yang sama; aplikasi otomatis menemukan Gist `perencana.json` di akun Anda.
- **Perangkat lain tanpa mengetik ulang**: di panel sinkron ketuk **Bagikan tautan sinkron**, lalu buka tautan itu sekali di perangkat lain. Token dan kata sandi dibawa di bagian `#` URL (tidak dikirim ke server), langsung tersimpan, dan setelah itu perangkat tersebut otomatis sinkron tiap dibuka. Tautan itu rahasia: kirim hanya ke diri sendiri atau pasangan, dan cabut token di GitHub jika bocor.
- Saat dibuka, aplikasi menarik data terbaru dulu sebelum menampilkan rencana, lalu sinkron lagi tiap ada perubahan, tiap 20 detik, dan saat aplikasi kembali aktif.
- Dokumen JSON dienkripsi di browser (AES-GCM, kunci dari kata sandi) sebelum disimpan di Gist rahasia. Token dan kata sandi hanya disimpan di localStorage perangkat. Jika kata sandi hilang, data di Gist tidak bisa dipulihkan.
- Penggabungan per rencana berdasarkan waktu ubah terbaru, dengan penanda untuk rencana yang dihapus. Dua orang mengubah rencana yang sama bersamaan: perubahan terbaru menang.
- Cadangan: **Ekspor JSON** dan **Impor JSON**.
- Rencana awal "Liburan Malaysia" ada di `app/seed.json` dan ikut ke bundel publik; kosongkan `plans` jika URL dibagikan.

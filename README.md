# Perencana

Checklist + jadwal untuk liburan, acara, pindahan, atau kegiatan apa pun. Next.js (App Router) murni sisi klien: tanpa API, database, atau environment variable.

## Deploy ke Vercel (tanpa pengaturan)
1. Push folder ini ke GitHub (atau jalankan `npx vercel` di folder ini).
2. Import di Vercel. Framework terdeteksi otomatis sebagai Next.js, klik Deploy.

## Jalankan lokal
`npm install` lalu `npm run dev`, buka http://localhost:3000

## Data
- Tersimpan di `localStorage` browser (format JSON), per perangkat dan per browser.
- Cadangan dan pindah perangkat: tombol **Ekspor JSON** dan **Impor JSON** di beranda. Impor menggabungkan berdasarkan id rencana.
- Rencana awal "Liburan Malaysia" ada di `app/seed.json` dan ikut ke bundel publik. Kosongkan `plans` di file itu jika URL akan dibagikan.

# Perencana (HTML + JavaScript murni)

Tanpa framework, tanpa build, tanpa server sendiri. File: `index.html`, `app.js`, `style.css`, `config.js`, `data.json`.

## Deploy
Upload folder ke host statis apa pun (Vercel: import folder, framework "Other", tanpa build command).

## Satu data JSON untuk semua perangkat
- `data.json` = data awal (Liburan Malaysia). Dipakai hanya saat penyimpanan masih kosong.
- Data hidup disimpan sebagai satu dokumen JSON di layanan json.extendsclass.com. Semua perangkat membaca dan menulis dokumen yang sama, jadi isinya selalu sama.
- Langkah sekali saja: buka aplikasi, ketuk status di pojok kanan atas, **Buat penyimpanan bersama**. Salin baris `window.CONFIG = {...}` ke `config.js`, deploy ulang. Setelahnya setiap perangkat yang membuka aplikasi langsung memakai data yang sama, tanpa langkah apa pun.
- Sampai deploy ulang, perangkat lain bisa memakai tautan `…/#bin=ID` (dibuka sekali).
- Aplikasi membaca data terbaru saat dibuka, lalu sinkron tiap ada perubahan, tiap 20 detik, dan saat kembali aktif. Tetap jalan offline (cache di perangkat) dan menggabungkan perubahan saat online lagi.
- Data dienkripsi dengan `SECRET` di `config.js` sebelum disimpan. Ganti `SECRET` sebelum membuat penyimpanan, dan jangan ubah lagi sesudahnya. Karena `config.js` publik, ini melindungi isi dokumen dari yang hanya menemukan alamat dokumennya, bukan dari yang membaca kode situs. Jangan bagikan URL aplikasi.
- Layanan penyimpanan publik: maks. 100 KB, bisa menghapus data yang lama tidak dipakai. Gunakan Ekspor JSON untuk cadangan.

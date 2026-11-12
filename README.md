# Perencana (HTML + JavaScript murni)

Tanpa framework, tanpa build, tanpa server sendiri. File: `index.html`, `app.js`, `style.css`, `config.js`, `data.json`.

## Deploy
Upload folder ke host statis apa pun (Vercel: import folder, framework "Other", tanpa build command).

## Satu data JSON untuk semua perangkat
- `data.json` = data awal (Liburan Malaysia). Dipakai hanya saat penyimpanan masih kosong.
- Data hidup disimpan sebagai satu dokumen JSON di layanan json.extendsclass.com. Semua perangkat membaca dan menulis dokumen yang sama, jadi isinya selalu sama.
- Layanan kini mewajibkan API key untuk membuat bin lewat API. Karena aplikasi statis tidak dapat menyimpan API key secara rahasia, buat bin tanpa **Security key** lewat [halaman JSON storage](https://extendsclass.com/json-storage.html). Isi JSON awal dengan `{"plans":[],"del":{}}`, simpan, lalu salin ID atau URL bin.
- Buka aplikasi, ketuk status di pojok kanan atas, tempel ID/URL bin dan pilih **Hubungkan**. Untuk otomatis terhubung di perangkat lain, salin baris `window.CONFIG = {...}` yang ditampilkan ke `config.js`, lalu deploy ulang. Sebelum deploy ulang, perangkat lain dapat membuka tautan `…/#bin=ID` sekali.
- Aplikasi membaca data terbaru saat dibuka, lalu sinkron tiap ada perubahan, tiap 20 detik, dan saat kembali aktif. Tetap jalan offline (cache di perangkat) dan menggabungkan perubahan saat online lagi.
- Data dienkripsi dengan `SECRET` di `config.js` sebelum disimpan. Gunakan bin publik tanpa **Security key** (enkripsi aplikasi tetap melindungi isi data) dan jangan ubah `SECRET` setelah ada data. Karena `config.js` publik, ini melindungi isi dokumen dari yang hanya menemukan alamat bin, bukan dari yang membaca kode situs. Jangan bagikan URL aplikasi.
- Layanan penyimpanan publik: maks. 100 KB, bisa menghapus data yang lama tidak dipakai. Gunakan Ekspor JSON untuk cadangan.

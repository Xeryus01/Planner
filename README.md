# Perencana

Aplikasi HTML, CSS, dan JavaScript tanpa framework. Di Vercel, API serverless membaca dan menyimpan data bersama ke file `data.json` di repository GitHub. Semua perangkat yang membuka aplikasi memakai file yang sama.

## Deploy ke Vercel

1. Pastikan project Vercel terhubung ke repository GitHub ini dan branch yang dipakai adalah `main`.
2. Buat GitHub fine-grained personal access token untuk repository ini dengan izin **Contents: Read and write**. Jangan masukkan token ke file project.
3. Di Vercel, buka **Project → Settings → Environment Variables** dan tambahkan:
   - `GITHUB_TOKEN`: token dari langkah 2.
   - `SYNC_PASSWORD`: kata sandi panjang dan acak yang akan dibagikan hanya ke perangkat tepercaya.
4. Jika deploy dari fork, atur juga `GITHUB_OWNER`, `GITHUB_REPO`, dan `GITHUB_BRANCH` sesuai repository dan branch. Nilai default: `Xeryus01`, `Planner`, `main`.
5. Redeploy project. Pastikan Vercel menyertakan folder `api/` sebagai Functions.
6. Di tiap perangkat, buka status sinkronisasi di aplikasi, masukkan nilai `SYNC_PASSWORD`, lalu pilih **Simpan & sinkron**. Kata sandi disimpan di browser perangkat itu saja.

Setiap perubahan tersimpan sebagai commit pada `data.json`. Aplikasi membaca ulang file GitHub secara berkala dan saat perangkat kembali aktif. Perangkat tanpa koneksi tetap memakai cache lokal sampai dapat tersambung lagi.

## File dan keamanan

- `data.json` adalah sumber data bersama. File awal berisi rencana contoh.
- `api/data.js` adalah Vercel Function. Token GitHub dan kata sandi sinkronisasi hanya dibaca dari environment variable server.
- `config.js` berisi `SECRET` untuk mengenkripsi data sebelum dikirim ke API. Jangan mengubahnya setelah data tersimpan, karena data lama tidak akan bisa dibuka.
- Endpoint baca data dapat diakses publik. Endpoint tulis memerlukan `SYNC_PASSWORD`; siapa pun yang memilikinya dapat mengubah file dan membuat commit ke repository. Jangan bagikan kata sandi itu secara publik.
- Karena `config.js` dikirim ke browser, `SECRET` bukan tempat menyimpan token atau kata sandi rahasia. Ekspor JSON tetap disarankan sebagai cadangan.

## Pembaruan UI/UX

- Kartu rencana menampilkan langkah berikutnya; jadwal memakai garis waktu dengan penanda hari ini.
- Tambah item langsung dari mode baca; tombol Sembunyikan yang selesai; tombol Enter menambah item.
- Hapus rencana memakai Urungkan (tanpa konfirmasi ganda). Dialog sinkronisasi dapat dipakai dengan keyboard (Esc, fokus terkunci dan dikembalikan).
- Perbaikan: perangkat baru tanpa cache tidak lagi menampilkan layar kosong karena data.json terenkripsi; status sinkron tidak lagi menghapus kata sandi yang sedang diketik.

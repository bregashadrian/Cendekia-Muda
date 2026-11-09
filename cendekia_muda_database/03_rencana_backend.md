# Rencana backend Cendekia Muda

Revisi **9 November 2026**. Acuan: [PRD](../assets/PRD.md), [ERD](../ERD/ERD-Cendekia-Muda-revisi.drawio), dan `01_schema.sql` (16 tabel domain, 27 FK). Node.js 24 + Express 5 sudah berada di `server/`; frontend berada di `index.html`, `script.js`, `style.css`, dan `js/`.

## Status dan langkah implementasi

1. **Tersedia:** Express menyajikan frontend, `/api`, `/api/health`, konfigurasi environment, dan respons error JSON. Schema serta seed PostgreSQL tersedia untuk database baru. Pengujian tidak menghubungkan database aplikasi pengguna.
2. **Koneksi database:** siapkan PostgreSQL, jalankan schema/seed, pilih ORM. Prisma sudah dibahas tetapi belum dipasang. Jika memakai Prisma setelah menjalankan SQL, introspeksi dan buat baseline migrasi; pertahankan constraint SQL yang tidak diwakili model ORM. Setelah itu perubahan skema memakai migrasi terurut, bukan mengedit lalu menjalankan ulang `01_schema.sql` pada database yang berisi data.
3. **Autentikasi:** hashing password server, sesi, logout, pemulihan password, validasi, pembatasan percobaan login, dan pemeriksaan role/akun aktif. Tentukan penyimpanan sesi/token satu kali pakai; tabel teknis tambahan harus didokumentasikan bila diperlukan. Akun demo browser dan hash lokal tidak dipakai sebagai kredensial produksi.
4. **Pengelolaan:** akun pengajar, tugas per subtes, kontak/penugasan pendamping, materi, unggahan privat, bank soal, dan program.
5. **Belajar:** jawaban latihan, progres siswa, draft tryout bersama, rilis admin, pengerjaan, autosave, penilaian, dan ringkasan pengajar.
6. **Transaksi:** pembelian, upgrade/perpanjangan, gateway, callback idempoten, notifikasi, serta email. Simulasi hanya di lingkungan pengembangan dan diberi label.
7. **Integrasi dan hosting:** ganti operasi localStorage/IndexedDB dengan API per modul; uji otorisasi dan perubahan bersamaan, siapkan storage privat serta backup. Server database yang menyala pada laptop harus tetap hidup agar dapat diakses; penggunaan lintas perangkat dapat memakai server PostgreSQL bersama yang tersedia sesuai kebutuhan.

## Rancangan endpoint

Endpoint berikut adalah usulan untuk implementasi berikutnya. Endpoint yang sudah bekerja saat ini hanya `/api` dan `/api/health`.

| Modul | Contoh endpoint | Pemeriksaan server |
| --- | --- | --- |
| Autentikasi | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` | Registrasi selalu siswa; login memeriksa role tersimpan dan status akun. Pilihan role dari browser bukan sumber izin |
| Akun dan tugas | `/api/admin/pengajar`, `/api/admin/pengajar/:id/subtes` | Admin mengatur satu atau lebih subtes; cabut tugas dengan `is_aktif=false` |
| Pendamping | `/api/admin/pendamping`, `/api/admin/siswa/:id/pendamping`, `GET /api/me/pendamping` | Admin menugaskan; siswa hanya mendapat kontak aktif miliknya saat Reguler/Lengkap aktif |
| Katalog pengelola | `/api/pengelola/materi`, `/api/pengelola/soal` | Admin seluruh subtes; pengajar hanya tugas aktif, termasuk validasi subtes asal/tujuan saat pindah |
| File | `POST /api/pengelola/unggahan`, `GET /api/materi/:id/file` | Validasi file, storage privat, role/subtes/program sebelum download atau stream |
| Belajar siswa | `GET /api/subtes`, `GET /api/materi`, `GET /api/soal`, `POST /api/latihan/jawaban`, `GET /api/me/progres` | Akses Gratis/Aktif, jawaban benar dihitung server, semua percobaan disimpan |
| Tryout pengelola | `/api/pengelola/tryout`, `PUT /api/pengelola/tryout/:id/subtes/:kode/soal`, `POST /api/admin/tryout/:id/rilis` | Kontribusi hanya subtes tugas pada Draft; admin memvalidasi tujuh subtes sebelum rilis |
| Pengerjaan | `POST /api/tryout/:id/mulai`, `PUT /api/hasil/:id/jawaban/:idSoal`, `POST /api/hasil/:id/selesai` | Pemilik hasil, paket Rilis yang sudah terjadwal, program aktif, sekali pengerjaan, deadline server |
| Ringkasan pengajar | `GET /api/pengajar/subtes/:kode/ringkasan?jenis=latihan`, `...?jenis=tryout&paket=:id` | Tugas aktif, agregat baca saja tanpa identitas/nilai individu |
| Program/transaksi | `GET /api/program`, `POST /api/pendaftaran`, `GET /api/me/transaksi`, `POST /api/pendaftaran/:id/batalkan` | Program aktif dan aturan pembelian; riwayat hanya milik siswa bersangkutan |
| Gateway | `POST /api/pembayaran/:id/checkout`, `POST /api/gateway/callback` | Jumlah dari server, signature, urutan lock konsisten, idempotensi |
| Riwayat/notifikasi | `GET /api/me/hasil`, `GET /api/hasil/:id/review`, `GET /api/me/notifikasi`, `PATCH /api/me/notifikasi/:id` | Kepemilikan; review sesuai program; tidak menerima nilai/skor kiriman klien |

Frontend dan API saat ini satu origin. Konfigurasi CORS baru diperlukan bila deployment memisah origin. Jika sesi memakai cookie, gunakan HttpOnly, Secure pada HTTPS, SameSite yang sesuai, dan proteksi CSRF. Password dan rahasia layanan hanya diproses server; autentikasi serta validasi request tidak digantikan oleh FK.

## Pembagian integritas database dan API

**Sudah dijaga SQL:** PK/FK dan pencegahan hapus data yang direferensikan; email lowercase unik; daftar role/status; kode subtes; satu tugas pengajar per subtes; satu penugasan pendamping berjalan per siswa-subtes; metadata sumber materi; opsi/kunci soal; metadata rilis; urutan unik dalam paket; sekali pengerjaan; keunikan jawaban autosave; tanggal dan rentang nilai dasar.

**Wajib diterapkan API:** role pada setiap FK pengguna; hak akses subtes; status program; tujuh subtes lengkap sebelum rilis; daftar soal milik paket pada setiap autosave; pembekuan konten historis; konsistensi kunci dengan `is_benar`; perhitungan skor dan penutupan timer; pembayaran dan batas satu transaksi menunggu per siswa; validasi isi file nyata serta URL penyedia. FK hanya memastikan record induk ada. CHECK satu baris tidak membuktikan keadaan lintas tabel atau otorisasi pengguna.

Setiap perubahan record yang memiliki `updated_at` harus mengisi waktu tersebut di API dalam transaksi yang sama. Nilai DEFAULT hanya bekerja saat INSERT; schema ini tidak memasang trigger timestamp.

## Transaksi yang perlu diperhatikan

### Penugasan dan konten

- Pengajar boleh mengelola konten pengajar lain pada subtes tugas yang sama. `dibuat_oleh` dan `diubah_oleh` menyimpan jejak perubahan, bukan pembatas kepemilikan konten. Penugasan dicabut langsung menutup izin pada permintaan berikutnya.
- Ganti pendamping dengan mengunci siswa/penugasan, menutup `berakhir_pada` lama, dan memasukkan penugasan baru dalam satu transaksi. Indeks parsial mencegah dua penugasan berjalan untuk pasangan siswa-subtes. Cek role siswa/admin dan kontak aktif sebelum menulis.
- Unggah video/PDF ke storage privat terlebih dahulu, validasi tipe/ukuran/isi, baru simpan metadata. Kegagalan dibersihkan; URL/link publik penyedia tunduk pada kontrol penyedia tersebut. `storage_key` tidak dikirim kepada pengguna tanpa hak.
- Sebelum mengubah isi/subtes/kunci atau menghapus soal, periksa apakah sudah dijawab latihan, berada di paket Rilis, atau berada di paket yang pernah dikerjakan. Jika digunakan, buat soal baru untuk revisi. Cek dan perubahan perlu lock yang konsisten dengan proses rilis/pengerjaan.

### Tryout bersama

- Lock baris paket sebelum kontribusi, rilis, atau mulai pengerjaan. Periksa kembali status Draft, role, serta tugas pengajar di transaksi yang sama; jangan mengganti kontribusi subtes lain dengan payload seluruh paket.
- Rilis memerlukan minimal satu soal aktif/lengkap di setiap tujuh subtes, urutan valid, durasi positif, dan jadwal. Hanya admin mengisi `dirilis_oleh`/`dirilis_pada`; jadwal `tanggal_rilis` berbeda dari waktu persetujuan admin.
- Setelah ada pengerjaan, daftar soal, urutan, durasi, dan isi soal dibekukan. Kembali ke Draft hanya sebelum pengerjaan dan harus mengosongkan metadata persetujuan.
- Untuk menukar posisi soal, dalam transaksi gunakan `SET CONSTRAINTS uq_tryout_soal_urutan DEFERRED`, perbarui urutan, lalu `SET CONSTRAINTS uq_tryout_soal_urutan IMMEDIATE` sebelum commit. Urutan akhir harus unik dan mengikuti master subtes. PK pasangan paket-soal tetap langsung diperiksa.
- Autosave memakai upsert `(id_hasil,id_soal)` setelah memastikan pemilik, keanggotaan soal, status Berlangsung, dan deadline. Waktu ditentukan server. Penyelesaian melalui scheduler/permintaan berikutnya harus idempoten meski browser ditutup.
- Skor = benar / seluruh soal paket × 100; jawaban kosong bernilai 0. Nilai dan `is_benar` dihitung server. Klien tidak dapat mengirim hasil penilaian final.

### Ringkasan pengajar

- Latihan menghitung seluruh percobaan, siswa/soal unik, akurasi, dan maksimal lima soal sering salah. Tryout hanya memakai hasil Selesai, termasuk soal tidak dijawab pada penyebut dan daftar salah. Dua kategori tidak digabung.
- Untuk tryout, join daftar tetap `tryout_soal` lalu LEFT JOIN jawaban per hasil agar soal kosong tetap dihitung. Hitung nilai subtes per pengerjaan terlebih dahulu, kemudian rata-ratakan dengan bobot pengerjaan sama; jangan langsung membagi total benar seluruh paket dengan total soal ketika ukuran paket berbeda.
- Filter hanya subtes yang ditugaskan dan masih aktif; jangan kirim identitas/nilai individu ke pengajar. Tidak perlu tabel statistik tambahan. Data tanpa hasil ditampilkan “—”.

### Pembayaran dan akses

- Akses aktif berasal dari pendaftaran `Lunas` dengan `tanggal_aktif <= NOW()` dan `tanggal_berakhir > NOW()`. `users.is_aktif` adalah status akun. Perpanjangan Lunas di masa depan belum memberi akses sebelum tanggalnya.
- Tetapkan urutan lock yang sama pada checkout, pembatalan, dan callback, misalnya siswa → pendaftaran → pembayaran. Cek ulang keadaan setelah lock. Satu pendaftaran dapat memiliki beberapa percobaan pembayaran; hanya satu pembayaran Menunggu Pembayaran per siswa.
- Nominal merupakan snapshot harga program dari server; `order_id` unik; batas bayar 24 jam. Gagal memungkinkan pembayaran baru pada pendaftaran yang sama. Signature gateway dan status akhir wajib diperiksa sebelum mengaktifkan akses.
- Upgrade Reguler → Lengkap berlaku langsung dengan harga penuh; lama menjadi Digantikan. Perpanjangan sejak H-3 menyambung masa aktif lama, atau mulai saat dibayar jika sudah habis. Lock siswa dan cek interval agar periode berjalan tidak tumpang tindih. Beberapa pendaftaran Lunas historis/terjadwal tetap diperbolehkan oleh schema.
- Pembatalan mengubah pendaftaran menjadi Dibatalkan dan menutup order pending sesuai alur provider. PRD tidak memiliki enum pembayaran Dibatalkan; pada prototype pending ditutup sebagai Kedaluwarsa. Saat memilih gateway, dokumentasikan pemetaan status ini dan cek callback terlambat agar tidak menghidupkan kembali pesanan batal. Jangan memakai pembatalan satu pesanan untuk mencabut program lain yang sudah aktif.
- Simpan perubahan status, aktivasi/perpanjangan, dan notifikasi secara atomik. Callback yang sudah diproses tidak boleh memperpanjang akses lagi atau membuat notifikasi ganda.

## Pemetaan data dan migrasi

Database menggunakan UUID; frontend demo menggunakan ID teks seperti `usr-siswa-001` dan `prg-reguler`. Seed Reguler memakai `00000000-0000-4000-8000-000000000101`, Lengkap `00000000-0000-4000-8000-000000000102`. Gunakan ID hasil API dalam frontend, dan buat pemetaan eksplisit jika data demo perlu diimpor.

`materi.subtes`/`soal.subtes` lama berupa nama dipetakan ke kode master `id_subtes`. Pertahankan hubungan jawaban/hasil dan riwayat; laporkan nama yang tidak dikenal atau metadata yang hilang. Database lama dengan ID angka memerlukan migrasi tersendiri. Akun admin awal dibuat melalui proses backend dengan hash password server setelah autentikasi diimplementasikan; seed master ini tidak memasang password bersama.

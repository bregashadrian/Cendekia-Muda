# Cendekia Muda

Prototype HTML, CSS, dan JavaScript berdasarkan [PRD](PRD.md) dan referensi desain yang sudah tersedia. Frontend berjalan tanpa build atau framework frontend; server menggunakan Node.js 24 dan Express 5.

## Rancangan terbaru dan status prototype

[PRD](PRD.md) revisi **9 November 2026** memuat **40 use case dan 16 tabel target**, dengan tiga role login: `siswa`, `pengajar`, `admin`. Pengajar mengelola konten pada subtes tugasnya dan berkontribusi dalam draft tryout bersama; hanya admin yang merilis. Pendamping merupakan kontak WhatsApp tanpa login yang ditugaskan admin per siswa–subtes, tersedia bagi siswa aktif Reguler maupun Lengkap.

**Frontend kini menjalankan tiga role (`siswa/pengajar/admin`) dengan 16 koleksi data lokal.** Portal pengajar, penugasan pendamping, draft tryout bersama, unggah PDF/video lokal, dropdown top bar, dan halaman transaksi sudah tersedia. **Fondasi Node.js + Express sudah tersedia** untuk menyajikan frontend dan endpoint `/api/health`. Koneksi PostgreSQL/ORM, autentikasi dan CRUD server, penyimpanan file privat di server, pembayaran sungguhan, dan email belum diterapkan. Pengunjung tetap mengakses informasi publik; konten gratis memerlukan login siswa pada prototype.

Rincian target ada di [Aktor dan Akses](../docs/AKTOR-DAN-AKSES.md) dan [ERD](../ERD/ERD-Cendekia-Muda-revisi.drawio). ERD berisi satu halaman keseluruhan dan empat halaman detail; kotak referensi pada halaman detail bukan tabel tambahan.

**Schema dan seed PostgreSQL sudah tersedia** di [cendekia_muda_database](../cendekia_muda_database/README.md): 16 tabel, 27 FK, tujuh subtes, serta dua program. Folder itu memuat panduan Navicat dan penyiapan laptop lain. SQL sudah diuji secara terisolasi; database aplikasi belum disambungkan ke Express.

## Menjalankan

Buka terminal di **folder utama proyek** (induk folder `assets`, tempat `package.json` berada). Gunakan Node.js 24. Pada penyiapan pertama atau laptop baru:

```sh
npm ci
npm run dev
```

Untuk penggunaan berikutnya cukup `npm run dev`, lalu buka [website lokal](http://127.0.0.1:3000). Cek server melalui [API health](http://127.0.0.1:3000/api/health); respons `status: "ok"` menandakan server berjalan, bukan koneksi database. Tekan **Ctrl+C** untuk berhenti. `npm start` tersedia untuk menjalankan server tanpa pemantauan perubahan file.

Konfigurasi `.env` bersifat opsional; nilai bawaan sudah dapat digunakan. Panduan struktur server, port, dan langkah backend berikutnya ada di [server/README.md](../server/README.md). Font Outfit dimuat dari Google Fonts; aset gambar dan video tersedia lokal.

Gunakan alamat/port yang sama agar data demo konsisten. Berpindah dari Live Server ke `127.0.0.1:3000` memakai penyimpanan browser yang berbeda; data pada alamat lama tidak ikut pindah atau terhapus. Live Server masih dapat membuka frontend saja, tetapi tidak menjalankan API Express.

## Akun demo

Semua akun berikut memakai kata sandi **`demo1234`**.

| Akun | Email | Halaman masuk |
| --- | --- | --- |
| Siswa Gratis — Raka | `raka@cendekiamuda.test` | `#/auth/login` |
| Program Lengkap — Nadia | `nadia@cendekiamuda.test` | `#/auth/login` |
| Admin | `admin@cendekiamuda.test` | `#/auth/admin-login` |
| Pengajar PU dan PPU — Maya | `maya@cendekiamuda.test` | `#/auth/pengajar-login` |
| Pengajar PK dan PM — Dimas | `dimas@cendekiamuda.test` | `#/auth/pengajar-login` |

Raka mempunyai contoh pesanan menunggu pembayaran. Buka **ikon profil di kanan atas → Pembayaran & Transaksi → Lanjutkan Pembayaran → Berhasil** untuk mencoba aktivasi Reguler. Pendaftaran akun baru dimulai dari Gratis tanpa transaksi contoh.

## Mencoba alur

1. Mulai tanpa login di `#/landing`. Lihat paket melalui `#/landing#program`, lalu klik **Coba Gratis** atau **Daftar** untuk registrasi. Setelah berhasil, prototype langsung membuka sesi siswa Gratis; kerjakan soal gratis dan periksa kunci jawaban.
2. Pilih Reguler atau Lengkap, tentukan metode, lalu tekan **Bayar Sekarang**.
3. Pada detail transaksi, gunakan simulasi **Berhasil**, **Gagal**, **Kedaluwarsa**, atau **Uji Signature Salah**. Sesudah Lunas, tersedia uji callback ganda.
4. Buka bank soal, drilling, PDF, tryout, hasil, dan progress. Video berbayar membutuhkan Program Lengkap; konten yang ditandai Gratis tetap dapat diakses siswa login.
5. Buka **Login Admin** dari footer landing atau `#/auth/admin-login`, lalu gunakan akun admin untuk mengelola siswa, program, materi, soal, jadwal tryout, serta mengekspor transaksi. Registrasi umum hanya membuat akun siswa.
6. Admin membuka **Kelola Pengajar** untuk membuat akun, menugaskan beberapa subtes, atau mencabut penugasan. Login Maya/Dimas untuk mencoba katalog sesuai tugas. Konten baru langsung tersedia sesuai akses; soal yang sudah digunakan hanya dapat disalin untuk revisi.
7. Admin membuat draft **Tryout**, mengatur jadwal/durasi, lalu pengajar membuka paket yang sama dan mengisi subtes tugasnya melalui **Pilih / Urutkan Soal**. Subtes tugas pengajar otomatis tampil paling atas; misalnya Dimas melihat PK dan PM terlebih dahulu. Admin memeriksa tujuh subtes dan merilis. Pengajar dapat melihat subtes lain tetapi tidak mengubahnya.
8. Di **Kelola Pendamping**, admin mengisi nomor WhatsApp; lalu buka **Penugasan Pendamping → siswa → subtes**. Kontak demo sengaja kosong, sehingga tombol WhatsApp baru aktif setelah nomor diisi. Siswa aktif Reguler/Lengkap melihat kontak yang ditugaskan melalui **Pendamping Saya**. Pergantian pendamping menyimpan riwayat.
9. Untuk video/PDF, gunakan **Tambah Materi → sumber Tautan atau Unggah File**. Tautan video mendukung YouTube, Vimeo, dan URL langsung MP4/WebM. File unggahan tersedia setelah reload pada browser dan alamat situs yang sama.
10. Ikon notifikasi di atas membuka dropdown; ikon profil menyediakan profil, kata sandi, serta **Pembayaran & Transaksi** dengan tab Belum Dibayar dan Riwayat Transaksi. **Daftar Program** tetap di sidebar.

Tanpa sesi login, tautan `#/siswa/...` mengarah ke login siswa, `#/pengajar/...` ke login pengajar, dan `#/admin/...` ke login admin. Daftar program/FAQ lengkap pada `#/siswa/program` memerlukan login siswa; ringkasan paket di landing dapat dilihat pengunjung. Setelah logout, pengguna kembali ke landing sebagai pengunjung.

Pada **Materi dan Bank Soal**, pilih salah satu dari tujuh kartu subtes, kemudian buka tab **Bank Soal** atau **Materi**. Klik pertanyaan untuk pratinjau soal lengkap; gunakan **Ubah** untuk soal yang belum dipakai atau **Salin** untuk revisi soal yang terkunci, serta **Lainnya** untuk mengatur status/akses. Form tambah mengikuti subtes yang sedang dibuka. Pencarian lintas subtes tersedia di halaman awal; pencarian dan filter pada detail hanya berlaku untuk subtes/tab tersebut.

Pengajar juga dapat membuka **Hasil Belajar**, memilih subtes tugasnya, lalu tab **Latihan Bank Soal** atau **Tryout**. Latihan menampilkan siswa unik, percobaan, akurasi, dan soal sering salah; tryout menyediakan filter paket, peserta selesai, rata-rata nilai subtes, serta perbandingan antartryout. Ini agregat baca saja tanpa identitas/nilai individu. Pengerjaan berjalan dikecualikan; soal kosong pada tryout selesai bernilai 0; nilai tanpa data ditampilkan “—”. ERD tetap 16 tabel. Pintasan juga tersedia pada katalog dan detail subtes tryout.

## Susunan file

| File | Isi |
| --- | --- |
| `assets/PRD.md` | Spesifikasi target terbaru |
| `assets/README.md` | Panduan prototype dan status rancangan |
| `package.json` / `package-lock.json` | Perintah npm dan dependency Express yang dikunci versinya |
| `.env.example` / `.nvmrc` | Contoh konfigurasi server dan versi Node.js |
| `server/` | Fondasi Express, konfigurasi, route API, dan penanganan error |
| `cendekia_muda_database/` | Schema PostgreSQL, seed, verifikasi, serta panduan Navicat dan integrasi |
| `index.html` | Entry point, font, dan urutan pemuatan script |
| `style.css` | UI kit, tampilan halaman, dan layout responsif |
| `script.js` | Router, halaman, formulir, interaksi, PDF dan CSV |
| `js/data.js` | Konfigurasi kontak, tujuh subtes, dan contoh dua belas tabel |
| `js/core.js` | Akun, akses, transaksi, penilaian, timer, dan penyimpanan |
| `js/management.js` | Migrasi lokal menjadi 16 koleksi, pengajar, subtes, pendamping, tryout bersama, dan file IndexedDB |
| `assets/` | Gambar dari referensi SVG dan tujuh video pengantar lokal |
| `tests/` | Pengujian aturan inti dan alur browser |
| `docs/AKTOR-DAN-AKSES.md` | Aktor, role, matriks akses, diagram interaksi, serta pemeriksaan kesesuaian ERD |
| `ERD/ERD-Cendekia-Muda-revisi.drawio` | Model 16 tabel, tiga role, dan 27 foreign key yang menjadi acuan schema SQL |
| `docs/preview/` | Screenshot implementasi desktop dan HP |

Isi `CM.config.whatsapp`, `email`, dan `address` di `js/data.js` dengan kontak resmi. WhatsApp memakai format kode negara, misalnya `62...`. Kontak kosong tidak diarahkan ke nomor contoh. Nomor dan alamat belum ditentukan dalam PRD.

## Data dan batas prototype

- Data disimpan di browser pada key `cendekia-muda-v2`; salinan sebelumnya disimpan pada `cendekia-muda-v2-backup`. `js/management.js` menambahkan empat koleksi dan metadata secara otomatis tanpa menghapus ID, jawaban, transaksi, atau hasil lama. Ini migrasi data browser, bukan migrasi SQL. Nama `subtes` lama tetap disimpan bersama `id_subtes` agar alur lama tetap bekerja.
- Akun, jawaban, pembayaran, dan hasil pada perangkat/browser lain tidak tersinkron. Menghapus data situs menghapus data lokal. Semua demo harus dicoba pada alamat/port localhost yang sama agar memakai penyimpanan yang sama.
- Unggahan memakai IndexedDB `cendekia-files-v1`; localStorage hanya menyimpan metadata/key, bukan base64. Batas video MP4/WebM 100 MB dan PDF 20 MB. Validasi browser memeriksa ukuran, ekstensi, MIME, serta header file; validasi server tetap diperlukan. File ini bukan storage privat produksi dan tidak ikut Git/pindah laptop.
- Tersedia 70 soal contoh, 14 modul PDF yang dapat dibaca/diunduh, 7 video pengantar singkat tanpa suara, dan 5 paket tryout (4 contoh Rilis lama serta 1 draft bersama baru). Konten ini untuk mendemonstrasikan alur; video dapat diganti melalui Kelola Materi.
- Pembayaran dan pemulihan kata sandi adalah simulasi lokal. Tidak ada pembayaran uang sungguhan atau email terkirim.
- Akses diperiksa di router dan operasi data, tetapi data serta kode client tetap dapat diperiksa lewat DevTools. Produksi membutuhkan API dengan otorisasi server, database, gateway sungguhan, layanan email, dan backup terjadwal di luar browser. Hash password dan secret callback lokal bukan pengganti keamanan server.

## Pengujian

Aturan frontend, server, dan schema database (Node.js 24, setelah `npm ci`):

```sh
npm test
```

Gunakan `npm run test:server` untuk HTTP server, `npm run test:frontend` untuk aturan frontend, atau `npm run test:database` untuk SQL. Pengujian database memakai PGlite in-memory dari dev dependency dan tidak mengakses database pribadi. Pengujian browser opsional membutuhkan Playwright dengan Chromium tersedia secara terpisah:

```sh
npm run test:browser
```

Pemeriksaan fondasi server: **31 pengujian otomatis** dan **8 kelompok pemeriksaan browser melalui Express** lolos; lihat [audit backend](../docs/AUDIT-BACKEND-FOUNDATION.md).

Revisi database menambah lima kelompok pengujian otomatis, termasuk 51 pemeriksaan constraint SQL. Rincian hasil dan batas uji ada di [audit database](../docs/AUDIT-DATABASE.md).

Jika Playwright dipasang di lokasi lain, tentukan `PLAYWRIGHT_MODULE`. Gunakan `PLAYWRIGHT_BROWSERS_PATH` untuk lokasi browser dan `QA_OUTPUT` untuk folder hasil. Pengujian membuat server localhost sementara dan memakai profil browser terisolasi. Data browser pribadi tidak diubah. Video contoh dibuat ulang hanya jika file lokalnya belum ada.

Jika memakai executable Chromium yang sudah tersedia, tentukan `PLAYWRIGHT_EXECUTABLE_PATH`. Pengujian admin mencakup katalog per subtes, filter, pratinjau, form tambah sesuai subtes, serta mempertahankan pagination setelah edit dan perpindahan tab.

Pemeriksaan terbaru untuk ringkasan pengajar dan regresi seluruh prototype ada di [audit ringkasan pengajar](../docs/AUDIT-RINGKASAN-PENGAJAR.md) dan [hasil uji](../docs/hasil-uji-ringkasan-pengajar.json). Pemeriksaan revisi tiga role, tryout, pendamping, video, serta navigasi sebelumnya ada di [audit revisi frontend](../docs/AUDIT-REVISI-FRONTEND.md) dan [hasil uji](../docs/hasil-uji-revisi-frontend.json). Pemeriksaan sebelumnya untuk pengelompokan konten admin ada di [audit admin per subtes](../docs/AUDIT-ADMIN-SUBTES.md) dan [hasil uji](../docs/hasil-uji-admin-subtes.json). Audit prototype sebelumnya tersedia di [AUDIT-PRD.md](../AUDIT-PRD.md) dan [laporan browser awal](../docs/hasil-uji-browser.json).

Penyelarasan dokumentasi aktor pada **7 November 2026** digantikan oleh rancangan 9 November di [Aktor dan Akses](../docs/AKTOR-DAN-AKSES.md). Hasil pengujian bertanggal sebelumnya tetap merupakan catatan pemeriksaan pada tanggal masing-masing.

## Pekerjaan berikutnya

Fondasi Express serta schema/seed PostgreSQL tersedia. Berikutnya siapkan database baru memakai SQL tersebut, hubungkan Express ke PostgreSQL, tentukan ORM (Prisma telah dibahas tetapi belum dipasang) dan riwayat migrasi, lalu implementasikan autentikasi dan CRUD server. Sambungkan frontend ke API secara bertahap dan ganti simulasi pembayaran/email serta file lokal dengan layanan server. Sidebar ringkas yang dibuka melalui logo serta perombakan gaya visual dibahas terpisah dan belum dikerjakan pada revisi ini.

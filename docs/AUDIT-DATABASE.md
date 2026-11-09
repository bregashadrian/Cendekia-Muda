# Audit revisi database Cendekia Muda

Tanggal: **9 November 2026**. Sumber awal: empat file pada `Downloads/cendekia_muda_database` versi 4 November. Hasil revisi ditempatkan di `Cendekia Muda/cendekia_muda_database/` agar menjadi bagian repository. File sumber di luar repository tetap tersedia sebagai versi lama.

## Hasil revisi

- Schema awal berubah dari 12 tabel/two-role menjadi **16 tabel dan tiga role** sesuai PRD. Seluruh **27 foreign key** serta nama/urutan kolom dicocokkan dengan kamus data PRD; kolom dan relasi diagram ERD juga diperiksa. Struktur ERD tidak perlu diubah.
- ID utama menggunakan UUID, kecuali kode teks subtes; uang memakai `numeric(14,2)` dan waktu `timestamptz`.
- Ditambahkan master subtes, penugasan pengajar, kontak pendamping, dan riwayat penugasan siswa. Indeks parsial menahan dua penugasan pendamping yang berjalan pada siswa-subtes sama.
- Materi mendukung tautan HTTPS atau metadata unggahan dengan sumber saling eksklusif. Soal memiliki lima opsi, pembahasan wajib, daftar tingkat kesulitan, dan jejak pembuat/pengubah.
- Tryout memiliki metadata rilis admin serta urutan soal unik yang dapat ditukar dalam transaksi. Keunikan pengerjaan dan autosave tetap diterapkan. FK menolak penghapusan record yang direferensikan.
- Seed memuat **tujuh subtes dan dua program** dengan UUID program stabil. Pengulangan seed mempertahankan perubahan admin. Schema awal menolak database dengan tabel yang sudah ada; tidak ada reset data atau upgrade otomatis versi lama.
- README dan rencana backend disesuaikan dengan Navicat, Express yang sudah tersedia, penyiapan laptop lain, dan baseline bila Prisma dipilih berikutnya. PRD, README proyek, serta dokumentasi akses/server diperbarui statusnya.

## Verifikasi

Lingkungan: Node.js **24.21.0**, dependency pengujian **PGlite 0.5.15**, engine **PostgreSQL 18.6 (WASM)**. PGlite hanya dev dependency untuk pengujian database in-memory; tidak menjadi database aplikasi atau pengganti server PostgreSQL tujuan.

| Pemeriksaan | Hasil |
| --- | --- |
| `npm run test:database` | 5 kelompok uji lolos |
| `tests/database.sql` | 51 pemeriksaan SQL lolos; seluruh fixture di-rollback |
| `npm test` | 36 pengujian lolos (13 core, 11 management, 7 server, 5 database) |
| Schema vs PRD | 16 tabel, seluruh kolom, tipe UUID pada ID, dan 27 FK cocok |
| ERD XML vs PRD | 16 tabel dan seluruh kolom cocok; 27 relasi diagram |
| Seed diulang | Tetap 7 subtes/2 program; perubahan harga tidak ditimpa |
| Schema dijalankan ulang | Ditolak tanpa menghapus data yang sudah ada |
| HTTP berkas SQL | Akses melalui Express ditolak seperti kode backend/config |
| `git diff --check` | Lolos |

Pemeriksaan SQL mencakup role/email, referensi akun, penugasan pengajar, kontak/riwayat pendamping, sumber dan metadata materi, soal/latihan berulang, rilis/urutan tryout, autosave, hasil selesai, harga/status/tenggat pembayaran, serta penolakan hapus data historis. Fixture menggunakan identitas sintetis dan tidak menjadi seed akun aplikasi.

## Batas implementasi

Target script PostgreSQL 16+, dengan verifikasi engine yang dilakukan pada versi di atas. Instalasi PostgreSQL/Navicat pada laptop tujuan belum diuji; gunakan `04_verifikasi.sql` dan, pada database pengujian baru, `tests/database.sql` setelah penyiapan.

Belum ada koneksi Express ke PostgreSQL, instalasi Prisma, autentikasi server, API CRUD, atau pemindahan data frontend. Role pada FK, otorisasi subtes, tujuh subtes lengkap sebelum rilis, pembekuan soal, ketepatan penilaian, dan transaksi pembayaran masih memerlukan implementasi server sebagaimana [rencana backend](../cendekia_muda_database/03_rencana_backend.md). SQL tidak mengklaim telah menerapkan aturan lintas tabel tersebut.

SQL awal ini ditujukan untuk database baru. Database versi lama yang berisi data memerlukan migrasi dengan pemetaan ID dan audit metadata. Penerapan tidak dilakukan pada database pribadi pengguna dan tidak ada commit/push dalam revisi ini.

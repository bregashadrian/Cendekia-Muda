# Database PostgreSQL — Cendekia Muda

Revisi **9 November 2026**, sesuai [PRD bagian 12](../assets/PRD.md) dan [ERD](../ERD/ERD-Cendekia-Muda-revisi.drawio): **16 tabel domain, 27 foreign key, tiga role login** (`siswa`, `pengajar`, `admin`). Target PostgreSQL **16 atau lebih baru**. Navicat dipakai untuk mengelola server PostgreSQL.

Folder ini berada **di dalam repository Cendekia Muda** dan dapat ikut di-push. Sumber revisi adalah folder lama `Downloads/cendekia_muda_database` versi 4 November; gunakan file di repository ini untuk penyiapan baru.

## Isi folder dan status

| File | Fungsi |
| --- | --- |
| `01_schema.sql` | Membuat 16 tabel, relasi, constraint, dan indeks pada database baru |
| `02_seed_program.sql` | Mengisi tujuh subtes dan dua program awal |
| `03_rencana_backend.md` | Urutan integrasi Node.js + Express dan aturan transaksi/akses |
| `04_verifikasi.sql` | Query baca saja untuk memeriksa struktur dan data awal |
| `../tests/database.sql` | Pengujian constraint dengan data sementara yang di-rollback |
| `../tests/database.test.cjs` | Pengujian otomatis schema/seed memakai PostgreSQL in-memory |

Skrip SQL siap untuk penyiapan database baru. **Express belum terhubung ke database ini.** Login, jawaban, pembayaran, dan unggahan frontend masih tersimpan di browser. Seed hanya berisi master subtes dan program; belum ada akun login, materi, soal, atau hasil siswa di PostgreSQL. Akun demo browser tidak otomatis menjadi akun database.

## Menjalankan melalui Navicat

1. Pastikan **server PostgreSQL** sudah terpasang dan berjalan di laptop/server tujuan. Navicat adalah aplikasi pengelola; pemasangan Navicat saja belum menjalankan PostgreSQL.
2. Buat koneksi PostgreSQL di Navicat dengan host, port, username, dan password milik instalasi tersebut. Untuk server lokal biasanya host `127.0.0.1`, port `5432`. Jalankan tes koneksi.
3. Buat database **baru dan kosong** bernama `cendekia_muda` dengan encoding UTF-8. Jika nama itu sudah dipakai database lama, gunakan nama baru, misalnya `cendekia_muda_dev`; simpan database lama untuk migrasi.
4. Pilih database baru tersebut. Buka editor query, muat `01_schema.sql`, lalu jalankan **seluruh file**. Skrip sudah memiliki `BEGIN`/`COMMIT`; tidak perlu membungkusnya dalam transaksi tambahan.
5. Jalankan seluruh `02_seed_program.sql` pada database yang sama.
6. Jalankan `04_verifikasi.sql`, lalu refresh daftar tabel pada schema `public`.

Hasil awal: **16 tabel, 27 foreign key, tujuh subtes, dua program**. Program Reguler: Rp100.000 / 30 hari tanpa video berbayar. Program Lengkap: Rp170.000 / 60 hari dengan video. Keduanya mendapat pendamping WhatsApp setelah aktif dan ditugaskan admin.

Jika SQL gagal di tengah transaksi, jalankan `ROLLBACK;` sebelum memperbaiki dan mengulang. `01_schema.sql` menolak schema `public` yang sudah memiliki tabel. `02_seed_program.sql` boleh diulang: ID yang sudah ada dilewati dan perubahan admin tidak ditimpa.

Alternatif melalui terminal jika `psql` tersedia, jalankan dari folder utama proyek dan ganti `nama_user_postgres` sesuai instalasi:

```sh
psql -h 127.0.0.1 -p 5432 -U nama_user_postgres -d cendekia_muda -v ON_ERROR_STOP=1 -f cendekia_muda_database/01_schema.sql
psql -h 127.0.0.1 -p 5432 -U nama_user_postgres -d cendekia_muda -v ON_ERROR_STOP=1 -f cendekia_muda_database/02_seed_program.sql
psql -h 127.0.0.1 -p 5432 -U nama_user_postgres -d cendekia_muda -v ON_ERROR_STOP=1 -f cendekia_muda_database/04_verifikasi.sql
```

Database harus dibuat terlebih dahulu. `CREATE DATABASE cendekia_muda;` dijalankan dari koneksi administratif di luar transaction block, jika memilih membuat database lewat SQL.

## Melanjutkan di laptop lain

Untuk penyiapan pertama:

```sh
git clone https://github.com/bregashadrian/Cendekia-Muda.git
cd Cendekia-Muda
npm ci
```

Jika repository sudah ada, ambil revisi terbaru lewat Git lalu jalankan `npm ci` ketika dependency berubah. Gunakan Node.js 24 sesuai `.nvmrc`.

Selanjutnya siapkan koneksi PostgreSQL dan jalankan urutan SQL melalui Navicat seperti di atas. Untuk melihat website:

```sh
npm run dev
```

Buka <http://127.0.0.1:3000>. Pengecekan `/api/health` saat ini hanya menguji server Express hidup. Koneksi database akan dibuat pada tahap backend berikutnya.

Kredensial koneksi tiap laptop nanti disimpan dalam `.env`, yang sudah dikecualikan dari Git. Folder `node_modules` juga tidak perlu dipindah atau di-push; `npm ci` memasangnya dari lockfile. File SQL di Git membuat ulang struktur dan seed, bukan menyalin data yang sudah dimasukkan ke server PostgreSQL. Untuk memindahkan data pengembangan yang sudah ada, gunakan backup/restore terpisah dan jangan memasukkan dump berisi akun/data pribadi ke repository.

## Jika pernah memakai versi 12 tabel

Versi 4 November memakai ID `BIGINT`, subtes berupa nama teks, dan dua role. Versi ini memakai UUID, master subtes, penugasan pengajar/pendamping, metadata unggahan, urutan soal, serta metadata rilis. **`01_schema.sql` bukan skrip upgrade untuk database lama.**

Database lama yang berisi data memerlukan backup dan migrasi khusus: petakan ID lama ke UUID untuk seluruh FK; ubah nama subtes menjadi kode; isi pembuat/pengubah dari akun admin migrasi yang terdokumentasi; tentukan urutan soal berdasarkan sumber lama; serta audit kelengkapan metadata rilis dan file. Struktur lama tidak menyimpan semua informasi tersebut, sehingga skrip ini tidak menebaknya. Lihat PRD §12.4.

## Pengujian

Dari folder utama proyek, setelah `npm ci`:

```sh
npm run test:database
npm test
```

Pengujian otomatis menggunakan **PGlite**, dependency pengembangan yang menjalankan PostgreSQL dalam memori. Tidak membaca `DATABASE_URL` atau mengakses database pribadi. Pengujian membandingkan tabel, kolom, dan FK dengan PRD; memeriksa seed berulang; lalu menjalankan 51 pemeriksaan SQL. Hasil lengkap dicatat di [audit database](../docs/AUDIT-DATABASE.md).

Untuk menguji langsung pada instalasi PostgreSQL tujuan, buat **database pengujian baru**, jalankan schema dan seed, lalu jalankan seluruh `tests/database.sql` melalui Navicat atau `psql`. File itu membuat fixture sementara, menampilkan jumlah pengujian lolos, lalu `ROLLBACK`. Jika ada error, lakukan `ROLLBACK` sebelum percobaan berikutnya. Akun/nomor pada fixture hanya data uji dan tidak menjadi seed aplikasi.

## Integrasi Prisma berikutnya

Prisma belum dipasang. Jika dipilih, introspeksi database yang sudah dibuat dan tetapkan **baseline migrasi** sebelum menggunakannya untuk perubahan berikutnya. Simpan CHECK, indeks parsial, dan constraint urutan deferrable dalam SQL migrasi; jangan mengandalkan model ORM saja untuk mempertahankan seluruh aturan PostgreSQL. Gunakan satu riwayat migrasi setelah integrasi agar tabel yang sudah ada tidak dibuat ulang. Lihat [panduan resmi baseline Prisma](https://www.prisma.io/docs/orm/prisma-migrate/workflows/baselining).

Aturan relasi dan CHECK mengikuti [dokumentasi PostgreSQL](https://www.postgresql.org/docs/current/ddl-constraints.html). UUID dibuat dengan `gen_random_uuid()` bawaan PostgreSQL. Pengujian in-memory mengikuti [dokumentasi PGlite](https://pglite.dev/docs/).

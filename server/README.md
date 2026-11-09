# Fondasi backend Cendekia Muda

Node.js 24 + Express 5 melayani frontend yang sudah ada dan endpoint pengecekan server. Tahap ini belum menghubungkan PostgreSQL, Prisma, login, atau CRUD ke backend. Akun demo, jawaban, transaksi, dan unggahan masih memakai penyimpanan browser.

Schema PostgreSQL 16 tabel dan seed tujuh subtes/dua program kini tersedia di [folder database](../cendekia_muda_database/README.md). Panduan tersebut mencakup Navicat dan laptop lain. SQL sudah diuji secara terisolasi; menjalankan `npm start` belum membuat atau menghubungkan database aplikasi.

## Menjalankan

Jalankan dari **folder utama Cendekia Muda**, tempat `package.json` berada:

```sh
npm ci
npm run dev
```

`npm ci` diperlukan saat pertama menyiapkan proyek atau setelah dependency berubah. Di laptop yang sudah dipasangkan dependency, cukup `npm run dev`. Node.js 24 diperlukan; versi proyek tercatat di `.nvmrc` dan dependency dikunci dalam `package-lock.json`.

- Website: <http://127.0.0.1:3000>
- Informasi API: <http://127.0.0.1:3000/api>
- Pemeriksaan server: <http://127.0.0.1:3000/api/health>
- `npm run dev` memulai ulang server ketika kode backend berubah. Muat ulang browser untuk perubahan frontend.
- `npm start` menjalankan server tanpa pemantauan perubahan file.
- Tekan **Ctrl+C** untuk menghentikan server.

Gunakan alamat dan port yang sama setiap kali mencoba prototype. Penyimpanan browser untuk `127.0.0.1:3000`, `localhost:3000`, dan Live Server berbeda; data lama tidak otomatis pindah atau dihapus saat berganti alamat.

## Konfigurasi opsional

Tanpa `.env`, server memakai `NODE_ENV=development`, `HOST=127.0.0.1`, dan `PORT=3000`. Untuk mengubahnya, salin `.env.example` menjadi `.env` bila file tersebut belum ada. File `.env` tidak masuk Git. Environment dari terminal/hosting diprioritaskan atas nilai dalam file.

Jika port 3000 sudah digunakan, ubah `PORT` di `.env`, lalu mulai ulang server. Saat deployment nanti, sesuaikan `PORT` dengan penyedia hosting dan gunakan `HOST=0.0.0.0` bila perlu menerima koneksi di luar localhost. Fondasi ini belum merupakan layanan produksi dengan autentikasi server.

## Struktur

| Berkas | Tugas |
| --- | --- |
| `src/server.js` | Membaca `.env`, membuka port, menangani kegagalan startup dan penghentian server |
| `src/config.js` | Nilai bawaan dan validasi konfigurasi |
| `src/app.js` | Menyusun Express, route API, dan berkas frontend publik |
| `src/routes/health.js` | `GET /api` dan `GET /api/health` |
| `src/middleware/errors.js` | Respons error JSON, termasuk 404 dan JSON tidak valid |
| `../tests/server.test.cjs` | Pengujian HTTP, konfigurasi, akses berkas, dan startup |

Frontend dan API memakai origin yang sama, sehingga belum memerlukan pengaturan CORS. Frontend belum memanggil API untuk alur bisnis. `/api/health` hanya membuktikan proses server hidup; endpoint itu tidak menguji koneksi database. `/api` secara eksplisit menampilkan `database: "not_connected"`.

Server hanya melayani entry frontend, JavaScript publik di `/js`, dan ekstensi media yang diizinkan di `/assets`. Konfigurasi, kode backend, dependency, PRD, dan README tidak dilayani sebagai berkas publik. Media contoh di `/assets` tetap publik; file berbayar produksi nantinya membutuhkan storage privat dan pemeriksaan akses server.

Permintaan JSON dibatasi 100 KB. Batas ini bukan mekanisme unggah file; upload backend belum tersedia. Route yang tidak ada memakai format berikut:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Alamat yang diminta tidak ditemukan."
  }
}
```

## Pengujian

```sh
npm test
npm run test:server
npm run test:database
```

`npm test` menjalankan aturan frontend, pengujian HTTP server, dan schema database. Pengujian HTTP memakai port sementara dan menutup server setelah selesai; pengujian SQL memakai PGlite in-memory tanpa membaca koneksi database aplikasi. Penyimpanan browser pribadi tidak diubah. Panduan pengujian browser lengkap tersedia di [README proyek](../assets/README.md).

Hasil pemeriksaan 9 November 2026: **31 pengujian otomatis** serta **8 kelompok pemeriksaan browser melalui Express** pada desktop/HP lolos. Rincian dan batas pemeriksaan tersedia di [audit fondasi backend](../docs/AUDIT-BACKEND-FOUNDATION.md).

## Langkah berikutnya

1. Hubungkan PostgreSQL dan pilih ORM; Prisma telah dibahas, tetapi belum dipasang. Navicat tetap dapat dipakai untuk mengelola PostgreSQL.
2. Terapkan schema/seed yang sudah tersedia pada database baru. Jika memakai Prisma setelah SQL dijalankan, siapkan introspeksi dan baseline migrasi. Database versi lama memerlukan migrasi khusus; panduan ada di folder database.
3. Terapkan autentikasi, hashing password, sesi, dan otorisasi tiga role di server.
4. Buat API akun, konten, tryout, dan ringkasan belajar; sambungkan frontend secara bertahap.
5. Tambahkan storage privat, integrasi pembayaran/email, dan deployment setelah alur server diuji.

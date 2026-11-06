# Cendekia Muda

Prototype HTML, CSS, dan JavaScript berdasarkan [PRD final](PRD.md) dan referensi dalam `foto svg/`. Aplikasi berjalan tanpa build atau framework.

## Menjalankan

Buka folder ini dengan **Live Server** di VS Code, atau jalankan:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Lalu buka [localhost:8000](http://localhost:8000). Gunakan localhost agar penyimpanan, Web Crypto, dan unduhan bekerja konsisten. Font Outfit dimuat dari Google Fonts; aset gambar dan video tersedia lokal.

## Akun demo

Semua akun berikut memakai kata sandi **`demo1234`**.

| Akun | Email | Halaman masuk |
| --- | --- | --- |
| Siswa Gratis — Raka | `raka@cendekiamuda.test` | `#/auth/login` |
| Program Lengkap — Nadia | `nadia@cendekiamuda.test` | `#/auth/login` |
| Admin | `admin@cendekiamuda.test` | `#/auth/admin-login` |

Raka mempunyai contoh pesanan menunggu pembayaran. Buka **Pembayaran & Transaksi → Lanjutkan Pembayaran → Berhasil** untuk mencoba aktivasi Reguler. Pendaftaran akun baru dimulai dari Gratis tanpa transaksi contoh.

## Mencoba alur

1. Daftar, kerjakan soal gratis, dan periksa kunci jawaban.
2. Pilih Reguler atau Lengkap, tentukan metode, lalu tekan **Bayar Sekarang**.
3. Pada detail transaksi, gunakan simulasi **Berhasil**, **Gagal**, **Kedaluwarsa**, atau **Uji Signature Salah**. Sesudah Lunas, tersedia uji callback ganda.
4. Buka bank soal, drilling, PDF, tryout, hasil, dan progress. Video membutuhkan Program Lengkap.
5. Gunakan akun admin untuk mengelola siswa, program, materi, soal, jadwal tryout, serta mengekspor transaksi.

## Susunan file

| File | Isi |
| --- | --- |
| `index.html` | Entry point, font, dan urutan pemuatan script |
| `style.css` | UI kit, tampilan halaman, dan layout responsif |
| `script.js` | Router, halaman, formulir, interaksi, PDF dan CSV |
| `js/data.js` | Konfigurasi kontak, tujuh subtes, dan contoh dua belas tabel |
| `js/core.js` | Akun, akses, transaksi, penilaian, timer, dan penyimpanan |
| `assets/` | Gambar dari referensi SVG dan tujuh video pengantar lokal |
| `tests/` | Pengujian aturan inti dan alur browser |
| `docs/preview/` | Screenshot implementasi desktop dan HP |

Isi `CM.config.whatsapp`, `email`, dan `address` di `js/data.js` dengan kontak resmi. WhatsApp memakai format kode negara, misalnya `62...`. Kontak kosong tidak diarahkan ke nomor contoh. Nomor dan alamat belum ditentukan dalam PRD.

## Data dan batas prototype

- Data disimpan di browser pada key `cendekia-muda-v2`; salinan sebelumnya disimpan pada `cendekia-muda-v2-backup`. Data versi lama tidak dihapus atau dimigrasikan otomatis.
- Akun, jawaban, pembayaran, dan hasil pada perangkat/browser lain tidak tersinkron. Menghapus data situs menghapus data lokal.
- Tersedia 70 soal contoh, 14 modul PDF yang dapat dibaca/diunduh, 7 video pengantar singkat tanpa suara, dan 4 tryout. Konten ini untuk mendemonstrasikan alur; video dapat diganti melalui Kelola Materi.
- Pembayaran dan pemulihan kata sandi adalah simulasi lokal. Tidak ada pembayaran uang sungguhan atau email terkirim.
- Akses diperiksa di router dan operasi data, tetapi data serta kode client tetap dapat diperiksa lewat DevTools. Produksi membutuhkan API dengan otorisasi server, database, gateway sungguhan, layanan email, dan backup terjadwal di luar browser. Hash password dan secret callback lokal bukan pengganti keamanan server.

## Pengujian

Aturan inti, tanpa dependency tambahan (Node.js 20+):

```sh
node --test tests/core.test.cjs
```

Pengujian browser membutuhkan Playwright dengan Chromium tersedia:

```sh
node tests/browser.cjs
```

Jika Playwright dipasang di lokasi lain, tentukan `PLAYWRIGHT_MODULE`. Gunakan `PLAYWRIGHT_BROWSERS_PATH` untuk lokasi browser dan `QA_OUTPUT` untuk folder hasil. Pengujian membuat server localhost sementara dan memakai profil browser terisolasi. Data browser pribadi tidak diubah. Video contoh dibuat ulang hanya jika file lokalnya belum ada.

Hasil pemeriksaan terakhir ada di [AUDIT-PRD.md](AUDIT-PRD.md) dan [laporan browser](docs/hasil-uji-browser.json).

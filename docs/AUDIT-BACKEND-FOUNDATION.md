# Pemeriksaan fondasi Node.js + Express

Tanggal: **9 November 2026**. Lingkungan pemeriksaan: macOS arm64, Node.js **24.21.0**, npm **11.19.0**, Express **5.3.0**.

## Hasil

- `npm test`: **31 pengujian lolos**, terdiri dari 24 pengujian aturan prototype dan 7 pengujian server.
- Server: konfigurasi, health endpoint, penyajian frontend, byte range video, penolakan akses konfigurasi/kode backend/dokumentasi, error JSON, batas request, serta kegagalan startup saat port digunakan atau konfigurasi tidak valid.
- `npm run dev`: startup berhasil, perubahan file backend memulai ulang server, dan penghentian melalui Ctrl+C berhasil.
- Chromium melalui Express di `http://127.0.0.1:3000`: **8 kelompok pemeriksaan lolos** pada viewport 1280 dan 390 piksel. Masing-masing mencakup landing/API origin yang sama; login siswa, bank soal, dan pemutaran video; login pengajar, ringkasan belajar, dan draft tryout; serta login admin, daftar pengajar, dan tryout.
- Tidak ditemukan error JavaScript atau respons HTTP lokal berstatus 400 ke atas dalam pemeriksaan browser tersebut. Profil browser pengujian terisolasi dari data browser pribadi.
- Pemeriksaan sintaks seluruh file server dan pengujiannya, konsistensi dependency dengan lockfile, aturan ignore konfigurasi/dependency, serta `git diff --check` lolos.

## Batas pemeriksaan

Fondasi ini belum menyediakan koneksi PostgreSQL, ORM, autentikasi server, API CRUD, upload server, payment gateway, atau email. Login dan operasi bisnis yang diuji di browser masih alur prototype lokal. `/api/health` menguji proses server hidup, bukan kesiapan database atau layanan produksi.

Pengujian browser kali ini memeriksa integrasi frontend dengan Express pada halaman utama dan tiga role; tidak mengulang seluruh skenario regresi browser lama. Hasil regresi prototype sebelumnya tetap ada di [audit ringkasan pengajar](AUDIT-RINGKASAN-PENGAJAR.md). Panduan menjalankan fondasi server ada di [README backend](../server/README.md).

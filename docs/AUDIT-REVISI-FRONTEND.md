# Audit Revisi Frontend — 9 November 2026

Acuan: [PRD](../assets/PRD.md), [ERD](../ERD/ERD-Cendekia-Muda-revisi.drawio), dan [panduan menjalankan](../assets/README.md). Implementasi mempertahankan HTML/CSS/JS tanpa framework. Revisi ini melengkapi prototype lokal; API PHP/PostgreSQL belum dibuat.

## Perubahan yang tersedia

- Tiga login: siswa, pengajar, admin. Admin membuat pengajar dan menentukan satu atau beberapa subtes; pencabutan tugas menutup pengelolaan subtes tersebut.
- Pengajar mengelola materi, video, serta soal pada subtes tugasnya. Konten langsung tersedia sesuai status aktif dan Gratis/Berbayar. Soal yang sudah dipakai atau masuk tryout Rilis dilindungi; revisi dibuat melalui **Salin**.
- Paket tryout bersama berisi tujuh subtes. Pengajar memilih/mengurutkan soal pada subtes tugasnya tanpa mengganti kontribusi subtes lain. Admin mengatur paket, memeriksa kelengkapan, dan merilis; paket yang sudah dikerjakan dibekukan.
- Admin mengelola kontak pendamping, menetapkan siswa per subtes, dan menyimpan riwayat penggantian. **Pendamping Saya** hanya menyediakan kontak untuk siswa dengan program aktif. Nomor demo sengaja kosong sampai admin mengisinya.
- Video mendukung tautan YouTube/Vimeo/MP4/WebM dan unggahan lokal. File tersimpan di IndexedDB, metadata di localStorage; unggahan salah tipe ditolak. Form PDF memakai batas 20 MB, video 100 MB.
- Notifikasi dan profil berada di dropdown top bar siswa. Pembayaran dibuka dari profil, dengan tab Belum Dibayar dan Riwayat Transaksi. Program dan checkout tetap halaman sendiri.
- `js/management.js` menambahkan empat koleksi serta metadata tanpa menghapus ID, jawaban, transaksi, atau hasil lama. Data browser kini memiliki 16 koleksi, sepadan dengan tabel target ERD.

## Verifikasi

**22 uji aturan data dan 20 kelompok uji browser lulus.** Rincian dan catatan pengujian ulang tersedia di [hasil uji JSON](hasil-uji-revisi-frontend.json).

Uji aturan meliputi migrasi aditif/idempoten, tiga role, pembatasan dan pencabutan subtes, kontribusi bersama, penolakan pilihan usang, rilis tujuh subtes, perlindungan soal, penggantian pendamping, akses program, validasi file, dan pemulihan data ketika penyimpanan operasi gagal.

Browser Chromium diperiksa pada lebar desktop 1280 px dan HP 390 px. Alur yang diuji mencakup login, registrasi, latihan/progress, checkout simulasi, tryout/autosave, PDF contoh/CSV, katalog admin, kontribusi dua pengajar, penugasan pendamping, dropdown profil/notifikasi, serta video unggahan yang dapat diputar setelah reload. Tidak ada exception browser yang tidak tertangani pada suite lengkap.

Kegagalan awal berasal dari asumsi/waktu tunggu pada harness: toggle kini asinkron, filter status tersedia di kedua tab katalog, klik penutup navigasi harus di luar sidebar, soal baru belum terkunci sebelum dijawab, dan video gratis tetap terbuka untuk siswa. Skenario diperbaiki sesuai perilaku yang diwajibkan PRD. Suite lengkap terakhir meluluskan 19/20 kelompok; satu kelompok katalog dilanjutkan dengan pengujian khusus hingga lulus. Laporan menggabungkan hasil terakhir setiap kelompok dan mencatat kedua run tersebut.

Pemeriksaan sintaks JavaScript dan `git diff --check` lulus. XML ERD terbaca dengan lima halaman. Preview berikut diperiksa secara visual:

- [Ringkasan pengajar — desktop](preview/pengajar-dashboard-desktop.png)
- [Tryout pengajar — HP](preview/pengajar-tryout-hp.png)

## Batas hasil

Otorisasi saat ini berjalan pada router dan operasi JavaScript. Data lokal tetap dapat diperiksa lewat DevTools; ini bukan bukti keamanan produksi. Berkas IndexedDB tidak berpindah lewat Git dan tidak tersinkron lintas browser/perangkat. Pembayaran serta pemulihan kata sandi masih simulasi lokal.

Pemutaran video unggahan diuji langsung. Untuk tautan penyedia eksternal, pengujian mencakup validasi dan pembentukan URL pemutar; ketersediaan jaringan dan izin embed penyedia tetap diperlukan. Pengujian tidak menghubungi nomor WhatsApp, memproses uang sungguhan, atau mengirim email.

Tahap berikutnya ialah API PHP, PostgreSQL, transaksi database, storage privat, serta pengujian otorisasi server. Sidebar ringkas yang dibuka lewat logo dan perubahan besar gaya visual belum dikerjakan dalam revisi fitur ini.

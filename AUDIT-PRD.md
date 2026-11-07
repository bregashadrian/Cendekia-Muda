# Audit implementasi Cendekia Muda

Tanggal pemeriksaan: **4 November 2026**. Acuan: [PRD final](PRD.md) dan folder `foto svg/`.

**Catatan dokumentasi 7 November 2026:** PRD kini mencantumkan Pengunjung dan 33 use case. Penjelasan terbaru ada di [Aktor dan Akses](docs/AKTOR-DAN-AKSES.md); hasil uji di bawah tetap merupakan catatan pemeriksaan 4 November. Perubahan halaman admin 6 November dicatat di [audit admin per subtes](docs/AUDIT-ADMIN-SUBTES.md).

Implementasi prototype sudah diperbarui dan alur utama yang diuji berjalan. Tampilan mengikuti warna, font Outfit, komponen, susunan halaman, serta aset gambar dari SVG. Isi yang bertentangan dengan PRD disesuaikan: tidak memakai kupon, ranking, IRT, mentor, transfer manual, atau klaim jumlah konten yang tidak ada.

Audit sebelumnya, termasuk temuan dan nomor baris kode lama, disimpan di [arsip audit awal](docs/AUDIT-PRD-AWAL.md). Arsip tersebut bukan status implementasi sekarang.

## Hasil pemeriksaan

| Bagian | Implementasi yang diperiksa |
| --- | --- |
| Landing dan autentikasi | Navigasi, program, CTA, login siswa/admin, registrasi, tampilkan password, ingat sesi, pemulihan lokal |
| Akses Gratis/Aktif | Diturunkan dari pendaftaran Lunas dan tanggal aktif; guard role, akses materi, transaksi milik sendiri, serta hasil milik sendiri |
| Program dan pembayaran | Dua program, empat metode, satu transaksi pending, 24 jam, signature simulasi, callback ganda idempoten, status akhir tetap |
| Gagal/batal/kedaluwarsa | Retry Gagal memakai pendaftaran yang sama; batal/kedaluwarsa membatalkan pendaftaran dan pesanan baru memakai pendaftaran baru |
| Upgrade/perpanjangan | Upgrade harga penuh dan status Digantikan; perpanjangan H-3 menyambung masa aktif; setelah habis dimulai dari pembayaran |
| Latihan dan bank soal | Tujuh subtes, simpan setiap jawaban, progress dari soal unik, kunci saja untuk Gratis, pembahasan untuk Aktif, drilling dan lanjut soal belum dijawab |
| Materi | PDF baca online/unduh, tujuh video lokal yang dapat diputar, video terkunci pada Reguler |
| Tryout | Jadwal rilis, sekali pengerjaan, satu timer total, autosave, ragu-ragu, navigasi per subtes, konfirmasi, penilaian otomatis, hasil dan review |
| Nilai dan riwayat | Grafik hasil tryout, kompetensi per subtes, dua prioritas belajar, log evaluasi dan review jawaban lama tanpa membuat percobaan baru |
| Profil/notifikasi | Ubah identitas dan password; notifikasi pembayaran, hasil, rilis tryout; tandai dibaca |
| Admin | Tambah/ubah siswa, nonaktifkan akun; ubah program; tambah/ubah materi dan soal; pengaturan akses; pilih soal dan jadwalkan tryout; laporan dan CSV |
| Monitoring transaksi | Filter, pagination, detail/linimasa dan salin ID; tidak menyediakan verifikasi manual atau tombol simulasi untuk admin |

## Pengujian yang dijalankan

- **13/13 tes aturan inti lulus** melalui `node --test tests/core.test.cjs`.
- **11/11 kelompok tes browser lulus** melalui Playwright/Chromium; laporan ada di [hasil uji browser](docs/hasil-uji-browser.json).
- Pemeriksaan 36 halaman/state pada masing-masing lebar **1280 px** dan **390 px**, meliputi publik, siswa Gratis, siswa Aktif, dan admin. Tidak ditemukan overflow horizontal halaman pada state yang diperiksa. Tabel lebar memakai area gulir sendiri.
- Alur browser mencakup daftar → latihan → reload → checkout → Lunas → upgrade → video; tryout → autosave/ragu → reload → hasil → review; drilling lanjut; PDF/CSV; CRUD admin; reset password; profil; menu HP; notifikasi; serta refresh otomatis saat akses berakhir.
- Tidak ada exception JavaScript yang tidak tertangani selama pengujian browser.
- Screenshot aplikasi diperiksa dan dibandingkan dengan referensi SVG utama. Penyesuaian bukan salinan piksel mutlak; data dinamis dan aturan PRD menentukan isi.

## Preview aktual

- [Landing desktop](docs/preview/landing-desktop.png)
- [Login desktop](docs/preview/login-desktop.png)
- [Dashboard Aktif desktop](docs/preview/dashboard-desktop.png)
- [Dashboard Gratis HP](docs/preview/dashboard-hp.png)

## Batas hasil ini

Ini prototype lokal sesuai kebutuhan data mock dan simulasi gateway. Belum merupakan layanan produksi dengan database/API, otorisasi server, gateway uang sungguhan, email pemulihan, dan backup eksternal terjadwal. Proteksi konten di client tidak menyembunyikan sumber data dari DevTools.

Data lama tidak dihapus. Implementasi baru memakai storage `cendekia-muda-v2`, dengan cadangan snapshot sebelumnya. Kontak WhatsApp, email, dan alamat resmi masih perlu diisi pada konfigurasi. Video berupa pengantar singkat tanpa suara dan soal/modul berupa contoh untuk mendemonstrasikan alur.

Pengujian dilakukan di Chromium lokal. Target waktu muat di bawah tiga detik belum diverifikasi pada koneksi produksi atau perangkat fisik; Safari/Firefox belum diuji. Panduan menjalankan dan akun demo tersedia di [README](README.md).

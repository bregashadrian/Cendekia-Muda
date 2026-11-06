# Pemeriksaan Materi & Bank Soal Admin

Tanggal: **6 November 2026**.

Menu `#/admin/materi-soal` sekarang menampilkan tujuh kartu subtes, dikelompokkan dalam TPS serta Literasi & Penalaran Matematika. Buka Kelola Subtes untuk berpindah ke tab Bank Soal atau Materi. Pengelompokan memakai data `subtes` yang sudah ada.

- Pencarian lintas subtes di halaman awal; pencarian dan filter khusus pada detail subtes.
- Pratinjau soal lengkap, kunci, dan pembahasan sebelum mengedit.
- Form tambah otomatis memilih subtes aktif; edit mengikuti subtes milik data.
- Filter dan pagination terpisah per subtes/tab selama halaman aplikasi terbuka. Reload membuka kembali rute yang sama dengan filter awal.
- Status dan akses tetap dapat diubah lewat Lainnya. Riwayat pengerjaan tetap tersimpan ketika soal dinonaktifkan.
- Tampilan HP memakai kartu, dengan dropdown filter yang terbaca penuh.

## Validasi

- **13/13 tes aturan inti lulus** (`tests/core.test.cjs`).
- **14/14 kelompok tes browser lulus** (`tests/browser.cjs`), termasuk alur siswa, admin, pembayaran simulasi, serta fitur katalog baru.
- Skenario baru memeriksa filter gabungan, pencarian soal/materi, teks HTML sebagai teks biasa, penambahan ke subtes selain subtes pertama, perubahan status, pratinjau, dan pembatasan akses siswa.
- Pagination diuji dengan 105 soal dalam satu subtes, termasuk setelah edit dan perubahan filter di tab/subtes lain.
- Layout diperiksa pada lebar 1280 dan 390 px. Setelah penyesuaian terakhir lebar dropdown HP, skenario mobile dijalankan kembali dan lulus.
- Pemeriksaan sintaks JavaScript dan `git diff --check` lulus.

[Hasil terstruktur](hasil-uji-admin-subtes.json). Pengujian memakai Chromium dengan profil terisolasi; data browser pribadi tidak diubah. Backend tetap berupa prototype lokal sesuai README.

## Screenshot

- [Daftar subtes desktop](preview/admin-subtes-desktop.png)
- [Bank soal desktop](preview/admin-bank-soal-desktop.png)
- [Bank soal HP](preview/admin-bank-soal-hp.png)
- [Pratinjau soal HP](preview/admin-pratinjau-hp.png)

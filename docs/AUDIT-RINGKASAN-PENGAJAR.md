# Ringkasan Hasil Belajar Pengajar — 9 November 2026

Implementasi mengikuti [PRD §7.2 dan UC-40](../assets/PRD.md). PRD kini memuat 40 use case; struktur ERD tetap 16 tabel. Ringkasan dihitung dari jawaban latihan, soal/subtes, keanggotaan soal tryout, serta hasil/jawaban tryout yang sudah ada.

## Hasil implementasi

Pengajar membuka **Hasil Belajar** melalui sidebar, dashboard, katalog subtes, atau detail subtes tryout. Pilihan subtes mengikuti tugas aktif: Dimas PK/PM, Maya PU/PPU. Pengajar dengan penugasan kosong mendapat arahan menghubungi admin; subtes lain ditolak.

Tab **Latihan Bank Soal** menampilkan siswa unik, jumlah percobaan, jumlah soal unik, akurasi, serta maksimal lima soal yang paling sering salah. Percobaan berulang tetap dihitung terpisah. Tab **Tryout** memisahkan siswa unik dan jumlah pengerjaan selesai, menghitung rata-rata nilai subtes, menyediakan filter paket, serta membandingkan rata-rata kelompok antartryout berdasarkan jadwal rilis. Soal tidak dijawab dalam pengerjaan selesai masuk penyebut dengan nilai 0; pengerjaan berjalan dikecualikan. Tanpa data, nilai ditampilkan “—” atau “Belum ada hasil”.

Ringkasan baca saja dan agregat. Respons `CM.teacherSummary` tidak memuat identitas/nilai individu. Pratinjau soal dari laporan tidak memiliki tombol ubah atau salin. Halaman ini tidak menambahkan relasi pengajar–siswa.

## Verifikasi

**24 uji aturan data dan 21 kelompok uji browser lulus**, tanpa exception browser yang tidak tertangani. [Laporan JSON](hasil-uji-ringkasan-pengajar.json) memuat hasil lengkap. Pemeriksaan sintaks JavaScript, tautan dokumentasi lokal, dan `git diff --check` juga lulus.

Kasus perhitungan menguji percobaan latihan berulang versus siswa/soal unik, pemisahan subtes, rata-rata per pengerjaan dengan jumlah soal paket berbeda, soal kosong tanpa record jawaban, nilai 0 yang sah versus data kosong, serta pengecualian tryout berjalan. Akses role lain, subtes di luar tugas, dan tugas yang dicabut ditolak; membaca ringkasan tidak mengubah jawaban/hasil.

Browser mencakup pergantian subtes/tab, filter satu/semua paket, pratinjau baca saja, pintasan katalog, URL subtes terlarang, dan kondisi kosong. Seluruh alur prototype sebelumnya juga dijalankan ulang. Layout lebar 1280 px dan 390 px diperiksa tanpa overflow; preview berikut diperiksa secara visual:

- [Latihan — desktop](preview/pengajar-hasil-latihan-desktop.png)
- [Tryout — HP](preview/pengajar-hasil-tryout-hp.png)

## Batas prototype

Data masih berasal dari browser yang sama. Backend PHP/PostgreSQL dan API agregasi belum tersedia. Pemeriksaan JavaScript tidak menggantikan otorisasi server; API produksi harus memeriksa role/penugasan sebelum menghitung dan hanya mengirim agregat yang diizinkan. Perbandingan antartryout merupakan rata-rata kelompok peserta yang dapat berbeda, bukan klaim perkembangan individu.

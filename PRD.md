# PRD: Cendekia Muda (Platform Persiapan UTBK-SNBT Online)

Versi: terbaru, sinkron dengan laporan final (32 use case, 12 tabel).
Aturan emas: **jika desain Figma bertentangan dengan dokumen ini, ikuti dokumen ini** (lihat bagian 15).

## 1. Ringkasan
Cendekia Muda adalah aplikasi web persiapan UTBK-SNBT untuk siswa SMA. Siswa mencoba soal dan materi preview gratis, lalu membeli program berbayar untuk membuka bank soal, tryout mingguan, dan (program tertentu) video pembahasan. Pembayaran diproses otomatis lewat payment gateway tanpa verifikasi manual. Admin mengelola konten, program, tryout, dan memantau transaksi serta laporan.
Bahasa antarmuka: Bahasa Indonesia. Mata uang: Rupiah. Tata letak mengikuti wireframe (grayscale, low-fidelity) dan desain UI di Figma, dengan pengecualian pada bagian 15.

## 2. Aktor
- **Siswa:** registrasi, coba gratis, beli program, belajar, latihan soal, tryout, lihat nilai.
- **Admin:** kelola siswa, program, materi, bank soal, tryout, pantau transaksi, laporan. Akun admin dibuat langsung oleh pengelola, bukan lewat registrasi publik. Admin masuk lewat halaman **Login Admin** tersendiri.
- **Payment Gateway (eksternal):** memproses pembayaran dan mengirim notifikasi status.
- Proses otomatis sistem (bukan aktor): verifikasi pembayaran, aktivasi akses, pembatalan transaksi kedaluwarsa, penilaian tryout, penyimpanan jawaban latihan.

## 3. Konsep Akses
- Status akses dihitung, tidak disimpan: **Gratis** jika tidak ada program yang sedang berjalan, **Aktif** jika ada pendaftaran Lunas yang masa aktifnya berjalan.
- Konten bertanda gratis terbuka untuk semua siswa login. Bank soal berbayar, materi PDF, pembahasan lengkap, dan tryout terbuka untuk siswa Aktif. Video hanya jika program aktif punya akses video.
- **Pembahasan:** pada soal gratis, siswa Gratis hanya melihat **kunci jawaban (benar/salah)**. Pembahasan lengkap hanya untuk siswa Aktif.
- Setelah masa aktif berakhir konten berbayar terkunci lagi, riwayat latihan dan nilai tetap tersimpan dan bisa dilihat.
- Menu atau konten terkunci tampil dengan ikon gembok dan ajakan upgrade.
- Akses konten berbayar harus dicek di sisi server/route guard, bukan hanya disembunyikan di UI.

## 4. Program (nama dan harga contoh)
| Program | Durasi | Harga | Bank soal, pembahasan teks, tryout mingguan | Video pembahasan |
| --- | --- | --- | --- | --- |
| Program Reguler ("Paket Standard") | 30 hari | Rp 100.000 | Ya | Tidak |
| Program Lengkap ("Paket Komprehensif", label "Hemat - Paling Populer") | 60 hari | Rp 170.000 | Ya | Ya |

Pembeda hanya durasi dan video. Konten adalah satu katalog bersama (tidak terikat program), dikelompokkan per **subtes**.
Tujuh subtes UTBK-SNBT: Penalaran Umum, Pengetahuan dan Pemahaman Umum, Pemahaman Bacaan dan Menulis, Pengetahuan Kuantitatif (Tes Potensi Skolastik); Literasi Bahasa Indonesia, Literasi Bahasa Inggris, Penalaran Matematika (Tes Literasi).

## 5. Aturan Pembelian dan Pembayaran
- Satu program aktif pada satu waktu. Tanpa program aktif, boleh membeli program mana pun.
- **Upgrade** Reguler ke Lengkap saat Reguler berjalan: harga penuh, langsung berlaku, Reguler berstatus Digantikan, sisa hari hangus.
- **Perpanjangan** boleh mulai H-3 sebelum masa aktif berakhir: masa aktif baru menyambung setelah yang lama berakhir (tanpa hari hangus). Jika dibayar setelah masa aktif habis, dimulai dari tanggal bayar. Di luar itu, beli ulang dilarang.
- Hanya satu transaksi Menunggu Pembayaran per siswa.
- Pembayaran: sistem membuat transaksi (order_id unik, jumlah = harga saat itu) lalu siswa memilih metode (**QRIS, E-Wallet, Bank Mobile, Virtual Account**) dan membayar lewat gateway. Batas bayar **24 jam**.
- Status pembayaran: Menunggu Pembayaran, Lunas, Gagal, Kedaluwarsa (status akhir tidak berubah, notifikasi ganda tidak diproses dua kali, signature notifikasi divalidasi).
- **Lunas:** masa aktif dihitung (tanggal_berakhir = tanggal_aktif + durasi_hari), akses aktif, notifikasi dikirim.
- **Gagal:** pendaftaran tetap Menunggu Pembayaran, siswa boleh coba bayar lagi (pembayaran baru pada pendaftaran yang sama).
- **Kedaluwarsa** atau **Batalkan Pesanan** oleh siswa: pendaftaran Dibatalkan, akun tetap Gratis, boleh buat transaksi baru. Batalkan Pesanan hanya untuk transaksi berstatus Menunggu Pembayaran.
- Untuk prototype, simulasikan callback gateway dengan tombol uji (Berhasil, Gagal, Kedaluwarsa).
- Di luar cakupan: refund, voucher/kupon, diskon/harga coret, biaya layanan tambahan, transfer manual dan upload bukti, pembayaran kolektif sekolah.

## 6. Latihan Soal, Bank Soal, Materi
- **Latihan soal:** siswa menjawab soal per subtes, pembahasan muncul setelah menjawab (kunci saja untuk siswa Gratis, lengkap untuk siswa Aktif). **Setiap jawaban latihan disimpan** di tabel `jawaban_latihan` (boleh diulang, setiap percobaan satu baris), untuk siswa Gratis maupun Aktif.
- **Drilling 10 soal (siswa Aktif):** sistem memilih 10 soal dari subtes yang belum dikerjakan. "Lanjutkan Pengerjaan" melanjutkan ke soal yang belum dikerjakan.
- **Progres belajar per subtes** = jumlah soal berbeda yang sudah dikerjakan dibagi total soal aktif subtes itu (dari `jawaban_latihan`). **Skor dan akurasi per subtes** dihitung dari tryout.
- **Materi:** PDF (Baca Online dan Unduh PDF, hanya siswa Aktif untuk yang berbayar) dan video (Tonton Video, status Belum Diputar). Video terkunci untuk Reguler dengan keterangan "Khusus Program Lengkap" dan tombol Bandingkan Paket Belajar.
- Soal: pilihan ganda A sampai E, gambar opsional, rumus lewat teks atau gambar, punya `subtes` dan `tingkat_kesulitan`.

## 7. Tryout
- Dirilis mingguan sesuai tanggal_rilis. Siswa Aktif boleh mengerjakan semua tryout yang sudah dirilis, termasuk arsip, tanpa tanggal tutup.
- **Hanya boleh dikerjakan sekali.** **Satu timer total per tryout** (tidak ada timer per subtes). Jawaban tersimpan otomatis, siswa bisa lanjut selama waktu belum habis, dan saat waktu habis jawaban dikumpulkan otomatis.
- Fitur **Tandai Ragu-Ragu** per soal (`jawaban_siswa.is_ragu`). Soal dikelompokkan per subtes pada panel nomor soal.
- Skor = jumlah benar / total soal x 100 (tanpa pengurangan salah, **bukan IRT**). Kategori capaian per subtes (contoh): Sangat Tinggi (85 ke atas), Tinggi (70-84), Baik (55-69), Moderat (40-54), Perlu Peningkatan (25-39), Kritis (di bawah 25).
- **Review dan Pembahasan Tryout** terbuka untuk siswa Aktif pada tryout berstatus Selesai, diakses dari Hasil Tryout dan tabel riwayat Nilai dan Progress.

## 8. Use Case (32)
Gratis = semua siswa login. Berbayar = siswa Aktif. Sistem = otomatis.

| Kode | Use Case | Aktor | Akses |
| --- | --- | --- | --- |
| UC-01 | Registrasi | Siswa | Gratis |
| UC-02 | Login (admin lewat Login Admin) | Siswa, Admin | Gratis |
| UC-03 | Lupa Password | Siswa, Admin | Gratis |
| UC-04 | Kelola Profil (termasuk asal sekolah, tahun lulus) | Siswa | Gratis |
| UC-05 | Lihat Daftar Program | Siswa | Gratis |
| UC-06 | Pilih Program | Siswa | Gratis |
| UC-07 | Bayar Program | Siswa, Payment Gateway | Gratis |
| UC-08 | Perpanjang atau Upgrade Program | Siswa | Berbayar |
| UC-09 | Lihat Status dan Riwayat Transaksi | Siswa | Gratis |
| UC-10 | Kerjakan Soal Gratis (Gratis hanya lihat kunci jawaban) | Siswa | Gratis |
| UC-11 | Lihat Materi Preview | Siswa | Gratis |
| UC-12 | Lihat Notifikasi | Siswa | Gratis |
| UC-13 | Lihat Nilai dan Progress | Siswa | Gratis |
| UC-14 | Akses Materi Lengkap (PDF dan bank soal) | Siswa | Berbayar |
| UC-15 | Tonton Video Pembahasan | Siswa | Berbayar |
| UC-16 | Kerjakan Tryout | Siswa | Berbayar |
| UC-17 | Nilai Tryout Otomatis | Sistem | Berbayar |
| UC-18 | Lihat Laporan (termasuk ekspor CSV log transaksi) | Admin | Admin |
| UC-19 | Kelola Siswa | Admin | Admin |
| UC-20 | Kelola Program | Admin | Admin |
| UC-21 | Kelola Materi dan Bank Soal | Admin | Admin |
| UC-22 | Kelola Tryout dan Jadwal Rilis | Admin | Admin |
| UC-23 | Tandai Konten Gratis/Berbayar | Admin | Admin |
| UC-24 | Pantau Transaksi | Admin | Admin |
| UC-25 | Verifikasi Pembayaran Otomatis | Payment Gateway, Sistem | Sistem |
| UC-26 | Aktifkan Akses Siswa | Sistem | Sistem |
| UC-27 | Batalkan Transaksi Kedaluwarsa (hanya Kedaluwarsa, bukan Gagal) | Sistem | Sistem |
| UC-28 | Batalkan Pesanan | Siswa | Gratis |
| UC-29 | Kerjakan Latihan Soal Lengkap (termasuk drilling 10 soal) | Siswa | Berbayar |
| UC-30 | Simpan Jawaban Latihan | Sistem | Gratis dan Berbayar |
| UC-31 | Lihat Review dan Pembahasan Tryout | Siswa | Berbayar |
| UC-32 | Tandai Soal Ragu-Ragu | Siswa | Berbayar |

Relasi (asal -> tujuan; include = selalu dipanggil, extend = kondisional):
- Bayar Program include Pilih Program
- Perpanjang atau Upgrade include Bayar Program
- Lupa Password extend Login
- Kerjakan Tryout include Nilai Tryout Otomatis
- Tandai Konten Gratis/Berbayar extend Kelola Materi dan Bank Soal
- Aktifkan Akses Siswa extend Verifikasi Pembayaran Otomatis (jika Lunas)
- Batalkan Transaksi Kedaluwarsa extend Verifikasi Pembayaran Otomatis (jika Kedaluwarsa)
- Kerjakan Soal Gratis include Simpan Jawaban Latihan
- Kerjakan Latihan Soal Lengkap include Simpan Jawaban Latihan
- Tandai Soal Ragu-Ragu extend Kerjakan Tryout
- Lihat Review dan Pembahasan Tryout extend Lihat Nilai dan Progress
- Batalkan Pesanan extend Lihat Status dan Riwayat Transaksi (jika Menunggu Pembayaran)

## 9. Daftar Layar (mengikuti wireframe dan UI Figma)
**Landing Page:** navbar (Beranda, Program, Keunggulan, Testimoni, Kontak, Masuk, Daftar); hero dengan tombol Coba Gratis dan Lihat Program, plus mockup Portal Siswa; Keunggulan Utama (3 kartu); Alur Belajar (01 Daftar, 02 Program, 03 Simulasi); Paket Belajar (dua kartu program); Cerita Siswa (3 testimoni); banner "Daftar Akun Gratis Sekarang" dan "Konsultasi Program via WhatsApp"; footer (Navigasi, Program UTBK, Kontak & Lokasi).

**Auth:** Login (layout terbagi, email, kata sandi dengan tampilkan, Ingat Saya, Lupa Kata Sandi, Masuk, tautan Daftar Akun Baru). Registrasi (nama lengkap, email, nomor HP, kata sandi min 8, konfirmasi, centang syarat, Daftar Sekarang). Lupa Kata Sandi (email dan kirim tautan). **Login Admin** (halaman tersendiri). Tanpa login pihak ketiga.

**Kerangka Siswa:** sidebar, top bar (pencarian, notifikasi dengan badge, nama dan status akses).
- Siswa Gratis: Beranda, Latihan Soal Gratis, Materi Preview, Daftar Program, Pembayaran & Transaksi, Nilai & Progress, Notifikasi, Profil Saya; grup "Fitur Premium Terkunci" (gembok): Bank Soal Lengkap, Tryout, Video Pembahasan.
- Siswa Aktif: Beranda, Latihan Soal, Materi Pelajaran, Bank Soal Lengkap, Tryout, Video Pembahasan, Daftar Program, Pembayaran & Transaksi, Nilai & Progress, Notifikasi, Profil Saya.

**Beranda Gratis:** sapaan, badge Gratis, banner upgrade (Lihat Program, Bandingkan Paket Reguler vs Lengkap), kartu Latihan Soal Gratis dan Materi Preview, tabel progres 7 subtes (awal 0%).
**Beranda Aktif:** sapaan, kartu Status Program (hari tersisa, progress bar, Riwayat Transaksi), banner Perpanjang Sekarang (hanya H-3), kartu Tryout Minggu Ini, kartu Lanjut Bank Soal, kartu Tonton Video Pembahasan (Program Lengkap), Analisis Kompetensi 7 subtes, Log Evaluasi (tanggal, kegiatan, hasil, status, Review Soal, pagination).

**Bank Soal dan Materi:** pencarian dan filter status, tab Semua Subtes (7), Tes Potensi Skolastik, Tes Literasi dan Penalaran Matematika; kartu per subtes (jumlah soal, modul PDF, video, progres, buka subtes, Mulai Drilling 10 Soal); kartu Rekomendasi Belajar (subtes terlemah). **Detail Subtes:** daftar modul PDF dan video, tampilan Akses Terkunci untuk Reguler.
**Latihan Soal:** mode pengerjaan dan pembahasan (kunci saja untuk Gratis). **Materi Preview.** **Profil Saya:** nama, email, nomor HP, asal sekolah (opsional), tahun lulus (opsional), ubah kata sandi.

**Daftar Program:** keterangan akses terbatas, dua kartu program (durasi, harga, fitur, Pilih dan Bayar), tabel perbandingan Gratis/Reguler/Lengkap, bantuan (FAQ Pembayaran, Hubungi Admin lewat WhatsApp).
**Checkout:** batas waktu 24 jam, pilih metode pembayaran, ringkasan pesanan (program, harga, total), Bayar Sekarang, Kembali Pilih Paket Lain.
**Pembayaran dan Transaksi:** empat kartu status (Menunggu Pembayaran dengan Lanjutkan Pembayaran dan Batalkan Pesanan; Lunas dengan Mulai Belajar; Gagal dengan Coba Bayar Lagi dan Hubungi Bantuan; Kedaluwarsa dengan Buat Transaksi Baru), riwayat transaksi (filter status, program, waktu, pagination), bantuan.

**Tryout (daftar):** ringkasan (total, selesai dievaluasi, sedang berlangsung, agenda mendatang), tab Semua, Sedang Berlangsung, Belum Dikerjakan, Selesai, pencarian dan urutan, kartu tryout (status, durasi, jumlah soal, tombol Mulai/Lanjutkan/Lihat Hasil, tata tertib).
**Pengerjaan Tryout:** satu timer total, ukuran huruf A-/A/A+, nomor dan teks soal, opsi A sampai E, Tandai Ragu-Ragu, panel nomor soal (terjawab, ragu-ragu, belum, sedang dibuka) dan ringkasan jumlah, Soal Sebelumnya/Selanjutnya, Kumpulkan & Selesai, dialog konfirmasi, keterangan jawaban tersimpan otomatis.
**Hasil Tryout:** skor, benar dan salah, sisa waktu, skor dan kategori per subtes, tombol Review/Buka Pembahasan. **Review Tryout:** jawaban siswa, kunci, pembahasan per soal.
**Nilai dan Progress:** ringkasan (skor terakhir, total tryout, tren), grafik skor per tryout, subtes paling kritis dan terlemah ke-2, tabel riwayat (no, tanggal, tryout, skor, subtes tertinggi, subtes terendah, pagination, aksi Review).
**Notifikasi:** daftar notifikasi (pembayaran, tryout baru, hasil tryout), tandai sudah dibaca.

**Kerangka Admin:** sidebar (Ringkasan dan Laporan, Kelola Siswa, Kelola Program, Kelola Materi dan Bank Soal, Kelola Tryout dan Jadwal Rilis, Tandai Konten Gratis/Berbayar, Monitoring Transaksi, Keluar Sesi Admin).
**Dashboard Admin:** 4 kartu (Total Siswa dengan Gratis/Aktif, Siswa Aktif dengan konversi dan Lengkap/Reguler, Pendapatan Bulan Ini, Transaksi Menunggu), grafik pendapatan (mingguan, bulanan, kuartal), rata-rata skor per subtes (penanda Kritis), tabel Log Transaksi (invoice, siswa, program, metode, nominal, status, Detail), filter, ekspor CSV. Semua read-only, tanpa aksi verifikasi.
**Monitoring Transaksi:** kartu ringkasan, tab status (Semua, Menunggu Pembayaran, Lunas, Gagal, Kedaluwarsa), pencarian dan filter, tabel, panel detail dengan linimasa transaksi dan Salin ID.
**Halaman kelola:** Kelola Siswa (tambah, ubah, nonaktifkan, tanpa hapus); Kelola Program (ubah, nonaktifkan); Kelola Materi dan Bank Soal (tambah dan ubah, **Form Tambah Soal** dengan subtes dan tingkat kesulitan, tandai gratis/berbayar, soal terpakai hanya dinonaktifkan); Kelola Tryout (pilih soal dari bank soal, atur tanggal rilis, status Draft/Rilis).

**Susunan Materi dan Bank Soal Admin:** halaman awal menampilkan tujuh kartu subtes dalam kelompok TPS dan Literasi & Penalaran Matematika. Setiap kartu memuat jumlah soal, jumlah materi, jumlah soal aktif/nonaktif, serta tombol Kelola Subtes. Pencarian di halaman awal mencari soal dan materi lintas subtes.
- Detail subtes memiliki breadcrumb, navigasi kembali/pindah subtes, serta tab **Bank Soal** dan **Materi** dengan jumlah konten masing-masing.
- Bank Soal hanya menampilkan soal subtes yang dibuka, dengan pencarian pertanyaan/kode soal dan filter kesulitan, akses, serta status. Klik pertanyaan membuka pratinjau lengkap (pilihan A–E, kunci, gambar opsional, pembahasan) dan tombol Ubah Soal.
- Materi hanya menampilkan PDF/video subtes yang dibuka, dengan pencarian judul/kode materi serta filter tipe dan akses. Materi diurutkan sesuai kolom `urutan`.
- Daftar memakai pagination 10 item; filter dan halaman disimpan terpisah per subtes dan tab selama sesi halaman, termasuk setelah mengedit. Pada layar HP, baris tabel ditampilkan sebagai kartu.
- Form Tambah Soal/Materi otomatis memilih subtes yang sedang dibuka. Form Ubah mengikuti subtes data yang diedit. Status aktif dan akses konten dapat diubah melalui menu Lainnya pada setiap baris.
- Pengelompokan menggunakan kolom `subtes` pada tabel `soal` dan `materi`; tidak menambah tabel atau mengubah aturan akses siswa.

## 10. Kebutuhan Nonfungsional
Responsif (HP dan komputer), halaman di bawah 3 detik, password di-hash, data kartu tidak disimpan, validasi signature pembayaran, konten berbayar tidak bisa dibuka lewat tautan langsung tanpa cek akses, jawaban tryout tersimpan otomatis, backup berkala.

## 11. Batasan (di luar cakupan)
Refund, voucher/kupon, diskon/harga coret, peringkat atau ranking antar siswa, skor IRT atau tryout adaptif, timer per subtes, live class, mentor, forum komunitas, transfer manual dengan upload bukti, pembayaran gerai ritel, aplikasi native, soal selain pilihan ganda, fitur tugas, langganan otomatis, login pihak ketiga.

## 12. Model Data (12 tabel)
- **users:** id_user, nama, email, password (hash), no_hp, asal_sekolah (opsional), tahun_lulus (opsional), role (siswa/admin), is_aktif, created_at
- **notifikasi:** id_notifikasi, id_user, judul, pesan, tipe, sudah_dibaca, created_at
- **program:** id_program, nama_program, deskripsi, harga, durasi_hari, akses_video, status (Aktif/Nonaktif)
- **pendaftaran:** id_pendaftaran, id_user, id_program, tanggal_daftar, status (Menunggu Pembayaran/Lunas/Dibatalkan/Digantikan), tanggal_aktif, tanggal_berakhir. Kondisi Aktif, Terjadwal, Berakhir dihitung dari tanggal.
- **pembayaran:** id_pembayaran, id_pendaftaran, order_id (unik), transaction_id, payment_url, jumlah, metode, status (Menunggu Pembayaran/Lunas/Gagal/Kedaluwarsa), tanggal_dibuat, batas_bayar, waktu_bayar
- **materi:** id_materi, judul, tipe (pdf/video), url_file, subtes, is_gratis, urutan
- **soal:** id_soal, subtes, tingkat_kesulitan, pertanyaan, gambar_soal, opsi_a sampai opsi_e, jawaban_benar, pembahasan, gambar_pembahasan, is_gratis, is_aktif
- **jawaban_latihan:** id_jawaban_latihan, id_user, id_soal, jawaban_dipilih, is_benar, waktu_jawab
- **tryout:** id_tryout, judul, durasi_menit (satu timer total), tanggal_rilis, status (Draft/Rilis)
- **tryout_soal:** id_tryout, id_soal (PK gabungan)
- **hasil_tryout:** id_hasil, id_tryout, id_user, status (Berlangsung/Selesai), skor, jumlah_benar, waktu_mulai, waktu_selesai (unik per tryout dan user)
- **jawaban_siswa:** id_jawaban, id_hasil, id_soal, jawaban_dipilih, is_ragu, is_benar

Relasi (semua 1:N, induk -> anak): users->notifikasi, users->pendaftaran, program->pendaftaran, pendaftaran->pembayaran, tryout->tryout_soal, soal->tryout_soal, tryout->hasil_tryout, users->hasil_tryout, hasil_tryout->jawaban_siswa, soal->jawaban_siswa, users->jawaban_latihan, soal->jawaban_latihan.
`materi` sengaja tidak punya relasi (katalog bersama); aksesnya ditentukan `is_gratis`, status pendaftaran siswa, dan `program.akses_video`.

## 13. Data Contoh
1 admin, 2 siswa (1 Gratis, 1 Aktif Program Lengkap), 2 program, materi (gratis, PDF, video), minimal 5 soal per subtes dengan beberapa bertanda gratis dan bertingkat kesulitan, contoh `jawaban_latihan`, 4 tryout mingguan, beberapa transaksi dengan status berbeda (Menunggu Pembayaran, Lunas, Gagal, Kedaluwarsa, Dibatalkan).
Jangan menulis klaim jumlah soal besar di UI (misalnya "15.000+ soal"); tampilkan angka dari data yang ada.

## 14. Gaya Visual dan UI Kit
Bersih dan modern, ramah pelajar. Font **Outfit** (Regular, Medium, SemiBold, Bold). Judul halaman 30 px Bold, label dan tombol 14-16 px SemiBold, teks isi 14 px, keterangan 12 px.

| Token | Nilai |
| --- | --- |
| Teal utama | #1FA891 |
| Teal gelap | #167A6D |
| Navy (judul, teks utama) | #0F1B4D |
| Teal muda (latar badge) | #E3F6F2 |
| Abu teks | #5B6478 |
| Border | #E6E9F0 |
| Latar halaman | #F6F7FB |
| Kuning aksen | #FFC93C |
| Merah error | #E5484D (latar #FFF5F5) |
| Ungu muda | #EDE7FF |

Komponen: tombol pill tinggi 44 px; input tinggi 48 px radius 12 px (error: border merah, latar merah muda, ikon, pesan); kartu putih radius 16-24 px dengan border dan bayangan lembut; badge pill; ikon garis (outline) dan gembok untuk konten terkunci. Grid 12 kolom, lebar desain 1280 px, tetap responsif untuk HP.

Frame Figma (file `XeQyIoCfy24x1eXryRCafT`): halaman **UI** (27 frame) dan **wireframe** (15 frame). Frame yang **belum ada** di UI: Notifikasi dan Monitoring Transaksi (wireframe Monitoring Transaksi ada). Bangun keduanya mengikuti bagian 9 dan wireframe, dengan gaya UI Kit di atas.

## 15. Konflik Figma vs PRD (PRD menang)
Beberapa elemen di desain Figma di luar cakupan. **Jangan diimplementasikan**; tampilkan versi sederhana atau hilangkan:
- Input Kode Kupon/Promo dan blok harga coret/diskon di Checkout dan Daftar Program.
- "Skor IRT", "IRT Adaptive", "Tryout Mingguan IRT", highlight peringkat/ranking nasional real-time. Skor memakai rumus benar/total x 100.
- "Pembagian waktu per subtes": gunakan satu timer total.
- Mentor, tutor PTN, forum komunitas belajar.
- Metode "Transfer Manual", gerai Indomaret/Alfamart, dan kalimat terkait bukti transfer. Metode hanya QRIS, E-Wallet, Bank Mobile, Virtual Account lewat gateway.
- Klaim angka dan klaim lain pada teks marketing ("15.000+ bank soal", "1.400+ butir", "66+ modul", "140+ jam video", "standar BPPP SNPMB", "enkripsi standar UTBK"). Ganti dengan teks netral atau angka dari data nyata.
- Nomor WhatsApp dan data kontak pada Figma hanyalah contoh; simpan sebagai konfigurasi.

## 16. Instruksi untuk Builder (AI Agent)
1. Baca seluruh dokumen ini sebelum menulis kode. Jika ada pertanyaan, ajukan sebelum membangun, jangan menebak.
2. Bangun aplikasi web responsif dengan routing Landing, Auth, Siswa, dan Admin. Guard akses berdasarkan role dan program aktif; status akses dihitung dari `pendaftaran`, tidak disimpan di `users`.
3. Gunakan data mock sesuai model data 12 tabel dan simulasikan callback gateway dengan tombol uji (Berhasil, Gagal, Kedaluwarsa), termasuk validasi signature palsu dan idempotensi notifikasi ganda.
4. Wujudkan alur end-to-end: registrasi, coba gratis (kunci jawaban saja), beli program, bayar atau batalkan pesanan, akses terbuka, latihan soal (setiap jawaban disimpan), tryout (sekali kerja, satu timer, autosave, tandai ragu-ragu), review pembahasan, nilai dan progress per subtes, perpanjangan H-3, akses terkunci setelah masa aktif habis.
5. Jangan menambah fitur di luar bagian 11 dan 15. Jangan menambah tabel di luar 12 tabel tanpa persetujuan.
6. Urutan pengerjaan yang disarankan: (a) fondasi: routing, auth, guard, data mock, UI Kit; (b) Landing, Login/Registrasi; (c) Beranda Siswa Gratis dan Aktif; (d) Daftar Program, Checkout, Pembayaran dan Transaksi; (e) Bank Soal dan Latihan; (f) Tryout, Hasil, Review, Nilai dan Progress; (g) Admin: Dashboard, Monitoring Transaksi, halaman kelola; (h) Notifikasi dan Profil.
7. Kerjakan satu kelompok halaman per langkah, jalankan aplikasi, dan laporkan apa yang sudah berfungsi sebelum lanjut.

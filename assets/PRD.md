# PRD: Cendekia Muda (Platform Persiapan UTBK-SNBT Online)

Versi: **9 November 2026** — revisi pengajar, pendamping WhatsApp, tryout bersama, video, dan navigasi siswa (40 use case, 16 tabel).

**Status dokumen:** spesifikasi target layanan, dengan frontend prototype yang telah diperbarui pada 9 November 2026. HTML/CSS/JS kini menjalankan tiga role (`siswa/pengajar/admin`), 16 koleksi data browser, portal pengajar, penugasan pendamping, tryout bersama, dropdown top bar, dan transaksi pribadi. Unggahan PDF/video memakai IndexedDB lokal; pembayaran dan pemulihan password masih simulasi. Fondasi **Node.js 24 + Express 5** sudah menyajikan frontend dan endpoint `/api/health`. [Schema SQL dan seed PostgreSQL](../cendekia_muda_database/README.md) tersedia untuk database baru dan sudah diuji secara terisolasi; koneksi database aplikasi, API bisnis, autentikasi server, storage privat server, dan email belum diimplementasikan. Navicat digunakan untuk mengelola database PostgreSQL; data aplikasi nantinya diakses melalui API Express. ORM belum dipasang. Cakupan pengujian prototype dicatat di [audit frontend](../docs/AUDIT-REVISI-FRONTEND.md), sedangkan panduan server ada di [README backend](../server/README.md).
Aturan emas: **jika desain Figma bertentangan dengan dokumen ini, ikuti dokumen ini** (lihat bagian 15).

## 1. Ringkasan
Cendekia Muda adalah aplikasi web persiapan UTBK-SNBT untuk siswa SMA. Pengunjung dapat melihat informasi platform dan paket program di landing page, lalu mendaftar menjadi siswa. Siswa yang sudah login mencoba soal dan materi preview gratis, lalu membeli program berbayar untuk membuka bank soal, tryout mingguan, dan (program tertentu) video pembahasan. Pada rancangan layanan, pembayaran diproses otomatis lewat payment gateway tanpa verifikasi manual; prototype saat ini memakai simulasi callback lokal. Admin mengelola akun, penugasan pengajar dan pendamping, program, konten, serta memantau transaksi dan laporan. Pengajar mengelola konten sesuai subtes yang ditugaskan admin dan mengisi soal dalam draft tryout bersama; hanya admin yang merilis tryout. Siswa aktif Reguler maupun Lengkap mendapat kontak pendamping per subtes untuk konsultasi melalui WhatsApp.
Bahasa antarmuka: Bahasa Indonesia. Mata uang: Rupiah. Tata letak mengikuti wireframe (grayscale, low-fidelity) dan desain UI di Figma, dengan pengecualian pada bagian 15.

## 2. Aktor dan peran

- **Pengunjung:** pengguna tanpa sesi login; melihat informasi dan paket publik, mendaftar sebagai siswa, atau membuka formulir login. Bukan role akun.
- **Siswa (`siswa`):** login, belajar, membeli program, mengerjakan latihan/tryout, melihat hasil dan transaksi pribadi. Gratis/Aktif merupakan status akses, bukan role berbeda.
- **Pengajar (`pengajar`):** akun dibuat admin; mengelola materi PDF, video, dan bank soal pada **satu atau lebih subtes yang ditugaskan admin**. Berkontribusi pada draft tryout bersama dalam batas subtes tersebut. Melihat ringkasan latihan/tryout agregat pada subtes tugasnya untuk mengevaluasi konten. Tidak mengelola pembayaran, akun siswa, atau penugasan pendamping.
- **Admin (`admin`):** mengelola seluruh konten dan akun, menugaskan subtes pengajar, menetapkan pendamping siswa, membuat paket tryout, memeriksa kontribusi pengajar, mengatur jadwal/durasi, dan merilis tryout. Memantau pembayaran tanpa verifikasi manual.
- **Pendamping:** orang yang membimbing siswa melalui WhatsApp, berbeda fungsi dari pengajar. Pada versi ini berupa **data kontak tanpa akun/login portal**; bukan role keempat. Admin mengelola kontak dan penugasannya. Tidak mengakses progress siswa melalui portal.
- **Payment Gateway:** sistem eksternal pemroses pembayaran dan pengirim status; tidak memakai login portal. Masih disimulasikan pada prototype.
- **Proses internal:** verifikasi callback, aktivasi akses, penilaian, dan penyimpanan jawaban dijalankan aplikasi; bukan aktor eksternal tambahan.

Ada **tiga role akun yang login: siswa, pengajar, admin**. Pengunjung merupakan aktor publik; pendamping berinteraksi melalui WhatsApp di luar portal. Tidak ada registrasi publik untuk pengajar/admin atau pemilihan role bebas saat login. Rincian matriks akses terdapat di [Aktor dan Akses](../docs/AKTOR-DAN-AKSES.md).

## 3. Konsep Akses

- **Publik:** landing page (`#/landing`), bagian paket program pada landing (`#/landing#program`), registrasi, login siswa/pengajar/admin, dan formulir pemulihan password dapat dibuka tanpa sesi login. Penggunaan tautan reset tetap memerlukan token yang valid.
- **Siswa Login:** akses setelah autentikasi akun `siswa`, mencakup profil, program di portal, transaksi pribadi, soal/materi gratis, notifikasi, nilai, dan progress. Istilah “gratis” pada konten tidak berarti dapat diakses pengunjung tanpa login.
- **Siswa Aktif:** siswa login dengan pendaftaran Lunas yang masa aktifnya berjalan; mendapat fitur berbayar sesuai program. Video berbayar memerlukan program dengan `akses_video`.
- **Pengajar:** akses setelah autentikasi `pengajar`, melalui `#/auth/pengajar-login` menuju `#/pengajar/dashboard`. Penugasan aktif di `pengajar_subtes` menentukan subtes yang boleh dikelola, termasuk akses file. Hak ini tidak bergantung pada pembelian program. Pencabutan penugasan langsung menutup hak pengelolaan tanpa menghapus kontennya.
- **Admin:** akses setelah autentikasi akun `admin`, melalui `#/auth/admin-login` menuju `#/admin/dashboard`. Halaman kelola memerlukan role admin; siswa tidak memperoleh akses admin dari status programnya.
- Status akses siswa dihitung, tidak disimpan sebagai role: **Gratis** jika tidak ada program yang sedang berjalan, **Aktif** jika ada pendaftaran Lunas yang masa aktifnya berjalan.
- Konten bertanda gratis terbuka untuk semua siswa login. Bank soal berbayar, materi PDF, pembahasan lengkap, dan tryout terbuka untuk siswa Aktif. Akses menu Video Pembahasan memerlukan program aktif dengan akses video.
- **Pembahasan:** pada soal gratis, siswa Gratis hanya melihat **kunci jawaban (benar/salah)**. Pembahasan lengkap hanya untuk siswa Aktif.
- Setelah masa aktif berakhir konten berbayar terkunci lagi, riwayat latihan dan nilai tetap tersimpan dan bisa dilihat.
- Menu atau konten terkunci tampil dengan ikon gembok dan ajakan upgrade.
- Tanpa sesi, `#/siswa/...`, `#/pengajar/...`, dan `#/admin/...` diarahkan ke formulir login masing-masing. Akun dengan role berbeda ditolak dan diarahkan ke dashboard miliknya; mengganti URL atau payload tidak memberikan hak tambahan.
- Kontak **Pendamping Saya** hanya tersedia bagi siswa dengan program Reguler atau Lengkap yang sedang aktif. Setelah masa aktif habis, akses kontak terkunci; penugasan tetap tersimpan. Siswa tidak memilih pengajar atau pendamping sendiri.
- Prototype memeriksa akses di router dan operasi data JavaScript. Implementasi backend harus memeriksa sesi, role, kepemilikan data, dan akses konten di server; proteksi browser saja belum memenuhi kebutuhan keamanan layanan produksi.

## 4. Program (nama dan harga contoh)
| Program | Durasi | Harga | Bank soal, pembahasan teks, tryout mingguan | Video pembahasan |
| --- | --- | --- | --- | --- |
| Program Reguler ("Paket Standard") | 30 hari | Rp 100.000 | Ya | Tidak |
| Program Lengkap ("Paket Komprehensif", label "Hemat - Paling Populer") | 60 hari | Rp 170.000 | Ya | Ya |

Kedua program mendapat pendampingan WhatsApp setelah aktif dan setelah admin menugaskan pendamping. Pembeda fitur tetap durasi dan video. Konten adalah satu katalog bersama (tidak terikat program), dikelompokkan per **subtes**.
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
- **Kedaluwarsa** atau **Batalkan Pesanan** oleh siswa: pendaftaran pesanan tersebut Dibatalkan; program aktif lain yang sudah dimiliki tidak dicabut, dan siswa boleh buat transaksi baru. Batalkan Pesanan hanya untuk transaksi berstatus Menunggu Pembayaran.
- Untuk prototype, simulasikan callback gateway dengan tombol uji (Berhasil, Gagal, Kedaluwarsa).
- Di luar cakupan: refund, voucher/kupon, diskon/harga coret, biaya layanan tambahan, transfer manual dan upload bukti, pembayaran kolektif sekolah.

## 6. Latihan Soal, Bank Soal, Materi

- **Latihan soal:** siswa menjawab soal per subtes, pembahasan muncul setelah menjawab (kunci saja untuk siswa Gratis, lengkap untuk siswa Aktif). **Setiap jawaban latihan disimpan** di tabel `jawaban_latihan` (boleh diulang, setiap percobaan satu baris), untuk siswa Gratis maupun Aktif.
- **Drilling 10 soal (siswa Aktif):** sistem memilih 10 soal dari subtes yang belum dikerjakan. "Lanjutkan Pengerjaan" melanjutkan ke soal yang belum dikerjakan.
- **Progres belajar per subtes** = jumlah soal aktif berbeda yang sudah dikerjakan dibagi total soal aktif subtes itu (dari `jawaban_latihan`). **Skor dan akurasi per subtes** dihitung dari tryout.
- **Materi:** PDF (Baca Online dan Unduh PDF, hanya siswa Aktif untuk yang berbayar) dan video (Tonton Video, status Belum Diputar). Video berbayar terkunci untuk Reguler dengan keterangan "Khusus Program Lengkap" dan tombol Bandingkan Paket Belajar.
- Soal: pilihan ganda A sampai E, gambar opsional, rumus lewat teks atau gambar, punya `id_subtes` dan `tingkat_kesulitan`.

### 6.1 Pengelolaan oleh pengajar

- Katalog tetap dikelompokkan per subtes dengan tab Bank Soal dan Materi. Pengajar boleh menambah, membaca, mengubah, mengatur Gratis/Berbayar, dan menonaktifkan konten dalam subtes tugasnya, termasuk konten yang dibuat pengajar lain pada subtes tersebut. Admin dapat mengelola seluruh subtes.
- **Konten langsung tersedia setelah berhasil disimpan**, mengikuti status aktif dan akses Gratis/Berbayar. Tidak ada antrean persetujuan admin untuk materi, video, dan bank soal. Menyimpan soal bank tidak otomatis memasukkannya ke suatu tryout.
- Pengajar tidak dapat memindahkan konten ke subtes di luar tugasnya. Validasi berlaku atas subtes asal dan tujuan, bukan hanya filter di tampilan. Akun pengajar tanpa penugasan mendapat tampilan kosong dan arahan menghubungi admin.
- Simpan pembuat, pengubah terakhir, serta waktu pembuatan/perubahan. Atribut pembuat untuk penelusuran; izin tetap mengikuti penugasan subtes.
- Konten yang sudah dipakai dalam pengerjaan tidak dihapus. Soal yang direferensikan jawaban latihan, berada dalam paket berstatus Rilis, atau berada dalam tryout yang sudah dikerjakan tidak boleh diubah isi, opsi, kunci, pembahasan, atau subtesnya; koreksi dibuat sebagai soal baru dan versi lama dinonaktifkan. Ini menjaga hasil lama tanpa menambah sistem versi pada tahap ini. Konten yang belum direferensikan boleh dihapus setelah konfirmasi dan pemeriksaan relasi.

### 6.2 Video: tautan dan unggah file

- Form materi video memiliki pilihan **Tautan Video** atau **Unggah Video**, satu sumber per materi. Pengajar mengisi judul, subtes tugasnya, akses Gratis/Berbayar, urutan, dan sumber video; admin memiliki formulir yang sama untuk semua subtes.
- Tautan memakai HTTPS dan penyedia video yang didukung pemutar. Unggahan disimpan pada storage server privat; database menyimpan lokasi/key dan metadata, bukan isi biner atau base64.
- Sumber `tautan` memakai `url_file`; sumber `unggah` memakai `storage_key`, `nama_file_asli`, `mime_type`, dan `ukuran_byte`. Kolom sumber lainnya harus kosong. PDF memakai pola sumber yang sama.
- Default implementasi awal yang dapat dikonfigurasi: video MP4/WebM maksimal 100 MB per file dan PDF maksimal 20 MB. Server memvalidasi ukuran, MIME aktual, dan ekstensi; unggah gagal tidak memublikasikan record. Tampilkan batas tersebut pada formulir. Nilai ini keputusan teknis awal, bukan ketentuan dosen.
- Akses file unggahan diperiksa server berdasarkan role, subtes, dan program; storage tidak menjadi folder publik. Tautan eksternal tetap tunduk pada kontrol penyedia: portal tidak dapat menjamin URL publik yang sudah diketahui tetap privat.

### 6.3 Pendampingan melalui WhatsApp

- Admin membuat data kontak pendamping dan **menetapkan pendamping untuk setiap siswa per subtes**. Seorang siswa dapat memiliki beberapa pendamping pada subtes berbeda; seorang pendamping dapat menangani banyak siswa/subtes.
- Default pembagian: maksimal satu penugasan pendamping aktif per pasangan siswa–subtes. Pergantian menutup penugasan lama dan membuat penugasan baru agar riwayat tetap ada. Ini tidak membatasi siswa menjadi hanya satu pendamping secara keseluruhan.
- Tidak ada penugasan otomatis setelah pembayaran. Siswa aktif yang belum mendapat pendamping melihat status “Pendamping belum ditetapkan” dan bantuan menghubungi admin. Subtes yang belum ditetapkan tetap ditampilkan.
- Halaman **Pendamping Saya** menampilkan nama, subtes, dan tombol WhatsApp sesuai penugasan aktif. Nomor memakai format internasional. Jika kontak dinonaktifkan, tombol tidak tersedia dan siswa diarahkan menghubungi admin.
- Konsultasi berlangsung di WhatsApp; aplikasi tidak menyimpan isi chat, tidak memiliki chat internal, dan pendamping tidak perlu login. Pengajar konten tidak otomatis menjadi pendamping siswa.

## 7. Tryout

- **Satu paket tryout menggabungkan tujuh subtes**, bukan ujian terpisah per subtes.
- Dirilis mingguan sesuai tanggal_rilis. Siswa Aktif boleh mengerjakan semua tryout yang sudah dirilis, termasuk arsip, tanpa tanggal tutup.
- **Hanya boleh dikerjakan sekali.** **Satu timer total per tryout** (tidak ada timer per subtes). Jawaban tersimpan otomatis, siswa bisa lanjut selama waktu belum habis, dan saat waktu habis jawaban dikumpulkan otomatis.
- Fitur **Tandai Ragu-Ragu** per soal (`jawaban_siswa.is_ragu`). Soal dikelompokkan per subtes pada panel nomor soal.
- Skor = jumlah benar / total soal x 100 (tanpa pengurangan salah, **bukan IRT**). Kategori capaian per subtes (contoh): Sangat Tinggi (85 ke atas), Tinggi (70-84), Baik (55-69), Moderat (40-54), Perlu Peningkatan (25-39), Kritis (di bawah 25).
- **Review dan Pembahasan Tryout** terbuka untuk siswa Aktif pada tryout berstatus Selesai, diakses dari Hasil Tryout dan tabel riwayat Nilai dan Progress.

### 7.1 Alur kerja bersama pengajar dan admin
1. Admin membuat satu **Draft** tryout, mengisi judul, durasi total, dan jadwal rilis.
2. Menu **Tryout** pengajar menampilkan paket bersama, tujuh subtes, dan jumlah soal tiap subtes. Pengajar boleh melihat soal subtes lain dalam paket sebagai baca saja; perubahan hanya pada subtes tugasnya.
3. Pada draft, pengajar memilih soal aktif dari bank atau membuat soal pada subtes tugasnya lalu memasukkannya ke paket. Tambah/lepas/urutkan soal hanya memengaruhi subtes yang boleh dikelolanya. Operasi tidak boleh mengganti seluruh daftar soal dan menimpa kontribusi subtes lain.
4. Admin memeriksa seluruh soal, melengkapi atau memperbaiki, lalu merilis paket. Sebelum rilis, validasi ketujuh subtes memiliki minimal satu soal aktif dan lengkap, tidak ada soal duplikat, urutan valid, durasi positif, dan jadwal terisi. Jumlah soal per subtes dapat berbeda; minimum ini validasi kelengkapan, bukan jumlah baku ujian resmi.
5. **Hanya admin dapat merilis** atau mengembalikan paket ke Draft sebelum ada pengerjaan. Status Rilis mengunci kontribusi pengajar, termasuk perubahan isi soal terkait melalui bank soal. Menonaktifkan soal bank tidak mencabutnya dari paket Rilis; pengerjaan mengambil daftar tetap dari `tryout_soal`. Paket muncul untuk dikerjakan siswa aktif setelah tanggal rilis tercapai.
6. Setelah ada pengerjaan, daftar/urutan soal, durasi, serta isi/kunci soal terkait dibekukan bagi admin dan pengajar. Paket tidak dikembalikan ke Draft atau dihapus; revisi ujian dibuat sebagai paket baru. Paket lama tetap tersedia sebagai arsip tanpa menghapus hasil.
7. Backend memeriksa otorisasi dan status paket dalam satu transaksi ketika menyimpan kontribusi atau merilis. Jika paket sudah dirilis saat pengajar menyimpan, perubahan ditolak dengan pesan untuk memuat ulang.

### 7.2 Ringkasan hasil belajar pengajar

- Pengajar membuka **Hasil Belajar** (`#/pengajar/hasil-belajar` atau `#/pengajar/hasil-belajar/:id_subtes`). Pilihan subtes hanya memuat penugasan aktif; tersedia pintasan dari katalog konten dan detail subtes tryout. Pencabutan tugas menutup akses ringkasan pada permintaan berikutnya.
- Ringkasan **baca saja dan agregat**, meliputi seluruh riwayat siswa pada subtes tugas pengajar, tanpa nama, kontak, identitas akun, atau nilai individu. Belum ada penugasan pengajar–siswa; fitur ini tidak menambahkan hak memantau profil per siswa. Riwayat siswa/soal nonaktif tetap dihitung agar hasil historis tidak hilang.
- Dua tab terpisah: **Latihan Bank Soal** dan **Tryout**. Hasil keduanya tidak digabung menjadi satu nilai. Tidak ada ubah nilai, hapus jawaban, atau ekspor data siswa pada halaman ini. Pratinjau soal dari ringkasan hanya baca.
- **Latihan Bank Soal:** jumlah siswa berbeda yang pernah menjawab, total percobaan jawaban, jumlah soal berbeda dikerjakan, akurasi (jawaban benar / seluruh percobaan × 100), serta maksimal lima soal paling sering salah. Latihan berulang dihitung sebagai percobaan terpisah; jumlah percobaan berbeda dari jumlah siswa atau soal unik.
- **Tryout:** filter Semua Paket atau satu paket; jumlah siswa berbeda yang selesai, jumlah pengerjaan selesai, rata-rata nilai subtes, dan maksimal lima soal paling sering salah termasuk jawaban kosong. Hanya `hasil_tryout.status = Selesai` yang dihitung. Pengerjaan berjalan dan siswa yang belum mengerjakan tidak dianggap bernilai 0.
- Nilai subtes setiap hasil = jumlah benar / seluruh soal subtes di paket × 100. Soal tidak dijawab dalam pengerjaan selesai tetap masuk penyebut dengan nilai 0. Rata-rata adalah rerata nilai subtes setiap pengerjaan selesai (bobot per pengerjaan sama), ditampilkan maksimal satu desimal; ini bukan skor total tujuh subtes dan bukan skor IRT.
- Tabel perkembangan memuat paket Rilis yang memiliki subtes tersebut (atau arsip yang telah dikerjakan), urut jadwal rilis, jumlah soal subtes, peserta selesai, dan rata-rata subtes. Setiap paket dapat memiliki kelompok peserta berbeda; perbandingan rata-rata kelompok tidak diklaim sebagai perkembangan individu. Paket tanpa hasil menampilkan “Belum ada hasil”; akurasi/rata-rata tanpa data ditampilkan “—”, bukan 0%.
- Soal paling sering salah diurutkan menurut jumlah respons salah, lalu persentase salah. Tampilkan salah/total respons dan persentase; untuk tryout, jumlah tidak dijawab ditandai terpisah. Ini membantu pengajar memilih materi atau pembahasan yang perlu diperbaiki tanpa menyimpulkan dari persentase saja.
- **ERD tetap 16 tabel:** latihan berasal dari `jawaban_latihan → soal → subtes`; tryout berasal dari `hasil_tryout + jawaban_siswa + tryout_soal → soal → subtes`; izin dari `pengajar_subtes`. Ringkasan dihitung saat dibaca, tanpa tabel statistik baru. API produksi hanya mengirim agregat subtes yang diizinkan, bukan seluruh jawaban/identitas siswa ke browser.

## 8. Use Case (40)
**Publik** = tanpa sesi login. **Siswa Login** = akun siswa yang sudah login, termasuk status Gratis dan Aktif. **Siswa Aktif** = siswa login dengan program aktif. **Pengajar** = akun pengajar aktif dengan penugasan subtes. **Admin** = akun admin yang sudah login. **Otomatis** = proses internal aplikasi.

Formulir login/pemulihan bersifat publik; aktor Siswa, Pengajar, atau Admin pada UC-02/UC-03 menunjukkan pemilik akun yang sedang mengakses formulir, bukan syarat sudah login. Label “Sistem internal” di tabel menjelaskan pemicu proses otomatis dan tidak menambah aktor eksternal.

| Kode | Use Case | Aktor / pemicu | Akses |
| --- | --- | --- | --- |
| UC-01 | Registrasi akun siswa | Pengunjung | Publik |
| UC-02 | Login sesuai role akun | Siswa, Pengajar, Admin | Publik; kredensial dan role diverifikasi |
| UC-03 | Lupa Password | Siswa, Pengajar, Admin | Publik; reset memerlukan token valid |
| UC-04 | Kelola profil dan kata sandi sendiri (asal sekolah/tahun lulus khusus siswa) | Siswa, Pengajar, Admin | Login; akun sendiri |
| UC-05 | Lihat Daftar Program | Pengunjung, Siswa | Publik untuk ringkasan di landing; Siswa Login untuk halaman program portal |
| UC-06 | Pilih Program | Siswa | Siswa Login |
| UC-07 | Bayar Program | Siswa, Payment Gateway | Siswa Login; interaksi gateway disimulasikan |
| UC-08 | Perpanjang atau Upgrade Program | Siswa | Siswa Aktif; mengikuti aturan waktu/program |
| UC-09 | Lihat Status dan Riwayat Transaksi | Siswa | Siswa Login; transaksi milik sendiri |
| UC-10 | Kerjakan Soal Gratis (siswa Gratis hanya lihat kunci jawaban) | Siswa | Siswa Login |
| UC-11 | Lihat Materi Preview | Siswa | Siswa Login |
| UC-12 | Lihat Notifikasi | Siswa | Siswa Login; notifikasi milik sendiri |
| UC-13 | Lihat Nilai dan Progress | Siswa | Siswa Login; hasil milik sendiri |
| UC-14 | Akses Materi Lengkap (PDF dan bank soal) | Siswa | Siswa Aktif |
| UC-15 | Tonton Video Pembahasan | Siswa | Siswa Aktif dengan akses video untuk konten berbayar |
| UC-16 | Kerjakan Tryout | Siswa | Siswa Aktif |
| UC-17 | Nilai Tryout Otomatis | Siswa mengumpulkan / sistem internal saat waktu habis | Otomatis pada pengerjaan tryout |
| UC-18 | Lihat Laporan (termasuk ekspor CSV log transaksi) | Admin | Admin |
| UC-19 | Kelola Siswa | Admin | Admin |
| UC-20 | Kelola Program | Admin | Admin |
| UC-21 | Kelola materi, video, dan bank soal | Admin, Pengajar | Admin seluruh subtes; Pengajar hanya subtes tugasnya |
| UC-22 | Buat paket, periksa, atur jadwal/durasi, dan rilis tryout | Admin | Admin; pemeriksaan kelengkapan tujuh subtes |
| UC-23 | Tandai Konten Gratis/Berbayar | Admin, Pengajar | Pengajar terbatas subtes tugasnya |
| UC-24 | Pantau Transaksi | Admin | Admin |
| UC-25 | Verifikasi Pembayaran Otomatis | Payment Gateway mengirim status; sistem internal memvalidasi | Otomatis; callback simulasi pada prototype |
| UC-26 | Aktifkan Akses Siswa | Sistem internal setelah pembayaran Lunas | Otomatis |
| UC-27 | Batalkan Transaksi Kedaluwarsa (hanya Kedaluwarsa, bukan Gagal) | Sistem internal saat batas bayar terlewati / status gateway Kedaluwarsa | Otomatis |
| UC-28 | Batalkan Pesanan | Siswa | Siswa Login; pesanan sendiri yang masih menunggu |
| UC-29 | Kerjakan Latihan Soal Lengkap (termasuk drilling 10 soal) | Siswa | Siswa Aktif |
| UC-30 | Simpan Jawaban Latihan | Sistem internal setelah siswa menjawab | Otomatis untuk siswa yang sudah login |
| UC-31 | Lihat Review dan Pembahasan Tryout | Siswa | Siswa Aktif; tryout sendiri yang sudah selesai |
| UC-32 | Tandai Soal Ragu-Ragu | Siswa | Siswa Aktif saat mengerjakan tryout |
| UC-33 | Lihat Landing Page dan Informasi Publik | Pengunjung | Publik; pengenalan platform, subtes, keunggulan, contoh cerita siswa, dan bagian kontak |
| UC-34 | Kelola akun pengajar dan penugasan subtes | Admin | Admin; satu atau lebih subtes per pengajar |
| UC-35 | Isi soal pada draft tryout bersama | Pengajar, Admin | Pengajar hanya subtes tugasnya; Admin seluruh paket |
| UC-36 | Kelola kontak pendamping | Admin | Admin; tanpa akun pendamping |
| UC-37 | Tetapkan/ganti pendamping siswa per subtes | Admin | Admin; satu penugasan aktif per siswa–subtes |
| UC-38 | Lihat Pendamping Saya dan buka WhatsApp | Siswa | Siswa Aktif Reguler/Lengkap; penugasan sendiri |
| UC-39 | Tambahkan video melalui tautan atau unggah file | Pengajar, Admin | Pengajar hanya subtes tugasnya; validasi sumber dan akses |
| UC-40 | Lihat ringkasan latihan dan tryout per subtes | Pengajar | Baca saja; agregat anonim hanya subtes tugas aktif; tanpa nilai/profil individu |

UC-01–UC-33 mempertahankan nomor sebelumnya; aktor dan batas akses diperluas sesuai keputusan terbaru. UC-34–UC-40 menambahkan pengajar, kontribusi tryout, pendamping, sumber video, dan ringkasan hasil belajar per subtes. UC-33 mendokumentasikan landing page yang sudah tersedia; rincian paket di landing termasuk UC-05. Melihat informasi publik tidak otomatis membuat akun atau memberi akses ke materi/soal. Tombol Coba Gratis dan Pilih Program pada landing mengarahkan pengunjung ke registrasi; selesai registrasi, prototype membuka sesi siswa Gratis. Login menjadi prasyarat operasi portal, bukan prasyarat UC-01–UC-03 atau akses publik UC-05/UC-33.

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

Landing merupakan halaman publik untuk Pengunjung. Kartu paket menampilkan harga dan fitur tanpa login; halaman `#/siswa/program` beserta tabel perbandingan dan FAQ merupakan bagian portal siswa. Tautan dari landing menuju halaman portal tetap mengikuti pemeriksaan login. Kontak WhatsApp bergantung pada konfigurasi kontak resmi; jika kosong, prototype menampilkan dialog bantuan.

**Auth:** Login (layout terbagi, email, kata sandi dengan tampilkan, Ingat Saya, Lupa Kata Sandi, Masuk, tautan Daftar Akun Baru). Registrasi (nama lengkap, email, nomor HP, kata sandi min 8, konfirmasi, centang syarat, Daftar Sekarang). Lupa Kata Sandi (email dan kirim tautan). **Login Admin** dan **Login Pengajar** (halaman tersendiri; tidak membutuhkan landing baru). Tanpa login pihak ketiga.

Form autentikasi dapat dibuka tanpa sesi. Registrasi publik selalu menghasilkan akun `siswa`; admin dan pengajar tidak didaftarkan melalui formulir tersebut. Pemulihan password pada prototype menampilkan tautan reset lokal, belum mengirim email. Pengunjung yang berhasil login masuk sebagai Siswa, Pengajar, atau Admin sesuai akun; setelah logout, akses kembali ke area publik.

**Kerangka Siswa:** sidebar untuk belajar/program, top bar untuk pencarian, ikon notifikasi, dan avatar profil. Tampilan HP menyediakan tombol yang sama dan dropdown yang dapat ditutup, diakses keyboard, serta tetap terbaca.
- Siswa Gratis: Beranda, Latihan Soal Gratis, Materi Preview, Daftar Program, Nilai & Progress; grup premium terkunci: Bank Soal Lengkap, Tryout, Video Pembahasan, Pendamping Saya.
- Siswa Aktif: Beranda, Latihan Soal, Materi Pelajaran, Bank Soal Lengkap, Tryout, Video Pembahasan (sesuai akses video), Pendamping Saya, Daftar Program, Nilai & Progress.
- **Ikon notifikasi di atas tetap membuka dropdown:** notifikasi terbaru, badge belum dibaca, tandai dibaca, dan Lihat Semua menuju halaman Notifikasi. Bukan menghapus dropdown.
- **Avatar profil di atas membuka dropdown:** Profil Saya/Ubah Profil → halaman profil; Pembayaran & Transaksi → halaman transaksi pribadi; Ubah Kata Sandi → tampilan perubahan kata sandi; Keluar → logout.
- Profil, Notifikasi, dan Pembayaran & Transaksi tidak lagi menjadi item sidebar siswa. **Daftar Program tetap di sidebar**, pemilihan paket dan checkout tetap halaman tersendiri. Shortcut transaksi yang kontekstual pada status program masih boleh tersedia.

**Beranda Gratis:** sapaan, badge Gratis, banner upgrade (Lihat Program, Bandingkan Paket Reguler vs Lengkap), kartu Latihan Soal Gratis dan Materi Preview, tabel progres 7 subtes (awal 0%).
**Beranda Aktif:** sapaan, kartu Status Program (hari tersisa, progress bar, Riwayat Transaksi), banner Perpanjang Sekarang (hanya H-3), kartu Tryout Minggu Ini, kartu Lanjut Bank Soal, kartu Tonton Video Pembahasan (Program Lengkap), Analisis Kompetensi 7 subtes, Log Evaluasi (tanggal, kegiatan, hasil, status, Review Soal, pagination).

**Bank Soal dan Materi:** pencarian dan filter status, tab Semua Subtes (7), Tes Potensi Skolastik, Tes Literasi dan Penalaran Matematika; kartu per subtes (jumlah soal, modul PDF, video, progres, buka subtes, Mulai Drilling 10 Soal); kartu Rekomendasi Belajar (subtes terlemah). **Detail Subtes:** daftar modul PDF dan video, tampilan Akses Terkunci untuk Reguler.
**Latihan Soal:** mode pengerjaan dan pembahasan (kunci saja untuk Gratis). **Materi Preview.** **Profil Saya:** nama, email, nomor HP, asal sekolah (opsional), tahun lulus (opsional), ubah kata sandi.

**Daftar Program:** keterangan akses terbatas, dua kartu program (durasi, harga, fitur, Pilih dan Bayar), tabel perbandingan Gratis/Reguler/Lengkap, bantuan (FAQ Pembayaran, Hubungi Admin lewat WhatsApp).
**Checkout:** batas waktu 24 jam, pilih metode pembayaran, ringkasan pesanan (program, harga, total), Bayar Sekarang, Kembali Pilih Paket Lain.
**Pembayaran dan Transaksi:** dibuka dari dropdown profil dan memiliki dua bagian/tab: **Belum Dibayar** untuk pesanan Menunggu Pembayaran (batas waktu, Lanjutkan Pembayaran, Batalkan Pesanan) dan **Riwayat Transaksi** untuk seluruh transaksi (filter status/program/waktu, pagination, detail). Status Lunas menyediakan Mulai Belajar; Gagal menyediakan Coba Bayar Lagi selama pesanan masih valid; Kedaluwarsa atau pendaftaran Dibatalkan menawarkan Buat Transaksi Baru sesuai aturan pembelian. “Dibatalkan” adalah status pendaftaran, bukan status pembayaran tambahan. Pesanan upgrade gagal tidak menghapus akses program lama. Tidak ada daftar paket program dalam dropdown profil.

**Pendamping Saya:** daftar tujuh subtes, nama pendamping aktif, tombol Hubungi via WhatsApp, status belum ditetapkan/nonaktif, serta bantuan admin. Siswa Gratis melihat ajakan aktivasi program; nomor pendamping tidak dikirim ke pengguna yang tidak berhak.

**Tryout (daftar):** ringkasan (total, selesai dievaluasi, sedang berlangsung, agenda mendatang), tab Semua, Sedang Berlangsung, Belum Dikerjakan, Selesai, pencarian dan urutan, kartu tryout (status, durasi, jumlah soal, tombol Mulai/Lanjutkan/Lihat Hasil, tata tertib).
**Pengerjaan Tryout:** satu timer total, ukuran huruf A-/A/A+, nomor dan teks soal, opsi A sampai E, Tandai Ragu-Ragu, panel nomor soal (terjawab, ragu-ragu, belum, sedang dibuka) dan ringkasan jumlah, Soal Sebelumnya/Selanjutnya, Kumpulkan & Selesai, dialog konfirmasi, keterangan jawaban tersimpan otomatis.
**Hasil Tryout:** skor, benar dan salah, sisa waktu, skor dan kategori per subtes, tombol Review/Buka Pembahasan. **Review Tryout:** jawaban siswa, kunci, pembahasan per soal.
**Nilai dan Progress:** ringkasan (skor terakhir, total tryout, tren), grafik skor per tryout, subtes paling kritis dan terlemah ke-2, tabel riwayat (no, tanggal, tryout, skor, subtes tertinggi, subtes terendah, pagination, aksi Review).
**Notifikasi:** daftar notifikasi (pembayaran, tryout baru, hasil tryout), tandai sudah dibaca.

**Kerangka Admin:** sidebar (Ringkasan dan Laporan, Kelola Siswa, Kelola Pengajar, Kelola Pendamping, Penugasan Pendamping, Kelola Program, Kelola Materi dan Bank Soal, Kelola Tryout dan Jadwal Rilis, Tandai Konten Gratis/Berbayar, Monitoring Transaksi, Keluar Sesi Admin).
**Dashboard Admin:** 4 kartu (Total Siswa dengan Gratis/Aktif, Siswa Aktif dengan konversi dan Lengkap/Reguler, Pendapatan Bulan Ini, Transaksi Menunggu), grafik pendapatan (mingguan, bulanan, kuartal), rata-rata skor per subtes (penanda Kritis), tabel Log Transaksi (invoice, siswa, program, metode, nominal, status, Detail), filter, ekspor CSV. Semua read-only, tanpa aksi verifikasi.
**Monitoring Transaksi:** kartu ringkasan, tab status (Semua, Menunggu Pembayaran, Lunas, Gagal, Kedaluwarsa), pencarian dan filter, tabel, panel detail dengan linimasa transaksi dan Salin ID.
**Halaman kelola:** Kelola Siswa (tambah, ubah, nonaktifkan, tanpa hapus); Kelola Program (ubah, nonaktifkan); Kelola Materi dan Bank Soal (tambah dan ubah, **Form Tambah Soal** dengan subtes dan tingkat kesulitan, tandai gratis/berbayar, soal terpakai hanya dinonaktifkan); Kelola Tryout (pilih soal dari bank soal, atur tanggal rilis, status Draft/Rilis).

**Susunan Materi dan Bank Soal Admin:** halaman awal menampilkan tujuh kartu subtes dalam kelompok TPS dan Literasi & Penalaran Matematika. Setiap kartu memuat jumlah soal, jumlah materi, jumlah soal aktif/nonaktif, serta tombol Kelola Subtes. Pencarian di halaman awal mencari soal dan materi lintas subtes.
- Detail subtes memiliki breadcrumb, navigasi kembali/pindah subtes, serta tab **Bank Soal** dan **Materi** dengan jumlah konten masing-masing.
- Bank Soal hanya menampilkan soal subtes yang dibuka, dengan pencarian pertanyaan/kode soal dan filter kesulitan, akses, serta status. Klik pertanyaan membuka pratinjau lengkap (pilihan A–E, kunci, gambar opsional, pembahasan) dan tombol Ubah Soal.
- Materi hanya menampilkan PDF/video subtes yang dibuka, dengan pencarian judul/kode materi serta filter tipe dan akses. Materi diurutkan sesuai kolom `urutan`.
- Daftar memakai pagination 10 item; filter dan halaman disimpan terpisah per subtes dan tab selama sesi halaman, termasuk setelah mengedit. Pada layar HP, baris tabel ditampilkan sebagai kartu.
- Form Tambah Soal/Materi otomatis memilih subtes yang sedang dibuka. Form Ubah mengikuti subtes data yang diedit. Status aktif dan akses konten dapat diubah melalui menu Lainnya pada setiap baris.
- Pada target database, pengelompokan menggunakan FK `id_subtes` menuju master `subtes`. Migrasi memetakan nama subtes prototype menjadi kode master; tampilan tujuh kartu dan aturan akses siswa dipertahankan.

**Kelola Pengajar (admin):** buat/ubah/nonaktifkan akun; pilih satu atau lebih subtes; lihat tugas aktif; cabut tugas. Akun historis tidak dihapus. Perubahan tugas tidak menghapus materi atau kontribusi tryout.
**Kelola Pendamping (admin):** nama, nomor WhatsApp, status aktif, catatan internal opsional. **Penugasan Pendamping:** cari siswa, lihat status program dan tujuh subtes, tetapkan/ganti/akhiri pendamping per subtes. Penugasan boleh disiapkan sebelum pembayaran; siswa baru melihat kontak ketika program aktif.
**Kerangka Pengajar:** sidebar Ringkasan, Materi & Bank Soal, Tryout, Hasil Belajar; dropdown profil untuk profil sendiri, kata sandi, dan keluar. Ringkasan menampilkan subtes tugas, jumlah konten, draft tryout yang perlu diisi, serta pintasan Hasil Belajar. Katalog mengikuti pola kartu subtes, tab, filter, pagination, dan pratinjau admin, dibatasi subtes tugasnya.
**Tryout Pengajar:** daftar paket bersama; detail memperlihatkan tujuh subtes dengan subtes tugas pengajar otomatis di urutan teratas. Urutan baku di dalam masing-masing kelompok tetap dipertahankan; misalnya Dimas melihat PK, PM, kemudian PU, PPU, PBM, LBI, LBE. Ini urutan tampilan pengajar; urutan ujian siswa tetap mengikuti paket. Subtes tugasnya dapat ditambah/dilepas/diurutkan saat Draft; subtes lain baca saja; paket Rilis seluruhnya baca saja. Tidak ada tombol rilis, ubah jadwal/durasi, monitoring transaksi, atau penugasan siswa pada portal pengajar.

## 10. Kebutuhan Nonfungsional
Responsif (HP dan komputer), halaman di bawah 3 detik, password di-hash, data kartu tidak disimpan, validasi signature pembayaran, konten berbayar tidak bisa dibuka lewat tautan langsung tanpa cek akses, jawaban tryout tersimpan otomatis, backup berkala.

## 11. Batasan (di luar cakupan)
Refund, voucher/kupon, diskon/harga coret, peringkat atau ranking antar siswa, skor IRT atau tryout adaptif, timer per subtes, live class, chat internal, dashboard/login pendamping, pemilihan pengajar/pendamping oleh siswa, penugasan pendamping otomatis, forum komunitas, transfer manual dengan upload bukti, pembayaran gerai ritel, aplikasi native, soal selain pilihan ganda, fitur tugas, langganan otomatis, login pihak ketiga.

## 12. Model Data Target (16 tabel, PostgreSQL)
Model ini sudah diterjemahkan ke [schema awal PostgreSQL](../cendekia_muda_database/01_schema.sql) dan seed tujuh subtes/dua program. SQL ditujukan untuk database baru; pemasangan pada database pengguna dan koneksi Express masih tahap berikutnya. Ini bukan migrasi otomatis dari schema lama 12 tabel atau data browser. Prototype memiliki 16 koleksi sepadan melalui migrasi lokal aditif di `js/management.js`; validasi JavaScript tidak menggantikan constraint PostgreSQL. Dua belas tabel sebelumnya dipertahankan dan diperluas; empat tabel baru adalah `subtes`, `pengajar_subtes`, `pendamping`, dan `siswa_pendamping`. Tidak ada tabel login pendamping atau tabel khusus pengunjung. Pengajar memakai `users.role`, bukan tabel akun terpisah.

### 12.1 Kamus tabel
PK = primary key; FK = foreign key; UQ = unique. ID utama menggunakan UUID kecuali `subtes.id_subtes` berupa kode teks tetap. Uang memakai `numeric(14,2)`, penanda memakai boolean, hitungan/urutan memakai integer (ukuran file bigint), waktu memakai `timestamptz`. Email dinormalisasi ke huruf kecil dan unik tanpa membedakan kapital. Kolom wajib kecuali dinyatakan opsional/nullable; validasi lintas tabel dijelaskan pada bagian 12.3.

**users**

| Kolom | Kunci / referensi | Keterangan |
| --- | --- | --- |
| `id_user` | PK | — |
| `nama` | — | — |
| `email` | UQ | — |
| `password` | — | hash |
| `no_hp` | — | — |
| `asal_sekolah` | — | opsional; siswa |
| `tahun_lulus` | — | opsional; siswa |
| `role` | — | siswa/pengajar/admin |
| `is_aktif` | — | — |
| `created_at` | — | — |

**subtes**

| Kolom | Kunci / referensi | Keterangan |
| --- | --- | --- |
| `id_subtes` | PK | pu/ppu/pbm/pk/lbi/lbe/pm |
| `nama_subtes` | UQ | — |
| `kelompok` | — | TPS/Literasi |
| `urutan` | UQ | — |

**pengajar_subtes**

| Kolom | Kunci / referensi | Keterangan |
| --- | --- | --- |
| `id_pengajar` | PK, FK → `users` | users.role = pengajar |
| `id_subtes` | PK, FK → `subtes` | — |
| `ditugaskan_oleh` | FK → `users` | users.role = admin |
| `is_aktif` | — | — |
| `created_at` | — | — |
| `updated_at` | — | — |

**pendamping**

| Kolom | Kunci / referensi | Keterangan |
| --- | --- | --- |
| `id_pendamping` | PK | — |
| `nama` | — | — |
| `nomor_whatsapp` | — | — |
| `is_aktif` | — | — |
| `catatan` | — | opsional; internal admin |
| `created_at` | — | — |
| `updated_at` | — | — |

**siswa_pendamping**

| Kolom | Kunci / referensi | Keterangan |
| --- | --- | --- |
| `id_penugasan` | PK | — |
| `id_siswa` | FK → `users` | users.role = siswa |
| `id_subtes` | FK → `subtes` | — |
| `id_pendamping` | FK → `pendamping` | — |
| `ditugaskan_oleh` | FK → `users` | users.role = admin |
| `mulai_pada` | — | — |
| `berakhir_pada` | — | NULL = penugasan berjalan |
| `created_at` | — | — |

**notifikasi**

| Kolom | Kunci / referensi | Keterangan |
| --- | --- | --- |
| `id_notifikasi` | PK | — |
| `id_user` | FK → `users` | — |
| `judul` | — | — |
| `pesan` | — | — |
| `tipe` | — | — |
| `sudah_dibaca` | — | — |
| `created_at` | — | — |

**program**

| Kolom | Kunci / referensi | Keterangan |
| --- | --- | --- |
| `id_program` | PK | — |
| `nama_program` | — | — |
| `deskripsi` | — | — |
| `harga` | — | — |
| `durasi_hari` | — | — |
| `akses_video` | — | — |
| `status` | — | Aktif/Nonaktif |

**pendaftaran**

| Kolom | Kunci / referensi | Keterangan |
| --- | --- | --- |
| `id_pendaftaran` | PK | — |
| `id_user` | FK → `users` | users.role = siswa |
| `id_program` | FK → `program` | — |
| `tanggal_daftar` | — | — |
| `status` | — | Menunggu Pembayaran/Lunas/ Dibatalkan/Digantikan |
| `tanggal_aktif` | — | nullable sebelum lunas |
| `tanggal_berakhir` | — | nullable sebelum lunas |

**pembayaran**

| Kolom | Kunci / referensi | Keterangan |
| --- | --- | --- |
| `id_pembayaran` | PK | — |
| `id_pendaftaran` | FK → `pendaftaran` | — |
| `order_id` | UQ | — |
| `transaction_id` | — | nullable |
| `payment_url` | — | nullable |
| `jumlah` | — | — |
| `metode` | — | — |
| `status` | — | Menunggu Pembayaran/Lunas/ Gagal/Kedaluwarsa |
| `tanggal_dibuat` | — | — |
| `batas_bayar` | — | — |
| `waktu_bayar` | — | nullable |

**materi**

| Kolom | Kunci / referensi | Keterangan |
| --- | --- | --- |
| `id_materi` | PK | — |
| `id_subtes` | FK → `subtes` | — |
| `judul` | — | — |
| `tipe` | — | pdf/video |
| `sumber` | — | tautan/unggah |
| `url_file` | — | nullable; hanya tautan |
| `storage_key` | — | nullable; hanya unggah |
| `nama_file_asli` | — | nullable; hanya unggah |
| `mime_type` | — | nullable; hanya unggah |
| `ukuran_byte` | — | nullable; hanya unggah |
| `is_gratis` | — | — |
| `is_aktif` | — | — |
| `urutan` | — | — |
| `dibuat_oleh` | FK → `users` | admin/pengajar |
| `diubah_oleh` | FK → `users` | admin/pengajar |
| `created_at` | — | — |
| `updated_at` | — | — |

**soal**

| Kolom | Kunci / referensi | Keterangan |
| --- | --- | --- |
| `id_soal` | PK | — |
| `id_subtes` | FK → `subtes` | — |
| `tingkat_kesulitan` | — | Mudah/Sedang/Sulit |
| `pertanyaan` | — | — |
| `gambar_soal` | — | opsional |
| `opsi_a` | — | — |
| `opsi_b` | — | — |
| `opsi_c` | — | — |
| `opsi_d` | — | — |
| `opsi_e` | — | — |
| `jawaban_benar` | — | A/B/C/D/E |
| `pembahasan` | — | — |
| `gambar_pembahasan` | — | opsional |
| `is_gratis` | — | — |
| `is_aktif` | — | — |
| `dibuat_oleh` | FK → `users` | admin/pengajar |
| `diubah_oleh` | FK → `users` | admin/pengajar |
| `created_at` | — | — |
| `updated_at` | — | — |

**jawaban_latihan**

| Kolom | Kunci / referensi | Keterangan |
| --- | --- | --- |
| `id_jawaban_latihan` | PK | — |
| `id_user` | FK → `users` | users.role = siswa |
| `id_soal` | FK → `soal` | — |
| `jawaban_dipilih` | — | A/B/C/D/E |
| `is_benar` | — | — |
| `waktu_jawab` | — | — |

**tryout**

| Kolom | Kunci / referensi | Keterangan |
| --- | --- | --- |
| `id_tryout` | PK | — |
| `judul` | — | — |
| `durasi_menit` | — | — |
| `tanggal_rilis` | — | nullable saat draft |
| `status` | — | Draft/Rilis |
| `dibuat_oleh` | FK → `users` | users.role = admin |
| `dirilis_oleh` | FK → `users` | nullable; admin |
| `dirilis_pada` | — | nullable |
| `created_at` | — | — |
| `updated_at` | — | — |

**tryout_soal**

| Kolom | Kunci / referensi | Keterangan |
| --- | --- | --- |
| `id_tryout` | PK, FK → `tryout` | — |
| `id_soal` | PK, FK → `soal` | — |
| `urutan` | — | unik dalam paket |

**hasil_tryout**

| Kolom | Kunci / referensi | Keterangan |
| --- | --- | --- |
| `id_hasil` | PK | — |
| `id_tryout` | FK → `tryout` | — |
| `id_user` | FK → `users` | users.role = siswa |
| `status` | — | Berlangsung/Selesai |
| `skor` | — | nullable sebelum selesai |
| `jumlah_benar` | — | nullable sebelum selesai |
| `waktu_mulai` | — | — |
| `waktu_selesai` | — | nullable |

**jawaban_siswa**

| Kolom | Kunci / referensi | Keterangan |
| --- | --- | --- |
| `id_jawaban` | PK | — |
| `id_hasil` | FK → `hasil_tryout` | — |
| `id_soal` | FK → `soal` | — |
| `jawaban_dipilih` | — | nullable; A/B/C/D/E |
| `is_ragu` | — | — |
| `is_benar` | — | nullable sebelum penilaian |

### 12.2 Relasi
Setiap baris berikut adalah satu FK: satu baris anak mengacu ke satu induk; satu induk dapat memiliki nol atau banyak anak. `tryout.dirilis_oleh` boleh NULL sebelum rilis. Kolom referensi induk adalah PK tunggal masing-masing tabel. Relasi terpisah ke tabel yang sama (misalnya pembuat dan pengubah) tetap ditampilkan sebagai dua FK.

| Induk | Anak | Foreign key pada anak |
| --- | --- | --- |
| `users` | `pengajar_subtes` | `id_pengajar` |
| `subtes` | `pengajar_subtes` | `id_subtes` |
| `users` | `pengajar_subtes` | `ditugaskan_oleh` |
| `users` | `siswa_pendamping` | `id_siswa` |
| `subtes` | `siswa_pendamping` | `id_subtes` |
| `pendamping` | `siswa_pendamping` | `id_pendamping` |
| `users` | `siswa_pendamping` | `ditugaskan_oleh` |
| `users` | `notifikasi` | `id_user` |
| `users` | `pendaftaran` | `id_user` |
| `program` | `pendaftaran` | `id_program` |
| `pendaftaran` | `pembayaran` | `id_pendaftaran` |
| `subtes` | `materi` | `id_subtes` |
| `users` | `materi` | `dibuat_oleh` |
| `users` | `materi` | `diubah_oleh` |
| `subtes` | `soal` | `id_subtes` |
| `users` | `soal` | `dibuat_oleh` |
| `users` | `soal` | `diubah_oleh` |
| `users` | `jawaban_latihan` | `id_user` |
| `soal` | `jawaban_latihan` | `id_soal` |
| `users` | `tryout` | `dibuat_oleh` |
| `users` | `tryout` | `dirilis_oleh` |
| `tryout` | `tryout_soal` | `id_tryout` |
| `soal` | `tryout_soal` | `id_soal` |
| `tryout` | `hasil_tryout` | `id_tryout` |
| `users` | `hasil_tryout` | `id_user` |
| `hasil_tryout` | `jawaban_siswa` | `id_hasil` |
| `soal` | `jawaban_siswa` | `id_soal` |

Total **27 foreign key** pada rancangan ini. ERD berisi halaman Ringkasan 16 Tabel serta halaman detail per domain; kotak referensi pada halaman detail bukan tabel tambahan.

### 12.3 Integritas dan otorisasi
- `users.role` dibatasi `siswa/pengajar/admin`. FK ke users menjamin akun ada, **tidak otomatis menjamin role**; API harus memeriksa role yang tertulis pada kamus tabel. Akun yang direferensikan tidak dihapus; nonaktifkan bila tidak dipakai. Role akun historis tidak diubah sembarangan.
- `pengajar_subtes` memiliki PK `(id_pengajar, id_subtes)`. Tugas dicabut dengan `is_aktif = false`; `ditugaskan_oleh` mencatat admin penugas terakhir. Ini keadaan penugasan terkini, bukan audit lengkap setiap perubahan. Semua pengelolaan konten memeriksa akun dan tugas yang masih aktif.
- `siswa_pendamping`: unique index parsial `(id_siswa, id_subtes) WHERE berakhir_pada IS NULL`; `berakhir_pada` harus sesudah `mulai_pada` bila terisi. Penggantian menutup penugasan lama lalu memasukkan yang baru dalam satu transaksi. Kontak harus aktif saat ditugaskan; akses siswa juga memerlukan program aktif saat permintaan dibuat. Tidak menyimpan status program di tabel penugasan.
- Master `subtes` memiliki tepat tujuh kode yang sudah dipakai UI; urutan tampilan 1–7. `materi.id_subtes`, `soal.id_subtes`, serta kedua tabel penugasan mengacu ke master ini. Soal dalam paket menentukan subtesnya melalui FK soal; tidak menduplikasi subtes pada `tryout_soal`.
- `materi`: CHECK untuk `tipe` dan `sumber`. Jika `tautan`, URL wajib dan semua metadata unggahan NULL. Jika `unggah`, key/nama/MIME/ukuran positif wajib dan URL NULL. `storage_key` unik ketika terisi. `is_aktif` mengatur publikasi tanpa antrean persetujuan. Menyimpan metadata di database hanya setelah unggahan berhasil; berkas gagal/yatim dibersihkan terjadwal. Lokasi file tidak dikirim ke pengguna tanpa hak.
- `soal` memerlukan lima opsi, satu kunci A–E, dan pembahasan; tingkat kesulitan dibatasi. API memeriksa referensi sebelum mengubah isi soal atau menghapus. Soal yang pernah dijawab latihan, termasuk paket Rilis, atau termasuk paket yang sudah dikerjakan dibekukan seperti bagian 6.1. Penghapusan soal yang masih direferensikan ditolak FK; lepas dari draft terlebih dahulu bila memang belum pernah dipakai.
- `tryout_soal`: PK `(id_tryout, id_soal)` mencegah duplikat; UNIQUE `(id_tryout, urutan)` dan urutan positif. Urutan mengikuti urutan master subtes lalu urutan soal dalam subtes. Backend menormalisasi urutan secara atomik saat kontribusi berubah; pengajar tidak dapat menggeser soal ke subtes lain.
- `tryout`: durasi positif, status dibatasi Draft/Rilis. Rilis mewajibkan jadwal, admin perilis, dan waktu persetujuan. `tanggal_rilis` adalah jadwal ketersediaan siswa; `dirilis_pada` adalah waktu admin menyetujui. Kembali ke Draft sebelum pengerjaan mengosongkan metadata rilis. Validasi tujuh subtes dan penguncian setelah pengerjaan dilakukan server dalam transaksi, bukan CHECK satu baris.
- `hasil_tryout`: UNIQUE `(id_tryout, id_user)` menjamin sekali pengerjaan. `jawaban_siswa`: UNIQUE `(id_hasil, id_soal)` untuk autosave; server memastikan soal anggota paket hasil tersebut. `jawaban_latihan` boleh memiliki banyak percobaan untuk pasangan siswa–soal. Jawaban kosong di tryout tetap dihitung sebagai tidak benar saat selesai.
- `program.harga` dan `pembayaran.jumlah` tidak negatif; durasi program positif. `order_id` unik; jumlah pembayaran merupakan snapshot harga saat pemesanan. Status pembayaran/pendaftaran sesuai bagian 5, bukan enum gabungan. Pendaftaran Lunas wajib memiliki tanggal aktif/berakhir yang valid.
- Pembatasan satu pesanan menunggu, periode program tidak tumpang tindih, perpanjangan/upgrade, dan callback idempoten perlu transaksi serta penguncian data siswa/pendaftaran pada backend; relasi FK saja tidak mencukupi. Jangan memakai indeks yang melarang seluruh baris Lunas historis, karena perpanjangan terjadwal tetap Lunas.
- FK data historis memakai RESTRICT/NO ACTION saat penghapusan. Data transaksi, jawaban, hasil, dan penugasan yang selesai tidak dihapus melalui CRUD biasa. Hapus materi/soal yang belum dipakai tetap memerlukan otorisasi dan konfirmasi; penonaktifan tersedia untuk kasus lainnya.

### 12.4 Pemetaan dari prototype
- Nama subtes yang saat ini berupa teks pada `materi.subtes` dan `soal.subtes` dipetakan ke `id_subtes`. Nama tidak dikenali harus dilaporkan dan diperbaiki sebelum migrasi, bukan ditebak.
- Buat pemetaan ID teks contoh ke UUID sambil mempertahankan seluruh hubungan; jangan mereset riwayat. Tambahkan urutan eksplisit pada `tryout_soal` mengikuti urutan lama. Isi pembuat/pengubah konten lama dengan akun admin migrasi yang terdokumentasi, bukan mengarang identitas pengajar.
- Materi URL lama diberi sumber tautan jika URL eksternal valid; file lokal contoh dipindah ke storage dan metadata diisi setelah verifikasi berkas. Pembayaran/akun contoh tetap data demo, bukan transaksi pengguna nyata.
- Rancangan ini mencakup data domain. Penyimpanan sesi dan token reset sekali pakai dapat memakai mekanisme framework/cache tersendiri; bila memilih tabel database tambahan, dokumentasikan dalam migrasi teknis. Hash/token prototype tidak boleh dianggap kredensial produksi.

## 13. Data Contoh dan kriteria penerimaan
Data target: 1 admin; minimal 2 pengajar (satu memegang dua subtes, satu memegang subtes berbeda); siswa Gratis, Aktif Reguler, Aktif Lengkap, dan akses berakhir; 7 subtes; 2 program; minimal 2 kontak pendamping; satu siswa memiliki pendamping berbeda pada dua subtes dan subtes lain belum ditetapkan. Sediakan PDF, video tautan dan unggahan, soal gratis/berbayar, empat tryout dengan draft bersama dan paket dirilis lengkap tujuh subtes, contoh jawaban tersimpan, serta transaksi lintas status. Jangan memakai kontak pribadi nyata sebagai data demo atau menulis klaim jumlah konten tanpa data.

Kriteria penerimaan implementasi berikutnya (belum merupakan hasil uji):
1. Siswa/pengajar/admin masuk ke portal sesuai role; registrasi publik tidak bisa membuat pengajar/admin. Akses URL/API role lain ditolak server.
2. Pengajar dengan dua subtes dapat menyimpan konten pada keduanya dan konten langsung terlihat sesuai hak akses siswa. Subtes lain ditolak, termasuk manipulasi ID/payload dan pemindahan konten. Pencabutan tugas berlaku pada permintaan berikutnya.
3. Dua pengajar mengisi draft paket yang sama tanpa menimpa subtes lain; paket tidak dapat dirilis pengajar. Admin hanya merilis setelah semua tujuh subtes valid; operasi simpan yang terlambat setelah rilis ditolak.
4. Rilis mengikuti jadwal, sekali pengerjaan, satu timer total, autosave, penilaian dan riwayat tetap berjalan. Soal yang sudah digunakan dan durasi tidak berubah; revisi memakai soal/paket baru.
5. Siswa Aktif Reguler dan Lengkap hanya melihat kontak pendamping yang ditugaskan kepadanya. Gratis/berakhir, siswa lain, atau kontak nonaktif tidak memperoleh nomor lewat UI maupun API. Belum ditetapkan menampilkan bantuan.
6. Video tautan dan unggahan dapat diputar sesuai akses; sumber tidak boleh ganda. File tidak valid/terlalu besar ditolak tanpa record aktif, file privat tidak bocor lewat URL langsung. Reguler tetap tidak memperoleh video berbayar.
7. Dropdown notifikasi/profil berfungsi di desktop dan HP. Pembayaran pribadi dan ubah profil menuju halaman masing-masing; Daftar Program tetap di sidebar; transaksi pengguna lain tidak dapat dibuka.
8. Pengajar hanya melihat agregat latihan/tryout pada subtes tugasnya, termasuk penolakan URL/API subtes lain dan akses setelah tugas dicabut. Uji percobaan berulang, siswa unik, jawaban kosong, tryout berjalan, nilai 0 yang sah versus belum ada data, filter paket, serta pemisahan latihan dan tryout. Respons API ringkasan tidak memuat identitas/nilai individu.
9. Progres dan hasil tidak hilang saat logout, berpindah perangkat, atau masa aktif berakhir setelah backend terpasang. Pembayaran mematuhi idempotensi dan tidak menghapus program lama ketika pesanan baru gagal/dibatalkan.

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
- Klaim tutor PTN tanpa data pendukung, chat internal, live class, dan forum komunitas belajar. Pendamping WhatsApp yang ditugaskan admin serta pengajar konten kini **masuk cakupan** sesuai bagian 6–9.
- Metode "Transfer Manual", gerai Indomaret/Alfamart, dan kalimat terkait bukti transfer. Metode hanya QRIS, E-Wallet, Bank Mobile, Virtual Account lewat gateway.
- Klaim angka dan klaim lain pada teks marketing ("15.000+ bank soal", "1.400+ butir", "66+ modul", "140+ jam video", "standar BPPP SNPMB", "enkripsi standar UTBK"). Ganti dengan teks netral atau angka dari data nyata.
- Nomor WhatsApp dan data kontak pada Figma hanyalah contoh; simpan sebagai konfigurasi.

## 16. Tahapan implementasi
1. **Frontend prototype tersedia:** tiga role, katalog konten sesuai penugasan, pengelolaan pengajar/pendamping, tryout bersama, penguncian soal yang digunakan, dropdown top bar, transaksi pribadi, serta ringkasan hasil belajar agregat per subtes pengajar. Data lama dipertahankan melalui migrasi aditif browser; empat koleksi baru melengkapi 16 koleksi. Unggahan memakai IndexedDB dan belum tersedia lintas perangkat. Lihat [README](README.md) untuk akun demo dan cara mencoba.
2. **Fondasi backend dan SQL awal tersedia:** Node.js 24 + Express 5, konfigurasi environment, penyajian frontend, endpoint `/api` dan `/api/health`, respons error JSON, serta schema/seed PostgreSQL 16 tabel di `cendekia_muda_database/`. Tahap selanjutnya: pasang SQL pada database baru, hubungkan Express ke PostgreSQL, tentukan ORM dan baseline migrasi bila diperlukan, lalu buat API bisnis, sesi login tiga role, hashing password server, validasi input, dan pemeriksaan hak akses di setiap endpoint. HTML/CSS/JS tetap antarmuka; Navicat adalah alat administrasi PostgreSQL, bukan backend aplikasi. Tidak ada kewajiban PHP berdasarkan klarifikasi terbaru; framework backend diperbolehkan. Jumlah tabel dan relasi ERD tetap sama.
3. Sambungkan pengelolaan akun, subtes, dan konten ke API. Ganti file IndexedDB dengan storage privat, validasi server, serta endpoint unduh/stream dengan pemeriksaan akses. Jangan menggunakan localStorage sebagai sumber data produksi.
4. Pindahkan penyimpanan kontribusi tryout, pemeriksaan konflik, validasi rilis admin, dan pembekuan soal ke transaksi database. Uji perubahan serentak antar pengguna/perangkat; pengujian prototype hanya mencakup browser lokal.
5. Sambungkan kontak/penugasan pendamping ke API yang hanya mengirim kontak penugasan siswa aktif yang bersangkutan. Data contoh tanpa nomor merupakan placeholder prototype; record kontak server harus memenuhi validasi PRD.
6. Integrasikan pembayaran/email sesuai lingkungan yang tersedia. Simulasi harus diberi label dan tidak disamakan dengan gateway produksi. Rahasia layanan tidak boleh disimpan di JavaScript browser.
7. Uji seluruh kriteria bagian 13 pada backend, termasuk permintaan API tanpa hak, lalu siapkan hosting Node.js, PostgreSQL, storage privat, dan backup. Laporkan fitur yang sudah bekerja serta yang masih simulasi. Perubahan skema membutuhkan migrasi eksplisit; jangan menghapus data lama untuk menyamakan seed.
8. Sidebar ringkas yang dibuka dengan logo serta perombakan gaya visual belum termasuk implementasi ini; keduanya merupakan tindak lanjut terpisah setelah revisi fitur yang disepakati.

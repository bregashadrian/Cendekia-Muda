# Audit kesesuaian Cendekia Muda dengan PRD

Tanggal: 3 November 2026. Acuan utama: `PRD.md` dalam workspace ini.

**Arsip:** jumlah 32 use case dan temuan di bawah mengacu pada kondisi 3 November 2026. Dokumentasi aktor saat ini memuat 33 use case; lihat [Aktor dan Akses](AKTOR-DAN-AKSES.md). Hasil audit historis tidak diperbarui menjadi klaim tentang implementasi terbaru.

**Kesimpulan: implementasi sudah memiliki fondasi prototype, tetapi belum memenuhi PRD secara menyeluruh. Ada bug pada alur inti, fitur wajib yang belum tersedia, dan fitur tambahan yang bertentangan dengan batasan PRD.**

## Cakupan dan cara pemeriksaan

- Meninjau `index.html`, `script.js`, dan `style.css`, lalu memetakan implementasi ke aturan bisnis, daftar layar, dan 32 use case PRD.
- Menginventarisasi folder `foto svg` dan melihat render referensi Landing Page, Dashboard Siswa Aktif, serta Bank Soal dan Materi Siswa Aktif. PRD tetap menjadi acuan ketika referensi desain bertentangan.
- Memuat dan menjalankan JavaScript menggunakan JavaScriptCore bawaan macOS. Storage dan elemen DOM diganti objek tiruan untuk memeriksa fungsi, guard, perubahan data, serta pemasangan event handler. Semua data uji terisolasi dari data browser pengguna.
- Pemeriksaan ini **belum mencakup pengujian browser end-to-end**, screenshot aplikasi aktual, pengukuran waktu muat, atau verifikasi layout pada perangkat. Media query merupakan bukti adanya aturan responsif, bukan bukti bahwa seluruh halaman sudah tampil benar.
- Simulasi pembayaran lokal dan 12 tabel mock memang diminta PRD. Ketiadaan gateway sungguhan tidak dihitung sebagai kegagalan prototype; validasi signature palsu dan penanganan callback ganda tetap wajib.

Lokasi `file:baris` di bawah mengacu pada kode saat audit dilakukan. File aplikasi tidak diedit.

## Temuan prioritas tinggi

### 1. Autosave jawaban tryout tidak terpasang saat halaman dibuka

**Lokasi:** `script.js:2914`, `script.js:2927`, `script.js:3038`.

Listener perubahan radio jawaban berada di dalam callback klik Tandai Ragu-Ragu. Saat halaman pertama dibuka, radio memiliki **0 listener change** dalam pengujian. Ketika tombol ragu diklik, listener dipasang pada DOM lama, kemudian `render()` mengganti elemen tersebut.

Akibatnya, memilih jawaban lalu langsung menekan Selanjutnya atau Kumpulkan tidak menyimpan pilihan itu. Pengguna harus menekan Simpan Jawaban, padahal PRD bagian 7 mewajibkan autosave. Pindahkan pemasangan listener ke level utama `attachHandlers()` dan simpan sebelum navigasi/pengumpulan.

### 2. Tryout yang belum dirilis dapat dimulai melalui URL langsung

**Lokasi:** `script.js:936`, `script.js:1881`, `script.js:2887`.

Daftar tryout memfilter `tanggal_rilis`, tetapi guard dan handler mulai hanya memeriksa sebagian kondisi. Login sebagai Nadia, lalu buka `#/siswa/tryout/to-004`: guard mengizinkan halaman dan tombol Mulai membuat hasil tryout baru meski jadwal rilis masih tujuh hari lagi. Ini teruji pada JavaScriptCore.

Tambahkan pemeriksaan status Rilis, tanggal rilis, role siswa, dan program aktif pada operasi mulai, bukan hanya penyaringan kartu daftar.

### 3. Pembahasan lengkap terbuka untuk siswa Gratis

**Lokasi:** `script.js:2000`, `script.js:2024`, `script.js:2069`, `script.js:2779`.

Siswa Gratis dapat membuka Mata Pelajaran SMA & UTBK, lalu menekan Lihat Kunci & Pembahasan untuk membaca penjelasan lengkap. Halaman publik `#/bank-soal` juga menampilkan penjelasan lengkap setelah simulasi tanpa mengecek program aktif. Keduanya terkonfirmasi dari keluaran markup.

PRD bagian 3 dan 6 membatasi siswa Gratis ke kunci/benar-salah. Seluruh jalur pembahasan harus menggunakan keputusan akses yang sama.

Ada masalah kebalikannya di `script.js:1787` dan `script.js:2268`: siswa Aktif yang mengerjakan Latihan Soal Gratis masih mendapat ajakan upgrade dan tidak mendapat pembahasan lengkap. Tampilan bergantung pada parameter `premium`, bukan status program pengguna.

### 4. Callback pembayaran belum memenuhi aturan status akhir dan idempotensi

**Lokasi:** `script.js:2796`, `script.js:3156`.

`applyPaymentStatus()` langsung menimpa status dan tidak menerima atau memvalidasi signature. Pengaman status Menunggu hanya ada pada handler tombol UI.

Uji pemanggilan fungsi menghasilkan:

- Callback Lunas yang dikirim dua kali menambah satu notifikasi pembayaran lagi dan membuat transaction ID baru.
- Pembayaran yang sudah Lunas masih bisa diubah menjadi Gagal oleh pemanggilan callback berikutnya.
- Simulasi signature tidak valid belum tersedia.

PRD bagian 5 dan 16 meminta pengujian callback ganda serta signature palsu bahkan untuk prototype. Letakkan aturan transisi dan validasi pada penerima callback, lalu jadikan pemrosesan Lunas idempotent.

### 5. Tombol admin Ubah Akses materi membalik status berulang kali

**Lokasi:** `script.js:2849`, `script.js:2857`, `script.js:2870`.

Pemasangan handler Edit Soal, Batal Ubah, dan Ubah Akses materi berada di dalam loop tombol Nonaktifkan/Ubah Gratis soal. Data awal berisi 24 soal dengan dua tombol pemicu per soal, sehingga satu tombol akses materi mendapat **48 listener klik**.

Uji klik membuktikan akses materi berakhir sama dengan sebelum diklik karena jumlah pembalikan genap. Edit Soal juga menjalankan render berulang. Pindahkan ketiga pemasangan handler tersebut keluar dari loop.

### 6. PDF berbayar dan video belum memiliki alur materi yang lengkap

**Lokasi:** `script.js:1816`, `script.js:2269`, `script.js:2270`, `script.js:2279`, `script.js:2785`.

Route materi siswa selalu memanggil `materialsMarkup()` dengan `active=false`. Tidak ada route Materi Pelajaran yang memanggil katalog lengkap untuk siswa Aktif. Bank Soal Lengkap langsung membuka latihan, sehingga tidak menyediakan jalur alternatif ke daftar PDF berbayar.

Handler Baca Online/Tonton Video mengabaikan `url_file` dan mengarahkan ke playlist contoh. Untuk subtes yang tidak cocok dengan playlist, pilihan kembali ke bab pertama Penalaran Umum. Tombol unduh membuat satu PDF ringkasan umum, bukan file materi yang dipilih. Pemutar di `script.js:1804` masih dummy dan tidak memutar video.

Sediakan katalog/detail subtes, viewer berdasarkan materi yang dipilih, unduhan PDF terkait, dan pemutar video dengan guard sesuai program. Sumber materi mock boleh digunakan, tetapi navigasinya perlu merepresentasikan materi yang benar.

### 7. Retry transaksi Kedaluwarsa menghidupkan pendaftaran yang sudah Dibatalkan

**Lokasi:** `script.js:1871`, `script.js:2816`, `script.js:2995`.

Gagal dan Kedaluwarsa memakai aksi retry yang sama. `retryEnrollment` diteruskan ke checkout, lalu pendaftaran lama diubah menjadi Menunggu Pembayaran. Uji pada `reg-kedaluwarsa` membuktikan pembayaran baru masih memakai ID pendaftaran yang sama.

Menurut PRD, Gagal boleh membuat pembayaran baru pada pendaftaran yang sama; Kedaluwarsa harus mempertahankan pendaftaran lama sebagai Dibatalkan dan membuat transaksi/pendaftaran baru.

### 8. Batas H-3 pembelian ulang hanya diterapkan pada kartu program

**Lokasi:** `script.js:1841`, `script.js:1852`, `script.js:2982`, `script.js:3156`.

Kartu program menonaktifkan tombol beli ulang di luar H-3, tetapi checkout dan callback tidak memeriksa ulang kelayakan pembelian. Uji pengiriman form checkout dengan program Lengkap ketika Nadia masih memiliki 42 hari aktif tetap membuat pembayaran baru.

Pengujian ini memanggil handler checkout dengan state yang diatur langsung; bukan klaim bahwa tombol normal selalu memungkinkan langkah tersebut. Kekurangannya adalah aturan bisnis tidak ditegakkan saat transaksi dibuat, sehingga state checkout lama atau perubahan kondisi tidak divalidasi ulang.

## Ketidaksesuaian cakupan dan data

| Temuan | Bukti | Dampak / tindakan |
| --- | --- | --- |
| Subtes berjumlah 15 | `script.js:9` | PRD bagian 4 menentukan 7. Delapan tambahan masuk ke materi, form admin, progres, dan katalog. Kembalikan katalog ke tujuh subtes PRD. |
| Live class dan tutor ditampilkan | `script.js:320`, `script.js:1189`, `script.js:1743` | Dilarang bagian 11 dan 15, termasuk ketika diberi label preview. Hapus dari landing, sidebar, dan dashboard. |
| Fitur tambahan belum tercantum PRD | `script.js:1712`, `script.js:1752`, `script.js:3314` | Daily task, poin/badge, dan target PTN memperluas cakupan. Konfirmasikan perubahan PRD sebelum mempertahankannya. Ini berbeda dari live class yang sudah dilarang eksplisit. |
| Penjelasan fitur Reguler keliru | `script.js:447`, `script.js:1148`, `script.js:1843` | Reguler ditulis hanya materi dasar/soal pilihan, sedangkan PRD memberi bank soal, PDF, pembahasan teks, dan tryout yang sama; pembeda hanya durasi dan video. |
| Metode Kartu Debit muncul | `script.js:1204` | Modal paket landing menambah metode di luar QRIS, E-Wallet, Bank Mobile, Virtual Account. |
| Soal contoh belum memenuhi minimum | `script.js:220`, `script.js:247` | Ada 24 soal. Tujuh subtes wajib masing-masing baru punya 2, 1, 1, 2, 2, 1, 2 soal; PRD meminta minimal 5 per subtes. Drilling 10 juga membutuhkan data yang mencukupi atau penanganan kekurangan yang jelas. |
| Pembayaran contoh memiliki batas 48 jam | `script.js:544` | `tanggal_dibuat=isoDate(-1)` dan `batas_bayar=isoDate(1)` terpaut 48 jam. Checkout baru sudah memakai 24 jam. |
| Hasil tryout contoh tidak konsisten | `script.js:684`, `script.js:696` | `hasil-002` punya skor 85,7 dan 6 benar, tetapi tidak memiliki baris jawaban. Halaman hasil menampilkan skor 85,7 dengan 0 jawaban benar dan kategori subtes 0. |
| Kebenaran jawaban latihan contoh keliru | `script.js:713` | `latihan-001` memilih A dan bertanda benar, sedangkan kunci soal pertama B. Memengaruhi statistik jawaban benar/poin. |

## Layar dan interaksi yang masih kurang

| Bagian | Yang sudah ada | Kekurangan dibanding PRD bagian 9 |
| --- | --- | --- |
| Landing | Hero, tiga kartu fitur, dua harga paket, tiga testimoni, CTA, footer | Navigasi berubah ke Kelas/Harga/Bank Soal; alur 01–03 tidak ada; konsultasi WhatsApp tidak ada; Pilih Paket berakhir di modal preview dan tidak menyambung ke pembelian siswa. Referensi SVG memiliki struktur alur dan CTA yang diminta PRD. |
| Auth | Login siswa/admin terpisah, registrasi konfirmasi password, Ingat Saya, tombol tampilkan password | Lupa Password hanya menampilkan pesan; belum ada token/tautan simulasi dan form reset untuk menyelesaikan pemulihan. |
| Kerangka siswa | Sidebar, pencarian, badge notifikasi, nama dan status | Sidebar Aktif masih memakai label Latihan Soal Gratis/Materi Preview. Materi Pelajaran lengkap belum tersedia. Dropdown profil/notifikasi dari referensi SVG belum dibangun; PRD dasar tidak mewajibkan seluruh variasi dropdown. |
| Dashboard Gratis | Sapaan, akses Gratis, upgrade, kartu latihan/materi, progres unik | Tabel menampilkan 15 subtes. Komponen tambahan menggeser struktur utama referensi. |
| Dashboard Aktif | Hari tersisa, kartu bank soal/tryout/video, banner H-3 | Progress bar masa aktif dan Log Evaluasi dengan Review/pagination belum ada. Analisis Kompetensi masih berupa progres latihan; skor/akurasi subtes dari tryout belum tersedia. |
| Bank soal dan detail subtes | Pemilih subtes dan latihan per soal | Kartu tujuh subtes, tab kategori, filter status, total modul/video, detail subtes, rekomendasi kelemahan, drilling 10 soal, dan lanjut soal yang belum dikerjakan belum ada. `script.js:1767`. |
| Latihan | A–E, kesulitan, cek jawaban dan penyimpanan percobaan pada route siswa | Pembatasan pembahasan tidak konsisten. Tombol Berikutnya mentok pada soal terakhir karena index dibatasi; tidak ada ringkasan/akhir sesi. |
| Daftar Program | Dua program, harga/durasi, perbandingan dasar, tombol upgrade/H-3 | Penjelasan Reguler perlu dibetulkan. FAQ pembayaran dan bantuan WhatsApp belum ada. `CONTACT_WHATSAPP` didefinisikan tetapi tidak digunakan. |
| Checkout | Empat metode yang benar di checkout siswa, nominal, teks batas 24 jam | Pilihan program hanya ada di memori dan hilang saat reload. Belum ada ringkasan harga/total lengkap atau tampilan batas bayar transaksi yang sedang berjalan. |
| Transaksi siswa | Status, riwayat, tombol simulasi dan batal | Empat kartu hanya menampilkan hitungan, belum tindakan per status sesuai rancangan; tidak ada filter status/program/waktu, pagination, atau bantuan. Gagal dan Kedaluwarsa belum dibedakan alurnya. |
| Daftar tryout | Kartu tryout rilis dan tombol Mulai/Lanjutkan/Hasil | Ringkasan, tab status, agenda mendatang, pencarian, pengurutan, dan tata tertib belum ada. |
| Pengerjaan tryout | Satu timer, A–E, ragu-ragu, nomor soal, navigasi, konfirmasi selesai | Autosave rusak; ukuran font A-/A/A+, kelompok nomor per subtes, serta ringkasan jumlah terjawab/ragu/kosong belum ada. |
| Hasil dan Review Tryout | Rumus skor, benar/salah, kategori subtes, kunci/pembahasan dan guard kepemilikan hasil | Sisa waktu tidak ditampilkan. Data contoh hasil kedua membuat tampilan kontradiktif. |
| Nilai & Progress | Skor terakhir, jumlah tryout, progres latihan, tabel riwayat | Tren/grafik, dua subtes terlemah, subtes tertinggi/terendah, pagination, dan aksi Review dari tabel belum ada. `script.js:1952`. |
| Notifikasi | Daftar per pengguna, badge, tandai semua dibaca | Belum ada pembentukan notifikasi tryout baru saat jadwal rilis tercapai. `toggle-tryout` hanya mengubah status. |
| Profil | Nama, nomor HP, sekolah/tahun opsional, email ditampilkan, ubah password | Dasar form tersedia. Pola error per input sesuai UI Kit belum diterapkan. |
| Kerangka admin | Header dan tautan kelola di dashboard | Sidebar admin yang diminta PRD belum ada; akses menu kelola dari halaman selain dashboard terbatas. |
| Dashboard admin | Empat kartu ringkasan, grafik tujuh hari, log, ekspor CSV | Konversi dan rincian Reguler/Lengkap, periode minggu/bulan/kuartal, rata-rata skor subtes/kritis, filter dan detail transaksi belum ada. |
| Kelola Siswa | Aktif/nonaktif tanpa hapus | Tambah dan ubah data siswa belum ada. `script.js:2215`. |
| Kelola Program | Ubah nama/deskripsi/harga/durasi/video dan aktif/nonaktif | Dasar pengelolaan tersedia, tetapi perubahan tidak tercermin pada harga/fitur landing yang ditulis terpisah. |
| Kelola Materi/Soal | Tambah materi; tambah/edit/nonaktif soal, subtes dan kesulitan | Edit judul/tipe/URL/subtes materi belum ada; Ubah Akses rusak karena handler ganda; gambar soal/pembahasan belum dapat diisi atau ditampilkan. |
| Kelola Tryout | Tambah draft, pilih soal, tanggal rilis, durasi, ganti Draft/Rilis | Belum ada form mengubah jadwal/durasi/soal tryout yang sudah dibuat. |
| Monitoring Transaksi | Tabel, cari, filter status, Salin ID | Ringkasan, tab status, panel detail dan linimasa belum ada. |

## Catatan timer dan penyimpanan

`script.js:2576` mengumpulkan tryout ketika timer di halaman pengerjaan habis. Saat pindah route, interval dibersihkan. Tidak ada proses yang menyelesaikan percobaan kedaluwarsa selama pengguna berada di halaman lain; status tetap Berlangsung sampai pengerjaan dibuka kembali.

`saveTryoutAnswer()` di `script.js:3137` juga belum memeriksa pemilik, status percobaan, keanggotaan soal pada tryout, atau deadline. Uji langsung menunjukkan jawaban tetap diterima setelah deadline. Tambahkan pemeriksaan pada operasi penyimpanan dan finalisasi; untuk prototype, pemeriksaan percobaan kedaluwarsa dapat dijalankan saat aplikasi dimuat dan saat navigasi.

Halaman bank soal publik dan katalog mata pelajaran menggunakan `BANK_QUESTIONS`/`SUBJECT_CATALOG` serta `appState`, terpisah dari tabel `soal`/`jawaban_latihan`. Menjawab di kedua jalur itu tidak menambah riwayat latihan pengguna yang sudah login, dan perubahan admin tidak tercermin pada katalog publik. Jalur latihan siswa utama sudah menambah satu baris tiap submit di `script.js:2964`.

## HTML, CSS, dan nonfungsional

**Yang sesuai:** `index.html` memakai `lang=id`, viewport responsif, meta description, stylesheet/script dengan defer, dan Outfit bobot 400–700. Token warna di `style.css:1` sesuai PRD. Tombol utama berbentuk pill dengan tinggi minimum 44 px (`style.css:183`), input standar 48 px/radius 12 px (`style.css:1013`), serta tersedia media query untuk layar kecil.

**Yang perlu disesuaikan:**

- `style.css:1665` memakai judul workspace hingga 42 px, sedangkan token judul halaman PRD 30 px. Beberapa judul mobile juga diubah lagi. Standarkan berdasarkan jenis judul.
- Error form masih berupa pesan umum; belum ada gaya input error merah, latar `#FFF5F5`, ikon, pesan per field, dan `aria-invalid` sesuai UI Kit.
- Ikon sidebar banyak memakai karakter Unicode (`⌂`, `♧`, `⌑`), belum mengikuti ikon outline dan gembok referensi.
- Pada lebar maksimal 780 px, `style.css:2914` menyembunyikan satu-satunya tombol logout sidebar. Topbar siswa tidak menyediakan logout pengganti, sehingga akses keluar lewat UI siswa hilang di HP.
- Password registrasi dan perubahan password sudah memakai PBKDF2 dengan salt, tetapi seed demo masih memakai penanda `mock-hash` dan fallback password demo. Ini tidak setara dengan penyimpanan password produksi.
- Session, seluruh data dan konten berada di browser. Guard route sudah ada untuk prototype, tetapi pemeriksaan akses di server, backup, dan perlindungan data produksi belum diimplementasikan. PRD nonfungsional belum dapat dinyatakan terpenuhi untuk produksi.
- Waktu muat kurang dari 3 detik serta responsivitas aktual belum diukur.

## Pemetaan 32 use case

“Ada dasar” berarti jalur utama ditemukan dari review kode; tidak berarti semua kasus tepi sudah lulus pengujian browser.

| UC | Status | Catatan |
| --- | --- | --- |
| 01 Registrasi | Ada dasar | Validasi minimal 8, konfirmasi, syarat, email unik, password PBKDF2. |
| 02 Login | Ada dasar | Siswa/admin terpisah, cek role dan akun aktif, Ingat Saya. |
| 03 Lupa Password | Sebagian | Form dan pesan tersedia; proses reset belum ada. |
| 04 Kelola Profil | Ada dasar | Sekolah/tahun opsional dan ubah password tersedia. |
| 05 Lihat Program | Sebagian | Daftar ada, fitur Reguler salah dijelaskan. |
| 06 Pilih Program | Ada dasar | Memilih paket menuju checkout siswa. |
| 07 Bayar Program | Sebagian | Membuat transaksi lokal; callback belum tervalidasi/idempotent. |
| 08 Perpanjang/Upgrade | Sebagian | Penggantian Reguler dan penyambungan tanggal berjalan; aturan H-3 belum dicek di operasi checkout. |
| 09 Status/Riwayat Transaksi | Sebagian | Daftar ada, filter/pagination/bantuan belum lengkap. |
| 10 Soal Gratis | Bermasalah | Pembahasan lengkap bocor pada jalur publik/katalog. |
| 11 Materi Preview | Sebagian | Daftar tersedia; materi yang dibuka belum mengikuti file/subtes terpilih. |
| 12 Notifikasi | Sebagian | Daftar/baca ada; notifikasi tryout baru belum dihasilkan. |
| 13 Nilai & Progress | Sebagian | Riwayat dasar ada; grafik, kelemahan dan Review tabel belum ada. |
| 14 Materi Lengkap | Bermasalah | Bank soal bisa dibuka; katalog PDF berbayar tidak terhubung ke route siswa. |
| 15 Video Pembahasan | Sebagian | Guard Program Lengkap ada; player masih dummy. |
| 16 Kerjakan Tryout | Bermasalah | Autosave rusak dan jadwal rilis bisa dilewati URL. |
| 17 Penilaian Otomatis | Ada dasar | Rumus benar/total × 100 dan kategori subtes ditemukan. |
| 18 Laporan Admin | Sebagian | Kartu/grafik tujuh hari/CSV ada; analisis dan filter kurang. |
| 19 Kelola Siswa | Sebagian | Nonaktifkan tersedia; tambah/edit belum ada. |
| 20 Kelola Program | Ada dasar | Edit dan nonaktif tersedia. |
| 21 Kelola Materi/Bank Soal | Sebagian | Tambah/edit soal tersedia; edit materi/gambar kurang. |
| 22 Kelola Tryout/Jadwal | Sebagian | Buat/jadwal/rilis ada; ubah tryout yang ada belum tersedia. |
| 23 Gratis/Berbayar | Bermasalah | Handler akses materi berjalan 48 kali per klik pada seed awal. |
| 24 Pantau Transaksi | Sebagian | Cari/filter/tabel ada; detail/timeline/ringkasan belum ada. |
| 25 Verifikasi Pembayaran | Bermasalah | Signature palsu belum divalidasi; callback ganda/transisi final belum aman. |
| 26 Aktifkan Akses | Ada dasar | Lunas mengaktifkan atau menjadwalkan pendaftaran; pengulangan callback masih bermasalah. |
| 27 Batalkan Kedaluwarsa | Ada dasar | Menunggu yang lewat batas dibatalkan saat render; Gagal tidak otomatis dibatalkan. |
| 28 Batalkan Pesanan | Ada dasar | Tombol hanya untuk Menunggu, pendaftaran menjadi Dibatalkan. |
| 29 Latihan Lengkap/Drilling | Sebagian | Latihan per soal ada; drilling 10/resume belum ada. |
| 30 Simpan Jawaban Latihan | Sebagian | Route latihan siswa menyimpan tiap submit; dua jalur contoh soal lain tidak tersimpan. |
| 31 Review Tryout | Sebagian | Halaman tersedia dengan cek pemilik dan selesai; tautan dari tabel progres belum ada. |
| 32 Ragu-Ragu | Ada dasar | `is_ragu` tersimpan; perlu memisahkan pemasangan autosave dari handler ini. |

## Hasil positif yang diuji pada fungsi JavaScript

- Database mock mempunyai tepat 12 tabel utama.
- Siswa Gratis diarahkan ke Program saat membuka Bank Soal berbayar; siswa biasa ditolak dari dashboard admin.
- Reguler ditolak dari route Video Pembahasan.
- Upgrade Reguler ke Lengkap mengubah pendaftaran lama menjadi Digantikan dan memberi program Lengkap langsung.
- Perpanjangan menyambung tepat dari tanggal akhir lama dan menambahkan durasi 60 hari untuk Program Lengkap.
- Setelah tanggal akhir lewat, `getActiveProgram()` mengembalikan null sementara riwayat skor tetap tampil pada Nilai & Progress.
- Satu jawaban benar dari tujuh soal menghasilkan skor 14,3, sesuai rumus PRD tanpa IRT.

## Urutan perbaikan yang disarankan

1. Benahi autosave tryout, pemeriksaan jadwal/deadline, callback pembayaran, retry Kedaluwarsa, dan handler admin yang berulang.
2. Satukan aturan akses pembahasan dan materi berdasarkan role, pendaftaran berjalan, serta akses video.
3. Kembalikan cakupan ke tujuh subtes, hilangkan live class/tutor, dan betulkan fitur Reguler serta data contoh.
4. Lengkapi katalog/detail materi, drilling 10/resume, grafik/analisis progres, serta pengelolaan admin.
5. Cocokkan struktur halaman dengan SVG yang relevan sambil mematuhi pengecualian PRD, lalu lakukan uji browser desktop/HP dan ukur waktu muat.

/* Katalog contoh lokal. Semua angka di UI dihitung dari katalog ini. */
window.CM = {};
CM.config = { whatsapp: "", email: "", address: "", storageKey: "cendekia-muda-v2", sessionKey: "cendekia-session-v2" };
CM.day = 86400000;
CM.subtests = [
  { id: "pu", name: "Penalaran Umum", short: "PU", group: "TPS", icon: "brain", color: "purple", description: "Induktif, deduktif, dan penalaran kuantitatif", notes: ["Premis adalah informasi yang digunakan sebagai dasar penalaran.", "Kesimpulan harus mengikuti informasi yang diberikan, tanpa menambah asumsi.", "Perhatikan kata semua, sebagian, tidak ada, dan jika-maka."] },
  { id: "ppu", name: "Pengetahuan dan Pemahaman Umum", short: "PPU", group: "TPS", icon: "book", color: "yellow", description: "Makna kata, konteks, dan hubungan gagasan", notes: ["Tentukan makna kata berdasarkan konteks kalimat.", "Bedakan informasi pokok dan informasi pendukung.", "Gunakan hubungan antarkalimat untuk memahami maksud penulis."] },
  { id: "pbm", name: "Pemahaman Bacaan dan Menulis", short: "PBM", group: "TPS", icon: "edit", color: "teal", description: "Gagasan utama, kalimat efektif, dan kepaduan teks", notes: ["Gagasan utama merangkum inti sebuah paragraf.", "Kalimat efektif menghindari pemborosan kata dan makna ganda.", "Periksa ejaan, kata depan, serta hubungan antarkalimat."] },
  { id: "pk", name: "Pengetahuan Kuantitatif", short: "PK", group: "TPS", icon: "calculator", color: "purple", description: "Bilangan, aljabar, geometri, dan data", notes: ["Tuliskan besaran yang diketahui dan yang ditanyakan.", "Persentase berarti per seratus; ubah ke pecahan sebelum menghitung.", "Periksa kembali satuan dan kewajaran hasil perhitungan."] },
  { id: "lbi", name: "Literasi Bahasa Indonesia", short: "LBI", group: "Literasi", icon: "language", color: "yellow", description: "Inferensi, evaluasi argumen, dan pemahaman teks", notes: ["Gunakan bukti dalam teks untuk mendukung jawaban.", "Inferensi merupakan simpulan dari petunjuk yang tersedia.", "Bedakan fakta yang dapat diuji dan opini yang bersifat penilaian."] },
  { id: "lbe", name: "Literasi Bahasa Inggris", short: "LBE", group: "Literasi", icon: "globe", color: "red", description: "Main idea, inference, dan vocabulary in context", notes: ["Read the passage for its main idea before checking the options.", "Use nearby sentences to understand vocabulary in context.", "Choose an inference supported by the text, rather than an outside assumption."] },
  { id: "pm", name: "Penalaran Matematika", short: "PM", group: "Literasi", icon: "chart", color: "purple", description: "Pemodelan matematika dan interpretasi data", notes: ["Terjemahkan situasi nyata menjadi model matematika.", "Tentukan variabel, hubungan, dan batasan yang berlaku.", "Tafsirkan hasil perhitungan kembali sesuai konteks persoalan."] },
];

CM.createQuestions = function () {
  const records = [];
  const add = (sub, question, options, key, explanation) => {
    const n = records.filter(q => q.subtes === sub.name).length;
    records.push({ id_soal: `q-${sub.id}-${n + 1}`, subtes: sub.name, tingkat_kesulitan: n < 3 ? "Mudah" : n < 7 ? "Sedang" : "Sulit", pertanyaan: question, gambar_soal: null, ...Object.fromEntries(options.map((v, i) => [`opsi_${"abcde"[i]}`, v])), jawaban_benar: "ABCDE"[key], pembahasan: explanation, gambar_pembahasan: null, is_gratis: n < 3, is_aktif: true });
  };
  const pu = CM.subtests[0];
  ["klub debat", "tim sains", "kelompok literasi", "klub bahasa", "tim olimpiade"].forEach((club, i) => {
    add(pu, `Semua anggota ${club} gemar membaca. Sebagian siswa kelas ${i % 2 ? "XI" : "XII"} adalah anggota ${club}. Kesimpulan yang pasti benar adalah ....`, ["Semua siswa gemar membaca.", "Sebagian siswa gemar membaca.", "Semua pembaca adalah anggota klub.", "Tidak ada siswa yang gemar membaca.", "Semua siswa merupakan anggota klub."], 1, `Sebagian siswa termasuk anggota ${club}. Karena setiap anggotanya gemar membaca, sebagian siswa pasti gemar membaca.`);
    const start = 2 + i, step = 3 + i;
    const next = start + step * 4;
    add(pu, `Tentukan bilangan berikutnya dalam pola ${[0, 1, 2, 3].map(n => start + step * n).join(", ")}, ....`, [String(next - 2), String(next + 1), String(next), String(next + step), String(next - 1)], 2, `Selisih antarbilangan selalu ${step}. Bilangan berikutnya adalah ${start + step * 3} + ${step} = ${next}.`);
  });
  const words = [
    ["esensial", "pokok", "Air bersih merupakan kebutuhan esensial.", "Esensial bermakna sangat penting atau mendasar."],
    ["mitigasi", "pengurangan risiko", "Mitigasi bencana dilakukan sebelum musim hujan.", "Mitigasi merupakan upaya untuk mengurangi risiko atau dampak."],
    ["inovasi", "pembaruan", "Inovasi membantu pengolahan limbah menjadi lebih baik.", "Inovasi berarti pembaruan atau pengenalan sesuatu yang baru."],
    ["konservasi", "pelestarian", "Konservasi hutan melindungi keanekaragaman hayati.", "Konservasi adalah pemeliharaan dan pelestarian sumber daya."],
    ["kolaborasi", "kerja sama", "Kolaborasi antarsiswa menghasilkan karya yang menarik.", "Kolaborasi adalah kerja sama untuk mencapai tujuan."],
    ["efisien", "hemat sumber daya", "Penggunaan energi yang efisien mengurangi pemborosan.", "Efisien berarti menggunakan waktu, biaya, atau tenaga secara tepat dan hemat."],
    ["relevan", "berkaitan", "Sertakan data yang relevan dengan topik penelitian.", "Relevan berarti mempunyai kaitan dengan sesuatu yang dibahas."],
    ["objektif", "berdasarkan fakta", "Penilaian harus objektif dan dapat dipertanggungjawabkan.", "Objektif berarti berdasarkan kenyataan dan tidak dipengaruhi pendapat pribadi."],
    ["konsisten", "tetap dan selaras", "Ia konsisten mengikuti jadwal latihan setiap hari.", "Konsisten menunjukkan ketetapan sikap atau keselarasan tindakan."],
    ["adaptasi", "penyesuaian", "Adaptasi tanaman membantu bertahan di lingkungan kering.", "Adaptasi adalah penyesuaian terhadap lingkungan atau keadaan."],
  ];
  words.forEach(([word, answer, sentence, explanation]) => add(CM.subtests[1], `${sentence} Makna kata “${word}” dalam kalimat tersebut adalah ....`, ["Penundaan", answer, "Pertentangan", "Pengulangan", "Penghapusan"], 1, explanation));
  ["peserta", "siswa", "anggota", "pembaca", "pengunjung", "peneliti", "penulis", "panitia", "pelajar", "pendaftar"].forEach(noun => add(CM.subtests[2], `Kalimat yang paling efektif adalah ....`, [`Para ${noun}-${noun} diminta untuk mengisi formulir.`, `${noun[0].toUpperCase() + noun.slice(1)} diminta agar supaya mengisi formulir.`, `Kepada ${noun} diminta mengisi formulir.`, `Para ${noun} diminta mengisi formulir.`, `Semua para ${noun} mengisi formulir bersama-sama semuanya.`], 3, `“Para ${noun} diminta mengisi formulir” tidak menggunakan bentuk jamak ganda, pasangan kata mubazir “agar supaya”, atau kata depan yang mengaburkan subjek.`));
  for (let i = 0; i < 10; i++) {
    const price = 100000 + i * 20000, percent = i % 2 ? 25 : 20, result = price * (100 - percent) / 100;
    add(CM.subtests[3], `Sebuah barang berharga Rp${price.toLocaleString("id-ID")} mendapat potongan ${percent}%. Berapa harga setelah potongan?`, [result - 10000, result, price, result + 5000, result + 10000].map(v => `Rp${v.toLocaleString("id-ID")}`), 1, `Potongan = ${percent}% × Rp${price.toLocaleString("id-ID")} = Rp${(price - result).toLocaleString("id-ID")}. Harga akhir = Rp${result.toLocaleString("id-ID")}.`);
  }
  const passages = [
    ["Sekolah memperpanjang jam perpustakaan hingga sore. Jumlah kunjungan setelah pelajaran kemudian meningkat.", "Perpanjangan jam layanan diikuti peningkatan kunjungan sore."],
    ["Tempat isi ulang air mengurangi botol sekali pakai. Sebagian siswa tetap membeli minuman kemasan karena pilihan isi ulang masih terbatas.", "Fasilitas isi ulang membantu mengurangi botol sekali pakai."],
    ["Warga mulai memilah sampah rumah tangga. Bank sampah setempat menerima lebih banyak bahan yang dapat didaur ulang.", "Pemilahan sampah mendukung pengumpulan bahan daur ulang."],
    ["Taman kota menyediakan pohon peneduh. Pengunjung memanfaatkan area tersebut untuk beristirahat saat siang.", "Pohon peneduh membantu menyediakan tempat beristirahat."],
    ["Petani memasang alat irigasi tetes. Air dialirkan langsung ke akar tanaman dengan lebih sedikit pemborosan.", "Irigasi tetes dapat membantu menghemat penggunaan air."],
    ["Siswa membuat catatan setelah latihan. Mereka menggunakan catatan kesalahan untuk menentukan materi yang akan dipelajari kembali.", "Catatan kesalahan membantu menentukan fokus belajar berikutnya."],
    ["Jalur sepeda menghubungkan permukiman dengan sekolah. Sebagian siswa mulai memilih bersepeda.", "Jalur penghubung mendukung pilihan bersepeda ke sekolah."],
    ["Pedagang menggunakan kemasan yang dapat dipakai kembali. Pelanggan diminta membawa wadah dari rumah.", "Pedagang mendorong penggunaan wadah secara berulang."],
    ["Museum menyediakan keterangan dalam dua bahasa. Pengunjung dari berbagai negara lebih mudah memahami koleksi.", "Keterangan dua bahasa membantu pemahaman pengunjung."],
    ["Sekolah menanam sayuran di kebun kecil. Siswa mengamati pertumbuhannya untuk pembelajaran.", "Kebun sekolah dimanfaatkan sebagai sarana pembelajaran."],
  ];
  passages.forEach(([text, answer]) => add(CM.subtests[4], `Bacalah teks berikut. “${text}” Simpulan yang paling sesuai adalah ....`, ["Semua orang memiliki kebiasaan yang sama.", "Kegiatan tersebut tidak memberikan manfaat.", answer, "Kegiatan tersebut pasti menyelesaikan seluruh masalah.", "Informasi dalam teks membuktikan adanya larangan baru."], 2, `Simpulan harus didukung informasi dalam bacaan. Teks mendukung pernyataan: ${answer} Pilihan lain menambahkan asumsi atau bertentangan dengan teks.`));
  const english = [
    ["Urban trees provide shade and absorb rainwater. These functions help cities stay cooler and reduce surface runoff.", "Urban trees provide environmental benefits."],
    ["Community gardens supply fresh vegetables. They also provide spaces where neighbors can work together.", "Community gardens offer food and social benefits."],
    ["Students who review their errors can identify concepts they have not understood. They can then plan more focused practice.", "Reviewing errors can help students plan their learning."],
    ["Public libraries lend books and offer quiet study areas. Many also provide free internet access.", "Libraries offer several useful services."],
    ["Cycling short distances reduces fuel use. It also gives people an opportunity to be physically active.", "Cycling can support health and reduce fuel use."],
    ["Wetlands absorb excess water during heavy rain. They are also habitats for many species.", "Wetlands have important ecological functions."],
    ["Reusable containers can be used many times. This can reduce the need for disposable packaging.", "Reusable containers can help reduce disposable packaging."],
    ["Clear labels help visitors find their way. Maps at entrances also make large buildings easier to navigate.", "Signs and maps can help visitors navigate buildings."],
    ["Reading regularly exposes learners to different words. Seeing these words in context can improve vocabulary.", "Regular reading can support vocabulary development."],
    ["Solar panels convert sunlight into electricity. Their output depends partly on the amount of sunlight available.", "Solar panels use sunlight to produce electricity."],
  ];
  english.forEach(([text, answer]) => add(CM.subtests[5], `Read the passage. “${text}” What is the main idea?`, [answer, "The activity has no practical benefits.", "All people should follow exactly the same routine.", "Technology always solves every problem.", "The passage describes a ban on public activities."], 0, `The main idea summarizes the information in the whole passage: ${answer} The other options are unsupported or too broad.`));
  for (let i = 0; i < 10; i++) {
    const initial = 8000 + i * 1000, perKm = 2000, distance = 5 + i, total = initial + (distance - 3) * perKm;
    add(CM.subtests[6], `Layanan pengantaran mengenakan Rp${initial.toLocaleString("id-ID")} untuk 3 km pertama dan Rp2.000 untuk setiap kilometer berikutnya. Berapa biaya perjalanan ${distance} km?`, [total - 4000, total + 2000, total + 4000, total, initial].map(v => `Rp${v.toLocaleString("id-ID")}`), 3, `Jarak tambahan = ${distance} − 3 = ${distance - 3} km. Total biaya = Rp${initial.toLocaleString("id-ID")} + (${distance - 3} × Rp2.000) = Rp${total.toLocaleString("id-ID")}.`);
  }
  return records;
};

CM.createDatabase = function () {
  const date = n => new Date(Date.now() + n * CM.day).toISOString();
  const password = "pbkdf2-sha256$120000$Y2VuZGVraWEtZGVtby12MiE=$K3ups5mA9KwjQbLG3W42yf7cokTj+f0TpEC5iiFvPxo=";
  const users = [
    { id_user: "usr-admin-001", nama: "Admin Cendekia", email: "admin@cendekiamuda.test", password, no_hp: "081200000001", asal_sekolah: null, tahun_lulus: null, role: "admin", is_aktif: true, created_at: date(-100) },
    { id_user: "usr-siswa-001", nama: "Nadia Putri", email: "nadia@cendekiamuda.test", password, no_hp: "081200000002", asal_sekolah: "SMA Cendekia", tahun_lulus: 2027, role: "siswa", is_aktif: true, created_at: date(-40) },
    { id_user: "usr-siswa-002", nama: "Raka Pratama", email: "raka@cendekiamuda.test", password, no_hp: "081200000003", asal_sekolah: "SMA Nusantara", tahun_lulus: 2027, role: "siswa", is_aktif: true, created_at: date(-10) },
  ];
  const program = [
    { id_program: "prg-reguler", nama_program: "Program Reguler", deskripsi: "Teman belajar mandiri dengan bank soal, modul PDF, pembahasan teks, dan tryout mingguan.", harga: 100000, durasi_hari: 30, akses_video: false, status: "Aktif" },
    { id_program: "prg-lengkap", nama_program: "Program Lengkap", deskripsi: "Semua fitur Reguler, masa belajar lebih panjang, dan video pembahasan untuk mendalami konsep.", harga: 170000, durasi_hari: 60, akses_video: true, status: "Aktif" },
  ];
  const soal = CM.createQuestions();
  const materi = CM.subtests.flatMap(s => [
    { id_materi: `mat-${s.id}-intro`, judul: `Pengenalan ${s.name}`, tipe: "pdf", url_file: `local:${s.id}:intro`, subtes: s.name, is_gratis: true, urutan: 1 },
    { id_materi: `mat-${s.id}-pdf`, judul: `Modul Konsep & Latihan ${s.short}`, tipe: "pdf", url_file: `local:${s.id}:full`, subtes: s.name, is_gratis: false, urutan: 2 },
    { id_materi: `mat-${s.id}-video`, judul: ({ pu: "Penalaran: Premis & Kesimpulan", ppu: "Makna Kata dalam Konteks", pbm: "Menyusun Kalimat Efektif", pk: "Menghitung Persentase & Diskon", lbi: "Menarik Simpulan dari Bacaan", lbe: "Finding the Main Idea", pm: "Memodelkan Tarif Perjalanan" })[s.id], tipe: "video", url_file: `assets/video/${s.id}.webm`, subtes: s.name, is_gratis: false, urutan: 3 },
  ]);
  const pendaftaran = [
    { id_pendaftaran: "reg-aktif-lengkap", id_user: users[1].id_user, id_program: "prg-lengkap", tanggal_daftar: date(-18), status: "Lunas", tanggal_aktif: date(-18), tanggal_berakhir: date(42) },
    { id_pendaftaran: "reg-menunggu", id_user: users[2].id_user, id_program: "prg-reguler", tanggal_daftar: date(-0.5), status: "Menunggu Pembayaran", tanggal_aktif: null, tanggal_berakhir: null },
    { id_pendaftaran: "reg-gagal", id_user: users[2].id_user, id_program: "prg-lengkap", tanggal_daftar: date(-2), status: "Menunggu Pembayaran", tanggal_aktif: null, tanggal_berakhir: null },
    { id_pendaftaran: "reg-expired", id_user: users[2].id_user, id_program: "prg-reguler", tanggal_daftar: date(-5), status: "Dibatalkan", tanggal_aktif: null, tanggal_berakhir: null },
  ];
  const pembayaran = pendaftaran.map((e, i) => ({ id_pembayaran: `pay-${i + 1}`, id_pendaftaran: e.id_pendaftaran, order_id: `CM-DEMO-00${i + 1}`, transaction_id: i === 0 ? "TX-DEMO-001" : null, payment_url: null, jumlah: program.find(p => p.id_program === e.id_program).harga, metode: ["QRIS", "Virtual Account", "E-Wallet", "Bank Mobile"][i], status: ["Lunas", "Menunggu Pembayaran", "Gagal", "Kedaluwarsa"][i], tanggal_dibuat: e.tanggal_daftar, batas_bayar: new Date(new Date(e.tanggal_daftar).getTime() + CM.day).toISOString(), waktu_bayar: i === 0 ? e.tanggal_daftar : null }));
  const tryout = [-21, -14, -7, 7].map((offset, i) => ({ id_tryout: `to-00${i + 1}`, judul: `Tryout Mingguan #${i + 1}`, durasi_menit: 105, tanggal_rilis: date(offset), status: "Rilis" }));
  const tryout_soal = tryout.flatMap(t => CM.subtests.flatMap(s => soal.filter(q => q.subtes === s.name).slice(0, 3).map(q => ({ id_tryout: t.id_tryout, id_soal: q.id_soal }))));
  const hasil_tryout = [15, 18].map((correct, i) => ({ id_hasil: `hasil-00${i + 1}`, id_tryout: tryout[i].id_tryout, id_user: users[1].id_user, status: "Selesai", skor: Number((correct / 21 * 100).toFixed(1)), jumlah_benar: correct, waktu_mulai: date(-20 + i * 7), waktu_selesai: new Date(new Date(date(-20 + i * 7)).getTime() + 80 * 60000).toISOString() }));
  const jawaban_siswa = hasil_tryout.flatMap(r => tryout_soal.filter(p => p.id_tryout === r.id_tryout).map((p, i) => { const q = soal.find(q => q.id_soal === p.id_soal); const is_benar = (i * 5 % 21) < r.jumlah_benar; return { id_jawaban: `${r.id_hasil}-a-${i}`, id_hasil: r.id_hasil, id_soal: q.id_soal, jawaban_dipilih: is_benar ? q.jawaban_benar : "ABCDE".split("").find(a => a !== q.jawaban_benar), is_ragu: false, is_benar }; }));
  const jawaban_latihan = [0, 1, 10, 20, 21, 30, 40, 41, 42, 50, 60].map((n, i) => ({ id_jawaban_latihan: `lat-${i}`, id_user: users[1].id_user, id_soal: soal[n].id_soal, jawaban_dipilih: soal[n].jawaban_benar, is_benar: true, waktu_jawab: date(-3 + i / 10) }));
  const notifikasi = [
    { id_notifikasi: "notif-1", id_user: users[1].id_user, judul: "Program Lengkap kamu sudah aktif!", pesan: "Selamat belajar! Bank soal, materi, tryout, dan video pembahasan sudah bisa kamu akses.", tipe: "pembayaran", sudah_dibaca: false, created_at: date(-18) },
    { id_notifikasi: "notif-2", id_user: users[1].id_user, judul: "Hasil tryout sudah tersedia", pesan: "Lihat hasil Tryout Mingguan #2 dan temukan bagian yang bisa kamu tingkatkan.", tipe: "hasil", sudah_dibaca: false, created_at: date(-13) },
    { id_notifikasi: "notif-3", id_user: users[2].id_user, judul: "Selesaikan pembayaran program", pesan: "Pesanan Program Reguler menunggu pembayaran. Cek batas waktunya di halaman transaksi.", tipe: "pembayaran", sudah_dibaca: false, created_at: date(-0.5) },
  ];
  return { users, notifikasi, program, pendaftaran, pembayaran, materi, soal, jawaban_latihan, tryout, tryout_soal, hasil_tryout, jawaban_siswa };
};

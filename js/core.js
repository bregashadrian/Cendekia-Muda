/* Aturan prototype lokal. Produksi memerlukan API, otorisasi server, dan gateway. */
(() => {
  const C = CM, tables = ["users", "notifikasi", "program", "pendaftaran", "pembayaran", "materi", "soal", "jawaban_latihan", "tryout", "tryout_soal", "hasil_tryout", "jawaban_siswa"];
  const valid = db => db && tables.every(t => Array.isArray(db[t]));
  C.id = prefix => `${prefix}-${crypto.randomUUID()}`;
  C.now = () => new Date().toISOString();
  C.save = () => {
    const previous = localStorage.getItem(C.config.storageKey);
    if (previous) localStorage.setItem(`${C.config.storageKey}-backup`, previous);
    localStorage.setItem(C.config.storageKey, JSON.stringify(C.db));
  };
  try {
    const stored = localStorage.getItem(C.config.storageKey);
    C.db = stored ? JSON.parse(stored) : C.createDatabase();
    if (!valid(C.db)) throw new Error("Struktur data tidak lengkap.");
  } catch {
    try { C.db = JSON.parse(localStorage.getItem(`${C.config.storageKey}-backup`)); } catch { /* Initial seed below. */ }
    if (!valid(C.db)) C.db = C.createDatabase();
    C.recovered = true;
  }
  // Repair only the unfinished demo media from the previous staging build.
  // Existing accounts, answers, transactions and custom material URLs stay intact.
  C.db.materi.filter(m => m.url_file === "assets/video/pengantar-penalaran.mp4").forEach(m => {
    const s = C.subtests.find(s => m.id_materi === `mat-${s.id}-video`);
    if (s) { m.url_file = `assets/video/${s.id}.webm`; m.judul = `Pengantar ${s.name}`; }
  });
  C.save();
  C.user = () => C.db.users.find(u => u.id_user === (sessionStorage.getItem(C.config.sessionKey) || localStorage.getItem(C.config.sessionKey)) && u.is_aktif) || null;
  C.requireUser = role => {
    const user = C.user();
    if (!user || (role && user.role !== role)) throw new Error("Sesi tidak sesuai. Silakan masuk kembali.");
    return user;
  };
  C.enrollment = userId => C.db.pendaftaran.find(e => e.id_user === userId && e.status === "Lunas" && Date.parse(e.tanggal_aktif) <= Date.now() && Date.parse(e.tanggal_berakhir) > Date.now()) || null;
  C.active = userId => { const e = C.enrollment(userId); return e ? C.db.program.find(p => p.id_program === e.id_program) || null : null; };
  C.requireActive = () => { const user = C.requireUser("siswa"); if (!C.active(user.id_user)) throw new Error("Aktifkan program untuk membuka fitur ini."); return user; };
  C.materialAccess = material => { const user = C.user(); const p = user && C.active(user.id_user); return Boolean(user?.role === "siswa" && (material.is_gratis || (p && (material.tipe !== "video" || p.akses_video)))); };
  C.daysLeft = userId => Math.max(0, Math.ceil((Date.parse(C.enrollment(userId)?.tanggal_berakhir) - Date.now()) / C.day) || 0);
  C.notify = (id_user, judul, pesan, tipe) => C.db.notifikasi.push({ id_notifikasi: C.id("notif"), id_user, judul, pesan, tipe, sudah_dibaca: false, created_at: C.now() });
  C.pending = userId => C.db.pembayaran.find(p => p.status === "Menunggu Pembayaran" && C.db.pendaftaran.some(e => e.id_pendaftaran === p.id_pendaftaran && e.id_user === userId && e.status === "Menunggu Pembayaran"));
  C.purchaseRule = (userId, programId) => {
    const program = C.db.program.find(p => p.id_program === programId && p.status === "Aktif");
    if (!program) return { allowed: false, reason: "Program ini sedang tidak tersedia." };
    const active = C.active(userId), enrollment = C.enrollment(userId);
    const scheduled = C.db.pendaftaran.some(e => e.id_user === userId && e.status === "Lunas" && Date.parse(e.tanggal_aktif) > Date.now());
    if (scheduled) return { allowed: false, reason: "Perpanjangan kamu sudah terjadwal. Tunggu hingga program tersebut berjalan." };
    if (!active) return { allowed: true, type: "baru", label: "Pilih dan Bayar" };
    if (!active.akses_video && program.akses_video) return { allowed: true, type: "upgrade", label: "Upgrade ke Lengkap" };
    if (C.daysLeft(userId) <= 3) return { allowed: true, type: "perpanjang", label: "Perpanjang Program" };
    return { allowed: false, reason: "Perpanjangan tersedia mulai H-3 masa aktif berakhir." };
  };
  C.createPayment = (programId, method, retryId = "") => {
    const user = C.requireUser("siswa"); C.sweep();
    const rule = C.purchaseRule(user.id_user, programId);
    if (!rule.allowed) throw new Error(rule.reason);
    if (C.pending(user.id_user)) throw new Error("Selesaikan atau batalkan pesanan yang masih menunggu pembayaran.");
    if (!["QRIS", "E-Wallet", "Bank Mobile", "Virtual Account"].includes(method)) throw new Error("Pilih metode pembayaran yang tersedia.");
    const program = C.db.program.find(p => p.id_program === programId);
    let enrollment = retryId ? C.db.pendaftaran.find(e => e.id_pendaftaran === retryId && e.id_user === user.id_user && e.id_program === programId && e.status === "Menunggu Pembayaran" && C.db.pembayaran.some(p => p.id_pendaftaran === e.id_pendaftaran && p.status === "Gagal")) : null;
    if (retryId && !enrollment) throw new Error("Pesanan ini tidak dapat dicoba ulang. Buat pesanan baru.");
    if (!enrollment) {
      enrollment = { id_pendaftaran: C.id("reg"), id_user: user.id_user, id_program: programId, tanggal_daftar: C.now(), status: "Menunggu Pembayaran", tanggal_aktif: null, tanggal_berakhir: null };
      C.db.pendaftaran.push(enrollment);
    }
    const payment = { id_pembayaran: C.id("pay"), id_pendaftaran: enrollment.id_pendaftaran, order_id: `CM-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, transaction_id: null, payment_url: null, jumlah: program.harga, metode: method, status: "Menunggu Pembayaran", tanggal_dibuat: C.now(), batas_bayar: new Date(Date.now() + C.day).toISOString(), waktu_bayar: null };
    C.db.pembayaran.push(payment);
    C.notify(user.id_user, "Pesanan kamu berhasil dibuat", `${program.nama_program} menunggu pembayaran. Batas bayar 24 jam sejak pesanan dibuat.`, "pembayaran");
    C.save(); return payment;
  };
  C.paymentForUser = paymentId => {
    const user = C.requireUser("siswa");
    const p = C.db.pembayaran.find(p => p.id_pembayaran === paymentId);
    if (!p || !C.db.pendaftaran.some(e => e.id_pendaftaran === p.id_pendaftaran && e.id_user === user.id_user)) throw new Error("Transaksi tidak ditemukan.");
    return p;
  };
  C.cancel = paymentId => {
    const payment = C.paymentForUser(paymentId);
    C.sweep(); if (payment.status !== "Menunggu Pembayaran") throw new Error("Hanya pesanan menunggu pembayaran yang dapat dibatalkan.");
    const e = C.db.pendaftaran.find(e => e.id_pendaftaran === payment.id_pendaftaran);
    payment.status = "Kedaluwarsa"; e.status = "Dibatalkan";
    C.notify(e.id_user, "Pesanan dibatalkan", `Pesanan ${payment.order_id} telah kamu batalkan. Kamu bisa memilih program kembali.`, "pembayaran"); C.save();
  };
  const encoded = value => new TextEncoder().encode(value);
  const hex = buffer => Array.from(new Uint8Array(buffer), b => b.toString(16).padStart(2, "0")).join("");
  C.sign = async payload => {
    const key = await crypto.subtle.importKey("raw", encoded("cendekia-local-gateway-demonstration-v2"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    return hex(await crypto.subtle.sign("HMAC", key, encoded(JSON.stringify({ order_id: payload.order_id, status: payload.status, transaction_id: payload.transaction_id, jumlah: payload.jumlah }))));
  };
  C.callback = async (payload, signature) => {
    const expected = await C.sign(payload);
    if (typeof signature !== "string" || signature.length !== expected.length || !expected.split("").every((v, i) => v === signature[i])) throw new Error("Signature tidak valid. Status transaksi tidak diubah.");
    C.sweep();
    const p = C.db.pembayaran.find(p => p.order_id === payload.order_id);
    if (!p || p.jumlah !== payload.jumlah || !["Lunas", "Gagal", "Kedaluwarsa"].includes(payload.status)) throw new Error("Data callback tidak sesuai pesanan.");
    if (p.status !== "Menunggu Pembayaran") {
      if (p.status === payload.status) return { duplicate: true, payment: p };
      throw new Error(`Transaksi sudah ${p.status}. Status akhir tidak dapat diubah.`);
    }
    const e = C.db.pendaftaran.find(e => e.id_pendaftaran === p.id_pendaftaran);
    if (!e || e.status !== "Menunggu Pembayaran") throw new Error("Pendaftaran tidak dapat diproses.");
    const program = C.db.program.find(program => program.id_program === e.id_program);
    if (payload.status === "Lunas") {
      const rule = C.purchaseRule(e.id_user, e.id_program);
      if (!rule.allowed) throw new Error(rule.reason);
      const active = C.enrollment(e.id_user);
      const start = rule.type === "perpanjang" && active ? Date.parse(active.tanggal_berakhir) : Date.now();
      if (rule.type === "upgrade" && active) active.status = "Digantikan";
      e.status = "Lunas"; e.tanggal_aktif = new Date(start).toISOString(); e.tanggal_berakhir = new Date(start + program.durasi_hari * C.day).toISOString();
      p.waktu_bayar = C.now();
      C.notify(e.id_user, "Pembayaran berhasil!", start > Date.now() + 1000 ? `${program.nama_program} terjadwal mulai ${new Date(start).toLocaleDateString("id-ID")}.` : `${program.nama_program} sudah aktif. Selamat belajar!`, "pembayaran");
    } else if (payload.status === "Kedaluwarsa") {
      e.status = "Dibatalkan";
      C.notify(e.id_user, "Batas pembayaran berakhir", `Pesanan ${p.order_id} kedaluwarsa. Silakan buat pesanan baru.`, "pembayaran");
    } else C.notify(e.id_user, "Pembayaran belum berhasil", `Pembayaran ${p.order_id} gagal. Kamu dapat mencoba metode pembayaran lagi.`, "pembayaran");
    p.status = payload.status; p.transaction_id = payload.transaction_id; C.save(); return { duplicate: false, payment: p };
  };
  C.simulate = async (paymentId, status, invalid = false) => {
    const payment = C.paymentForUser(paymentId);
    const payload = { order_id: payment.order_id, status, transaction_id: payment.transaction_id || `TX-${payment.order_id}`, jumlah: payment.jumlah };
    return C.callback(payload, invalid ? "invalid-signature" : await C.sign(payload));
  };
  C.solved = userId => new Set(C.db.jawaban_latihan.filter(a => a.id_user === userId).map(a => a.id_soal));
  C.progress = (userId, subtes) => {
    const questions = C.db.soal.filter(q => q.is_aktif && (!subtes || q.subtes === subtes));
    const solved = C.solved(userId), done = questions.filter(q => solved.has(q.id_soal)).length;
    return { total: questions.length, done, percent: questions.length ? Math.round(done / questions.length * 100) : 0 };
  };
  C.practice = (questionId, choice) => {
    const user = C.requireUser("siswa"), q = C.db.soal.find(q => q.id_soal === questionId && q.is_aktif);
    if (!q || (!q.is_gratis && !C.active(user.id_user))) throw new Error("Soal ini memerlukan program aktif.");
    if (!"ABCDE".includes(choice) || choice.length !== 1) throw new Error("Pilih satu jawaban terlebih dahulu.");
    const answer = { id_jawaban_latihan: C.id("latihan"), id_user: user.id_user, id_soal: q.id_soal, jawaban_dipilih: choice, is_benar: choice === q.jawaban_benar, waktu_jawab: C.now() };
    C.db.jawaban_latihan.push(answer); C.save(); return answer;
  };
  C.testQuestions = tryoutId => C.db.tryout_soal.filter(p => p.id_tryout === tryoutId).map(p => C.db.soal.find(q => q.id_soal === p.id_soal)).filter(Boolean);
  C.result = resultId => {
    const user = C.requireUser("siswa"), result = C.db.hasil_tryout.find(r => r.id_hasil === resultId && r.id_user === user.id_user);
    if (!result) throw new Error("Hasil tryout tidak ditemukan."); return result;
  };
  C.remaining = result => Math.max(0, Math.ceil((Date.parse(result.waktu_mulai) + (C.db.tryout.find(t => t.id_tryout === result.id_tryout)?.durasi_menit || 0) * 60000 - Date.now()) / 1000));
  C.startTest = tryoutId => {
    const user = C.requireActive(), test = C.db.tryout.find(t => t.id_tryout === tryoutId && t.status === "Rilis" && Date.parse(t.tanggal_rilis) <= Date.now());
    if (!test) throw new Error("Tryout ini belum dirilis.");
    const existing = C.db.hasil_tryout.find(r => r.id_tryout === tryoutId && r.id_user === user.id_user);
    if (existing) return existing;
    if (!C.testQuestions(tryoutId).length) throw new Error("Tryout belum memiliki soal.");
    const result = { id_hasil: C.id("hasil"), id_tryout: tryoutId, id_user: user.id_user, status: "Berlangsung", skor: null, jumlah_benar: 0, waktu_mulai: C.now(), waktu_selesai: null };
    C.db.hasil_tryout.push(result); C.save(); return result;
  };
  C.saveAnswer = (resultId, questionId, choice, doubt) => {
    C.requireActive(); const r = C.result(resultId);
    if (r.status !== "Berlangsung") throw new Error("Tryout ini sudah dikumpulkan.");
    if (!C.remaining(r)) { C.finish(r); C.save(); throw new Error("Waktu habis. Jawaban telah dikumpulkan otomatis."); }
    const q = C.testQuestions(r.id_tryout).find(q => q.id_soal === questionId);
    if (!q) throw new Error("Soal tidak termasuk dalam tryout.");
    let a = C.db.jawaban_siswa.find(a => a.id_hasil === r.id_hasil && a.id_soal === questionId);
    if (choice !== undefined && choice !== null && !/^[A-E]$/.test(choice)) throw new Error("Jawaban tidak valid.");
    if (!a) { a = { id_jawaban: C.id("ans"), id_hasil: r.id_hasil, id_soal: questionId, jawaban_dipilih: null, is_ragu: false, is_benar: false }; C.db.jawaban_siswa.push(a); }
    if (choice !== undefined) { a.jawaban_dipilih = choice; a.is_benar = choice === q.jawaban_benar; }
    if (doubt !== undefined) a.is_ragu = Boolean(doubt);
    C.save(); return a;
  };
  C.finish = result => {
    if (result.status !== "Berlangsung") return result;
    const qs = C.testQuestions(result.id_tryout);
    const answers = C.db.jawaban_siswa.filter(a => a.id_hasil === result.id_hasil && qs.some(q => q.id_soal === a.id_soal));
    answers.forEach(a => { a.is_benar = a.jawaban_dipilih === qs.find(q => q.id_soal === a.id_soal).jawaban_benar; });
    result.jumlah_benar = answers.filter(a => a.is_benar).length;
    result.skor = qs.length ? Number((result.jumlah_benar / qs.length * 100).toFixed(1)) : 0;
    result.status = "Selesai";
    const deadline = Date.parse(result.waktu_mulai) + C.db.tryout.find(t => t.id_tryout === result.id_tryout).durasi_menit * 60000;
    result.waktu_selesai = new Date(Math.min(Date.now(), deadline)).toISOString();
    C.notify(result.id_user, "Hasil tryout sudah tersedia", `Skor kamu ${result.skor} dari 100. Lihat analisis dan pembahasannya di Nilai & Progress.`, "hasil");
    return result;
  };
  C.submitTest = resultId => { C.requireUser("siswa"); const r = C.result(resultId); C.finish(r); C.save(); return r; };
  C.category = score => score >= 85 ? "Sangat Tinggi" : score >= 70 ? "Tinggi" : score >= 55 ? "Baik" : score >= 40 ? "Moderat" : score >= 25 ? "Perlu Peningkatan" : "Kritis";
  C.competencies = (userId, resultId) => {
    const results = C.db.hasil_tryout.filter(r => r.id_user === userId && r.status === "Selesai" && (!resultId || r.id_hasil === resultId));
    return C.subtests.map(s => {
      const pairs = results.flatMap(r => C.testQuestions(r.id_tryout).filter(q => q.subtes === s.name).map(q => ({ q, r })));
      const correct = pairs.filter(({ q, r }) => C.db.jawaban_siswa.some(a => a.id_hasil === r.id_hasil && a.id_soal === q.id_soal && a.jawaban_dipilih === q.jawaban_benar)).length;
      const score = pairs.length ? Math.round(correct / pairs.length * 100) : null;
      return { ...s, total: pairs.length, correct, score, category: score === null ? "Belum ada data" : C.category(score) };
    });
  };
  C.sweep = () => {
    let changed = false;
    C.db.pembayaran.filter(p => p.status === "Menunggu Pembayaran" && Date.parse(p.batas_bayar) <= Date.now()).forEach(p => {
      p.status = "Kedaluwarsa";
      const e = C.db.pendaftaran.find(e => e.id_pendaftaran === p.id_pendaftaran);
      if (e?.status === "Menunggu Pembayaran") e.status = "Dibatalkan";
      if (e) C.notify(e.id_user, "Batas pembayaran berakhir", `Pesanan ${p.order_id} sudah kedaluwarsa. Kamu dapat membuat pesanan baru.`, "pembayaran"); changed = true;
    });
    C.db.hasil_tryout.filter(r => r.status === "Berlangsung" && !C.remaining(r)).forEach(r => { C.finish(r); changed = true; });
    C.db.tryout.filter(t => t.status === "Rilis" && Date.parse(t.tanggal_rilis) <= Date.now()).forEach(t => {
      C.db.users.filter(u => u.role === "siswa" && u.is_aktif && C.active(u.id_user)).forEach(u => {
        const nid = `release-${t.id_tryout}-${u.id_user}`;
        if (!C.db.notifikasi.some(n => n.id_notifikasi === nid)) { C.db.notifikasi.push({ id_notifikasi: nid, id_user: u.id_user, judul: `${t.judul} sudah dirilis`, pesan: "Saatnya mengukur perkembanganmu. Kerjakan tryout saat kamu siap.", tipe: "tryout", sudah_dibaca: false, created_at: t.tanggal_rilis }); changed = true; }
      });
    });
    if (changed) C.save();
  };
  const base64 = bytes => btoa(String.fromCharCode(...bytes));
  C.hashPassword = async password => {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await crypto.subtle.importKey("raw", encoded(password), "PBKDF2", false, ["deriveBits"]);
    const hash = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 120000, hash: "SHA-256" }, key, 256);
    return `pbkdf2-sha256$120000$${base64(salt)}$${base64(new Uint8Array(hash))}`;
  };
  C.verifyPassword = async (password, value) => {
    const [algorithm, iterations, salt, expected] = value.split("$");
    if (algorithm !== "pbkdf2-sha256" || Number(iterations) !== 120000) return false;
    const key = await crypto.subtle.importKey("raw", encoded(password), "PBKDF2", false, ["deriveBits"]);
    const hash = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: Uint8Array.from(atob(salt), c => c.charCodeAt(0)), iterations: Number(iterations), hash: "SHA-256" }, key, 256);
    return base64(new Uint8Array(hash)) === expected;
  };
  C.login = async (email, password, role, remember) => {
    const user = C.db.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase() && u.role === role && u.is_aktif);
    if (!user || !await C.verifyPassword(password, user.password)) throw new Error("Email atau kata sandi tidak sesuai.");
    sessionStorage.removeItem(C.config.sessionKey); localStorage.removeItem(C.config.sessionKey);
    (remember ? localStorage : sessionStorage).setItem(C.config.sessionKey, user.id_user); return user;
  };
  C.logout = () => { sessionStorage.removeItem(C.config.sessionKey); localStorage.removeItem(C.config.sessionKey); };
  C.register = async data => {
    const nama = String(data.name || "").trim(), email = String(data.email || "").trim().toLowerCase(), phone = String(data.phone || "").trim();
    if (nama.length < 2) throw new Error("Isi nama lengkap minimal 2 karakter.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Masukkan alamat email yang valid.");
    if (!/^\+?[\d\s-]{9,16}$/.test(phone)) throw new Error("Masukkan nomor HP yang valid.");
    if (String(data.password).length < 8) throw new Error("Kata sandi minimal 8 karakter.");
    if (data.password !== data.confirm_password) throw new Error("Konfirmasi kata sandi belum cocok.");
    if (!data.terms) throw new Error("Setujui syarat dan ketentuan terlebih dahulu.");
    if (C.db.users.some(u => u.email.toLowerCase() === email)) throw new Error("Email sudah terdaftar. Silakan masuk.");
    const user = { id_user: C.id("usr"), nama, email, password: await C.hashPassword(data.password), no_hp: phone, asal_sekolah: null, tahun_lulus: null, role: "siswa", is_aktif: true, created_at: C.now() };
    C.db.users.push(user); C.save(); C.logout(); sessionStorage.setItem(C.config.sessionKey, user.id_user); return user;
  };
  C.guard = path => {
    const user = C.user();
    if (path.startsWith("/admin/") && user?.role !== "admin") return "/auth/admin-login";
    if (path.startsWith("/siswa/") && user?.role !== "siswa") return "/auth/login";
    if (path.startsWith("/siswa/")) {
      if (/^\/siswa\/(bank-soal|subtes|tryout)/.test(path) && !C.active(user.id_user)) return "/siswa/program";
      if (/^\/siswa\/tryout\/to-/.test(path)) {
        const t = C.db.tryout.find(t => t.id_tryout === path.split("/")[3]);
        if (!t || t.status !== "Rilis" || Date.parse(t.tanggal_rilis) > Date.now()) return "/siswa/tryout";
      }
      if (path === "/siswa/video" && !C.active(user.id_user)?.akses_video) return "/siswa/program";
    }
    return path;
  };
  C.sweep();
})();

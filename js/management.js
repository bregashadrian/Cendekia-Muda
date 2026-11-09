/* Pengelolaan tiga role untuk prototype lokal. Otorisasi produksi tetap di API. */
(() => {
  const C = CM;
  const baseSave = C.save;
  const stamp = () => C.now();
  const text = value => String(value ?? '').trim();
  const subjectOf = value => C.subtests.find(s => s.id === value || s.name === value);
  C.subjectOf = subjectOf;
  C.home = user => user?.role === 'admin' ? '/admin/dashboard' : user?.role === 'pengajar' ? '/pengajar/dashboard' : '/siswa/beranda';
  C.loginPath = role => role === 'admin' ? '/auth/admin-login' : role === 'pengajar' ? '/auth/pengajar-login' : '/auth/login';

  // Additive migration: existing IDs, answers, accounts and payments are retained.
  C.migrateManagement = db => {
    const first = !Array.isArray(db.pengajar_subtes), now = stamp();
    db.subtes ||= C.subtests.map((s, i) => ({ id_subtes: s.id, nama_subtes: s.name, kelompok: s.group, urutan: i + 1 }));
    db.pengajar_subtes ||= []; db.pendamping ||= []; db.siswa_pendamping ||= [];
    const admin = db.users.find(u => u.role === 'admin')?.id_user || null;
    if (first) {
      const seedPassword = C.createDatabase().users[0].password;
      [['maya', 'Maya Lestari', ['pu', 'ppu']], ['dimas', 'Dimas Pradana', ['pk', 'pm']]].forEach(([slug, nama, subjects]) => {
        let u = db.users.find(u => u.email === slug + '@cendekiamuda.test');
        if (!u) { u = { id_user: C.id('pengajar'), nama, email: slug + '@cendekiamuda.test', password: seedPassword, no_hp: '', asal_sekolah: null, tahun_lulus: null, role: 'pengajar', is_aktif: true, created_at: now }; db.users.push(u); }
        if (u.role === 'pengajar') subjects.forEach(id_subtes => db.pengajar_subtes.push({ id_pengajar: u.id_user, id_subtes, ditugaskan_oleh: admin, is_aktif: true, created_at: now, updated_at: now }));
      });
      // No invented phone numbers: admin fills real contacts before WhatsApp is enabled.
      [['pendamping-demo-1', 'Kak Alya'], ['pendamping-demo-2', 'Kak Fajar']].forEach(([id_pendamping, nama]) => db.pendamping.push({ id_pendamping, nama, nomor_whatsapp: '', is_aktif: true, catatan: 'Kontak contoh. Isi nomor WhatsApp sebelum digunakan.', created_at: now, updated_at: now }));
      const nadia = db.users.find(u => u.id_user === 'usr-siswa-001' && u.role === 'siswa');
      if (nadia) ['pu', 'pk'].forEach((id_subtes, i) => db.siswa_pendamping.push({ id_penugasan: C.id('penugasan'), id_siswa: nadia.id_user, id_subtes, id_pendamping: `pendamping-demo-${i + 1}`, ditugaskan_oleh: admin, mulai_pada: now, berakhir_pada: null, created_at: now }));
      db.tryout.push({ id_tryout: C.id('to'), judul: 'Draft Tryout Bersama', durasi_menit: 105, tanggal_rilis: null, status: 'Draft', dibuat_oleh: admin, dirilis_oleh: null, dirilis_pada: null, created_at: now, updated_at: now });
    }
    ['materi', 'soal'].forEach(table => db[table].forEach(item => {
      item.id_subtes ||= subjectOf(item.subtes)?.id || null;
      item.subtes ||= subjectOf(item.id_subtes)?.name || '';
      item.is_aktif ??= true;
      item.dibuat_oleh ??= admin; item.diubah_oleh ??= admin;
      item.created_at ||= now; item.updated_at ||= now;
    }));
    db.materi.forEach(m => {
      m.sumber ||= 'tautan';
      for (const key of ['storage_key', 'nama_file_asli', 'mime_type', 'ukuran_byte']) m[key] ??= null;
    });
    db.tryout.forEach(t => {
      t.dibuat_oleh ??= admin; t.dirilis_oleh ??= t.status === 'Rilis' ? admin : null;
      t.dirilis_pada ??= t.status === 'Rilis' ? now : null;
      t.created_at ||= now; t.updated_at ||= now;
      db.tryout_soal.filter(p => p.id_tryout === t.id_tryout).forEach((p, i) => p.urutan ??= i + 1);
    });
    return db;
  };
  C.db = C.migrateManagement(C.db);
  C.save = () => { baseSave(); C.lastStored = localStorage.getItem(C.config.storageKey); };
  C.save();
  C.syncManagement = () => {
    const raw = localStorage.getItem(C.config.storageKey);
    if (raw && raw !== C.lastStored) { const db = JSON.parse(raw); if (!Array.isArray(db.pengajar_subtes)) throw new Error('Muat ulang halaman untuk memperbarui data.'); C.db = db; C.lastStored = raw; }
  };
  let queue = Promise.resolve();
  C.manage = fn => {
    const execute = async () => {
      C.syncManagement();
      const previous = JSON.stringify(C.db);
      try { const value = await fn(); C.save(); return value; }
      catch (error) { C.db = JSON.parse(previous); throw error; }
    };
    if (globalThis.navigator?.locks) return navigator.locks.request(C.config.storageKey + ':management', execute);
    const result = queue.then(execute, execute); queue = result.catch(() => {}); return result;
  };
  C.requireManager = () => { const u = C.requireUser(); if (!['admin', 'pengajar'].includes(u.role)) throw new Error('Fitur ini hanya untuk pengelola konten.'); return u; };
  C.assignedSubjects = (user = C.user()) => !user?.is_aktif ? [] : user.role === 'admin' ? C.subtests : user.role === 'pengajar' ? C.subtests.filter(s => C.db.pengajar_subtes.some(a => a.id_pengajar === user.id_user && a.id_subtes === s.id && a.is_aktif)) : [];
  C.canManageSubject = value => C.assignedSubjects().some(s => s.id === subjectOf(value)?.id);
  C.requireSubject = value => { const u = C.requireManager(); if (!C.canManageSubject(value)) throw new Error('Subtes ini bukan penugasanmu. Hubungi admin jika tugas berubah.'); return u; };
  C.questionLocked = id => C.db.jawaban_latihan.some(a => a.id_soal === id) || C.db.jawaban_siswa.some(a => a.id_soal === id) || C.db.tryout_soal.some(p => p.id_soal === id && (C.db.tryout.some(t => t.id_tryout === p.id_tryout && t.status === 'Rilis') || C.db.hasil_tryout.some(r => r.id_tryout === p.id_tryout)));
  C.questionUsed = id => C.db.jawaban_latihan.some(a => a.id_soal === id) || C.db.jawaban_siswa.some(a => a.id_soal === id) || C.db.tryout_soal.some(p => p.id_soal === id);
  const assertRecord = (table, key, id) => { const record = C.db[table].find(r => r[key] === id); if (!record) throw new Error('Data tidak ditemukan. Muat ulang halaman.'); return record; };
  const assertVersion = (record, expected) => { if (expected && record.updated_at !== expected) throw new Error('Data sudah diubah di tab lain. Buka ulang formulir sebelum menyimpan.'); };
  C.safeSource = value => /^https:\/\//i.test(value) || /^assets\/[a-z0-9_./-]+$/i.test(value) && !value.includes('..');
  C.videoSource = value => {
    if (!C.safeSource(value)) throw new Error('Gunakan tautan HTTPS atau aset video yang valid.');
    if (value.startsWith('assets/')) return { type: 'video', url: value };
    const url = new URL(value), host = url.hostname.toLowerCase();
    if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtube-nocookie.com'].includes(host)) {
      const id = host === 'youtu.be' ? url.pathname.slice(1) : url.searchParams.get('v') || url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1];
      if (!/^[\w-]{11}$/.test(id || '')) throw new Error('Tautan YouTube tidak valid. Gunakan tautan video, bukan kanal atau playlist.');
      return { type: 'iframe', url: 'https://www.youtube-nocookie.com/embed/' + id };
    }
    if (['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'].includes(host)) {
      const id = url.pathname.match(/(?:\/video)?\/(\d+)\/?$/)?.[1];
      if (!id) throw new Error('Tautan Vimeo tidak valid.');
      return { type: 'iframe', url: 'https://player.vimeo.com/video/' + id };
    }
    if (!/\.(mp4|webm)$/i.test(url.pathname)) throw new Error('Gunakan YouTube, Vimeo, atau URL langsung berakhiran .mp4/.webm.');
    return { type: 'video', url: value };
  };
  C.saveQuestion = (id, data, expected) => C.manage(() => {
    const old = id ? assertRecord('soal', 'id_soal', id) : null;
    if (old) { C.requireSubject(old.id_subtes); assertVersion(old, expected); if (C.questionLocked(id)) throw new Error('Soal ini sudah digunakan atau masuk tryout Rilis. Buat salinan untuk revisi.'); }
    const s = subjectOf(data.subject), user = C.requireSubject(s?.id);
    if (!s || !['Mudah', 'Sedang', 'Sulit'].includes(data.difficulty) || !/^[A-E]$/.test(data.key)) throw new Error('Subtes, tingkat kesulitan, atau kunci jawaban tidak valid.');
    if (!text(data.question) || !text(data.explanation) || [...'abcde'].some(k => !text(data['option_' + k]))) throw new Error('Lengkapi pertanyaan, lima pilihan, dan pembahasan.');
    if ([data.image, data.explanation_image].some(v => text(v) && !C.safeSource(text(v)))) throw new Error('Gunakan URL gambar HTTPS atau lokasi assets/... yang valid.');
    const fields = { id_subtes: s.id, subtes: s.name, tingkat_kesulitan: data.difficulty, pertanyaan: text(data.question), gambar_soal: text(data.image) || null, ...Object.fromEntries([...'abcde'].map(k => ['opsi_' + k, text(data['option_' + k])])), jawaban_benar: data.key, pembahasan: text(data.explanation), gambar_pembahasan: text(data.explanation_image) || null, is_gratis: Boolean(data.free), diubah_oleh: user.id_user, updated_at: stamp() };
    if (old) { Object.assign(old, fields); return old; }
    const q = { id_soal: C.id('q'), ...fields, is_aktif: true, dibuat_oleh: user.id_user, created_at: stamp() }; C.db.soal.push(q); return q;
  });
  const filesDB = () => new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) return reject(new Error('Penyimpanan file tidak tersedia di browser ini.'));
    const req = indexedDB.open('cendekia-files-v1', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('files');
    req.onsuccess = () => resolve(req.result); req.onerror = () => reject(new Error('Penyimpanan file belum dapat dibuka.'));
  });
  const fileOperation = async (mode, operation) => {
    const db = await filesDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('files', mode), req = operation(transaction.objectStore('files'));
      transaction.oncomplete = () => { db.close(); resolve(req.result); };
      transaction.onerror = transaction.onabort = () => { db.close(); reject(new Error('File gagal disimpan atau dibaca. Periksa ruang penyimpanan browser.')); };
    });
  };
  C.mediaStore = { get: key => fileOperation('readonly', store => store.get(key)), put: (key, file) => fileOperation('readwrite', store => store.put(file, key)), remove: key => fileOperation('readwrite', store => store.delete(key)) };
  C.validateFile = async (file, type) => {
    const limit = type === 'video' ? 100 : 20;
    if (!file || !file.size || file.size > limit * 1024 * 1024) throw new Error(`Pilih file ${type.toUpperCase()} berukuran 1 byte–${limit} MB.`);
    const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer()), head = String.fromCharCode(...bytes);
    const valid = type === 'pdf' ? file.type === 'application/pdf' && /\.pdf$/i.test(file.name) && head.startsWith('%PDF-') : file.type === 'video/mp4' && /\.mp4$/i.test(file.name) && head.slice(4, 8) === 'ftyp' || file.type === 'video/webm' && /\.webm$/i.test(file.name) && [26, 69, 223, 163].every((b, i) => bytes[i] === b);
    if (!valid) throw new Error('Isi, tipe, atau ekstensi file tidak cocok. Gunakan PDF, MP4, atau WebM yang valid.');
  };
  C.saveMaterial = async (id, data, file, expected) => {
    const source = data.source || 'tautan', type = data.type;
    if (!['pdf', 'video'].includes(type) || !['tautan', 'unggah'].includes(source)) throw new Error('Tipe atau sumber materi tidak valid.');
    C.requireSubject(subjectOf(data.subject)?.id);
    let freshKey = null, obsolete = null;
    if (source === 'unggah' && file?.size) {
      await C.validateFile(file, type); freshKey = C.id('file'); await C.mediaStore.put(freshKey, file);
    }
    try {
      const value = await C.manage(() => {
        const old = id ? assertRecord('materi', 'id_materi', id) : null;
        if (old) { C.requireSubject(old.id_subtes); assertVersion(old, expected); }
        const s = subjectOf(data.subject), user = C.requireSubject(s?.id);
        if (!text(data.title) || !Number.isSafeInteger(Number(data.order)) || Number(data.order) < 1) throw new Error('Judul dan urutan positif wajib diisi.');
        let metadata = { url_file: null, storage_key: null, nama_file_asli: null, mime_type: null, ukuran_byte: null };
        if (source === 'tautan') {
          const url = text(data.url), sameLocal = old?.url_file === url && /^local:/.test(url);
          if (!sameLocal && !C.safeSource(url)) throw new Error('Gunakan URL HTTPS atau lokasi assets/... yang valid.');
          if (type === 'video') C.videoSource(url);
          metadata.url_file = url;
        } else if (freshKey) metadata = { ...metadata, storage_key: freshKey, nama_file_asli: file.name, mime_type: file.type, ukuran_byte: file.size };
        else if (old?.sumber === 'unggah' && old.storage_key && old.tipe === type) metadata = { ...metadata, storage_key: old.storage_key, nama_file_asli: old.nama_file_asli, mime_type: old.mime_type, ukuran_byte: old.ukuran_byte };
        else throw new Error('Pilih file untuk diunggah.');
        obsolete = old?.storage_key && old.storage_key !== metadata.storage_key ? old.storage_key : null;
        const fields = { judul: text(data.title), id_subtes: s.id, subtes: s.name, tipe: type, sumber: source, ...metadata, is_gratis: Boolean(data.free), urutan: Number(data.order), diubah_oleh: user.id_user, updated_at: stamp() };
        if (old) { Object.assign(old, fields); return old; }
        const m = { id_materi: C.id('mat'), ...fields, is_aktif: true, dibuat_oleh: user.id_user, created_at: stamp() }; C.db.materi.push(m); return m;
      });
      if (obsolete) C.mediaStore.remove(obsolete).catch(() => {});
      return value;
    } catch (error) { if (freshKey) await C.mediaStore.remove(freshKey).catch(() => {}); throw error; }
  };
  C.canReadMaterial = m => m && (C.materialAccess(m) || C.canManageSubject(m.id_subtes));
  C.getMaterialFile = async id => {
    C.syncManagement(); const m = assertRecord('materi', 'id_materi', id);
    if (!C.canReadMaterial(m) || m.sumber !== 'unggah') throw new Error('File ini tidak dapat diakses.');
    const file = await C.mediaStore.get(m.storage_key);
    if (!file) throw new Error('File tidak ditemukan di browser ini. Unggah kembali melalui pengelola materi.');
    if (!C.canReadMaterial(C.db.materi.find(v => v.id_materi === id))) throw new Error('Akses file telah berubah.');
    return file;
  };
  C.toggleContent = (type, id) => C.manage(() => {
    const material = type.startsWith('material'), record = assertRecord(material ? 'materi' : 'soal', material ? 'id_materi' : 'id_soal', id), u = C.requireSubject(record.id_subtes);
    const field = ['question', 'material-status'].includes(type) ? 'is_aktif' : 'is_gratis';
    record[field] = !record[field]; record.diubah_oleh = u.id_user; record.updated_at = stamp();
  });
  C.deleteContent = (type, id) => C.manage(() => {
    const table = type === 'material' ? 'materi' : 'soal', key = type === 'material' ? 'id_materi' : 'id_soal';
    const record = assertRecord(table, key, id); C.requireSubject(record.id_subtes);
    if (type !== 'material' && C.questionUsed(id)) throw new Error('Soal masih dipakai dalam latihan atau tryout. Gunakan Nonaktifkan.');
    C.db[table] = C.db[table].filter(r => r[key] !== id); return record.storage_key;
  });
  C.saveTeacher = async (id, data, subjects, expected) => {
    C.requireUser('admin');
    const password = !id && text(data.password).length >= 8 ? await C.hashPassword(data.password) : null;
    return C.manage(() => {
      const admin = C.requireUser('admin'), old = id ? assertRecord('users', 'id_user', id) : null;
      if (old && old.role !== 'pengajar') throw new Error('Akun ini bukan pengajar.');
      if (old) assertVersion(old, expected);
      const email = text(data.email).toLowerCase(), selected = [...new Set(subjects)];
      if (text(data.name).length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || C.db.users.some(u => u.id_user !== id && u.email.toLowerCase() === email)) throw new Error('Nama atau email tidak valid, atau email sudah dipakai.');
      if (text(data.phone) && !/^\+?[\d\s-]{9,16}$/.test(text(data.phone))) throw new Error('Nomor HP tidak valid.');
      if (selected.some(s => !subjectOf(s))) throw new Error('Subtes tidak valid.');
      if (!old && !password) throw new Error('Kata sandi awal minimal 8 karakter.');
      const u = old || { id_user: C.id('pengajar'), role: 'pengajar', password, is_aktif: true, asal_sekolah: null, tahun_lulus: null, created_at: stamp() };
      Object.assign(u, { nama: text(data.name), email, no_hp: text(data.phone), updated_at: stamp() });
      if (!old) C.db.users.push(u);
      C.db.pengajar_subtes.filter(a => a.id_pengajar === u.id_user).forEach(a => { a.is_aktif = selected.includes(a.id_subtes); a.ditugaskan_oleh = admin.id_user; a.updated_at = stamp(); });
      selected.forEach(id_subtes => { if (!C.db.pengajar_subtes.some(a => a.id_pengajar === u.id_user && a.id_subtes === id_subtes)) C.db.pengajar_subtes.push({ id_pengajar: u.id_user, id_subtes, ditugaskan_oleh: admin.id_user, is_aktif: true, created_at: stamp(), updated_at: stamp() }); });
      return u;
    });
  };
  C.toggleTeacher = id => C.manage(() => { C.requireUser('admin'); const u = assertRecord('users', 'id_user', id); if (u.role !== 'pengajar') throw new Error('Akun bukan pengajar.'); u.is_aktif = !u.is_aktif; u.updated_at = stamp(); });
  C.saveMentor = (id, data, expected) => C.manage(() => {
    C.requireUser('admin'); const old = id ? assertRecord('pendamping', 'id_pendamping', id) : null;
    if (old) assertVersion(old, expected);
    let phone = text(data.phone).replace(/[\s()+-]/g, ''); if (phone.startsWith('0')) phone = '62' + phone.slice(1);
    if (text(data.name).length < 2 || !/^[1-9]\d{8,14}$/.test(phone)) throw new Error('Isi nama dan nomor WhatsApp valid, misalnya format 62 untuk Indonesia.');
    const fields = { nama: text(data.name), nomor_whatsapp: phone, catatan: text(data.note), updated_at: stamp() };
    if (old) { Object.assign(old, fields); return old; }
    const mentor = { id_pendamping: C.id('pendamping'), ...fields, is_aktif: true, created_at: stamp() }; C.db.pendamping.push(mentor); return mentor;
  });
  C.toggleMentor = id => C.manage(() => { C.requireUser('admin'); const m = assertRecord('pendamping', 'id_pendamping', id); m.is_aktif = !m.is_aktif; m.updated_at = stamp(); });
  C.assignMentor = (studentId, subjectId, mentorId, expected) => C.manage(() => {
    const admin = C.requireUser('admin'), student = assertRecord('users', 'id_user', studentId);
    if (student.role !== 'siswa' || !subjectOf(subjectId)) throw new Error('Siswa atau subtes tidak sesuai.');
    const current = C.db.siswa_pendamping.find(a => a.id_siswa === studentId && a.id_subtes === subjectId && !a.berakhir_pada);
    if (expected !== undefined && (current?.id_penugasan || '') !== expected) throw new Error('Penugasan sudah berubah. Muat ulang sebelum menyimpan.');
    if (mentorId) { const mentor = assertRecord('pendamping', 'id_pendamping', mentorId); if (!mentor.is_aktif) throw new Error('Pilih pendamping aktif.'); }
    if (current?.id_pendamping === mentorId) return current;
    const now = stamp(); if (current) current.berakhir_pada = now;
    if (!mentorId) return null;
    const assignment = { id_penugasan: C.id('penugasan'), id_siswa: studentId, id_subtes: subjectId, id_pendamping: mentorId, ditugaskan_oleh: admin.id_user, mulai_pada: now, berakhir_pada: null, created_at: now }; C.db.siswa_pendamping.push(assignment); return assignment;
  });
  C.myMentors = () => {
    const u = C.requireActive();
    return C.subtests.map(s => {
      const a = C.db.siswa_pendamping.find(a => a.id_siswa === u.id_user && a.id_subtes === s.id && !a.berakhir_pada);
      const m = a && C.db.pendamping.find(m => m.id_pendamping === a.id_pendamping);
      return { subject: s, name: m?.nama || '', state: !m ? 'Belum ditetapkan' : !m.is_aktif ? 'Pendamping tidak aktif' : !m.nomor_whatsapp ? 'Nomor belum tersedia' : 'Tersedia', phone: m?.is_aktif ? m.nomor_whatsapp : null };
    });
  };
  C.testUsed = id => C.db.hasil_tryout.some(r => r.id_tryout === id);
  C.tryoutCoverage = id => C.subtests.map(s => ({ ...s, count: C.testQuestions(id).filter(q => q.id_subtes === s.id).length }));
  C.testQuestions = id => C.db.tryout_soal.filter(p => p.id_tryout === id).sort((a, b) => a.urutan - b.urutan).map(p => C.db.soal.find(q => q.id_soal === p.id_soal)).filter(Boolean);
  C.teacherSummary = subjectId => {
    C.syncManagement(); C.requireUser('pengajar'); C.requireSubject(subjectId);
    const subject = subjectOf(subjectId), questions = C.db.soal.filter(q => q.id_subtes === subject.id);
    const byId = new Map(questions.map(q => [q.id_soal, q]));
    const students = new Set(C.db.users.filter(u => u.role === 'siswa').map(u => u.id_user));
    const round = value => Number(value.toFixed(1));
    const isCorrect = (answer, q) => typeof answer?.is_benar === 'boolean' ? answer.is_benar : Boolean(answer?.jawaban_dipilih && answer.jawaban_dipilih === q.jawaban_benar);
    const commonErrors = observations => {
      const counts = new Map();
      observations.forEach(({q, answer}) => {
        const item = counts.get(q.id_soal) || { id: q.id_soal, question: q.pertanyaan, total: 0, wrong: 0, blank: 0 };
        item.total++; if (!isCorrect(answer, q)) { item.wrong++; if (!answer?.jawaban_dipilih) item.blank++; }
        counts.set(q.id_soal, item);
      });
      return [...counts.values()].filter(q => q.wrong).map(q => ({...q, percent: round(q.wrong / q.total * 100)})).sort((a,b) => b.wrong - a.wrong || b.percent - a.percent || a.id.localeCompare(b.id)).slice(0,5);
    };
    const attempts = C.db.jawaban_latihan.filter(a => byId.has(a.id_soal) && students.has(a.id_user));
    const practiceCorrect = attempts.filter(a => isCorrect(a, byId.get(a.id_soal))).length;
    const practice = { students: new Set(attempts.map(a => a.id_user)).size, attempts: attempts.length, questionCount: new Set(attempts.map(a => a.id_soal)).size, correct: practiceCorrect, accuracy: attempts.length ? round(practiceCorrect / attempts.length * 100) : null, missed: commonErrors(attempts.map(a => ({q: byId.get(a.id_soal), answer: a}))) };
    const finished = C.db.hasil_tryout.filter(r => r.status === 'Selesai' && students.has(r.id_user));
    const answerMap = new Map(C.db.jawaban_siswa.map(a => [a.id_hasil + ':' + a.id_soal, a]));
    const rows = finished.map(r => {
      const qs = C.testQuestions(r.id_tryout).filter(q => byId.has(q.id_soal));
      // Start from package membership so unanswered questions still count toward the score.
      const observations = qs.map(q => ({q, answer: answerMap.get(r.id_hasil + ':' + q.id_soal)}));
      return { result: r, observations, score: qs.length ? observations.filter(o => isCorrect(o.answer,o.q)).length / qs.length * 100 : null };
    }).filter(r => r.score !== null);
    const summarize = rows => ({ students: new Set(rows.map(r => r.result.id_user)).size, completed: rows.length, average: rows.length ? round(rows.reduce((n,r) => n + r.score,0) / rows.length) : null, missed: commonErrors(rows.flatMap(r => r.observations)) });
    const packages = C.db.tryout.filter(t => t.status === 'Rilis' || rows.some(r => r.result.id_tryout === t.id_tryout)).map(t => {
      const qs = C.testQuestions(t.id_tryout).filter(q => byId.has(q.id_soal));
      return { id: t.id_tryout, title: t.judul, date: t.tanggal_rilis, questionCount: qs.length, ...summarize(rows.filter(r => r.result.id_tryout === t.id_tryout)) };
    }).filter(t => t.questionCount).sort((a,b) => (Date.parse(a.date) || 0) - (Date.parse(b.date) || 0) || a.id.localeCompare(b.id));
    return { subject, practice, tryout: { ...summarize(rows), packages } };
  };
  const orderQuestions = id => {
    const rows = C.db.tryout_soal.filter(p => p.id_tryout === id);
    rows.sort((a, b) => { const qa = C.db.soal.find(q => q.id_soal === a.id_soal), qb = C.db.soal.find(q => q.id_soal === b.id_soal); return C.subtests.findIndex(s => s.id === qa.id_subtes) - C.subtests.findIndex(s => s.id === qb.id_subtes) || a.urutan - b.urutan; });
    rows.forEach((row, i) => row.urutan = i + 1);
  };
  C.saveTryout = (id, data, expected) => C.manage(() => {
    const admin = C.requireUser('admin'), old = id ? assertRecord('tryout', 'id_tryout', id) : null;
    if (old) { assertVersion(old, expected); if (old.status !== 'Draft' || C.testUsed(id)) throw new Error('Ubah pengaturan hanya pada draft yang belum dikerjakan.'); }
    if (!text(data.title) || !Number.isSafeInteger(Number(data.duration)) || Number(data.duration) < 1 || data.release && !Number.isFinite(Date.parse(data.release))) throw new Error('Isi judul, durasi positif, dan tanggal yang valid.');
    const fields = { judul: text(data.title), durasi_menit: Number(data.duration), tanggal_rilis: data.release ? new Date(data.release).toISOString() : null, updated_at: stamp() };
    if (old) { Object.assign(old, fields); return old; }
    const t = { id_tryout: C.id('to'), ...fields, status: 'Draft', dibuat_oleh: admin.id_user, dirilis_oleh: null, dirilis_pada: null, created_at: stamp() }; C.db.tryout.push(t); return t;
  });
  C.contributionVersion = (id, subjectId) => C.testQuestions(id).filter(q => q.id_subtes === subjectId).map(q => q.id_soal).join('|');
  C.saveContribution = (id, subjectId, ids, expected) => C.manage(() => {
    C.requireSubject(subjectId); const t = assertRecord('tryout', 'id_tryout', id);
    if (t.status !== 'Draft' || C.testUsed(id)) throw new Error('Paket sudah dirilis atau dikerjakan. Kontribusi tidak dapat diubah.');
    if (expected !== undefined && expected !== C.contributionVersion(id, subjectId)) throw new Error('Soal subtes ini sudah diubah. Buka ulang pemilihan soal.');
    if (new Set(ids).size !== ids.length) throw new Error('Soal tidak boleh duplikat.');
    if (ids.some(qid => !C.db.soal.some(q => q.id_soal === qid && q.id_subtes === subjectId && q.is_aktif))) throw new Error('Pilih soal aktif dari subtes yang ditugaskan.');
    C.db.tryout_soal = C.db.tryout_soal.filter(p => p.id_tryout !== id || C.db.soal.find(q => q.id_soal === p.id_soal)?.id_subtes !== subjectId);
    ids.forEach((id_soal, i) => C.db.tryout_soal.push({ id_tryout: id, id_soal, urutan: i + 1 })); orderQuestions(id); t.updated_at = stamp();
  });
  C.releaseTryout = id => C.manage(() => {
    const admin = C.requireUser('admin'), t = assertRecord('tryout', 'id_tryout', id);
    if (C.testUsed(id)) throw new Error('Tryout sudah pernah dikerjakan. Status dan isinya dibekukan.');
    if (t.status === 'Rilis') { t.status = 'Draft'; t.dirilis_oleh = null; t.dirilis_pada = null; t.updated_at = stamp(); return t; }
    const missing = C.tryoutCoverage(id).filter(s => !s.count);
    if (missing.length) throw new Error('Lengkapi soal subtes: ' + missing.map(s => s.short).join(', ') + '.');
    if (!t.tanggal_rilis || !Number.isFinite(Date.parse(t.tanggal_rilis)) || t.durasi_menit < 1) throw new Error('Isi jadwal rilis dan durasi melalui Pengaturan Tryout.');
    if (C.testQuestions(id).some(q => !q.is_aktif || !q.pertanyaan.trim() || !q.pembahasan.trim() || [...'abcde'].some(a => !q['opsi_' + a]?.trim()))) throw new Error('Paket masih berisi soal nonaktif atau belum lengkap.');
    orderQuestions(id); t.status = 'Rilis'; t.dirilis_oleh = admin.id_user; t.dirilis_pada = stamp(); t.updated_at = stamp(); return t;
  });
  const baseAccess = C.materialAccess;
  C.materialAccess = m => Boolean(m && m.is_aktif !== false && baseAccess(m));
  const baseGuard = C.guard;
  C.guard = path => {
    const requested = path.split('/')[1], user = C.user();
    if (['admin', 'pengajar', 'siswa'].includes(requested) && user?.role !== requested) return user ? C.home(user) : C.loginPath(requested);
    return requested === 'pengajar' ? path : baseGuard(path);
  };
})();

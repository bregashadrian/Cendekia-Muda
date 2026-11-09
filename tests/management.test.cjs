const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { webcrypto } = require('node:crypto');
function fixture() {
  const storage = () => { const map = new Map(); return { getItem:k => map.get(k) ?? null, setItem:(k,v) => map.set(k,String(v)), removeItem:k => map.delete(k) }; };
  const ctx = { crypto:webcrypto, TextEncoder, Date, localStorage:storage(), sessionStorage:storage(), btoa, atob, console, URL, Blob };
  ctx.window = ctx; vm.createContext(ctx);
  for (const name of ['data','core','management']) vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',name + '.js'),'utf8'),ctx);
  const C = ctx.CM, blobs = new Map();
  C.mediaStore = { put:async(k,v) => blobs.set(k,v), get:async k => blobs.get(k), remove:async k => blobs.delete(k) };
  return { C,ctx,blobs,as:email => ctx.sessionStorage.setItem(C.config.sessionKey,C.db.users.find(u => u.email === email + '@cendekiamuda.test').id_user) };
}
const question = (subject = 'pu') => ({ subject,difficulty:'Sedang',question:'Pertanyaan baru',option_a:'A',option_b:'B',option_c:'C',option_d:'D',option_e:'E',key:'A',explanation:'Penjelasan',free:true });
const material = (subject = 'pu') => ({ subject,type:'video',source:'tautan',title:'Video Baru',url:'https://example.test/lesson.webm',order:1,free:true });

test('Additive migration is idempotent and preserves legacy identities, answers and transactions', () => {
  const {C} = fixture(), before = JSON.stringify(C.db);
  const answers = JSON.stringify(C.db.jawaban_latihan), payments = JSON.stringify(C.db.pembayaran);
  C.migrateManagement(C.db);
  assert.equal(JSON.stringify(C.db),before); assert.equal(JSON.stringify(C.db.jawaban_latihan),answers); assert.equal(JSON.stringify(C.db.pembayaran),payments);
  assert.equal(Object.keys(C.db).length,16); assert.equal(C.db.users.filter(u => u.role === 'pengajar').length,2);
  assert.ok(C.db.soal.every(q => C.db.subtes.some(s => s.id_subtes === q.id_subtes)));
});
test('Teacher login and role guards reject student, admin and unassigned content operations', async () => {
  const {C,as} = fixture(); await C.login('maya@cendekiamuda.test','demo1234','pengajar',false);
  assert.equal(C.guard('/admin/dashboard'),'/pengajar/dashboard'); assert.equal(C.guard('/siswa/profil'),'/pengajar/dashboard');
  assert.deepEqual(Array.from(C.assignedSubjects(),s => s.id),['pu','ppu']);
  await assert.rejects(C.saveQuestion('',question('pk')),/penugasan/);
  await assert.rejects(C.saveTeacher('',{name:'Teacher'},[]),/Sesi/);
  as('raka'); await assert.rejects(C.saveQuestion('',question()),/pengelola/);
  C.logout(); assert.equal(C.guard('/pengajar/dashboard'),'/auth/pengajar-login');
});
test('Content is shared within assigned subtests; movement and revoked assignments are enforced', async () => {
  const {C,as} = fixture(); as('maya'); const q = await C.saveQuestion('',question());
  as('admin'); const teacher = C.db.users.find(u => u.email.startsWith('dimas@'));
  await C.saveTeacher(teacher.id_user,{name:teacher.nama,email:teacher.email,phone:teacher.no_hp},['pu']);
  as('dimas'); await C.saveQuestion(q.id_soal,{...question(),question:'Diubah pengajar kedua'});
  assert.equal(C.db.soal.find(r => r.id_soal === q.id_soal).pertanyaan,'Diubah pengajar kedua');
  await assert.rejects(C.saveQuestion(q.id_soal,question('pk')),/penugasan/);
  as('admin'); await C.saveTeacher(teacher.id_user,{name:teacher.nama,email:teacher.email},[]);
  as('dimas'); await assert.rejects(C.saveQuestion(q.id_soal,question()),/penugasan/);
});
test('Two teachers contribute to the same draft without overwriting other subtests; stale selections rejected', async () => {
  const {C,as} = fixture(), id = C.db.tryout.find(t => t.status === 'Draft').id_tryout;
  as('maya'); await C.saveContribution(id,'pu',['q-pu-4','q-pu-5'],'');
  as('dimas'); await C.saveContribution(id,'pk',['q-pk-4'],'');
  assert.deepEqual(Array.from(C.testQuestions(id),q => q.id_soal),['q-pu-4','q-pu-5','q-pk-4']);
  await assert.rejects(C.saveContribution(id,'pu',['q-pu-6']),/penugasan/);
  as('maya'); await assert.rejects(C.saveContribution(id,'pu',['q-pu-6'],''),/sudah diubah/);
  await C.saveContribution(id,'pu',['q-pu-5','q-pu-4'],C.contributionVersion(id,'pu'));
  assert.deepEqual(Array.from(C.testQuestions(id),q => q.id_soal),['q-pu-5','q-pu-4','q-pk-4']);
});
test('Release is admin-only, requires all seven subtests and a schedule, and freezes used packages', async () => {
  const {C,as} = fixture(), id = C.db.tryout.find(t => t.status === 'Draft').id_tryout;
  as('maya'); await assert.rejects(C.releaseTryout(id),/Sesi/);
  as('admin'); await assert.rejects(C.releaseTryout(id),/Lengkapi/);
  for (const s of C.subtests) await C.saveContribution(id,s.id,['q-' + s.id + '-4']);
  await assert.rejects(C.releaseTryout(id),/jadwal/);
  await C.saveTryout(id,{title:'Ujian Lengkap',duration:90,release:'2020-01-01T00:00:00Z'}); await C.releaseTryout(id);
  as('maya'); await assert.rejects(C.saveContribution(id,'pu',['q-pu-5']),/dirilis/); await assert.rejects(C.saveQuestion('q-pu-4',question()),/sudah digunakan/);
  as('nadia'); C.startTest(id); as('admin'); await assert.rejects(C.releaseTryout(id),/dibekukan/); await assert.rejects(C.saveTryout(id,{title:'X',duration:1}),/draft/);
});
test('Used questions cannot be rewritten or deleted; unused content supports deletion', async () => {
  const {C,as} = fixture(); as('admin');
  const previous = C.db.soal.find(q => q.id_soal === 'q-pu-1').jawaban_benar;
  await assert.rejects(C.saveQuestion('q-pu-1',{...question(),key:'E'}),/sudah digunakan/);
  await assert.rejects(C.deleteContent('question','q-pu-1'),/masih dipakai/);
  assert.equal(C.db.soal.find(q => q.id_soal === 'q-pu-1').jawaban_benar,previous);
  const q = await C.saveQuestion('',question()); await C.deleteContent('question',q.id_soal); assert.ok(!C.db.soal.some(r => r.id_soal === q.id_soal));
});
test('Mentor replacement retains history and contacts are limited to assigned active students', async () => {
  const {C,as} = fixture(); as('admin');
  const m = await C.saveMentor('',{name:'Pendamping Uji',phone:'081234567890'});
  assert.equal(m.nomor_whatsapp,'6281234567890');
  const old = C.db.siswa_pendamping.find(a => a.id_siswa === 'usr-siswa-001' && a.id_subtes === 'pu');
  await C.assignMentor('usr-siswa-001','pu',m.id_pendamping,old.id_penugasan);
  assert.ok(C.db.siswa_pendamping.find(a => a.id_penugasan === old.id_penugasan).berakhir_pada);
  assert.equal(C.db.siswa_pendamping.filter(a => a.id_siswa === 'usr-siswa-001' && a.id_subtes === 'pu' && !a.berakhir_pada).length,1);
  as('raka'); assert.throws(() => C.myMentors(),/Aktifkan/);
  as('nadia'); assert.equal(C.myMentors().find(r => r.subject.id === 'pu').phone,'6281234567890');
  // Both paid programs grant contact access.
  C.enrollment(C.user().id_user).id_program = 'prg-reguler'; C.save(); assert.equal(C.myMentors().find(r => r.subject.id === 'pu').phone,'6281234567890');
  as('admin'); await C.toggleMentor(m.id_pendamping); as('nadia'); assert.equal(C.myMentors().find(r => r.subject.id === 'pu').phone,null);
  C.enrollment(C.user().id_user).tanggal_berakhir = '2000-01-01T00:00:00Z'; assert.throws(() => C.myMentors(),/Aktifkan/);
});
test('File validation, rollback, program access and sources are enforced', async () => {
  const {C,as,blobs} = fixture(); as('maya');
  const file = new Blob([new Uint8Array([26,69,223,163,0,0])],{type:'video/webm'}); file.name = 'sample.webm';
  const bad = new Blob(['not a video'],{type:'video/webm'}); bad.name = 'sample.webm';
  await assert.rejects(C.validateFile(bad,'video'),/tidak cocok/);
  await assert.rejects(C.validateFile({size:101*1024*1024},'video'),/100 MB/);
  const m = await C.saveMaterial('',{...material(),source:'unggah',free:false},file); assert.equal(m.url_file,null); assert.ok(m.storage_key); assert.equal(blobs.size,1);
  as('raka'); await assert.rejects(C.getMaterialFile(m.id_materi),/tidak dapat/);
  as('nadia'); assert.equal((await C.getMaterialFile(m.id_materi)).size,file.size);
  C.enrollment(C.user().id_user).id_program='prg-reguler'; C.save(); await assert.rejects(C.getMaterialFile(m.id_materi),/tidak dapat/);
  as('maya'); await assert.rejects(C.saveMaterial('',{...material(),source:'unggah',title:''},file),/Judul/); assert.equal(blobs.size,1);
  await C.saveMaterial(m.id_materi,material()); assert.equal(C.db.materi.find(r => r.id_materi === m.id_materi).storage_key,null);
  await new Promise(resolve => setTimeout(resolve,0)); assert.equal(blobs.size,0);
  assert.equal(C.videoSource('https://youtu.be/dQw4w9WgXcQ').type,'iframe'); assert.throws(() => C.videoSource('javascript:alert(1)'));
});
test('Concurrent-tab latest database is reloaded before mutation and malformed updates cannot partially save', async () => {
  const {C,ctx,as} = fixture(); as('maya'); const before = C.db.soal.length;
  const remote = JSON.parse(ctx.localStorage.getItem(C.config.storageKey)); remote.pengajar_subtes.filter(a => a.id_pengajar === C.user().id_user).forEach(a => a.is_aktif=false);
  ctx.localStorage.setItem(C.config.storageKey,JSON.stringify(remote));
  await assert.rejects(C.saveQuestion('',question()),/penugasan/); assert.equal(C.db.soal.length,before);
});

test('Teacher summaries separate repeated practice from finished tryouts and include unanswered questions in scores', () => {
  const {C,as} = fixture(); as('dimas');
  const nadia = C.db.users.find(u => u.email.startsWith('nadia@')).id_user, raka = C.db.users.find(u => u.email.startsWith('raka@')).id_user;
  C.db.jawaban_latihan = [
    {id_user:nadia,id_soal:'q-pk-4',is_benar:true,jawaban_dipilih:'A'},
    {id_user:nadia,id_soal:'q-pk-4',is_benar:false,jawaban_dipilih:'B'},
    {id_user:raka,id_soal:'q-pk-5',is_benar:false,jawaban_dipilih:'B'},
    {id_user:nadia,id_soal:'q-pu-4',is_benar:false,jawaban_dipilih:'B'}
  ];
  const first=C.db.tryout[0], second=C.db.tryout[1];
  C.db.tryout_soal = [{id_tryout:first.id_tryout,id_soal:'q-pk-4',urutan:1},{id_tryout:first.id_tryout,id_soal:'q-pk-5',urutan:2},{id_tryout:second.id_tryout,id_soal:'q-pk-4',urutan:1}];
  C.db.hasil_tryout = [
    {id_hasil:'summary-a',id_user:nadia,id_tryout:first.id_tryout,status:'Selesai'},
    {id_hasil:'summary-b',id_user:raka,id_tryout:first.id_tryout,status:'Selesai'},
    {id_hasil:'summary-c',id_user:nadia,id_tryout:second.id_tryout,status:'Selesai'},
    {id_hasil:'summary-running',id_user:raka,id_tryout:second.id_tryout,status:'Berlangsung'}
  ];
  C.db.jawaban_siswa = [
    {id_hasil:'summary-a',id_soal:'q-pk-4',is_benar:true,jawaban_dipilih:'A'},
    {id_hasil:'summary-b',id_soal:'q-pk-4',is_benar:true,jawaban_dipilih:'A'},
    {id_hasil:'summary-b',id_soal:'q-pk-5',is_benar:true,jawaban_dipilih:'A'},
    {id_hasil:'summary-c',id_soal:'q-pk-4',is_benar:false,jawaban_dipilih:'B'},
    {id_hasil:'summary-running',id_soal:'q-pk-4',is_benar:true,jawaban_dipilih:'A'}
  ]; C.save();
  const before=JSON.stringify(C.db), summary=C.teacherSummary('pk');
  assert.equal(summary.practice.students,2); assert.equal(summary.practice.attempts,3); assert.equal(summary.practice.questionCount,2); assert.equal(summary.practice.accuracy,33.3);
  assert.equal(summary.tryout.students,2); assert.equal(summary.tryout.completed,3); assert.equal(summary.tryout.average,50);
  assert.equal(summary.tryout.packages[0].average,75); assert.equal(summary.tryout.packages[1].average,0);
  const missing=summary.tryout.missed.find(q => q.id === 'q-pk-5'); assert.equal(missing.blank,1); assert.equal(missing.total,2); assert.equal(missing.percent,50);
  assert.equal(JSON.stringify(C.db),before);
  const serialized=JSON.stringify(summary); for(const hidden of [nadia,raka,'Nadia','Raka','q-pu-4','summary-running']) assert.equal(serialized.includes(hidden),false);
});
test('Teacher summary access rejects other roles, unassigned and revoked subjects; empty data stays unknown', async () => {
  const {C,as} = fixture(); as('raka'); assert.throws(() => C.teacherSummary('pk'),/Sesi/);
  as('admin'); assert.throws(() => C.teacherSummary('pk'),/Sesi/);
  as('dimas'); assert.throws(() => C.teacherSummary('pu'),/penugasan/);
  C.db.jawaban_latihan=[]; C.db.hasil_tryout=[]; C.db.jawaban_siswa=[]; C.save();
  const empty=C.teacherSummary('pk'); assert.equal(empty.practice.accuracy,null); assert.equal(empty.tryout.average,null); assert.equal(empty.tryout.packages[0].average,null); assert.equal(empty.tryout.completed,0);
  as('admin'); const dimas=C.db.users.find(u => u.email.startsWith('dimas@')); await C.saveTeacher(dimas.id_user,{name:dimas.nama,email:dimas.email},[]);
  as('dimas'); assert.throws(() => C.teacherSummary('pk'),/penugasan/);
});

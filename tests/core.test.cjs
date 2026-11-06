// Run: node --test tests/core.test.cjs (Node 20+).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { webcrypto } = require('node:crypto');

function fixture() {
  let now = Date.now();
  class Clock extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } }
  const storage = () => { const map = new Map(); return { getItem: k => map.get(k) ?? null, setItem: (k, v) => map.set(k, String(v)), removeItem: k => map.delete(k) }; };
  const ctx = { crypto: webcrypto, TextEncoder, Date: Clock, localStorage: storage(), sessionStorage: storage(), btoa, atob, console };
  ctx.window = ctx; vm.createContext(ctx);
  for (const file of ['js/data.js', 'js/core.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), ctx, { filename: file });
  const C = ctx.CM;
  return { C, ctx, advance: ms => { now += ms; }, user: (id = 'usr-siswa-002') => ctx.sessionStorage.setItem(C.config.sessionKey, id), clearPending: () => { C.db.pembayaran.filter(p => p.status === 'Menunggu Pembayaran').forEach(p => C.cancel(p.id_pembayaran)); } };
}

test('Seed uses twelve tables, seven subtests, consistent tryout scores and usable local videos', () => {
  const { C } = fixture(); assert.equal(Object.keys(C.db).length, 12); assert.equal(C.subtests.length, 7);
  for (const s of C.subtests) { assert.equal(C.db.soal.filter(q => q.subtes === s.name).length, 10); assert.ok(C.db.materi.find(m => m.subtes === s.name && m.tipe === 'video').url_file.endsWith(`${s.id}.webm`)); }
  for (const r of C.db.hasil_tryout) { const n = C.db.jawaban_siswa.filter(a => a.id_hasil === r.id_hasil && a.is_benar).length; assert.equal(r.jumlah_benar, n); assert.equal(r.skor, Number((n / C.testQuestions(r.id_tryout).length * 100).toFixed(1))); }
});
test('Authentication checks role, hashes passwords, and rejects duplicate registration', async () => {
  const { C } = fixture(); await assert.rejects(C.login('admin@cendekiamuda.test', 'demo1234', 'siswa', false));
  await assert.rejects(C.login('raka@cendekiamuda.test', 'wrong', 'siswa', false));
  await C.login('raka@cendekiamuda.test', 'demo1234', 'siswa', true); assert.equal(C.user().nama, 'Raka Pratama');
  const data = { name: 'Siswa Uji', email: 'uji@example.test', phone: '08123456789', password: 'belajar123', confirm_password: 'belajar123', terms: 'on' };
  const u = await C.register(data); assert.notEqual(u.password, data.password); assert.equal(await C.verifyPassword(data.password, u.password), true); assert.equal(C.active(u.id_user), null); await assert.rejects(C.register(data));
});
test('Role and ownership guards reject unrelated payments, answers and results', () => {
  const { C, user } = fixture(); assert.equal(C.guard('/siswa/beranda'), '/auth/login'); user();
  assert.equal(C.guard('/admin/dashboard'), '/auth/admin-login'); assert.equal(C.guard('/siswa/bank-soal'), '/siswa/program'); assert.throws(() => C.paymentForUser('pay-1')); assert.throws(() => C.result('hasil-001'));
});
test('Practice stores every attempt while progress counts distinct active questions', () => {
  const { C, user } = fixture(); user(); const q = C.db.soal.find(q => q.is_gratis); C.practice(q.id_soal, q.jawaban_benar); C.practice(q.id_soal, 'B'); assert.equal(C.db.jawaban_latihan.filter(a => a.id_user === C.user().id_user).length, 2); assert.equal(C.progress(C.user().id_user, q.subtes).done, 1); assert.throws(() => C.practice('q-pu-10', 'A')); assert.throws(() => C.practice(q.id_soal, 'Z'));
});
test('Payment validates signature, enforces one pending order and handles duplicate callbacks once', async () => {
  const { C, user } = fixture(); user(); assert.throws(() => C.createPayment('prg-reguler', 'QRIS'));
  await assert.rejects(C.simulate('pay-2', 'Lunas', true)); assert.equal(C.paymentForUser('pay-2').status, 'Menunggu Pembayaran');
  await C.simulate('pay-2', 'Lunas'); const p = C.active(C.user().id_user); assert.equal(p.id_program, 'prg-reguler'); assert.equal(p.akses_video, false);
  C.sweep(); const count = C.db.notifikasi.length; const dates = JSON.stringify(C.db.pendaftaran); assert.equal((await C.simulate('pay-2', 'Lunas')).duplicate, true); assert.equal(C.db.notifikasi.length, count); assert.equal(JSON.stringify(C.db.pendaftaran), dates); await assert.rejects(C.simulate('pay-2', 'Gagal'));
});
test('Failed payment retries the same enrollment; canceled and expired payments create a new enrollment', async () => {
  const { C, user } = fixture(); user(); await C.simulate('pay-2', 'Gagal'); const p = C.createPayment('prg-reguler', 'E-Wallet', 'reg-menunggu'); assert.equal(p.id_pendaftaran, 'reg-menunggu'); C.cancel(p.id_pembayaran); assert.equal(C.db.pendaftaran.find(e => e.id_pendaftaran === p.id_pendaftaran).status, 'Dibatalkan'); assert.throws(() => C.createPayment('prg-reguler', 'QRIS', 'reg-menunggu')); const next = C.createPayment('prg-reguler', 'QRIS'); assert.notEqual(next.id_pendaftaran, p.id_pendaftaran);
});
test('Orders expire after 24 hours and late callbacks cannot activate access', async () => {
  const { C, user, clearPending, advance } = fixture(); user(); clearPending(); const p = C.createPayment('prg-reguler', 'QRIS'); advance(C.day + 1); C.sweep(); assert.equal(p.status, 'Kedaluwarsa'); assert.equal(C.active(C.user().id_user), null); await assert.rejects(C.simulate(p.id_pembayaran, 'Lunas'));
});
test('Full-price upgrade replaces the regular enrollment immediately', async () => {
  const { C, user } = fixture(); user(); await C.simulate('pay-2', 'Lunas'); const old = C.enrollment(C.user().id_user); const p = C.createPayment('prg-lengkap', 'QRIS'); assert.equal(p.jumlah, 170000); await C.simulate(p.id_pembayaran, 'Lunas'); assert.equal(old.status, 'Digantikan'); assert.equal(C.active(C.user().id_user).id_program, 'prg-lengkap'); assert.equal(C.daysLeft(C.user().id_user), 60);
});
test('Renewal is allowed from H-3, joins the previous end date and activates when due', async () => {
  const { C, user, advance } = fixture(); user(); await C.simulate('pay-2', 'Lunas'); const old = C.enrollment(C.user().id_user); assert.throws(() => C.createPayment('prg-reguler', 'QRIS')); advance(27 * C.day); const p = C.createPayment('prg-reguler', 'QRIS'); await C.simulate(p.id_pembayaran, 'Lunas'); const next = C.db.pendaftaran.find(e => e.id_pendaftaran === p.id_pendaftaran); assert.equal(next.tanggal_aktif, old.tanggal_berakhir); assert.equal(C.enrollment(C.user().id_user).id_pendaftaran, old.id_pendaftaran); assert.equal(C.purchaseRule(C.user().id_user, 'prg-lengkap').allowed, false); advance(3 * C.day); assert.equal(C.enrollment(C.user().id_user).id_pendaftaran, next.id_pendaftaran);
});
test('Renewal paid after expiry starts from payment time', async () => {
  const { C, user, advance } = fixture(); user(); await C.simulate('pay-2', 'Lunas'); advance(29.5 * C.day); const p = C.createPayment('prg-reguler', 'QRIS'); advance(.6 * C.day); await C.simulate(p.id_pembayaran, 'Lunas'); assert.equal(C.enrollment(C.user().id_user).tanggal_aktif, p.waktu_bayar);
});
test('Video requires the full program; expired access leaves progress and score history intact', () => {
  const { C, user, advance } = fixture(); user('usr-siswa-001'); const count = C.db.hasil_tryout.length; const done = C.progress(C.user().id_user).done; assert.equal(C.materialAccess(C.db.materi.find(m => m.tipe === 'video')), true); advance(43 * C.day); assert.equal(C.active(C.user().id_user), null); assert.equal(C.materialAccess(C.db.materi.find(m => m.tipe === 'video')), false); assert.equal(C.db.hasil_tryout.length, count); assert.equal(C.progress(C.user().id_user).done, done); assert.equal(C.guard('/siswa/nilai-progress'), '/siswa/nilai-progress'); assert.equal(C.guard('/siswa/tryout/review/hasil-001'), '/siswa/program');
});
test('Tryout release guard, one attempt, autosave, doubt flags and scoring work together', () => {
  const { C, user } = fixture(); user('usr-siswa-001'); assert.throws(() => C.startTest('to-004')); const r = C.startTest('to-003'), q = C.testQuestions(r.id_tryout)[0]; C.saveAnswer(r.id_hasil, q.id_soal, q.jawaban_benar); C.saveAnswer(r.id_hasil, q.id_soal, undefined, true); assert.equal(C.db.jawaban_siswa.filter(a => a.id_hasil === r.id_hasil).length, 1); assert.equal(C.db.jawaban_siswa.find(a => a.id_hasil === r.id_hasil).is_ragu, true); assert.throws(() => C.saveAnswer(r.id_hasil, 'q-pu-10', 'A')); C.submitTest(r.id_hasil); assert.equal(r.jumlah_benar, 1); assert.equal(r.skor, 4.8); assert.equal(C.startTest('to-003').id_hasil, r.id_hasil); assert.throws(() => C.saveAnswer(r.id_hasil, q.id_soal, 'B'));
});
test('Expired tryout auto-submits without being on the attempt route and cannot notify twice', () => {
  const { C, user, advance } = fixture(); user('usr-siswa-001'); const r = C.startTest('to-003'), q = C.testQuestions(r.id_tryout)[0]; C.saveAnswer(r.id_hasil, q.id_soal, q.jawaban_benar); advance(106 * 60000); C.sweep(); assert.equal(r.status, 'Selesai'); assert.equal(r.skor, 4.8); assert.equal(Date.parse(r.waktu_selesai) - Date.parse(r.waktu_mulai), 105 * 60000); const count = C.db.notifikasi.length; C.sweep(); assert.equal(C.db.notifikasi.length, count);
});

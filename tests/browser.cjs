// Optional browser QA: PLAYWRIGHT_MODULE=/path/to/playwright node tests/browser.cjs
// Screenshots and downloads are written to a temporary directory.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const os = require('node:os');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const out = process.env.QA_OUTPUT || path.join(os.tmpdir(), 'cendekia-qa');
fs.mkdirSync(out, { recursive: true });
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.webm': 'video/webm' };
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname === '/' ? '/index.html' : new URL(req.url, 'http://localhost').pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (error, data) => { res.writeHead(error ? 404 : 200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(error ? 'Not found' : data); });
});
const checks = [], errors = [];
let browser, base;
async function check(name, fn) { if (process.env.QA_CHECK && !name.includes(process.env.QA_CHECK)) return; try { await fn(); checks.push({ name, pass: true }); console.log('PASS', name); } catch (e) { checks.push({ name, pass: false, error: e.message }); console.error('FAIL', name, e.stack); } }
async function newPage(width = 1280, height = 900) { const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' }); page.on('pageerror', error => errors.push(error.message)); return page; }
async function route(page, url) { await page.goto(base + '/#' + url); await page.locator('h1').first().waitFor(); await page.waitForTimeout(80); assert.equal(await page.getByText('Halaman Belum Dapat Dibuka', { exact: true }).count(), 0); }
async function login(page, name) { const role = name === 'admin' ? 'admin' : ['maya','dimas'].includes(name) ? 'pengajar' : 'siswa'; await route(page, role === 'admin' ? '/auth/admin-login' : role === 'pengajar' ? '/auth/pengajar-login' : '/auth/login'); await page.locator('[name=email]').fill(name + '@cendekiamuda.test'); await page.locator('[name=password]').fill('demo1234'); await page.locator('form [type=submit]').click(); await page.waitForURL(role === 'admin' ? '**/#/admin/dashboard' : role === 'pengajar' ? '**/#/pengajar/dashboard' : '**/#/siswa/beranda'); await page.locator('.portal').waitFor(); }
async function layout(page, label) { const result = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, broken: [...document.images].filter(i => i.complete && !i.naturalWidth).map(i => i.getAttribute('src')) })); assert.ok(result.scroll <= result.width + 1, `${label}: overflow ${result.scroll} > ${result.width}`); assert.deepEqual(result.broken, [], `${label}: broken images`); }
async function shot(page, name) { await page.screenshot({ path: path.join(out, name + '.png'), fullPage: true }); }

async function demoVideos() {
  const lessons = [
    ['pu', 'Premis & Kesimpulan', ['Semua peserta rajin berlatih.\nNadia adalah peserta.', 'Hubungkan dua premis:\nNadia termasuk kelompok peserta.', 'Kesimpulan: Nadia rajin berlatih.\nGunakan informasi yang tersedia.']],
    ['ppu', 'Makna Kata dalam Konteks', ['"Air esensial bagi kehidupan."\nApa arti kata esensial?', 'Perhatikan konteks kalimat.\nAir merupakan kebutuhan utama.', 'Esensial berarti pokok atau penting.\nUji makna dengan mengganti katanya.']],
    ['pbm', 'Menyusun Kalimat Efektif', ['"Para siswa-siswa membaca buku."\nApakah kalimat ini sudah efektif?', 'Para sudah menunjukkan jamak.\nPengulangan siswa tidak diperlukan.', '"Para siswa membaca buku."\nHindari kata yang berlebihan.']],
    ['pk', 'Persentase & Diskon', ['Harga awal Rp100.000.\nDiskon 20%. Berapa harga akhirnya?', 'Besar diskon = 20/100 x 100.000\nBesar diskon = Rp20.000', 'Harga akhir = 100.000 - 20.000\nJadi, harga akhir Rp80.000.']],
    ['lbi', 'Menarik Simpulan dari Bacaan', ['Perpustakaan menambah jam buka.\nJumlah pengunjung kemudian meningkat.', 'Simpulan harus didukung bacaan.\nBedakan bukti dengan dugaan.', 'Kunjungan meningkat setelah\nperubahan jam operasional.']],
    ['lbe', 'Finding the Main Idea', ['Regular reading builds vocabulary.\nIt also improves understanding.', 'Find the idea that connects\nthe details in the passage.', 'Main idea: the benefits of reading.\nUse the whole passage as evidence.']],
    ['pm', 'Memodelkan Tarif Perjalanan', ['Tarif 3 km pertama Rp8.000.\nSetiap km tambahan Rp2.000.', 'Untuk 7 km, jarak tambahan = 7 - 3.\nBiaya tambahan = 4 x 2.000.', 'Total tarif = 8.000 + 8.000.\nBiaya perjalanan adalah Rp16.000.']],
  ];
  fs.mkdirSync(path.join(root, 'assets/video'), { recursive: true });
  await Promise.all(lessons.filter(([id]) => !fs.existsSync(path.join(root, 'assets/video', id + '.webm'))).map(async ([id, title, slides]) => {
    const page = await newPage(); await page.goto(base);
    const encoded = await page.evaluate(async ({ title, slides }) => {
      const canvas = document.createElement('canvas'); canvas.width = 960; canvas.height = 540;
      document.body.replaceChildren(canvas); const ctx = canvas.getContext('2d');
      const draw = (index, progress) => {
        ctx.fillStyle = '#F6F7FB'; ctx.fillRect(0, 0, 960, 540); ctx.fillStyle = '#1FA891'; ctx.fillRect(0, 0, 960, 12);
        ctx.font = 'bold 18px sans-serif'; ctx.fillStyle = '#167A6D'; ctx.fillText('CENDEKIA MUDA  /  PENGANTAR KONSEP', 56, 70);
        ctx.fillStyle = '#0F1B4D'; ctx.font = 'bold 33px sans-serif'; ctx.fillText(title, 56, 138);
        ctx.fillStyle = '#EDE7FF'; ctx.fillRect(56, 174, 848, 240); ctx.fillStyle = '#0F1B4D'; ctx.font = '27px sans-serif';
        slides[index].split('\n').forEach((line, i) => ctx.fillText(line, 86, 264 + i * 49));
        ctx.fillStyle = '#5B6478'; ctx.font = '18px sans-serif'; ctx.fillText(`LANGKAH ${index + 1} / 3`, 56, 472); ctx.fillText('Pahami konsep. Lanjutkan latihan.', 572, 472);
        ctx.fillStyle = '#E6E9F0'; ctx.fillRect(56, 504, 848, 5); ctx.fillStyle = '#1FA891'; ctx.fillRect(56, 504, 848 * progress, 5);
      };
      draw(0, 0); const stream = canvas.captureStream(12), recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8', videoBitsPerSecond: 450000 }), chunks = [];
      const stopped = new Promise(resolve => { recorder.ondataavailable = e => chunks.push(e.data); recorder.onstop = resolve; }); recorder.start();
      const start = performance.now(); await new Promise(resolve => { const timer = setInterval(() => { const elapsed = performance.now() - start; draw(Math.min(2, Math.floor(elapsed / 4000)), Math.min(1, elapsed / 12000)); if (elapsed >= 12000) { clearInterval(timer); recorder.stop(); stream.getTracks().forEach(t => t.stop()); resolve(); } }, 83); }); await stopped;
      const bytes = new Uint8Array(await new Blob(chunks, { type: 'video/webm' }).arrayBuffer()); let binary = ''; for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192)); return btoa(binary);
    }, { title, slides });
    fs.writeFileSync(path.join(root, 'assets/video', id + '.webm'), Buffer.from(encoded, 'base64')); console.log('MEDIA', id); await page.close();
  }));
}

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); base = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}) });
  await demoVideos();
  if (process.env.QA_CAPTURE_REFERENCES) {
    for (const [name, file] of [['landing', 'Landing Page Cendekia Muda.svg'], ['dashboard', 'Dashboard Siswa Cendekia Muda (Status Aktif).svg'], ['login', 'Halaman Login Cendekia Muda.svg']]) {
      const page = await newPage(); await page.setContent(`<body style="margin:0"><img style="width:1280px;display:block" src="${base}/foto%20svg/${encodeURIComponent(file)}"></body>`); await page.locator('img').evaluate(img => img.decode()); await shot(page, 'reference-' + name); await page.close();
    }
  }
  for (const width of [1280, 390]) {
    await check(`Public, student, teacher and admin routes at ${width}px`, async () => {
      const page = await newPage(width); const routes = ['/landing', '/auth/register', '/auth/login', '/auth/forgot-password', '/auth/admin-login', '/auth/pengajar-login'];
      for (const url of routes) { await route(page, url); await layout(page, url); if (['/landing', '/auth/login'].includes(url)) await shot(page, `${width}-${url.split('/').at(-1)}`); }
      await login(page, 'raka');
      for (const url of ['beranda', 'latihan-gratis', 'materi-preview', 'program', 'transaksi', 'nilai-progress', 'notifikasi', 'profil', 'pendamping']) { await route(page, '/siswa/' + url); await layout(page, 'gratis-' + url); if (url === 'beranda') await shot(page, `${width}-gratis`); }
      await login(page, 'nadia');
      for (const url of ['beranda', 'bank-soal', 'subtes/pu', 'materi-preview', 'video', 'program', 'transaksi', 'tryout', 'tryout/to-003', 'tryout/hasil/hasil-001', 'tryout/review/hasil-001', 'nilai-progress', 'notifikasi', 'profil', 'materi/mat-pu-intro', 'materi/mat-pu-video']) { await route(page, '/siswa/' + url); await layout(page, 'aktif-' + url); if (['beranda', 'bank-soal', 'nilai-progress', 'program'].includes(url)) await shot(page, `${width}-${url.replaceAll('/', '-')}`); }
      await login(page, 'admin');
      for (const url of ['dashboard', 'siswa', 'pengajar', 'pendamping', 'penugasan-pendamping', 'penugasan-pendamping/usr-siswa-001', 'profil', 'program', 'materi-soal', 'materi-soal/pu/soal', 'materi-soal/lbe/materi', 'tryout', 'akses-konten', 'transaksi']) { await route(page, '/admin/' + url); await layout(page, 'admin-' + url); if (['dashboard', 'materi-soal', 'materi-soal/pu/soal', 'materi-soal/lbe/materi'].includes(url)) await shot(page, `${width}-admin-${url.replaceAll('/', '-')}`); }
      await login(page, 'maya');
      const draftId = await page.evaluate(() => CM.db.tryout.find(t => t.status === 'Draft').id_tryout);
      for (const url of ['dashboard','materi-soal','materi-soal/pu/soal','materi-soal/ppu/materi','tryout','tryout/' + draftId,'hasil-belajar','hasil-belajar/pk','hasil-belajar/pu','profil']) { await route(page, '/pengajar/' + url); await layout(page, 'pengajar-' + url); if (['dashboard','tryout/' + draftId].includes(url)) await shot(page, `${width}-pengajar-${url.includes('/') ? 'tryout' : url}`); }
      await page.close();
    });
  }
  await check('Registration, free practice, reload, checkout, payment and upgrade', async () => {
    const page = await newPage(); await route(page, '/auth/register');
    for (const [name, value] of Object.entries({ name: 'Siswa Uji Browser', email: 'browser@example.test', phone: '081234567890', password: 'belajar123', confirm_password: 'belajar123' })) await page.locator(`[name=${name}]`).fill(value);
    await page.locator('[name=terms]').check(); await page.locator('form [type=submit]').click(); await page.waitForURL('**/#/siswa/beranda');
    await route(page, '/siswa/latihan-gratis'); await page.locator('[data-act=practice-start][data-sub=pu]').click(); await page.locator('[name=answer][value=A]').check(); await page.locator('form [type=submit]').click(); await page.locator('.answer-feedback').waitFor(); assert.equal(await page.locator('.answer-feedback .explanation').count(), 0);
    await page.reload(); await page.locator('.answer-feedback').waitFor(); assert.equal(await page.locator('form[data-form=practice] [type=submit]').count(), 0); await page.locator('[data-act=practice-next]').click(); assert.equal(await page.locator('.question-panel').innerText().then(t => t.includes('Soal 2 dari 3')), true);
    await route(page, '/siswa/checkout?program=prg-reguler'); await page.locator('[name=method][value=QRIS]').check(); await page.locator('form[data-form=checkout] [type=submit]').click(); await page.locator('[role=dialog]').waitFor(); await page.locator('[data-act=simulate][data-status=Lunas]:not([data-invalid])').click(); await page.waitForFunction(() => CM.active(CM.user().id_user)?.id_program === 'prg-reguler');
    await route(page, '/siswa/subtes/pu'); assert.ok(await page.getByText('Khusus Program Lengkap', { exact: false }).count());
    await route(page, '/siswa/checkout?program=prg-lengkap'); await page.locator('[name=method][value=QRIS]').check(); await page.locator('form[data-form=checkout] [type=submit]').click(); await page.locator('[role=dialog]').waitFor(); await page.locator('[data-act=simulate][data-status=Lunas]:not([data-invalid])').click(); await page.waitForFunction(() => CM.active(CM.user().id_user)?.akses_video === true);
    assert.equal(await page.evaluate(() => CM.db.pendaftaran.filter(e => e.id_user === CM.user().id_user && e.status === 'Digantikan').length), 1);
    await route(page, '/siswa/materi/mat-pu-video'); await page.locator('video').evaluate(v => v.play()); await page.waitForFunction(() => document.querySelector('video').currentTime > 0); await shot(page, 'video-playing'); await page.close();
  });
  await check('Tryout autosave, resume, doubt flag, review and one-attempt restriction', async () => {
    const page = await newPage(390); await login(page, 'nadia'); await route(page, '/siswa/tryout/to-003'); await page.locator('[data-act=start-test]').click(); await page.locator('[name=test-answer]').first().check(); await page.locator('[data-act=doubt]').click(); await page.reload(); await page.locator('[name=test-answer]:checked').waitFor(); assert.equal(await page.locator('[data-act=doubt]').getAttribute('aria-pressed'), 'true'); await layout(page, 'mobile-exam'); await shot(page, '390-exam');
    await page.locator('[data-act=submit-test]').first().click(); await page.locator('[data-act=submit-confirm]').click(); await page.waitForURL('**/tryout/hasil/**'); await page.getByRole('link', { name: 'Buka Review & Pembahasan' }).click(); await page.locator('.review-question').first().waitFor(); assert.equal(await page.locator('.review-question').count(), 21);
    await route(page, '/siswa/tryout/to-003'); assert.equal(await page.locator('[data-act=start-test]').count(), 0); await page.close();
  });
  await check('Actual PDF download and admin CSV export with read-only payment details', async () => {
    const page = await newPage(); await login(page, 'nadia'); await route(page, '/siswa/materi/mat-pu-pdf'); const pdf = page.waitForEvent('download'); await page.locator('[data-act=download]').first().click(); const file = await pdf; await file.saveAs(path.join(out, 'module.pdf')); assert.ok(fs.readFileSync(path.join(out, 'module.pdf')).subarray(0, 8).toString().startsWith('%PDF-1.4'));
    await login(page, 'admin'); const csv = page.waitForEvent('download'); await page.locator('[data-act=export]').click(); await (await csv).saveAs(path.join(out, 'transactions.csv')); assert.ok(fs.readFileSync(path.join(out, 'transactions.csv'), 'utf8').includes('CM-DEMO-001'));
    await page.locator('[data-act=payment]').first().click(); assert.equal(await page.locator('[data-act=simulate]').count(), 0); await page.close();
  });
  await check('Admin editing persists and preserves data history', async () => {
    const page = await newPage(); await login(page, 'admin'); await route(page, '/admin/program'); await page.locator('[data-act=editor][data-type=program]').first().click(); await page.locator('.dialog [name=description]').fill('Deskripsi program diperbarui untuk uji.'); await page.locator('.dialog [type=submit]').click(); await page.locator('.dialog').waitFor({ state: 'detached' }); assert.ok(await page.getByText('Deskripsi program diperbarui untuk uji.', { exact: true }).count());
    await route(page, '/admin/siswa'); const rowCount = await page.locator('tbody tr').count(); await page.locator('[data-act=toggle][data-type=student]').first().click(); assert.equal(await page.locator('tbody tr').count(), rowCount); assert.equal(await page.evaluate(() => CM.db.users.filter(u => u.role === 'siswa' && !u.is_aktif).length), 1); await page.close();
  });
  await check('Drilling resumes at the next unanswered question and historical review adds no attempt', async () => {
    const page = await newPage(); await login(page, 'nadia'); await route(page, '/siswa/bank-soal'); await page.locator('[data-act=practice-start][data-sub=pu]').click();
    const first = await page.locator('form[data-form=practice]').getAttribute('data-question'); await page.locator('[name=answer][value=A]').check(); await page.locator('form [type=submit]').click(); await page.locator('.answer-feedback').waitFor();
    await route(page, '/siswa/bank-soal'); await page.locator('[data-act=practice-start][data-sub=pu]').click(); assert.notEqual(await page.locator('form[data-form=practice]').getAttribute('data-question'), first);
    await route(page, '/siswa/beranda'); const count = await page.evaluate(() => CM.db.jawaban_latihan.length); await page.locator('a[href*="/siswa/latihan/review/"]').first().click(); await page.locator('.review-question').waitFor(); assert.equal(await page.evaluate(() => CM.db.jawaban_latihan.length), count); assert.equal(await page.locator('form[data-form=practice]').count(), 0); await page.close();
  });
  await check('Account recovery, profile edits and password change', async () => {
    const page = await newPage(); await route(page, '/auth/forgot-password'); await page.locator('[name=email]').fill('raka@cendekiamuda.test'); await page.locator('form [type=submit]').click(); await page.locator('.reset-link a').click(); await page.locator('[name=password]').fill('pemulihan123'); await page.locator('[name=confirm_password]').fill('pemulihan123'); await page.locator('form [type=submit]').click(); await page.waitForURL('**/#/auth/login');
    await page.locator('[name=email]').fill('raka@cendekiamuda.test'); await page.locator('[name=password]').fill('pemulihan123'); await page.locator('form [type=submit]').click(); await page.waitForURL('**/#/siswa/beranda'); await route(page, '/siswa/profil'); await page.locator('[name=school]').fill('SMA Pengujian'); await page.locator('form [type=submit]').click(); await page.waitForFunction(() => CM.user().asal_sekolah === 'SMA Pengujian');
    await page.locator('[data-act=profile-tab][data-value=password]').click(); await page.locator('[name=current_password]').fill('pemulihan123'); await page.locator('[name=new_password]').fill('passwordbaru123'); await page.locator('[name=confirm_password]').fill('passwordbaru123'); await page.locator('form [type=submit]').click(); await page.locator('.success-message').waitFor(); assert.equal(await page.evaluate(() => CM.verifyPassword('passwordbaru123', CM.user().password)), true); await page.close();
  });
  await check('Admin creates question, material, student and scheduled tryout from the bank', async () => {
    const page = await newPage(); await login(page, 'admin'); await route(page, '/admin/materi-soal/pu/soal'); await page.locator('[data-act=editor][data-type=question]').first().click();
    for (const [name, value] of Object.entries({ question: 'Soal tambahan pengujian: 2 + 3 = ...', option_a: '5', option_b: '6', option_c: '7', option_d: '8', option_e: '9', explanation: 'Dua ditambah tiga sama dengan lima.' })) await page.locator(`.dialog [name=${name}]`).fill(value);
    await page.locator('.dialog [type=submit]').click(); await page.locator('.dialog').waitFor({ state: 'detached' }); assert.equal(await page.evaluate(() => CM.db.soal.length), 71);
    await page.locator('.admin-content-tabs a[href$="/materi"]').click(); await page.locator('[data-act=editor][data-type=material]').first().click(); await page.locator('.dialog [name=title]').fill('Materi Tambahan'); await page.locator('.dialog [name=url]').fill('assets/video/pu.webm'); await page.locator('.dialog [name=type]').selectOption('video'); await page.locator('.dialog [type=submit]').click(); await page.locator('.dialog').waitFor({ state: 'detached' }); assert.equal(await page.evaluate(() => CM.db.materi.length), 22);
    await route(page, '/admin/siswa'); await page.locator('[data-act=editor][data-type=student]').first().click(); for (const [name, value] of Object.entries({ name: 'Siswa Admin Uji', email: 'admin-created@example.test', phone: '081234567890', password: 'belajar123' })) await page.locator(`.dialog [name=${name}]`).fill(value); await page.locator('.dialog [type=submit]').click(); await page.locator('.dialog').waitFor({ state: 'detached' }); assert.equal(await page.evaluate(() => CM.db.users.filter(u => u.role === 'siswa').length), 3);
    await route(page, '/admin/tryout'); await page.locator('[data-act=editor][data-type=tryout]').first().click(); await page.locator('.dialog [name=title]').fill('Tryout Terjadwal Uji'); await page.locator('.dialog [name=release]').fill('2099-01-10T08:00'); await page.locator('.dialog [type=submit]').click(); await page.locator('.dialog').waitFor({ state:'detached' }); await page.locator('.tryout-subject-list').waitFor();
    for (const subject of await page.evaluate(() => CM.subtests.map(s => s.id))) { await page.locator(`[data-act=tryout-pick][data-sub=${subject}]`).click(); await page.locator('.dialog [name=questions]').first().check(); await page.locator('.dialog [type=submit]').click(); await page.locator('.dialog').waitFor({state:'detached'}); }
    await page.locator('[data-act=release-check]').click(); await page.locator('[data-act=release-confirm]').click(); await page.locator('.dialog').waitFor({state:'detached'});
    const id = await page.evaluate(() => CM.db.tryout.at(-1).id_tryout); assert.equal(await page.evaluate(() => CM.db.tryout.at(-1).status),'Rilis'); await login(page,'nadia'); await route(page,'/siswa/tryout/' + id); assert.ok(page.url().endsWith('/siswa/tryout')); await page.close();
  });
  await check('Admin subtest catalog, filters, previews and contextual forms', async () => {
    const page = await newPage(); await login(page, 'admin'); await route(page, '/admin/materi-soal');
    assert.equal(await page.locator('.admin-subject-card').count(), 7);
    assert.equal(await page.locator('.admin-subject-group').count(), 2);
    for (const subject of await page.evaluate(() => CM.subtests)) {
      const card = page.locator(`[data-subject="${subject.id}"]`);
      assert.equal(await card.locator('.admin-subject-counts strong').allTextContents().then(v => v.join(',')), '10,3');
    }
    await page.getByRole('link', { name: 'Kelola Literasi Bahasa Inggris', exact: true }).click();
    await page.waitForURL('**/#/admin/materi-soal/lbe/soal');
    await page.locator('.admin-content-tabs a[aria-current=page][href="#/admin/materi-soal/lbe/soal"]').waitFor();
    assert.equal(await page.locator('[data-question-id]').count(), 10);
    assert.ok((await page.locator('[data-question-id]').evaluateAll(rows => rows.map(row => row.dataset.questionId))).every(id => id.startsWith('q-lbe-')));
    assert.ok(await page.locator('.sidebar a[href="#/admin/materi-soal"]').getAttribute('aria-current'));
    await page.getByRole('button', { name: 'Tambah Soal', exact: true }).click();
    assert.equal(await page.locator('.dialog [name=subject]').inputValue(), 'Literasi Bahasa Inggris');
    await page.getByRole('button', { name: 'Batal', exact: true }).click();
    await page.locator('[data-filter=kesulitan]').selectOption('Sulit');
    assert.equal(await page.locator('[data-question-id]').count(), 3);
    await page.locator('[data-filter=akses]').selectOption('gratis');
    assert.equal(await page.locator('[data-question-id]').count(), 0);
    await page.getByRole('button', { name: 'Reset filter', exact: true }).click();
    await page.locator('[data-filter=status]').selectOption('aktif');
    await page.locator('[data-question-id=q-lbe-4] [data-act=question-preview]').click();
    assert.equal(await page.locator('.admin-preview-options li').count(), 5);
    assert.equal(await page.locator('.admin-preview-options li.correct').count(), 1);
    assert.ok(await page.locator('.admin-preview-explanation').textContent());
    await page.getByRole('button', { name: 'Ubah Soal', exact: true }).click();
    assert.equal(await page.locator('.dialog [name=subject]').inputValue(), 'Literasi Bahasa Inggris');
    const updated = 'QA preview LBE: pertanyaan yang diperbarui melalui pratinjau.';
    await page.locator('.dialog [name=question]').fill(updated);
    await page.locator('.dialog [type=submit]').click(); await page.locator('.dialog').waitFor({ state: 'detached' });
    assert.equal(await page.locator('[data-filter=status]').inputValue(), 'aktif');
    assert.equal(await page.locator('[data-question-id=q-lbe-4] .question-excerpt').textContent(), updated);
    await page.locator('[data-question-id=q-lbe-4] summary').click();
    await page.locator('[data-question-id=q-lbe-4] [data-type=question-access]').click();
    await page.waitForFunction(() => document.querySelector('[data-question-id=q-lbe-4] [data-label=Akses]')?.textContent === 'Gratis');
    assert.equal(await page.locator('[data-question-id=q-lbe-4] [data-label=Akses]').textContent(), 'Gratis');
    await page.locator('.admin-content-tabs a[href$="/materi"]').click();
    await page.locator('[data-material-id]').first().waitFor();
    assert.equal(await page.locator('[data-material-id]').count(), 3);
    await page.getByRole('button', { name: 'Tambah Materi', exact: true }).click();
    assert.equal(await page.locator('.dialog [name=subject]').inputValue(), 'Literasi Bahasa Inggris');
    await page.getByRole('button', { name: 'Batal', exact: true }).click();
    await page.locator('[data-filter=tipe]').selectOption('video');
    assert.equal(await page.locator('[data-material-id]').count(), 1);
    await page.locator('.admin-content-tabs a[href$="/soal"]').click();
    await page.locator('.admin-content-tabs a[aria-current=page][href="#/admin/materi-soal/lbe/soal"]').waitFor();
    assert.equal(await page.locator('[data-filter=status]').inputValue(), 'aktif');
    await page.locator('[data-admin-subject]').selectOption('pu');
    await page.waitForURL('**/#/admin/materi-soal/pu/soal');
    await page.locator('.admin-content-tabs a[aria-current=page][href="#/admin/materi-soal/pu/soal"]').waitFor();
    assert.equal(await page.locator('[data-filter=status]').inputValue(), '');
    await page.getByRole('link', { name: 'Semua Subtes', exact: true }).click();
    await page.locator('.admin-catalog-search input').waitFor();
    await page.locator('[data-filter=search]').fill('QA preview LBE');
    assert.equal(await page.locator('[data-question-id]').count(), 1);
    assert.equal(await page.locator('[data-question-id]').getAttribute('data-question-id'), 'q-lbe-4');
    // Search by an actual title, independent of seed wording.
    const title = await page.evaluate(() => CM.db.materi.find(m => m.subtes === 'Literasi Bahasa Inggris' && m.tipe === 'video').judul);
    await page.locator('[data-filter=search]').fill(title);
    assert.equal(await page.locator('[data-material-id]').count(), 1);
    await page.locator('[data-filter=search]').fill('<script>missing</script>');
    assert.equal(await page.locator('[data-question-id], [data-material-id]').count(), 0);
    assert.ok((await page.locator('.admin-search-summary').textContent()).includes('<script>missing</script>'));
    await route(page, '/admin/materi-soal/lbe/soal');
    await page.getByRole('button', { name: 'Tambah Soal', exact: true }).click();
    for (const [name, value] of Object.entries({ question: 'QA konteks LBE <b>teks biasa</b>', option_a: 'A', option_b: 'B', option_c: 'C', option_d: 'D', option_e: 'E', explanation: 'Pembahasan LBE.' })) await page.locator(`.dialog [name=${name}]`).fill(value);
    await page.locator('.dialog [type=submit]').click(); await page.locator('.dialog').waitFor({ state: 'detached' });
    assert.equal(await page.evaluate(() => CM.db.soal.at(-1).subtes), 'Literasi Bahasa Inggris');
    await page.locator('[data-filter=search]').fill('QA konteks LBE');
    assert.equal(await page.locator('.admin-question-link b').count(), 0);
    await page.locator('[data-question-id] summary').click();
    await page.getByRole('button', { name: 'Nonaktifkan', exact: true }).click();
    await page.locator('[data-question-id]').waitFor({state:'detached'});
    assert.equal(await page.locator('[data-question-id]').count(), 0); // Active filter is retained.
    await page.locator('[data-filter=status]').selectOption('nonaktif');
    assert.equal(await page.locator('[data-question-id]').count(), 1);
    assert.equal(await page.evaluate(() => CM.db.soal.at(-1).is_aktif), false);
    await page.locator('.admin-content-tabs a[href$="/materi"]').click();
    await page.getByRole('button', { name: 'Tambah Materi', exact: true }).click();
    await page.locator('.dialog [name=title]').fill('Materi QA LBE');
    await page.locator('.dialog [name=url]').fill('assets/video/lbe.webm');
    await page.locator('.dialog [name=type]').selectOption('video');
    await page.locator('.dialog [type=submit]').click(); await page.locator('.dialog').waitFor({ state: 'detached' });
    assert.equal(await page.evaluate(() => CM.db.materi.at(-1).subtes), 'Literasi Bahasa Inggris');
    await route(page, '/admin/materi-soal/tidak-ada/soal');
    assert.equal(await page.locator('h1').textContent(), 'Subtes Tidak Ditemukan');
    await login(page, 'raka'); await route(page, '/admin/materi-soal/lbe/soal');
    assert.ok(page.url().endsWith('/siswa/beranda'));
    await page.close();
  });
  await check('Admin pagination survives editing, tab changes and filters in other subtests', async () => {
    const page = await newPage(); await login(page, 'admin');
    await page.evaluate(() => {
      const sample = CM.db.soal.find(q => q.id_soal === 'q-pu-1');
      for (let i = 0; i < 95; i++) CM.db.soal.push({ ...sample, id_soal: `qa-pu-${i}`, pertanyaan: `Pertanyaan tambahan ${i}` });
      CM.save();
    });
    await route(page, '/admin/materi-soal/pu/soal');
    assert.ok(await page.locator('.page-number').count() <= 5);
    await page.getByRole('button', { name: 'Halaman 2', exact: true }).click();
    const row = page.locator('[data-question-id]').first(), id = await row.getAttribute('data-question-id');
    await row.getByRole('button', { name: 'Ubah', exact: true }).click();
    await page.locator('.dialog [name=question]').fill('Soal halaman kedua setelah diubah.');
    await page.locator('.dialog [type=submit]').click(); await page.locator('.dialog').waitFor({ state: 'detached' });
    assert.equal(await page.locator('.pagination [aria-current=page]').textContent(), '2');
    assert.equal(await page.locator('[data-question-id]').first().getAttribute('data-question-id'), id);
    await page.locator('.admin-content-tabs a[href$="/materi"]').click();
    await page.locator('[data-filter=tipe]').selectOption('video');
    await page.locator('.admin-content-tabs a[href$="/soal"]').click();
    await page.locator('[data-question-id]').first().waitFor();
    assert.equal(await page.locator('.pagination [aria-current=page]').textContent(), '2');
    await page.locator('[data-admin-subject]').selectOption('ppu');
    await page.waitForURL('**/#/admin/materi-soal/ppu/soal');
    await page.locator('.admin-content-tabs a[aria-current=page][href="#/admin/materi-soal/ppu/soal"]').waitFor();
    await page.locator('[data-filter=kesulitan]').selectOption('Mudah');
    await page.locator('[data-admin-subject]').selectOption('pu');
    await page.waitForURL('**/#/admin/materi-soal/pu/soal');
    await page.locator('.admin-content-tabs a[aria-current=page][href="#/admin/materi-soal/pu/soal"]').waitFor();
    assert.equal(await page.locator('.pagination [aria-current=page]').textContent(), '2');
    await page.locator('.admin-content-tabs a[href$="/materi"]').click();
    await page.locator('[data-filter=tipe]').waitFor();
    assert.equal(await page.locator('[data-filter=tipe]').inputValue(), 'video');
    await page.reload(); await page.locator('[data-material-id]').first().waitFor();
    assert.ok(page.url().endsWith('/admin/materi-soal/pu/materi'));
    await page.close();
  });
  await check('Admin mobile catalog and complete question preview fit the screen', async () => {
    const page = await newPage(390); await login(page, 'admin'); await route(page, '/admin/materi-soal');
    await page.getByRole('link', { name: 'Kelola Penalaran Umum', exact: true }).click();
    await page.locator('[data-question-id]').first().waitFor(); await layout(page, 'mobile-admin-subtest');
    await page.screenshot({ path: path.join(out, '390-admin-bank-soal.png'), fullPage: false });
    await page.locator('[data-act=question-preview]').first().click();
    await page.locator('.admin-question-preview').waitFor(); await layout(page, 'mobile-admin-preview');
    assert.ok(await page.locator('.dialog').evaluate(el => el.scrollWidth <= el.clientWidth + 1));
    await page.screenshot({ path: path.join(out, '390-admin-question-preview.png'), fullPage: false }); await page.keyboard.press('Escape');
    await page.locator('.dialog').waitFor({ state: 'detached' });
    assert.equal(await page.evaluate(() => document.activeElement.dataset.act), 'question-preview');
    await page.close();
  });
  await check('Mobile menu, notifications, skip link and automatic expiry refresh', async () => {
    const page = await newPage(390); await login(page, 'nadia'); await page.locator('[data-act=menu]').click(); await page.locator('.sidebar-scrim').click({position:{x:380,y:450}}); await page.locator('.sidebar-scrim').waitFor({state:'detached'}); await page.locator('[data-act=popover][data-value=notifications]').click(); await page.locator('.popover-footer').click(); await page.locator('[data-act=read-all]').click(); assert.equal(await page.evaluate(() => CM.db.notifikasi.filter(n => n.id_user === CM.user().id_user && !n.sudah_dibaca).length), 0);
    await route(page, '/siswa/beranda'); await page.locator('.skip-link').focus(); await page.keyboard.press('Enter'); assert.equal(await page.evaluate(() => document.activeElement.id), 'main-content');
    await page.evaluate(() => { CM.enrollment(CM.user().id_user).tanggal_berakhir = new Date(Date.now() + 500).toISOString(); CM.save(); }); await page.waitForFunction(() => document.querySelector('.upgrade-banner') !== null, { timeout: 5000 }); assert.equal(await page.evaluate(() => CM.db.hasil_tryout.length), 2); await page.close();
  });
  await check('Teacher scoped catalog, content creation, immediate student access and forbidden subtest', async () => {
    const page = await newPage(); await login(page,'maya'); await route(page,'/pengajar/materi-soal');
    assert.equal(await page.locator('.admin-subject-card').count(),2);
    await route(page,'/pengajar/materi-soal/pk/soal'); assert.equal(await page.locator('h1').textContent(),'Subtes Tidak Ditugaskan');
    await route(page,'/pengajar/materi-soal/pu/soal'); await page.getByRole('button',{name:'Tambah Soal',exact:true}).click();
    assert.equal(await page.locator('.dialog [name=subject] option').count(),2);
    for (const [name,value] of Object.entries({question:'Soal Guru Maya Baru',option_a:'Pilihan A',option_b:'Pilihan B',option_c:'Pilihan C',option_d:'Pilihan D',option_e:'Pilihan E',explanation:'Pembahasan dari pengajar.'})) await page.locator(`.dialog [name=${name}]`).fill(value);
    await page.locator('.dialog [name=free]').check(); await page.locator('.dialog [type=submit]').click(); await page.locator('.dialog').waitFor({state:'detached'});
    const id = await page.evaluate(() => CM.db.soal.at(-1).id_soal); assert.equal(await page.evaluate(() => CM.db.soal.at(-1).id_subtes),'pu');
    await page.locator('[data-filter=search]').fill('Soal Guru Maya Baru'); assert.equal(await page.locator('[data-question-id]').count(),1);
    await login(page,'raka'); await route(page,'/siswa/latihan-gratis?question=' + id); assert.ok((await page.locator('.question-panel').textContent()).includes('Soal Guru Maya Baru'));
    await page.locator('[name=answer][value=A]').check(); await page.locator('form[data-form=practice] [type=submit]').click(); await page.locator('.answer-feedback').waitFor();
    await login(page,'maya'); await route(page,'/pengajar/materi-soal/pu/soal'); await page.locator('[data-filter=search]').fill('Soal Guru Maya Baru'); await page.locator('[data-question-id] summary').click();
    assert.equal(await page.locator('[data-act=content-delete]').count(),0); assert.equal(await page.locator('[data-act=question-copy]').count(),1);
    await page.close();
  });
  await check('Admin assigns teacher multiple subtests, revokes access and saves staff profile', async () => {
    const page = await newPage(390); await login(page,'admin'); await route(page,'/admin/pengajar');
    const row = page.locator('tr',{hasText:'Maya Lestari'}); await row.locator('[data-type=teacher][data-act=editor]').click();
    await page.locator('.dialog [name=subjects][value=pbm]').check(); await page.locator('.dialog [type=submit]').click(); await page.locator('.dialog').waitFor({state:'detached'}); await layout(page,'admin-teachers-mobile'); await shot(page,'390-admin-pengajar');
    await login(page,'maya'); await route(page,'/pengajar/materi-soal'); assert.equal(await page.locator('.admin-subject-card').count(),3);
    await page.locator('.profile-button').click(); await page.locator('.profile-popover a[href="#/pengajar/profil"]').click(); await page.locator('[name=phone]').fill('081234567890'); await page.locator('form [type=submit]').click(); await page.waitForFunction(() => CM.user().no_hp === '081234567890');
    await login(page,'admin'); await route(page,'/admin/pengajar'); await page.locator('tr',{hasText:'Maya Lestari'}).locator('[data-act=editor]').click();
    for (const checkbox of await page.locator('.dialog [name=subjects]').all()) await checkbox.uncheck();
    await page.locator('.dialog [type=submit]').click(); await page.locator('.dialog').waitFor({state:'detached'});
    await login(page,'maya'); await route(page,'/pengajar/materi-soal'); assert.equal(await page.locator('.admin-subject-card').count(),0); assert.ok(await page.getByText('Belum ada subtes yang ditugaskan',{exact:true}).count());
    await page.close();
  });
  await check('Shared tryout collaboration by two teachers, read-only subtests and admin release', async () => {
    const page = await newPage(); await login(page,'maya');
    const id = await page.evaluate(() => CM.db.tryout.find(t => t.status === 'Draft').id_tryout);
    await route(page,'/pengajar/tryout/' + id); assert.equal(await page.locator('[data-tryout-sub]').count(),7); assert.equal(await page.locator('[data-act=tryout-pick]').count(),2); assert.equal(await page.locator('[data-act=release-check]').count(),0);
    await page.locator('[data-act=tryout-pick][data-sub=pu]').click(); await page.locator('[name=questions][value=q-pu-4]').check(); await page.locator('[name=questions][value=q-pu-5]').check(); await page.locator('[data-pick-id=q-pu-5] [data-step="-1"]').click();
    await page.locator('.dialog [type=submit]').click(); await page.locator('.dialog').waitFor({state:'detached'});
    await login(page,'dimas'); await route(page,'/pengajar/tryout/' + id); await page.locator('[data-act=tryout-pick][data-sub=pk]').click(); await page.locator('[name=questions][value=q-pk-4]').check(); await page.locator('.dialog [type=submit]').click(); await page.locator('.dialog').waitFor({state:'detached'});
    assert.deepEqual(await page.evaluate(id => CM.testQuestions(id).map(q => q.id_soal),id),['q-pu-5','q-pu-4','q-pk-4']);
    await page.locator('[data-tryout-sub=pu] [data-act=tryout-preview]').first().click(); assert.equal(await page.locator('.dialog [data-act=editor], .dialog [data-act=question-copy]').count(),0); await page.keyboard.press('Escape');
    await login(page,'admin'); await route(page,'/admin/tryout/' + id); await page.locator('[data-act=release-check]').click(); assert.equal(await page.locator('[data-act=release-confirm]').isDisabled(),true); await page.keyboard.press('Escape');
    await page.locator('[data-type=tryout][data-act=editor]').click(); await page.locator('.dialog [name=release]').fill('2020-01-01T08:00'); await page.locator('.dialog [type=submit]').click(); await page.locator('.dialog').waitFor({state:'detached'});
    for (const subject of ['ppu','pbm','lbi','lbe','pm']) { await page.locator(`[data-act=tryout-pick][data-sub=${subject}]`).click(); await page.locator(`[name=questions][value=q-${subject}-4]`).check(); await page.locator('.dialog [type=submit]').click(); await page.locator('.dialog').waitFor({state:'detached'}); }
    await page.locator('[data-act=release-check]').click(); await page.locator('[data-act=release-confirm]').click(); await page.locator('.dialog').waitFor({state:'detached'});
    await login(page,'maya'); await route(page,'/pengajar/tryout/' + id); assert.equal(await page.locator('[data-act=tryout-pick]').count(),0);
    await login(page,'nadia'); await route(page,'/siswa/tryout/' + id); await page.locator('[data-act=start-test]').click(); await page.locator('[name=test-answer]').first().waitFor(); await page.close();
  });
  await check('Mentor contact CRUD, assignment history and active student WhatsApp access', async () => {
    const page = await newPage(); await login(page,'admin'); await route(page,'/admin/pendamping'); await page.locator('[data-act=editor][data-type=mentor]').first().click();
    await page.locator('.dialog [name=name]').fill('Pendamping Pengujian'); await page.locator('.dialog [name=phone]').fill('081234567890'); await page.locator('.dialog [type=submit]').click(); await page.locator('.dialog').waitFor({state:'detached'});
    const mid = await page.evaluate(() => CM.db.pendamping.at(-1).id_pendamping);
    await route(page,'/admin/penugasan-pendamping/usr-siswa-001'); await page.locator('[data-act=mentor-assign][data-sub=pu]').click(); await page.locator('.dialog [name=mentor]').selectOption(mid); await page.locator('.dialog [type=submit]').click(); await page.locator('.dialog').waitFor({state:'detached'});
    assert.equal(await page.evaluate(() => CM.db.siswa_pendamping.filter(a => a.id_siswa === 'usr-siswa-001' && a.id_subtes === 'pu' && !!a.berakhir_pada).length),1);
    await login(page,'nadia'); await route(page,'/siswa/pendamping'); const href = await page.locator('[data-mentor-sub=pu] a').getAttribute('href'); assert.ok(href.startsWith('https://wa.me/6281234567890?'));
    await shot(page,'1280-pendamping-siswa'); await page.setViewportSize({width:390,height:900}); await layout(page,'student-mentors-mobile'); await shot(page,'390-pendamping-siswa');
    await login(page,'raka'); await route(page,'/siswa/pendamping'); assert.equal(await page.locator('a[href*="wa.me/6281234567890"]').count(),0);
    await login(page,'admin'); await route(page,'/admin/pendamping'); await page.locator(`[data-act=manage-toggle][data-id="${mid}"]`).click(); await page.waitForFunction(id => !CM.db.pendamping.find(m => m.id_pendamping === id).is_aktif,mid);
    await login(page,'nadia'); await route(page,'/siswa/pendamping'); assert.equal(await page.locator('[data-mentor-sub=pu] a').count(),0); assert.ok(await page.getByText('Pendamping tidak aktif',{exact:true}).count()); await page.close();
  });
  await check('Video upload persists across reload, supports playback, and rejects invalid files', async () => {
    const page = await newPage(); await login(page,'maya'); await route(page,'/pengajar/materi-soal/pu/materi'); await page.locator('[data-act=editor][data-type=material]').first().click();
    await page.locator('.dialog [name=title]').fill('Video Unggahan Pengajar'); await page.locator('.dialog [name=type]').selectOption('video'); await page.locator('.dialog [name=source]').selectOption('unggah');
    await page.locator('.dialog [name=free]').uncheck();
    await page.locator('.dialog [name=file]').setInputFiles({name:'invalid.webm',mimeType:'video/webm',buffer:Buffer.from('not a video')}); await page.locator('.dialog [type=submit]').click(); await page.locator('.dialog .form-message:not([hidden])').waitFor(); assert.ok((await page.locator('.dialog .form-message').textContent()).includes('tidak cocok'));
    await page.locator('.dialog [name=file]').setInputFiles(path.join(root,'assets/video/pu.webm')); await layout(page,'upload-form'); await shot(page,'1280-pengajar-upload'); await page.locator('.dialog [type=submit]').click(); await page.locator('.dialog').waitFor({state:'detached'});
    const id = await page.evaluate(() => CM.db.materi.at(-1).id_materi); assert.equal(await page.evaluate(() => CM.db.materi.at(-1).sumber),'unggah'); assert.equal(await page.evaluate(() => CM.db.materi.at(-1).url_file),null);
    await login(page,'nadia'); await route(page,'/siswa/materi/' + id); await page.locator('video').waitFor(); await page.locator('video').evaluate(v => v.play()); await page.waitForFunction(() => document.querySelector('video').currentTime > 0);
    await page.reload(); await page.locator('video').waitFor(); await page.locator('video').evaluate(v => v.play()); await page.waitForFunction(() => document.querySelector('video').currentTime > 0);
    await page.evaluate(() => { CM.enrollment(CM.user().id_user).id_program='prg-reguler'; CM.save(); }); await page.reload(); await page.getByRole('heading',{name:'Akses Materi Terkunci',exact:true}).waitFor(); assert.equal(await page.locator('video').count(),0);
    await login(page,'maya'); await route(page,'/pengajar/materi-soal/pu/materi'); await page.locator('[data-act=editor][data-type=material]').first().click(); await page.locator('.dialog [name=title]').fill('Video Tautan Pengajar'); await page.locator('.dialog [name=type]').selectOption('video'); await page.locator('.dialog [name=url]').fill('https://youtu.be/dQw4w9WgXcQ'); await page.locator('.dialog [type=submit]').click(); await page.locator('.dialog').waitFor({state:'detached'});
    assert.equal(await page.evaluate(() => CM.videoSource(CM.db.materi.at(-1).url_file).url),'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'); await page.close();
  });
  await check('Profile dropdown routes payments and password; notification dropdown remains accessible', async () => {
    const page = await newPage(390); await login(page,'raka');
    for (const item of ['profil','notifikasi','transaksi']) assert.equal(await page.locator(`.sidebar a[href="#/siswa/${item}"]`).count(),0);
    assert.equal(await page.locator('.sidebar').getByRole('link',{name:'Daftar Program',exact:true}).count(),1);
    await page.locator('.profile-button').click(); await page.locator('.profile-popover a[href="#/siswa/transaksi"]').click(); await page.locator('.payment-tabs').waitFor(); assert.equal(await page.locator('.unpaid-card').count(),1); await layout(page,'payments-mobile');
    await page.getByRole('button',{name:'Riwayat Transaksi',exact:true}).click(); await page.locator('[data-filter=status]').selectOption('Gagal'); assert.ok(await page.getByText('Gagal',{exact:true}).count());
    await page.locator('.profile-button').click(); await page.locator('.profile-popover a[href="#/siswa/profil?tab=password"]').click(); await page.locator('[name=current_password]').waitFor();
    await page.locator('.profile-button').click(); await page.locator('.profile-popover a[href="#/siswa/profil"]').click(); await page.locator('[name=name]').waitFor(); assert.equal(await page.locator('[name=current_password]').count(),0);
    await page.locator('[data-act=popover][data-value=notifications]').click(); await page.locator('.notification-popover').waitFor(); await page.locator('.notification-popover [data-act=read-all]').click(); assert.equal(await page.evaluate(() => CM.db.notifikasi.filter(n => n.id_user === CM.user().id_user && !n.sudah_dibaca).length),0);
    await page.keyboard.press('Escape'); await page.close();
  });

  await check('Teacher learning summaries, package filters, read-only preview and mobile layout', async () => {
    for (const width of [1280,390]) {
      const page=await newPage(width); await login(page,'raka');
      await page.evaluate(() => { const q=CM.db.soal.find(q => q.id_soal === 'q-pk-1'); CM.practice(q.id_soal,'ABCDE'.split('').find(c => c !== q.jawaban_benar)); });
      await login(page,'dimas'); await page.locator('.sidebar a[href="#/pengajar/hasil-belajar"]').evaluate(a => a.click()); await page.locator('[data-learning-summary=pk]').waitFor();
      assert.deepEqual(await page.locator('[data-summary-subject] option').evaluateAll(nodes => nodes.map(n => n.value)),['pk','pm']);
      assert.equal(await page.locator('[data-summary-source=latihan]').count(),1); await layout(page,'teacher-summary-practice-' + width);
      assert.equal(await page.locator('[data-act=summary-preview][data-id=q-pk-1]').count(),1);
      const before=await page.evaluate(() => JSON.stringify([CM.db.jawaban_latihan,CM.db.jawaban_siswa,CM.db.hasil_tryout]));
      await page.locator('[data-act=summary-preview][data-id=q-pk-1]').click(); await page.locator('.admin-question-preview').waitFor();
      assert.equal(await page.locator('.dialog [data-act=editor], .dialog [data-act=question-copy]').count(),0); await page.keyboard.press('Escape'); await page.locator('.dialog').waitFor({state:'detached'});
      if(width===1280) await shot(page,'1280-pengajar-hasil-latihan');
      await page.getByRole('button',{name:'Tryout',exact:true}).click(); await page.locator('[data-summary-source=tryout]').waitFor();
      await page.locator('[data-filter=paket]').selectOption('to-001'); assert.equal(await page.locator('[data-summary-package]').count(),1);
      assert.equal(await page.locator('[data-summary-package]').getAttribute('data-summary-package'),'to-001');
      await page.locator('[data-filter=paket]').selectOption('all'); assert.ok(await page.locator('[data-summary-package]').count() >= 2);
      await layout(page,'teacher-summary-tryout-' + width); if(width===390) await shot(page,'390-pengajar-hasil-tryout');
      assert.equal(await page.evaluate(() => JSON.stringify([CM.db.jawaban_latihan,CM.db.jawaban_siswa,CM.db.hasil_tryout])),before);
      assert.equal((await page.locator('[data-learning-summary]').textContent()).includes('Nadia'),false);
      await page.locator('[data-summary-subject]').selectOption('pm'); await page.locator('[data-learning-summary=pm][data-summary-source=tryout]').waitFor();
      await route(page,'/pengajar/hasil-belajar/pu'); assert.equal(await page.locator('h1').textContent(),'Subtes Tidak Ditugaskan'); assert.equal(await page.locator('[data-learning-summary]').count(),0);
      await route(page,'/pengajar/materi-soal/pk/soal'); await page.getByRole('link',{name:'Ringkasan Hasil',exact:true}).click(); await page.locator('[data-learning-summary=pk]').waitFor();
      await page.evaluate(() => {CM.db.jawaban_latihan=[];CM.db.hasil_tryout=[];CM.db.jawaban_siswa=[];CM.save();});
      await route(page,'/pengajar/hasil-belajar/pk?tab=tryout'); await page.locator('[data-summary-source=tryout]').waitFor();
      assert.equal(await page.locator('.stat-card').filter({hasText:'Rata-Rata Nilai'}).locator('strong').textContent(),'—');
      assert.ok(await page.getByText('Belum ada hasil',{exact:true}).count()); await page.close();
    }
  });

  await check('No unhandled browser errors', () => assert.deepEqual(errors, []));
})().catch(error => { console.error(error); checks.push({ name: 'Harness', pass: false, error: error.message }); }).finally(async () => {
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify({ checks, errors }, null, 2));
  await browser?.close(); server.close(); console.log('QA output:', out); if (checks.some(c => !c.pass)) process.exitCode = 1;
});

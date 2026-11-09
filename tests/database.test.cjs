const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const schema = read('cendekia_muda_database/01_schema.sql');
const seed = read('cendekia_muda_database/02_seed_program.sql');
const prd = read('assets/PRD.md');
let db;
before(async () => {
  db = new PGlite(); // PostgreSQL WASM in-memory; no DATABASE_URL or personal DB used.
  await db.exec(schema);
  await db.exec(seed);
});
after(async () => { if (db) await db.close(); });

test('SQL tables, columns and all 27 foreign keys match the current PRD', async () => {
  const dictionary = prd.split('### 12.1 Kamus tabel')[1].split('### 12.2 Relasi')[0];
  const expected = Object.fromEntries([...dictionary.matchAll(/^\*\*(\w+)\*\*\s*\n([\s\S]*?)(?=^\*\*\w+\*\*|(?![\s\S]))/gm)]
    .map(match => [match[1], [...match[2].matchAll(/^\| `([^`]+)` \|/gm)].map(column => column[1])]));
  assert.equal(Object.keys(expected).length, 16, 'Read all tables from PRD');
  const actual = await db.query("SELECT table_name,column_name,data_type FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position");
  const columns = {};
  for (const row of actual.rows) {
    (columns[row.table_name] ||= []).push(row.column_name);
    if (row.column_name.startsWith('id_') && row.column_name !== 'id_subtes') assert.equal(row.data_type, 'uuid', row.table_name + '.' + row.column_name);
  }
  assert.deepEqual(columns, expected);
  const relations = prd.split('### 12.2 Relasi')[1].split('### 12.3')[0];
  const expectedRelations = [...relations.matchAll(/^\| `(\w+)` \| `(\w+)` \| `(\w+)` \|/gm)]
    .map(match => `${match[1]}:${match[2]}:${match[3]}`).sort();
  const actualRelations = await db.query(`SELECT parent.relname AS parent,child.relname AS child,col.attname AS column
    FROM pg_constraint c JOIN pg_class child ON child.oid=c.conrelid
    JOIN pg_namespace ns ON ns.oid=child.relnamespace
    JOIN pg_class parent ON parent.oid=c.confrelid
    JOIN pg_attribute col ON col.attrelid=child.oid AND col.attnum=c.conkey[1]
    WHERE c.contype='f' AND ns.nspname='public'`);
  assert.equal(expectedRelations.length, 27);
  assert.deepEqual(actualRelations.rows.map(r => `${r.parent}:${r.child}:${r.column}`).sort(), expectedRelations);
});

test('Seeds contain seven ordered subtests and the two programs in the PRD', async () => {
  const subjects = await db.query('SELECT id_subtes,urutan FROM subtes ORDER BY urutan');
  assert.deepEqual(subjects.rows.map(r => r.id_subtes), ['pu','ppu','pbm','pk','lbi','lbe','pm']);
  assert.deepEqual(subjects.rows.map(r => r.urutan), [1,2,3,4,5,6,7]);
  const programs = await db.query('SELECT nama_program,harga,durasi_hari,akses_video FROM program ORDER BY durasi_hari');
  assert.deepEqual(programs.rows.map(r => ({ ...r, harga: Number(r.harga) })), [
    { nama_program: 'Program Reguler', harga: 100000, durasi_hari: 30, akses_video: false },
    { nama_program: 'Program Lengkap', harga: 170000, durasi_hari: 60, akses_video: true }
  ]);
});

test('Seed reruns preserve existing administrator edits without duplicating records', async () => {
  const id = '00000000-0000-4000-8000-000000000101';
  await db.query('UPDATE program SET harga=123456 WHERE id_program=$1', [id]);
  try {
    await db.exec(seed);
    assert.equal(Number((await db.query('SELECT harga FROM program WHERE id_program=$1',[id])).rows[0].harga), 123456);
    assert.equal(Number((await db.query('SELECT COUNT(*) AS n FROM program')).rows[0].n), 2);
    assert.equal(Number((await db.query('SELECT COUNT(*) AS n FROM subtes')).rows[0].n), 7);
  } finally {
    await db.query('UPDATE program SET harga=100000 WHERE id_program=$1',[id]);
  }
});

test('Database constraints enforce assignments, uploads, attempts, payments and historical references', async t => {
  let results;
  try {
    results = await db.exec(read('tests/database.sql'));
  } catch (error) {
    throw new Error(`${error.message}\n${error.where || ''}`);
  } finally {
    await db.exec('ROLLBACK');
  }
  const summary = results.find(r => r.rows?.length === 1 && Number(r.rows[0].pengujian_lolos) > 0);
  assert.ok(summary, 'SQL assertion suite completed');
  t.diagnostic(`${summary.rows[0].pengujian_lolos} SQL assertions passed`);
  assert.equal(Number((await db.query('SELECT COUNT(*) AS n FROM users')).rows[0].n), 0, 'All fixture data rolled back');
  assert.equal(Number((await db.query('SELECT COUNT(*) AS n FROM materi')).rows[0].n), 0);
});

test('Read-only verification runs and rerunning the initial schema preserves existing data', async () => {
  const verification = await db.exec(read('cendekia_muda_database/04_verifikasi.sql'));
  assert.equal(Number(verification[0].rows[0].jumlah_tabel), 16);
  assert.equal(Number(verification[1].rows[0].jumlah_foreign_key), 27);
  await assert.rejects(db.exec(schema), error => error.code === 'P0001' && /database baru/.test(error.message));
  await db.exec('ROLLBACK');
  assert.equal(Number((await db.query('SELECT COUNT(*) AS n FROM program')).rows[0].n), 2);
});

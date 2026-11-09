-- Jalankan setelah 01_schema.sql. Isi: tujuh subtes + dua program awal.
-- UUID program stabil untuk seed; kode prg-reguler/prg-lengkap frontend
-- harus dipetakan saat integrasi. Data frontend tidak dipindah otomatis.
-- Aman diulang: konflik PK dilewati, perubahan admin tidak ditimpa.

BEGIN;
SET LOCAL search_path = public;

INSERT INTO subtes (id_subtes, nama_subtes, kelompok, urutan) VALUES
    ('pu',  'Penalaran Umum',                  'TPS',      1),
    ('ppu', 'Pengetahuan dan Pemahaman Umum',  'TPS',      2),
    ('pbm', 'Pemahaman Bacaan dan Menulis',    'TPS',      3),
    ('pk',  'Pengetahuan Kuantitatif',         'TPS',      4),
    ('lbi', 'Literasi Bahasa Indonesia',      'Literasi', 5),
    ('lbe', 'Literasi Bahasa Inggris',        'Literasi', 6),
    ('pm',  'Penalaran Matematika',            'Literasi', 7)
ON CONFLICT (id_subtes) DO NOTHING;

INSERT INTO program (id_program, nama_program, deskripsi, harga, durasi_hari, akses_video, status) VALUES
    ('00000000-0000-4000-8000-000000000101', 'Program Reguler',
     'Bank soal, pembahasan teks, modul PDF, tryout mingguan, dan pendamping WhatsApp setelah ditugaskan admin.',
     100000.00, 30, FALSE, 'Aktif'),
    ('00000000-0000-4000-8000-000000000102', 'Program Lengkap',
     'Semua fitur Reguler, masa belajar lebih panjang, dan video pembahasan.',
     170000.00, 60, TRUE, 'Aktif')
ON CONFLICT (id_program) DO NOTHING;

COMMIT;

SELECT id_subtes, nama_subtes, kelompok, urutan FROM subtes ORDER BY urutan;
SELECT id_program, nama_program, harga, durasi_hari, akses_video, status FROM program ORDER BY durasi_hari;

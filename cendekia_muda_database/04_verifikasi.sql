-- Pemeriksaan baca saja setelah schema + seed. Bisa dijalankan berulang.
-- Expected awal: 16 tabel, 27 FK, 7 subtes, 2 program; akun/konten belum di-seed.
SELECT COUNT(*) AS jumlah_tabel
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

SELECT COUNT(*) AS jumlah_foreign_key
FROM information_schema.table_constraints
WHERE table_schema = 'public' AND constraint_type = 'FOREIGN KEY';

SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

SELECT id_subtes, nama_subtes, kelompok, urutan FROM public.subtes ORDER BY urutan;
SELECT id_program, nama_program, harga, durasi_hari, akses_video, status
FROM public.program ORDER BY durasi_hari;

SELECT indexname, indexdef FROM pg_indexes
WHERE schemaname = 'public' AND indexname = 'uq_siswa_pendamping_berjalan';

SELECT conname, condeferrable, condeferred
FROM pg_constraint WHERE conrelid = 'public.tryout_soal'::regclass AND contype = 'u';

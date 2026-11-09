-- Uji constraint pada database PENGUJIAN setelah schema + seed.
-- Semua fixture berada di transaksi yang selalu di-ROLLBACK pada akhir file.
-- Jalankan seluruh file; bila ada error tak terduga, jalankan ROLLBACK;
BEGIN;
SET LOCAL search_path = public;
CREATE TEMP TABLE cm_test_results (nama TEXT NOT NULL);

CREATE FUNCTION pg_temp.cm_assert(ok BOOLEAN, nama TEXT) RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    IF ok IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'GAGAL: %', nama; END IF;
    INSERT INTO cm_test_results VALUES (nama);
END $$;

CREATE FUNCTION pg_temp.cm_reject(perintah TEXT, kode TEXT, nama TEXT) RETURNS VOID
LANGUAGE plpgsql AS $$
DECLARE actual TEXT;
BEGIN
    BEGIN
        EXECUTE perintah;
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS actual = RETURNED_SQLSTATE;
        IF NOT actual = ANY(string_to_array(kode, ',')) THEN RAISE EXCEPTION 'GAGAL: %; expected %, actual %', nama, kode, actual; END IF;
        INSERT INTO cm_test_results VALUES (nama);
        RETURN;
    END;
    RAISE EXCEPTION 'GAGAL: %; data tidak valid justru diterima', nama;
END $$;

DO $$
DECLARE
    a UUID; t UUID; s UUID; p UUID; q UUID; q2 UUID; exam UUID; attempt UUID;
    m UUID; assignment UUID; enrollment UUID; payment UUID; material UUID;
BEGIN
    IF EXISTS (SELECT 1 FROM users) THEN
        RAISE EXCEPTION 'Gunakan database pengujian baru dengan schema dan seed saja.';
    END IF;
    PERFORM pg_temp.cm_assert((SELECT COUNT(*) = 16 FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'), '16 tabel domain');
    PERFORM pg_temp.cm_assert((SELECT COUNT(*) = 27 FROM information_schema.table_constraints WHERE table_schema = 'public' AND constraint_type = 'FOREIGN KEY'), '27 foreign key');
    PERFORM pg_temp.cm_assert((SELECT COUNT(*) = 7 FROM subtes), 'Seed tujuh subtes');
    PERFORM pg_temp.cm_assert((SELECT COUNT(*) = 2 FROM program), 'Seed dua program');

    INSERT INTO users(nama,email,password,no_hp,role) VALUES ('Admin Uji','admin@database.test','HASH-FIXTURE-TIDAK-UNTUK-LOGIN','620000000001','admin') RETURNING id_user INTO a;
    INSERT INTO users(nama,email,password,no_hp,role) VALUES ('Pengajar Uji','pengajar@database.test','HASH-FIXTURE-TIDAK-UNTUK-LOGIN','620000000002','pengajar') RETURNING id_user INTO t;
    INSERT INTO users(nama,email,password,no_hp,role) VALUES ('Siswa Uji','siswa@database.test','HASH-FIXTURE-TIDAK-UNTUK-LOGIN','620000000003','siswa') RETURNING id_user INTO s;
    PERFORM pg_temp.cm_assert((SELECT COUNT(DISTINCT role) = 3 FROM users), 'Tiga role diterima');
    PERFORM pg_temp.cm_reject(format('UPDATE users SET role = ''pendamping'' WHERE id_user = %L', t), '23514', 'Pendamping bukan role login');
    PERFORM pg_temp.cm_reject(format('UPDATE users SET email = ''ADMIN@database.test'' WHERE id_user = %L', t), '23514', 'Email wajib dinormalisasi');
    PERFORM pg_temp.cm_reject(format('UPDATE users SET email = ''admin@database.test'' WHERE id_user = %L', t), '23505', 'Email duplikat ditolak');
    PERFORM pg_temp.cm_reject('INSERT INTO subtes VALUES (''xyz'',''Subtes asing'',''TPS'',8)', '23514', 'Kode subtes di luar tujuh master ditolak');

    INSERT INTO pengajar_subtes(id_pengajar,id_subtes,ditugaskan_oleh) VALUES (t,'pk',a),(t,'pm',a);
    PERFORM pg_temp.cm_assert((SELECT COUNT(*) = 2 FROM pengajar_subtes WHERE id_pengajar=t), 'Pengajar boleh memiliki beberapa subtes');
    PERFORM pg_temp.cm_reject(format('INSERT INTO pengajar_subtes(id_pengajar,id_subtes,ditugaskan_oleh) VALUES (%L,''pk'',%L)',t,a), '23505', 'Penugasan pengajar duplikat ditolak');
    PERFORM pg_temp.cm_reject(format('INSERT INTO pengajar_subtes(id_pengajar,id_subtes,ditugaskan_oleh) VALUES (%L,''pu'',%L)',gen_random_uuid(),a), '23503', 'Referensi akun yang tidak ada ditolak');

    INSERT INTO pendamping(nama,nomor_whatsapp) VALUES ('Kontak Uji','620000000004') RETURNING id_pendamping INTO m;
    PERFORM pg_temp.cm_reject(format('UPDATE pendamping SET nomor_whatsapp = '''' WHERE id_pendamping = %L',m), '23514', 'Kontak WhatsApp kosong ditolak');
    INSERT INTO siswa_pendamping(id_siswa,id_subtes,id_pendamping,ditugaskan_oleh,mulai_pada) VALUES (s,'pk',m,a,NOW()-INTERVAL '1 day') RETURNING id_penugasan INTO assignment;
    PERFORM pg_temp.cm_reject(format('INSERT INTO siswa_pendamping(id_siswa,id_subtes,id_pendamping,ditugaskan_oleh) VALUES (%L,''pk'',%L,%L)',s,m,a), '23505', 'Dua pendamping berjalan pada siswa-subtes sama ditolak');
    PERFORM pg_temp.cm_reject(format('UPDATE siswa_pendamping SET berakhir_pada = mulai_pada WHERE id_penugasan = %L',assignment), '23514', 'Akhir penugasan wajib sesudah awal');
    UPDATE siswa_pendamping SET berakhir_pada=NOW() WHERE id_penugasan=assignment;
    INSERT INTO siswa_pendamping(id_siswa,id_subtes,id_pendamping,ditugaskan_oleh) VALUES (s,'pk',m,a),(s,'pm',m,a);
    PERFORM pg_temp.cm_assert((SELECT COUNT(*)=3 FROM siswa_pendamping WHERE id_siswa=s), 'Pergantian dan beberapa subtes mempertahankan riwayat');

    INSERT INTO materi(id_subtes,judul,tipe,sumber,url_file,dibuat_oleh,diubah_oleh) VALUES ('pk','PDF Uji','pdf','tautan','https://example.test/materi.pdf',t,t) RETURNING id_materi INTO material;
    PERFORM pg_temp.cm_reject(format('UPDATE materi SET url_file = NULL WHERE id_materi = %L',material), '23514', 'Tautan NULL ditolak');
    PERFORM pg_temp.cm_reject(format('UPDATE materi SET url_file = ''http://example.test/a.pdf'' WHERE id_materi = %L',material), '23514', 'Tautan non-HTTPS ditolak');
    PERFORM pg_temp.cm_reject(format('UPDATE materi SET storage_key = ''file.pdf'' WHERE id_materi = %L',material), '23514', 'Dua sumber materi sekaligus ditolak');
    UPDATE materi SET sumber='unggah',url_file=NULL,storage_key='uji/file.pdf',nama_file_asli='file.pdf',mime_type='application/pdf',ukuran_byte=100 WHERE id_materi=material;
    PERFORM pg_temp.cm_assert((SELECT sumber='unggah' FROM materi WHERE id_materi=material), 'Metadata unggahan lengkap diterima');
    PERFORM pg_temp.cm_reject(format('UPDATE materi SET ukuran_byte = NULL WHERE id_materi = %L',material), '23514', 'Ukuran unggahan NULL ditolak');
    PERFORM pg_temp.cm_reject(format('UPDATE materi SET ukuran_byte = 0 WHERE id_materi = %L',material), '23514', 'Ukuran unggahan nol ditolak');
    PERFORM pg_temp.cm_reject(format('UPDATE materi SET mime_type = ''video/mp4'' WHERE id_materi = %L',material), '23514', 'MIME tidak sesuai tipe ditolak');
    PERFORM pg_temp.cm_reject(format('INSERT INTO materi(id_subtes,judul,tipe,sumber,storage_key,nama_file_asli,mime_type,ukuran_byte,dibuat_oleh,diubah_oleh) VALUES (''pk'',''Duplikat'',''pdf'',''unggah'',''uji/file.pdf'',''a.pdf'',''application/pdf'',100,%L,%L)',t,t), '23505', 'Storage key duplikat ditolak');
    INSERT INTO materi(id_subtes,judul,tipe,sumber,url_file,dibuat_oleh,diubah_oleh) VALUES ('pm','Video Uji','video','tautan','https://example.test/video.mp4',t,t),('pm','Video Lain','video','tautan','https://example.test/video2.mp4',t,t);
    PERFORM pg_temp.cm_assert((SELECT COUNT(*)=2 FROM materi WHERE storage_key IS NULL), 'Beberapa materi tautan boleh memiliki storage key NULL');

    INSERT INTO soal(id_subtes,tingkat_kesulitan,pertanyaan,opsi_a,opsi_b,opsi_c,opsi_d,opsi_e,jawaban_benar,pembahasan,dibuat_oleh,diubah_oleh) VALUES ('pk','Mudah','1+1?','2','3','4','5','6','A','1+1=2',t,t) RETURNING id_soal INTO q;
    INSERT INTO soal(id_subtes,tingkat_kesulitan,pertanyaan,opsi_a,opsi_b,opsi_c,opsi_d,opsi_e,jawaban_benar,pembahasan,dibuat_oleh,diubah_oleh) VALUES ('pm','Sedang','2+2?','4','5','6','7','8','A','2+2=4',t,t) RETURNING id_soal INTO q2;
    PERFORM pg_temp.cm_reject(format('UPDATE soal SET opsi_e = '''' WHERE id_soal=%L',q), '23514', 'Lima opsi wajib terisi');
    PERFORM pg_temp.cm_reject(format('UPDATE soal SET pembahasan = NULL WHERE id_soal=%L',q), '23502', 'Pembahasan wajib terisi');
    PERFORM pg_temp.cm_reject(format('UPDATE soal SET jawaban_benar = ''F'' WHERE id_soal=%L',q), '23514', 'Kunci di luar A-E ditolak');
    PERFORM pg_temp.cm_reject(format('UPDATE soal SET tingkat_kesulitan = ''Ekstrem'' WHERE id_soal=%L',q), '23514', 'Kesulitan di luar PRD ditolak');
    INSERT INTO jawaban_latihan(id_user,id_soal,jawaban_dipilih,is_benar) VALUES (s,q,'A',TRUE),(s,q,'B',FALSE);
    PERFORM pg_temp.cm_assert((SELECT COUNT(*)=2 FROM jawaban_latihan WHERE id_user=s AND id_soal=q), 'Percobaan latihan berulang disimpan terpisah');
    PERFORM pg_temp.cm_reject(format('DELETE FROM soal WHERE id_soal=%L',q), '23503,23001', 'Soal dengan riwayat jawaban tidak bisa dihapus');

    INSERT INTO tryout(judul,durasi_menit,dibuat_oleh) VALUES ('Draft Uji',120,a) RETURNING id_tryout INTO exam;
    PERFORM pg_temp.cm_reject(format('UPDATE tryout SET status=''Rilis'' WHERE id_tryout=%L',exam), '23514', 'Rilis tanpa jadwal dan metadata ditolak');
    INSERT INTO tryout_soal VALUES (exam,q,1),(exam,q2,2);
    PERFORM pg_temp.cm_reject(format('INSERT INTO tryout_soal VALUES (%L,%L,3)',exam,q), '23505', 'Soal duplikat dalam paket ditolak');
    PERFORM pg_temp.cm_reject(format('UPDATE tryout_soal SET urutan=1 WHERE id_tryout=%L AND id_soal=%L',exam,q2), '23505', 'Urutan paket duplikat ditolak');
    SET CONSTRAINTS uq_tryout_soal_urutan DEFERRED;
    UPDATE tryout_soal SET urutan=3-urutan WHERE id_tryout=exam;
    SET CONSTRAINTS uq_tryout_soal_urutan IMMEDIATE;
    PERFORM pg_temp.cm_assert((SELECT urutan=2 FROM tryout_soal WHERE id_tryout=exam AND id_soal=q), 'Pertukaran urutan atomik diterima');
    UPDATE tryout SET status='Rilis',tanggal_rilis=NOW(),dirilis_oleh=a,dirilis_pada=NOW() WHERE id_tryout=exam;
    PERFORM pg_temp.cm_reject(format('UPDATE tryout SET status=''Draft'' WHERE id_tryout=%L',exam), '23514', 'Kembali Draft harus mengosongkan metadata rilis');
    INSERT INTO hasil_tryout(id_tryout,id_user) VALUES (exam,s) RETURNING id_hasil INTO attempt;
    PERFORM pg_temp.cm_reject(format('INSERT INTO hasil_tryout(id_tryout,id_user) VALUES (%L,%L)',exam,s), '23505', 'Pengerjaan kedua tryout ditolak');
    INSERT INTO jawaban_siswa(id_hasil,id_soal,is_ragu) VALUES (attempt,q,TRUE);
    INSERT INTO jawaban_siswa(id_hasil,id_soal,jawaban_dipilih) VALUES (attempt,q,'A') ON CONFLICT (id_hasil,id_soal) DO UPDATE SET jawaban_dipilih=EXCLUDED.jawaban_dipilih;
    PERFORM pg_temp.cm_assert((SELECT COUNT(*)=1 FROM jawaban_siswa WHERE id_hasil=attempt AND id_soal=q), 'Autosave memperbarui jawaban tanpa duplikasi');
    PERFORM pg_temp.cm_reject(format('INSERT INTO jawaban_siswa(id_hasil,id_soal,is_benar) VALUES (%L,%L,TRUE)',attempt,q2), '23514', 'Jawaban kosong tidak boleh dianggap benar');
    PERFORM pg_temp.cm_reject(format('UPDATE hasil_tryout SET status=''Selesai'' WHERE id_hasil=%L',attempt), '23514', 'Selesai tanpa skor dan waktu ditolak');
    UPDATE hasil_tryout SET status='Selesai',skor=50,jumlah_benar=1,waktu_selesai=NOW() WHERE id_hasil=attempt;
    PERFORM pg_temp.cm_reject(format('UPDATE hasil_tryout SET skor=101 WHERE id_hasil=%L',attempt), '23514', 'Skor di luar 0-100 ditolak');
    PERFORM pg_temp.cm_reject(format('DELETE FROM tryout WHERE id_tryout=%L',exam), '23503,23001', 'Paket dengan relasi historis tidak bisa dihapus');

    SELECT id_program INTO p FROM program WHERE nama_program='Program Reguler';
    PERFORM pg_temp.cm_reject(format('UPDATE program SET harga=-1 WHERE id_program=%L',p), '23514', 'Harga negatif ditolak');
    PERFORM pg_temp.cm_reject(format('UPDATE program SET harga=''NaN'' WHERE id_program=%L',p), '23514', 'Harga NaN ditolak');
    INSERT INTO pendaftaran(id_user,id_program) VALUES (s,p) RETURNING id_pendaftaran INTO enrollment;
    PERFORM pg_temp.cm_reject(format('UPDATE pendaftaran SET status=''Lunas'' WHERE id_pendaftaran=%L',enrollment), '23514', 'Pendaftaran Lunas wajib masa aktif');
    UPDATE pendaftaran SET status='Lunas',tanggal_aktif=NOW(),tanggal_berakhir=NOW()+INTERVAL '30 days' WHERE id_pendaftaran=enrollment;
    INSERT INTO pendaftaran(id_user,id_program,status,tanggal_aktif,tanggal_berakhir) VALUES (s,p,'Lunas',NOW()+INTERVAL '30 days',NOW()+INTERVAL '60 days');
    PERFORM pg_temp.cm_assert((SELECT COUNT(*)=2 FROM pendaftaran WHERE id_user=s AND status='Lunas'), 'Perpanjangan terjadwal tidak terhalang unique Lunas');
    INSERT INTO pembayaran(id_pendaftaran,order_id,jumlah,metode,batas_bayar,status) VALUES (enrollment,'CM-TEST-01',100000,'QRIS',NOW()+INTERVAL '24 hours','Gagal') RETURNING id_pembayaran INTO payment;
    INSERT INTO pembayaran(id_pendaftaran,order_id,jumlah,metode,batas_bayar) VALUES (enrollment,'CM-TEST-02',100000,'QRIS',NOW()+INTERVAL '24 hours');
    PERFORM pg_temp.cm_assert((SELECT COUNT(*)=2 FROM pembayaran WHERE id_pendaftaran=enrollment), 'Beberapa percobaan pembayaran per pendaftaran diterima');
    PERFORM pg_temp.cm_reject(format('UPDATE pembayaran SET order_id=''CM-TEST-02'' WHERE id_pembayaran=%L',payment), '23505', 'Order gateway duplikat ditolak');
    PERFORM pg_temp.cm_reject(format('UPDATE pembayaran SET status=''Lunas'' WHERE id_pembayaran=%L',payment), '23514', 'Pembayaran Lunas wajib waktu bayar');
    PERFORM pg_temp.cm_reject(format('UPDATE pembayaran SET batas_bayar=tanggal_dibuat WHERE id_pembayaran=%L',payment), '23514', 'Tenggat pembayaran wajib sesudah pembuatan');
    PERFORM pg_temp.cm_reject(format('DELETE FROM users WHERE id_user=%L',s), '23503,23001', 'Siswa dengan riwayat tidak bisa dihapus');
END $$;

SELECT COUNT(*) AS pengujian_lolos FROM cm_test_results;
SELECT nama AS pengujian_lolos FROM cm_test_results;
ROLLBACK;

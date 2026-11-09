-- CENDEKIA MUDA — PostgreSQL 16+ — revisi 9 November 2026
-- 16 tabel domain, 27 foreign key; acuan: assets/PRD.md bagian 12.
-- Jalankan SELURUH file pada database baru melalui Navicat atau psql.
-- Ini skema awal, bukan upgrade otomatis dari versi 12 tabel/BIGINT.
-- Tidak ada DROP, TRUNCATE, atau reset data. Jika gagal: ROLLBACK;

BEGIN;
SET LOCAL search_path = public;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ) THEN
        RAISE EXCEPTION 'Schema public sudah berisi tabel. Gunakan database baru; data lama memerlukan migrasi terpisah.';
    END IF;
END $$;

-- 1. Akun tiga role. API menormalisasi email sebelum INSERT/UPDATE.
CREATE TABLE users (
    id_user UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama VARCHAR(150) NOT NULL CHECK (btrim(nama) <> ''),
    email VARCHAR(254) NOT NULL UNIQUE
        CHECK (email = lower(btrim(email)) AND email <> ''),
    password TEXT NOT NULL CHECK (btrim(password) <> ''), -- hash server, bukan plaintext
    no_hp VARCHAR(25) NOT NULL CHECK (btrim(no_hp) <> ''),
    asal_sekolah VARCHAR(200),
    tahun_lulus SMALLINT CHECK (tahun_lulus BETWEEN 1900 AND 2200),
    role VARCHAR(10) NOT NULL DEFAULT 'siswa'
        CHECK (role IN ('siswa', 'pengajar', 'admin')),
    is_aktif BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Master tujuh subtes; diisi oleh 02_seed_program.sql.
CREATE TABLE subtes (
    id_subtes VARCHAR(3) PRIMARY KEY
        CHECK (id_subtes IN ('pu', 'ppu', 'pbm', 'pk', 'lbi', 'lbe', 'pm')),
    nama_subtes VARCHAR(100) NOT NULL UNIQUE CHECK (btrim(nama_subtes) <> ''),
    kelompok VARCHAR(10) NOT NULL CHECK (kelompok IN ('TPS', 'Literasi')),
    urutan INTEGER NOT NULL UNIQUE CHECK (urutan BETWEEN 1 AND 7)
);

-- 3. Satu pengajar boleh mendapat beberapa subtes; pencabutan memakai is_aktif.
CREATE TABLE pengajar_subtes (
    id_pengajar UUID NOT NULL REFERENCES users(id_user) ON DELETE RESTRICT,
    id_subtes VARCHAR(3) NOT NULL REFERENCES subtes(id_subtes) ON DELETE RESTRICT,
    ditugaskan_oleh UUID NOT NULL REFERENCES users(id_user) ON DELETE RESTRICT,
    is_aktif BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id_pengajar, id_subtes)
);
CREATE INDEX idx_pengajar_subtes_subtes ON pengajar_subtes (id_subtes, is_aktif);

-- 4. Kontak WhatsApp; tidak mempunyai akun login.
CREATE TABLE pendamping (
    id_pendamping UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama VARCHAR(150) NOT NULL CHECK (btrim(nama) <> ''),
    nomor_whatsapp VARCHAR(15) NOT NULL
        CHECK (nomor_whatsapp ~ '^[1-9][0-9]{6,14}$'), -- kode negara + nomor, tanpa +/spasi
    is_aktif BOOLEAN NOT NULL DEFAULT TRUE,
    catatan TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Riwayat pendamping per siswa-subtes; satu penugasan berjalan per pasangan.
CREATE TABLE siswa_pendamping (
    id_penugasan UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_siswa UUID NOT NULL REFERENCES users(id_user) ON DELETE RESTRICT,
    id_subtes VARCHAR(3) NOT NULL REFERENCES subtes(id_subtes) ON DELETE RESTRICT,
    id_pendamping UUID NOT NULL REFERENCES pendamping(id_pendamping) ON DELETE RESTRICT,
    ditugaskan_oleh UUID NOT NULL REFERENCES users(id_user) ON DELETE RESTRICT,
    mulai_pada TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    berakhir_pada TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_siswa_pendamping_periode CHECK (
        berakhir_pada IS NULL OR berakhir_pada > mulai_pada
    )
);
CREATE UNIQUE INDEX uq_siswa_pendamping_berjalan
    ON siswa_pendamping (id_siswa, id_subtes) WHERE berakhir_pada IS NULL;
CREATE INDEX idx_siswa_pendamping_pendamping ON siswa_pendamping (id_pendamping);
CREATE INDEX idx_siswa_pendamping_subtes ON siswa_pendamping (id_subtes);

-- 6. Notifikasi setiap akun.
CREATE TABLE notifikasi (
    id_notifikasi UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_user UUID NOT NULL REFERENCES users(id_user) ON DELETE RESTRICT,
    judul VARCHAR(200) NOT NULL CHECK (btrim(judul) <> ''),
    pesan TEXT NOT NULL,
    tipe VARCHAR(50) NOT NULL,
    sudah_dibaca BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notifikasi_user_created ON notifikasi (id_user, created_at DESC);

-- 7. Paket berbayar; status Gratis diturunkan dari ketiadaan program aktif.
CREATE TABLE program (
    id_program UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_program VARCHAR(150) NOT NULL CHECK (btrim(nama_program) <> ''),
    deskripsi TEXT NOT NULL,
    harga NUMERIC(14,2) NOT NULL CHECK (harga >= 0 AND harga <> 'NaN'::numeric),
    durasi_hari INTEGER NOT NULL CHECK (durasi_hari > 0),
    akses_video BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(10) NOT NULL DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Nonaktif'))
);

-- 8. Banyak riwayat Lunas diperbolehkan, termasuk perpanjangan terjadwal.
CREATE TABLE pendaftaran (
    id_pendaftaran UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_user UUID NOT NULL REFERENCES users(id_user) ON DELETE RESTRICT,
    id_program UUID NOT NULL REFERENCES program(id_program) ON DELETE RESTRICT,
    tanggal_daftar TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(30) NOT NULL DEFAULT 'Menunggu Pembayaran'
        CHECK (status IN ('Menunggu Pembayaran', 'Lunas', 'Dibatalkan', 'Digantikan')),
    tanggal_aktif TIMESTAMPTZ,
    tanggal_berakhir TIMESTAMPTZ,
    CONSTRAINT ck_pendaftaran_tanggal_berpasangan CHECK (
        (tanggal_aktif IS NULL AND tanggal_berakhir IS NULL)
        OR (tanggal_aktif IS NOT NULL AND tanggal_berakhir IS NOT NULL
            AND tanggal_berakhir > tanggal_aktif)
    ),
    CONSTRAINT ck_pendaftaran_lunas_punya_masa_aktif CHECK (
        status NOT IN ('Lunas', 'Digantikan')
        OR (tanggal_aktif IS NOT NULL AND tanggal_berakhir IS NOT NULL)
    )
);
CREATE INDEX idx_pendaftaran_user_status_tanggal
    ON pendaftaran (id_user, status, tanggal_aktif, tanggal_berakhir);
CREATE INDEX idx_pendaftaran_program ON pendaftaran (id_program);

-- 9. Satu pendaftaran bisa memiliki beberapa percobaan pembayaran.
CREATE TABLE pembayaran (
    id_pembayaran UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_pendaftaran UUID NOT NULL REFERENCES pendaftaran(id_pendaftaran) ON DELETE RESTRICT,
    order_id VARCHAR(120) NOT NULL UNIQUE CHECK (btrim(order_id) <> ''),
    transaction_id VARCHAR(150),
    payment_url TEXT,
    jumlah NUMERIC(14,2) NOT NULL CHECK (jumlah >= 0 AND jumlah <> 'NaN'::numeric),
    metode VARCHAR(30) NOT NULL CHECK (metode IN ('QRIS', 'E-Wallet', 'Bank Mobile', 'Virtual Account')),
    status VARCHAR(30) NOT NULL DEFAULT 'Menunggu Pembayaran'
        CHECK (status IN ('Menunggu Pembayaran', 'Lunas', 'Gagal', 'Kedaluwarsa')),
    tanggal_dibuat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    batas_bayar TIMESTAMPTZ NOT NULL,
    waktu_bayar TIMESTAMPTZ,
    CONSTRAINT ck_pembayaran_tenggat CHECK (batas_bayar > tanggal_dibuat),
    CONSTRAINT ck_pembayaran_waktu_lunas CHECK (status <> 'Lunas' OR waktu_bayar IS NOT NULL)
);
CREATE INDEX idx_pembayaran_pendaftaran_status ON pembayaran (id_pendaftaran, status);
CREATE INDEX idx_pembayaran_status_tenggat ON pembayaran (status, batas_bayar);

-- 10. Katalog materi bersama; satu sumber: tautan HTTPS atau metadata unggahan.
CREATE TABLE materi (
    id_materi UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_subtes VARCHAR(3) NOT NULL REFERENCES subtes(id_subtes) ON DELETE RESTRICT,
    judul VARCHAR(250) NOT NULL CHECK (btrim(judul) <> ''),
    tipe VARCHAR(10) NOT NULL CHECK (tipe IN ('pdf', 'video')),
    sumber VARCHAR(10) NOT NULL CHECK (sumber IN ('tautan', 'unggah')),
    url_file TEXT,
    storage_key TEXT UNIQUE,
    nama_file_asli TEXT,
    mime_type VARCHAR(100),
    ukuran_byte BIGINT,
    is_gratis BOOLEAN NOT NULL DEFAULT FALSE,
    is_aktif BOOLEAN NOT NULL DEFAULT TRUE,
    urutan INTEGER NOT NULL DEFAULT 0 CHECK (urutan >= 0),
    dibuat_oleh UUID NOT NULL REFERENCES users(id_user) ON DELETE RESTRICT,
    diubah_oleh UUID NOT NULL REFERENCES users(id_user) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_materi_sumber CHECK (
        (sumber = 'tautan' AND url_file IS NOT NULL AND url_file ~ '^https://[^[:space:]]+$'
            AND storage_key IS NULL AND nama_file_asli IS NULL
            AND mime_type IS NULL AND ukuran_byte IS NULL)
        OR
        (sumber = 'unggah' AND url_file IS NULL
            AND storage_key IS NOT NULL AND btrim(storage_key) <> ''
            AND nama_file_asli IS NOT NULL AND btrim(nama_file_asli) <> ''
            AND mime_type IS NOT NULL AND ukuran_byte IS NOT NULL AND ukuran_byte > 0
            AND ((tipe = 'pdf' AND mime_type = 'application/pdf')
                OR (tipe = 'video' AND mime_type IN ('video/mp4', 'video/webm'))))
    )
);
CREATE INDEX idx_materi_subtes_aktif_urutan ON materi (id_subtes, is_aktif, urutan);

-- 11. Soal dipakai bersama oleh latihan dan tryout.
CREATE TABLE soal (
    id_soal UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_subtes VARCHAR(3) NOT NULL REFERENCES subtes(id_subtes) ON DELETE RESTRICT,
    tingkat_kesulitan VARCHAR(10) NOT NULL CHECK (tingkat_kesulitan IN ('Mudah', 'Sedang', 'Sulit')),
    pertanyaan TEXT NOT NULL CHECK (btrim(pertanyaan) <> ''),
    gambar_soal TEXT,
    opsi_a TEXT NOT NULL CHECK (btrim(opsi_a) <> ''),
    opsi_b TEXT NOT NULL CHECK (btrim(opsi_b) <> ''),
    opsi_c TEXT NOT NULL CHECK (btrim(opsi_c) <> ''),
    opsi_d TEXT NOT NULL CHECK (btrim(opsi_d) <> ''),
    opsi_e TEXT NOT NULL CHECK (btrim(opsi_e) <> ''),
    jawaban_benar CHAR(1) NOT NULL CHECK (jawaban_benar IN ('A', 'B', 'C', 'D', 'E')),
    pembahasan TEXT NOT NULL CHECK (btrim(pembahasan) <> ''),
    gambar_pembahasan TEXT,
    is_gratis BOOLEAN NOT NULL DEFAULT FALSE,
    is_aktif BOOLEAN NOT NULL DEFAULT TRUE,
    dibuat_oleh UUID NOT NULL REFERENCES users(id_user) ON DELETE RESTRICT,
    diubah_oleh UUID NOT NULL REFERENCES users(id_user) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_soal_subtes_aktif_gratis ON soal (id_subtes, is_aktif, is_gratis);

-- 12. Setiap percobaan satu baris; tidak UNIQUE pada siswa-soal.
CREATE TABLE jawaban_latihan (
    id_jawaban_latihan UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_user UUID NOT NULL REFERENCES users(id_user) ON DELETE RESTRICT,
    id_soal UUID NOT NULL REFERENCES soal(id_soal) ON DELETE RESTRICT,
    jawaban_dipilih CHAR(1) NOT NULL CHECK (jawaban_dipilih IN ('A', 'B', 'C', 'D', 'E')),
    is_benar BOOLEAN NOT NULL,
    waktu_jawab TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_jawaban_latihan_user_soal ON jawaban_latihan (id_user, id_soal);
CREATE INDEX idx_jawaban_latihan_user_waktu ON jawaban_latihan (id_user, waktu_jawab DESC);
CREATE INDEX idx_jawaban_latihan_soal_benar ON jawaban_latihan (id_soal, is_benar);

-- 13. Paket tujuh subtes. Kelengkapan subtes dan role perilis dicek API.
CREATE TABLE tryout (
    id_tryout UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    judul VARCHAR(250) NOT NULL CHECK (btrim(judul) <> ''),
    durasi_menit INTEGER NOT NULL CHECK (durasi_menit > 0),
    tanggal_rilis TIMESTAMPTZ,
    status VARCHAR(10) NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Rilis')),
    dibuat_oleh UUID NOT NULL REFERENCES users(id_user) ON DELETE RESTRICT,
    dirilis_oleh UUID REFERENCES users(id_user) ON DELETE RESTRICT,
    dirilis_pada TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_tryout_metadata_rilis CHECK (
        (status = 'Draft' AND dirilis_oleh IS NULL AND dirilis_pada IS NULL)
        OR (status = 'Rilis' AND tanggal_rilis IS NOT NULL
            AND dirilis_oleh IS NOT NULL AND dirilis_pada IS NOT NULL)
    )
);
CREATE INDEX idx_tryout_rilis ON tryout (status, tanggal_rilis);

-- 14. Posisi unik di setiap paket; subtes diambil melalui soal.id_subtes.
CREATE TABLE tryout_soal (
    id_tryout UUID NOT NULL REFERENCES tryout(id_tryout) ON DELETE RESTRICT,
    id_soal UUID NOT NULL REFERENCES soal(id_soal) ON DELETE RESTRICT,
    urutan INTEGER NOT NULL CHECK (urutan > 0),
    PRIMARY KEY (id_tryout, id_soal),
    CONSTRAINT uq_tryout_soal_urutan UNIQUE (id_tryout, urutan) DEFERRABLE INITIALLY IMMEDIATE
);
CREATE INDEX idx_tryout_soal_soal ON tryout_soal (id_soal);

-- 15. Sekali pengerjaan per siswa-paket; hasil tidak lengkap ditolak saat selesai.
CREATE TABLE hasil_tryout (
    id_hasil UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_tryout UUID NOT NULL REFERENCES tryout(id_tryout) ON DELETE RESTRICT,
    id_user UUID NOT NULL REFERENCES users(id_user) ON DELETE RESTRICT,
    status VARCHAR(15) NOT NULL DEFAULT 'Berlangsung' CHECK (status IN ('Berlangsung', 'Selesai')),
    skor NUMERIC(5,2) CHECK (skor BETWEEN 0 AND 100),
    jumlah_benar INTEGER CHECK (jumlah_benar >= 0),
    waktu_mulai TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    waktu_selesai TIMESTAMPTZ,
    CONSTRAINT uq_hasil_tryout_tryout_user UNIQUE (id_tryout, id_user),
    CONSTRAINT ck_hasil_tryout_status CHECK (
        (status = 'Berlangsung' AND skor IS NULL AND jumlah_benar IS NULL AND waktu_selesai IS NULL)
        OR (status = 'Selesai' AND skor IS NOT NULL AND jumlah_benar IS NOT NULL AND waktu_selesai IS NOT NULL)
    ),
    CONSTRAINT ck_hasil_tryout_urutan_waktu CHECK (waktu_selesai IS NULL OR waktu_selesai >= waktu_mulai)
);
CREATE INDEX idx_hasil_tryout_user_waktu ON hasil_tryout (id_user, waktu_mulai DESC);

-- 16. Autosave pada pasangan hasil-soal. Keanggotaan soal dicek API.
CREATE TABLE jawaban_siswa (
    id_jawaban UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_hasil UUID NOT NULL REFERENCES hasil_tryout(id_hasil) ON DELETE RESTRICT,
    id_soal UUID NOT NULL REFERENCES soal(id_soal) ON DELETE RESTRICT,
    jawaban_dipilih CHAR(1) CHECK (jawaban_dipilih IN ('A', 'B', 'C', 'D', 'E')),
    is_ragu BOOLEAN NOT NULL DEFAULT FALSE,
    is_benar BOOLEAN,
    CONSTRAINT uq_jawaban_siswa_hasil_soal UNIQUE (id_hasil, id_soal),
    CONSTRAINT ck_jawaban_kosong_bukan_benar CHECK (is_benar IS DISTINCT FROM TRUE OR jawaban_dipilih IS NOT NULL)
);
CREATE INDEX idx_jawaban_siswa_soal ON jawaban_siswa (id_soal);

COMMIT;

-- updated_at diisi ulang oleh API saat UPDATE; tidak ada trigger otomatis.
-- Role FK, izin per subtes, pembayaran, pembekuan soal/tryout, dan skor
-- memerlukan transaksi/otorisasi server. Lihat 03_rencana_backend.md.

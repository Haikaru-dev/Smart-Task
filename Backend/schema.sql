-- =====================================================================
-- SmartTask DB — Schema Lengkap v2.0
-- Menggantikan database.sql + setup_tables.sql (kedua-dua sudah lapuk)
-- Berdasarkan struktur sebenar yang digunakan oleh Backend/server.js
-- Jalankan dalam XAMPP phpMyAdmin atau MySQL CLI:
--   source C:/SmartTask/Backend/schema.sql
-- =====================================================================

CREATE DATABASE IF NOT EXISTS smarttask_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_general_ci;

USE smarttask_db;

-- ─────────────────────────────────────────────────────────────────
-- Jadual: users (akaun log masuk — Manager dan Staff)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id         INT          NOT NULL AUTO_INCREMENT,
    username   VARCHAR(100) NOT NULL,
    password   VARCHAR(255) NOT NULL COMMENT 'bcrypt hash SAHAJA, BUKAN plain text',
    role       ENUM('Manager','Staff') NOT NULL DEFAULT 'Staff',
    name       VARCHAR(150) NULL     COMMENT 'Nama penuh, dikemaskini melalui /api/admin/update',
    email      VARCHAR(150) NULL,
    is_active  TINYINT(1)  NOT NULL DEFAULT 1,
    created_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ─────────────────────────────────────────────────────────────────
-- Jadual: staff (profil pekerja)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff (
    id           INT          NOT NULL AUTO_INCREMENT,
    full_name    VARCHAR(150) NOT NULL,
    job_title    VARCHAR(100) NOT NULL
        COMMENT 'Nilai sah: Designer | Operator Digital | Operator Mesin (Banner/Bunting) | Finishing | Pengurusan / Admin',
    status       ENUM('Aktif','Cuti','Tidak Aktif') NOT NULL DEFAULT 'Aktif',
    email        VARCHAR(150) NULL,
    phone_number VARCHAR(20)  NULL,
    user_id      INT          NULL COMMENT 'FK ke users.id — hubungan staf dengan akaun login',
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_staff_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ─────────────────────────────────────────────────────────────────
-- Jadual: orders (Tempahan pelanggan)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
    id                INT            NOT NULL AUTO_INCREMENT,
    order_number      VARCHAR(50)    NOT NULL COMMENT 'Format: ORD-YYYYMMDD-XXXX (dijana oleh server)',
    client_name       VARCHAR(150)   NOT NULL,
    item_type         VARCHAR(100)   NOT NULL,
    quantity          INT            NOT NULL DEFAULT 1,
    price             DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
    due_date          DATE           NOT NULL,
    delivery_type     VARCHAR(50)    NULL     COMMENT 'Contoh: Internal, External',
    delivery_location VARCHAR(255)   NULL,
    specifications    TEXT           NULL,
    status            ENUM('Pending','In Progress','Completed','Cancelled') NOT NULL DEFAULT 'Pending',
    created_at        TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_orders_number (order_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ─────────────────────────────────────────────────────────────────
-- Jadual: tasks (Tugasan bagi setiap tempahan)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
    id                INT         NOT NULL AUTO_INCREMENT,
    order_id          INT         NOT NULL,
    task_type         VARCHAR(50) NOT NULL COMMENT 'Nilai sah: Design | Printing | Packing | Delivery',
    description       TEXT        NULL,
    assigned_staff_id INT         NULL,
    start_time        DATETIME    NULL,
    end_time          DATETIME    NULL,
    status            ENUM('Pending','In Progress','Completed') NOT NULL DEFAULT 'Pending',
    approval_status   ENUM('Draft','Confirmed')                 NOT NULL DEFAULT 'Confirmed'
        COMMENT 'Draft = belum disahkan admin; Confirmed = staf boleh lihat',
    created_at        TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_tasks_order
        FOREIGN KEY (order_id)          REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_tasks_staff
        FOREIGN KEY (assigned_staff_id) REFERENCES staff(id)  ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ─────────────────────────────────────────────────────────────────
-- Jadual: leaves (Permohonan cuti staf)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leaves (
    id         INT  NOT NULL AUTO_INCREMENT,
    staff_id   INT  NOT NULL,
    start_date DATE NOT NULL,
    end_date   DATE NOT NULL,
    reason     TEXT NULL,
    status     ENUM('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_leaves_staff
        FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- =====================================================================
-- SEED DATA
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────
-- Staf (6 pekerja dengan job_title yang variasi)
-- ─────────────────────────────────────────────────────────────────
INSERT INTO staff (full_name, job_title, status, email, phone_number) VALUES
('Ahmad Ali',      'Designer',                        'Aktif', 'ahmad@shdesign.com',   '0112345678'),
('Siti Rahmah',    'Operator Digital',                'Aktif', 'siti@shdesign.com',    '0123456789'),
('Farid Hassan',   'Operator Mesin (Banner/Bunting)', 'Aktif', 'farid@shdesign.com',   '0134567890'),
('Nurul Ain',      'Finishing',                       'Aktif', 'nurul@shdesign.com',   '0145678901'),
('Zulkifli Omar',  'Pengurusan / Admin',              'Aktif', 'zul@shdesign.com',     '0156789012'),
('Halimah Yusof',  'Designer',                        'Aktif', 'halimah@shdesign.com', '0167890123');

-- ─────────────────────────────────────────────────────────────────
-- Users (akaun login)
--
-- !! PENTING !!
-- Password TIDAK BOLEH disimpan sebagai plain text.
-- Bahagian ini KOSONG dengan sengaja.
--
-- GUNAKAN salah satu cara berikut untuk cipta akaun:
--
-- CARA 1 (DISYORKAN) — Jalankan skrip seed Node.js:
--   node Backend/seed.js
--   Skrip ini akan hash password dengan bcrypt dan INSERT ke DB.
--   Akaun lalai: admin / Admin@1234  dan  ahmad.ali / Staff@1234
--
-- CARA 2 (Manual) — Jana hash dahulu dalam terminal:
--   node -e "require('bcrypt').hash('Admin@1234',10).then(h=>console.log(h))"
--   Kemudian jalankan:
--   INSERT INTO users (username,password,role,name,email)
--   VALUES ('admin','<HASH_DI_ATAS>','Manager','Admin SmartTask','admin@shdesign.com');
--
-- ─────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────
-- Tempahan contoh
-- ─────────────────────────────────────────────────────────────────
INSERT INTO orders (order_number, client_name, item_type, quantity, price, due_date, delivery_type, delivery_location, specifications, status) VALUES
('ORD-20260601-1001', 'Kedai Cahaya Sdn Bhd',           'Banner Vinyl',  5,  250.00, '2026-07-10', 'External', 'No 12, Jalan Maju, Kuala Lumpur',     '3m x 1.5m, bahan vinyl 440gsm, cetak satu sisi',           'Pending'),
('ORD-20260605-1002', 'Restoran Maju Jaya',              'Bunting',      10,  180.00, '2026-07-05', 'Internal', NULL,                                  '1.5m x 0.6m, full colour, laminate matte',                 'Pending'),
('ORD-20260610-1003', 'Syarikat Matahari Trading',       'Kad Nama',    500,  150.00, '2026-07-15', 'External', 'No 5, Taman Industri, Petaling Jaya', 'Saiz standard 90x54mm, art card 310gsm, cetak dua sisi',   'In Progress'),
('ORD-20260615-1004', 'Persatuan Penduduk Taman Damai',  'Flyer',      1000,   80.00, '2026-07-20', 'Internal', NULL,                                  'A5, kertas 128gsm, full colour satu sisi',                 'Pending'),
('ORD-20260620-1005', 'TechStart Sdn Bhd',               'Roll-up Banner', 2, 320.00, '2026-07-08', 'External', 'Tower A, KLCC, Kuala Lumpur',        '85cm x 200cm, bahan pull-up, frame termasuk',              'Pending');

-- ─────────────────────────────────────────────────────────────────
-- Tugasan (tasks) untuk setiap tempahan
-- ─────────────────────────────────────────────────────────────────
INSERT INTO tasks (order_id, task_type, description, status, approval_status) VALUES
(1, 'Design',   'Reka bentuk banner vinyl untuk Kedai Cahaya. Warna korporat biru dan emas. Saiz kerja: 3m x 1.5m.',            'Pending', 'Confirmed'),
(1, 'Printing', 'Cetak banner vinyl 440gsm untuk Kedai Cahaya. Semak kalibrasi warna sebelum cetak.',                           'Pending', 'Confirmed'),
(2, 'Design',   'Reka bentuk bunting 10 keping untuk Restoran Maju Jaya. Sertakan logo restoran dan menu pilihan.',             'Pending', 'Confirmed'),
(2, 'Printing', 'Cetak 10 keping bunting full colour, laminate matte.',                                                         'Pending', 'Confirmed'),
(3, 'Design',   'Reka bentuk kad nama untuk Syarikat Matahari Trading. Gaya korporat formal, dua sisi.',                        'Pending', 'Confirmed'),
(3, 'Printing', 'Cetak 500 keping kad nama art card 310gsm.',                                                                   'Pending', 'Confirmed'),
(3, 'Packing',  'Susun dan bungkus kad nama — 100 keping setiap kotak (5 kotak jumlah).',                                      'Pending', 'Confirmed'),
(4, 'Design',   'Reka bentuk flyer A5 untuk Persatuan Penduduk Taman Damai. Tema mesra komuniti, warna hijau.',                 'Pending', 'Confirmed'),
(5, 'Design',   'Reka bentuk roll-up banner untuk TechStart Sdn Bhd. Tema teknologi, warna biru cerah dan putih.',              'Pending', 'Confirmed'),
(5, 'Printing', 'Cetak 2 keping roll-up banner pull-up untuk TechStart.',                                                       'Pending', 'Confirmed'),
(5, 'Delivery', 'Hantar 2 roll-up banner ke KLCC Tower A. Hubungi En. Hafiz (013-9876543) sebelum penghantaran.',              'Pending', 'Confirmed');

-- ─────────────────────────────────────────────────────────────────
-- Rekod Cuti (campuran Approved / Pending)
-- ─────────────────────────────────────────────────────────────────
INSERT INTO leaves (staff_id, start_date, end_date, reason, status) VALUES
(1, '2026-07-14', '2026-07-15', 'Cuti Sakit — Demam dan kelesuan. Sijil MC disertakan.',        'Approved'),
(2, '2026-07-21', '2026-07-22', 'Cuti Tahunan — Percutian bersama keluarga.',                   'Approved'),
(3, '2026-07-28', '2026-07-29', 'Urusan Peribadi — Urusan hospital ahli keluarga.',             'Pending'),
(4, '2026-08-04', '2026-08-04', 'Cuti Khas — Kenduri kahwin adik.',                             'Approved'),
(5, '2026-08-11', '2026-08-12', 'Cuti Tahunan — Rehat.',                                        'Pending');

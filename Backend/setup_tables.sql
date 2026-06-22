-- =====================================================
-- SmartTask DB: Cipta jadual Staff dan Leaves
-- Jalankan dalam XAMPP phpMyAdmin atau MySQL CLI
-- =====================================================

USE smarttask_db;

-- ── Jadual Staff ──
CREATE TABLE IF NOT EXISTS Staff (
    id        INT AUTO_INCREMENT PRIMARY KEY,
    name      VARCHAR(100)  NOT NULL,
    role      VARCHAR(100)  NOT NULL,
    status    VARCHAR(20)   NOT NULL DEFAULT 'Aktif',
    created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ── Jadual Leaves ──
CREATE TABLE IF NOT EXISTS Leaves (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    staff_id   INT          NOT NULL,
    start_date DATE         NOT NULL,
    end_date   DATE         NOT NULL,
    reason     TEXT,
    status     VARCHAR(20)  NOT NULL DEFAULT 'Pending',
    applied_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_id) REFERENCES Staff(id) ON DELETE CASCADE
);

-- ── Data contoh Staff ──
INSERT INTO Staff (name, role, status) VALUES
('Ahmad Ali',    'Designer',              'Aktif'),
('Siti Rahmah',  'Operator Digital',      'Aktif'),
('Farid Hassan', 'Operator Mesin (Banner/Bunting)', 'Aktif'),
('Nurul Ain',    'Finishing',             'Aktif'),
('Zulkifli Omar','Pengurusan / Admin',    'Aktif');

-- ── Data contoh Leaves ──
INSERT INTO Leaves (staff_id, start_date, end_date, reason, status) VALUES
(1, '2026-05-10', '2026-05-11', 'Cuti Sakit - Demam dan batuk', 'Approved'),
(2, '2026-05-12', '2026-05-12', 'Urusan Peribadi - Urusan keluarga', 'Pending'),
(3, '2026-05-08', '2026-05-09', 'Cuti Tahunan - Percutian keluarga', 'Approved');

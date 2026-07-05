-- Aliran kerja tempahan berperingkat (workflow.jpg) — §12 #16.
-- 1) Jenis tempahan menentukan tugasan yang dijana (Design Only / Product Only / Design & Product).
-- 2) Fail design pelanggan untuk Product Only.
-- 3) Status tugasan baharu 'Submitted' (staf hantar, menunggu kelulusan admin)
--    + sebab penolakan jika admin tolak hantaran.
ALTER TABLE orders
  ADD COLUMN order_type ENUM('Design Only','Product Only','Design & Product')
    NOT NULL DEFAULT 'Design & Product' AFTER item_type,
  ADD COLUMN design_file_path VARCHAR(255) NULL AFTER specifications;

-- Pembetulan ENUM lapuk (ditemui semasa ujian): DB tempatan lama tiada nilai
-- 'Cancelled' — MariaDB mod tak-ketat menyimpan '' secara senyap. schema.sql
-- v2.0 sudah betul; ALTER ini menyelaraskan DB sedia ada.
ALTER TABLE orders
  MODIFY COLUMN status ENUM('Pending','In Progress','Completed','Cancelled') NOT NULL DEFAULT 'Pending';

ALTER TABLE tasks
  MODIFY COLUMN status ENUM('Pending','In Progress','Submitted','Completed') NOT NULL DEFAULT 'Pending',
  ADD COLUMN rejection_reason TEXT NULL AFTER staff_notes;

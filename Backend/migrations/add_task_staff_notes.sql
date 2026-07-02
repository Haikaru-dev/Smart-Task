-- Migration: tambah lajur staff_notes ke jadual tasks
-- Jalankan sekali pada pangkalan data sedia ada melalui phpMyAdmin atau MySQL CLI

ALTER TABLE tasks
    ADD COLUMN staff_notes TEXT NULL AFTER attachment_path;

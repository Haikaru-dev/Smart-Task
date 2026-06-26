-- Migration: tambah lajur attachment_path ke jadual tasks
-- Jalankan sekali pada pangkalan data sedia ada melalui phpMyAdmin atau MySQL CLI

ALTER TABLE tasks
    ADD COLUMN attachment_path VARCHAR(255) NULL AFTER approval_status;

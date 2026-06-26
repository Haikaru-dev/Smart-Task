-- Migration: tambah lajur rejection_reason ke jadual leaves
-- Jalankan sekali pada pangkalan data sedia ada melalui phpMyAdmin atau MySQL CLI

ALTER TABLE leaves
    ADD COLUMN rejection_reason VARCHAR(500) NULL AFTER status;

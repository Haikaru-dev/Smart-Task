-- Migration: tambah lajur profile_picture_url ke jadual staff
-- Jalankan sekali pada pangkalan data sedia ada melalui phpMyAdmin atau MySQL CLI
-- NOTA: jika lajur sudah wujud (sesetengah DB lama), langkau migrasi ini.

ALTER TABLE staff
    ADD COLUMN profile_picture_url VARCHAR(255) NULL AFTER phone_number;

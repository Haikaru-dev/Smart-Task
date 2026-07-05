-- Jajarkan job_title sedia ada kepada model 2-peranan baharu.
-- 'Manager' TIDAK disentuh (bukan peranan operasi pengeluaran).
-- 'Printing Operator' ialah nilai tidak rasmi yang ditemui dalam DB tempatan
-- (bukan antara 5 jawatan lama) — turut dijajarkan ke 'Operator Am' kerana
-- ia peranan operasi pengeluaran; tanpa ini staf berkenaan tersingkir
-- daripada semua kolam agihan.
UPDATE staff
SET job_title = 'Operator Am'
WHERE job_title IN ('Operator Digital', 'Operator Mesin (Banner/Bunting)', 'Finishing', 'Pengurusan / Admin', 'Printing Operator');

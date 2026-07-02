# TEST_REPORT.md

**Tarikh ujian:** 2026-07-03
**Commit HEAD semasa ujian:** `020cf93` — "feat: implement automatic creation of four default tasks for new orders and add endpoint to retrieve order tasks"
**Keadaan pokok kerja:** bersih kecuali fail ujian baharu (`Backend/tests/*.js`) dan laporan ini.

---

## Metodologi

Dua lapisan ujian, direkodkan berasingan:

1. **Ujian automatik (Jest + supertest)** — `Backend/tests/`, corak sama dengan
   `login.test.js` sedia ada: `jest.mock('../db')` (semua akses MySQL dimock,
   termasuk `db.getConnection()` untuk route bertransaksi),
   `jest.mock('@google/generative-ai')` (Gemini distub), supertest memanggil
   app Express terus tanpa pelayan berjalan. Lapisan ini mengesahkan **logik
   handler** (status code, validasi, RBAC, parameter SQL) tetapi **TIDAK**
   mengesahkan keserasian dengan skema MySQL sebenar.
2. **Pengesahan manual (API sebenar + MySQL sebenar)** — instance ujian
   `PORT=5099 node server.js` terhadap `smarttask_db` XAMPP tempatan.
   Akaun ujian sementara dicipta terus dalam DB dengan hash bcrypt
   (`ujian_admin`/Manager, `ujian_staf`/Staff → staff id 11) kerana kata
   laluan akaun sebenar tidak diketahui. **Semua data ujian dibersihkan
   selepas tamat** — keadaan DB disahkan kembali ke garis dasar
   (tasks=0, max order=16, users=6, staff=9, max leave=16).
   Nota: pengesahan adalah pada peringkat API + DB; klik-lalui pelayar
   (React UI) tidak dilakukan dalam sesi ini.

Peraturan sesi: pepijat yang ditemui **TIDAK dibaiki** — direkodkan sahaja
(pemisahan audit-kemudian-baiki).

---

## Ringkasan

| Lapisan | Keputusan |
|---|---|
| Ujian automatik | **138 / 139 lulus** (1 gagal — IDOR sebenar, lihat Isu Baharu #A) |
| Semakan manual | **8 PASS penuh, 1 PASS separa (UC-08), 1 disekat persekitaran (UC-04 AI)** |

---

## Keputusan Automatik (daripada `npm test` sebenar, bukan anggaran)

```
Test Suites: 1 failed, 5 passed, 6 total
Tests:       1 failed, 138 passed, 139 total
Time:        5.083 s
```

| Fail | Kes | Lulus | Gagal | Skop |
|---|---|---|---|---|
| `login.test.js` (sedia ada) | 7 | 7 | 0 | F1, UC-01 |
| `orders.test.js` (baharu) | 8 | 8 | 0 | F2, UC-03, UC-11, isu #4/#12 — transaksi order+4 tugasan, rollback, validasi ENUM |
| `staff.test.js` (baharu) | 12 | 12 | 0 | F6, UC-02, UC-10, isu #5 — CRUD staf, guard padam-sendiri (400), gambar profil (403/400), hash kata laluan |
| `tasks.test.js` (baharu) | 11 | 10 | **1** | F3/F4, UC-04/07/08, isu #2/#6/#12 — staff_notes, konflik cuti 409/warning, DELETE dua kes, **IDOR ✗** |
| `leaves.test.js` (baharu) | 6 | 6 | 0 | F5, UC-05, UC-09 — Pending lalai, approve/reject + rejection_reason |
| `rbac.test.js` (baharu) | 95 | 95 | 0 | NFR 3.4.1.b — 26 route Manager-sahaja × token Staff (403), 34 route dilindungi × tanpa token (401) dan × token rosak (401) |

**Kegagalan tunggal (dikekalkan sengaja, bukan dibaiki):**
`GET /api/staff/tasks/:staff_id` — token Staff `staffId=4` meminta
`/api/staff/tasks/9` dijangka **403**, menerima **200** dengan data staf lain.
Lihat Isu Baharu #A.

---

## Keputusan Manual (per UC, terhadap pelayan + MySQL sebenar)

| UC | Tindakan Diuji | Keputusan Dijangka | Keputusan Sebenar | PASS/FAIL |
|---|---|---|---|---|
| UC-01 | Login `ujian_admin` dan `ujian_staf` melalui `POST /api/login` | role betul + token JWT + staffId diselesaikan | Manager: role=Manager, token ✓; Staff: role=Staff, staffId=11, nama dari jadual staff ✓ (redirect = client-side, data peranan yang dipulangkan betul) | **PASS** |
| UC-02 | Tambah staf → edit nama+jawatan → muat naik JPG sebenar → padam staf | Semua 200/201; fail di `uploads/staff/`; `profile_picture_url` dalam DB; akaun users turut dipadam | Tambah: staffId=12/`finishing01` ✓; Edit ✓; Upload: fail `staff-12-*.jpg` wujud di cakera + DB dikemaskini ✓; Padam: baris staff & users = 0 ✓ | **PASS** |
| UC-03 | **(Paling penting — isu #12)** Cipta Tempahan → semak `SELECT * FROM tasks WHERE order_id=<baru>` | 4 tugasan serta-merta | Order 21 dicipta → 4 baris tasks (Design/Printing/Packing/Delivery, Pending/Confirmed/NULL) muncul serta-merta dalam MySQL ✓ | **PASS** |
| UC-04 (Round-Robin) | Staf 11 diberi cuti Approved meliputi seluruh tempoh; jana jadual | Tugasan diagih; staf bercuti dilangkau | 4/4 tugasan diagih kepada staf 1,2,3,5; staf 11 (bercuti) menerima **0** tugasan ✓ | **PASS** |
| UC-04 (Gemini AI) | `POST /api/manager/auto-assign` dengan 1 tugasan belum diagih | Cadangan agihan AI | **HTTP 500** selepas 3 percubaan — `API_KEY_INVALID` (`GEMINI_API_KEY` tiada dalam `.env`). Kes "tiada tugasan" pulang 200 dengan mesej betul ✓ | **DISEKAT persekitaran** (lihat Isu #C) |
| UC-05 | Staf mohon cuti → Admin lulus; mohon lagi → Admin tolak dengan sebab → staf semak semula | Status & rejection_reason kelihatan kepada staf | Leave 20: Approved ✓; Leave 21: Rejected + reason 'Ujian manual: kuota cuti' ✓ — kedua-duanya kelihatan melalui `GET /api/staff/leaves/11` | **PASS** |
| UC-08 (nota) | Staf PATCH status + notes, kemudian GET semula (simulasi refresh) | Nota kekal | status=In Progress, notes='Nota UC-08 tanpa fail' kekal selepas GET semula ✓ | **PASS** |
| UC-08 (fail bukti) | PATCH status + notes + fail JPG | 200, attachment disimpan | **HTTP 500** — `ER_BAD_FIELD_ERROR: Unknown column 'attachment_path'`; fail SUDAH ditulis ke `uploads/tasks/` tetapi UPDATE gagal sepenuhnya (nota turut hilang) | **FAIL** (lihat Isu #B) |
| UC-11 | PATCH status order → GET semula; cuba status tak sah | Kekal selepas "refresh"; 400 untuk nilai tak sah | Order 21 → In Progress, kekal pada GET baharu ✓; 'StatusRekaan' → 400 ✓ | **PASS** |
| *(Bonus F3.3)* | PUT /api/tasks/:id tetapkan staf bercuti penuh, kemudian selepas cuti dipadam | 409 → 200 | 409 semasa cuti penuh ✓; 200 tanpa warning selepas cuti dipadam ✓ | **PASS** |

---

## Isu Baharu Ditemui

### 🔴 #A — IDOR: `GET /api/staff/tasks/:staff_id` tiada semakan pemilikan (F4.1, NFR 3.4.1.b)

**Bukti (ujian automatik, `tasks.test.js`):** token Staff dengan `staffId=4`
memanggil `GET /api/staff/tasks/9` → dijangka 403, **sebenar 200 dengan data
tugasan staf 9**. Handler (`server.js` ~baris 1240) terus query dengan param
URL tanpa membandingkannya dengan `req.user.staffId` — berbeza dengan
`PATCH /api/tasks/:id/status` dan `profile-picture` yang ada semakan.
**Corak sama (pemerhatian statik, belum diuji satu-satu):**
`GET /api/staff/leaves/:staff_id` (staf boleh baca cuti staf lain),
`PUT /api/staff/update-profile/:id` (staf boleh ubah emel/telefon staf lain),
`GET /api/staff/:id`. `change-password/:userId` separa terlindung kerana
mewajibkan kata laluan semasa akaun sasaran.
**Cadangan skop pembetulan (prompt berasingan):** tambah semakan
`req.user.role === 'Staff' && String(req.user.staffId) !== String(req.params...)`
→ 403, seperti corak sedia ada dalam PATCH status.

### 🔴 #B — Hanyutan skema: lajur lampiran tugasan `attachment_path` tiada dalam DB tempatan (F4.4, UC-08)

**Bukti (larian sebenar):** `PATCH /api/tasks/22/status` dengan fail →
`ER_BAD_FIELD_ERROR: Unknown column 'attachment_path' in 'field list'`
(log pelayan, errno 1054). `SHOW COLUMNS FROM tasks` tempatan menunjukkan
lajur lama **`completion_attachment_url`**, manakala kod + `schema.sql`
menggunakan **`attachment_path`**. Kesan sampingan: fail bukti sudah ditulis
ke cakera sebelum UPDATE gagal (fail yatim), dan seluruh UPDATE gagal —
nota staf turut tidak disimpan pada permintaan yang sama. Jadual tempatan
juga tiada `created_at` (ada dalam schema.sql). Ini lanjutan corak §5.2
NEW_ARCHITECTURE.md (DB tempatan ≠ schema.sql) — kini terbukti menyebabkan
kegagalan fungsi sebenar, bukan sekadar kosmetik.
**Keputusan diperlukan pengguna:** jajarkan DB tempatan ke schema.sql
(RENAME lajur, kekalkan data) ATAU ubah kod ikut DB — jangan buat kedua-duanya.

### 🟡 #C — `GEMINI_API_KEY` tiada dalam `.env` — laluan AI tidak berfungsi dalam persekitaran ini (F3 AI)

**Bukti:** `.env` hanya mengandungi `DATABASE_URL`. `auto-assign` dengan
tugasan belum diagih → 3 percubaan Gemini semuanya `400 API_KEY_INVALID`
→ respons 500. Tambahan: `db.js` sebenarnya membaca `DB_HOST/DB_USER/
DB_PASSWORD/DB_NAME` (bukan `DATABASE_URL`) — sambungan DB berjaya hanya
kerana nilai fallback kebetulan sepadan dengan XAMPP lalai. `JWT_SECRET`
juga masih belum ditetapkan (isu §12 #3 — amaran startup muncul seperti
dijangka). Kod AI sendiri TIDAK disahkan salah — ia tidak dapat diuji di sini.

### 🟡 #D — Baris staf dengan `status = NULL` tidak akan pernah menerima tugasan

**Bukti:** staf id 6 & 7 dalam DB tempatan mempunyai `status = NULL`
(lajur ENUM tempatan membenarkan NULL — lanjutan §5.2). Semua laluan agihan
menapis `WHERE status = 'Aktif'`, jadi mereka dilangkau secara senyap.
Data turut menunjukkan nama berganda (6 vs 8, 7 vs 9) — kualiti data,
kemungkinan baris ujian lama. Bukan pepijat kod; perlu pembersihan data
selepas keputusan migrasi #B.

---

## Kesimpulan

Dakwaan **"17/17 F-requirements, 11/11 UC patuh"** dalam NEW_ARCHITECTURE.md
**TIDAK disahkan sepenuhnya** oleh ujian sebenar dan perlu diperbetulkan:

- **Disahkan benar (majoriti):** F1, F2 (termasuk isu #12 — penjanaan 4 tugasan
  automatik BERFUNGSI pada larian sebenar), F3.3 (409/warning pada larian
  sebenar), F5, F6.1/F6.2, UC-01/02/03/05/11, RBAC 26 route Manager (95 kes lulus).
- **Perlu diturunkan taraf:**
  - **F4.1/UC-07** — "papar tugasan khusus staf log masuk" berfungsi, tetapi
    tiada penguatkuasaan pemilikan (Isu #A) → sepatutnya "✅ dengan kaveat
    keselamatan" atau "⚠️ Separa".
  - **F4.4/UC-08** — muat naik bukti kerja **GAGAL pada persekitaran sebenar
    semasa** (Isu #B). Kod betul terhadap schema.sql, tetapi "patuh" tidak
    boleh didakwa selagi DB tempatan belum dijajarkan.
  - **F3.1–F3.2 (laluan AI)** — tidak dapat disahkan dalam persekitaran ini
    (Isu #C); hanya Round-Robin terbukti hujung-ke-hujung.
- Pembetulan untuk Isu #A dan #B hendaklah dibuat sebagai **prompt berasingan**
  selepas laporan ini disemak, mengikut disiplin audit-kemudian-baiki.

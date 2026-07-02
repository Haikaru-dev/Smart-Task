# ARCHITECTURE.md

Dokumen rujukan teknikal rasmi untuk sistem **SmartTask**.
Sumber kebenaran (*source of truth*) tunggal untuk tech stack, skema pangkalan data,
kontrak API, dan status pematuhan terhadap keperluan FYP.

> **Gantian penuh** bagi `ARCHITECTURE.md` dan sebahagian besar `CLAUDE.md` yang lama.
> Kedua-dua dokumen tersebut didapati **lapuk dan bercanggah dengan kod sebenar**
> semasa audit ini — lihat §0.2. Claude Code hendaklah rujuk dokumen INI, bukan
> versi lama, sebagai baseline pembangunan seterusnya.

---

## 0. Status Dokumen & Kaedah Pengesahan

### 0.1 Bagaimana dokumen ini dihasilkan

Setiap dakwaan dalam dokumen ini disahkan melalui salah satu daripada dua cara:

1. **Kod sebenar** — `git clone` terus daripada `github.com/Haikaru-dev/Smart-Task`
   (branch `main`, commit `4443080` — 2026-07-02 17:45 +0800), dibaca fail demi fail
   (`server.js`, `schema.sql`, `middleware/auth.js`, `App.jsx`, komponen React
   berkaitan). **Bukan** disalin daripada dokumentasi lama.
2. **Baseline keperluan FYP rasmi** — Jadual 3.1 (Keperluan Pengguna), Jadual 3.2
   (Keperluan Fungsian F1–F6.2), Seksyen 3.4 (Keperluan Bukan Fungsian), Rajah 3.2
   (Rajah Kes Guna), Jadual 3.6–3.16 (Spesifikasi Kes Guna UC-01–UC-11), dan
   Jadual 3.17–3.22 (Kamus Data) daripada laporan PDF.

Bila kedua-dua sumber bercanggah, §12 (Isu Pematuhan) menyenaraikan percanggahan
tersebut secara eksplisit — dokumen ini **tidak** menyembunyikan percanggahan demi
kelihatan kemas.

### 0.2 Kenapa penulisan semula ini diperlukan

Audit mendapati `ARCHITECTURE.md` dan `CLAUDE.md` versi sedia ada dalam repo sendiri
sudah tidak selari dengan kod:

| Dokumen lama mendakwa | Kod sebenar (disahkan) |
|---|---|
| "Auth: `bcrypt.compare()` — tiada JWT/sesi pelayan" | JWT penuh (`jsonwebtoken`), `verifyToken`/`requireRole` pada **semua** 31 route |
| Jadual `staff` ada `staff_id_code`, `profile_picture_url` | Kedua-dua lajur **tidak wujud** dalam `schema.sql` sebenar |
| Jadual `tasks` ada lajur `staff_notes`, `completion_attachment_url` | Lajur sebenar ialah `attachment_path`; `staff_notes` **tidak wujud**; `approval_status` (Draf/Sahkan) **tiada langsung** dalam dokumentasi lama walaupun wujud dalam DB |
| CLAUDE.md: *"single-file app ~716 lines"* | `server.js` kini **1386 baris** (hampir 2×) |
| CLAUDE.md: *".env pakai `DATABASE_URL`"* | `db.js` sebenar baca `DB_HOST`/`DB_USER`/`DB_PASSWORD`/`DB_NAME` |
| CLAUDE.md: *"No test suite is configured yet"* | `Backend/tests/login.test.js` wujud (Jest + Supertest) |
| CLAUDE.md: *"akaun pengurus pertama disimpan plain text"* | `seed.js` guna `bcrypt.hash()` untuk **semua** akaun termasuk admin |
| Tech stack table (lama) tiada `jsonwebtoken`, `multer` | Kedua-duanya dependency teras (`package.json`) |

Kesimpulan: bukan sahaja logik sistem ada jurang berbanding keperluan FYP (§12),
dokumentasi sendiri turut gagal mengesan pembangunan yang sudah berlaku. Dokumen
ini ditulis semula daripada kod sebenar untuk betulkan kedua-dua masalah serentak.

---

## 1. Gambaran Keseluruhan Sistem

SmartTask ialah sistem pengurusan tugasan harian berasaskan web untuk
**SH Design & Print Sdn. Bhd.**, menggabungkan tiga pendekatan:

- **TPS** — merekod tempahan, tugasan, dan permohonan cuti secara sistematik
- **DSS** — papan pemuka dengan KPI dan log aktiviti untuk sokongan keputusan
- **AI** — Google Gemini 2.5 Flash (Function Calling) mencadangkan agihan tugasan
  berdasarkan kemahiran, beban kerja, dan konflik cuti

Dua portal:
- **Portal Admin/Pengurus** (`/dashboard`, `/tempahan`, `/staf`, `/jadual`, `/cuti`, `/profil`)
- **Portal Staf** (`/staf/tugasan`, `/staf/cuti`, `/staf/profil`)

### 1.1 Pemetaan Istilah — FYP ↔ Kod

Laporan FYP guna istilah "**Admin (Pengurus)**" dan "**Staf**" sebagai pelakon.
Kod guna nilai ENUM `role`. Sentiasa rujuk jadual ini bila baca mana-mana bahagian
dokumen ini atau kod:

| Istilah FYP | Nilai `role` dalam DB/JWT | Catatan |
|---|---|---|
| Admin / Pengurus | `'Manager'` | **Bukan** `'Admin'` — lihat §12 (isu kecil, dead code) |
| Staf | `'Staff'` | |
| Tempahan | jadual `orders` | |
| Tugasan | jadual `tasks` | |
| Cuti | jadual `leaves` | |
| Pengguna | jadual `users` (akaun log masuk) | |

---

## 2. Tech Stack (Disahkan daripada `package.json`)

| Lapisan | Teknologi | Versi |
|---|---|---|
| Backend Runtime | Node.js (CommonJS) | — |
| Backend Framework | Express.js | ^5.2.1 |
| Pangkalan Data | MySQL via XAMPP (InnoDB, utf8mb4) | — |
| MySQL Driver | mysql2/promise | ^3.22.3 |
| **Pengesahan (Auth)** | **jsonwebtoken (JWT)** | **^9.0.3** |
| Hash Kata Laluan | bcrypt | ^6.0.0 |
| **Muat Naik Fail** | **multer** | **^2.2.0** |
| AI Engine | Google Gemini 2.5 Flash (Function Calling) | SDK `@google/generative-ai` ^0.24.1 |
| Pembolehubah Persekitaran | dotenv | ^17.4.2 |
| CORS | cors | ^2.8.6 |
| **Ujian (Backend)** | **jest + supertest** | **^30.4.2 / ^7.2.2** (devDependency) |
| Frontend Framework | React | ^18.2.0 |
| Build Tool | Vite | ^4.4.5 |
| Routing (Frontend) | React Router DOM | ^7.14.2 |
| HTTP Client | Axios | ^1.15.2 |
| Ikon | lucide-react + inline SVG | ^0.263.1 |

Baris **bold** ialah dependency teras yang hilang daripada jadual tech stack versi lama.

---

## 3. Senibina Sistem (MVC)

```
┌─────────────────────────────────────────────────────────┐
│                   BROWSER (React SPA)                    │
│   Portal Admin (/dashboard, /staf, /jadual, /tempahan…)  │
│   Portal Staf  (/staf/tugasan, /staf/cuti, /staf/profil) │
└────────────────────────┬──────────────────────────────────┘
                          │ Axios + Bearer <JWT> → localhost:5000
┌────────────────────────▼──────────────────────────────────┐
│              BACKEND (Express.js — server.js)             │
│   Controller: semua route handler, 1 fail (1386 baris)    │
│   Middleware: cors(), express.json(), verifyToken(),       │
│               requireRole(...), multer (upload lampiran)  │
└────────┬──────────────────────────────┬────────────────────┘
         │ mysql2 (connection pool)     │ @google/generative-ai SDK
┌────────▼──────────┐        ┌──────────▼──────────────────┐
│  MySQL (XAMPP)     │        │  Gemini 2.5 Flash API        │
│  smarttask_db      │        │  (Function Calling, mode ANY)│
└────────────────────┘        └───────────────────────────────┘
```

**Lapisan:**
- **View** — React 18 SPA, dua layout berasingan: `Layout.jsx` (admin, sidebar+topbar)
  dan `StaffLayout.jsx` (staf). Routing oleh React Router DOM v7 (`App.jsx`).
- **Controller** — semua route handler dalam `Backend/server.js`. Tiada pemisahan
  ke fail `routes/` berasingan (lihat §15 — pemodulan dirancang tetapi ditangguh).
- **Model** — pool `mysql2/promise` (`Backend/db.js`). Tiada ORM; semua query SQL mentah.

### 3.1 Pengesahan & Sesi (BETUL — bukan seperti dokumen lama)

- Log masuk melalui `POST /api/login` (endpoint berpusat, Manager & Staff).
- Kata laluan disahkan dengan `bcrypt.compare()`.
- **Selepas kata laluan sah, sistem menjana JWT** (`jsonwebtoken`):
  ```js
  jwt.sign({ userId, role, staffId }, JWT_SECRET, { expiresIn: '24h' })
  ```
- Token disimpan client-side dalam `localStorage['authToken']`; profil pengguna
  dalam `localStorage['user']` (Manager) atau `localStorage['staffUser']` (Staff).
- `Frontend/src/main.jsx` — interceptor Axios menyisip `Authorization: Bearer <token>`
  secara automatik pada setiap request, dan redirect ke halaman log masuk yang betul
  bila respons `401`/`403` diterima (bukan endpoint `/api/login` sendiri).
- Setiap route backend (kecuali `/api/login`) dilindungi `verifyToken` (sahkan JWT)
  dan `requireRole(...)` (semak peranan) — `Backend/middleware/auth.js`.
- **Frontend** turut ada lapisan pertahanan kedua: `<PrivateRoute>` (Manager) dan
  `<StaffPrivateRoute>` (Staff) dalam `App.jsx`, semak token + role dalam
  `localStorage` sebelum benarkan akses laluan.

**Risiko keselamatan disahkan (lihat §12, Keutamaan Tinggi):**
```js
const JWT_SECRET = process.env.JWT_SECRET || 'smarttask_dev_secret_TUKAR_DI_PRODUKSI';
```
Fallback ini wujud dalam `server.js`, `middleware/auth.js`, **dan** `tests/login.test.js`.
Jika `.env` tidak menetapkan `JWT_SECRET`, string fallback inilah secret sebenar yang
digunakan — dan ia boleh dibaca sesiapa sahaja dalam repo awam.

---

## 4. Peranan Pengguna & Kawalan Akses (RBAC)

Berdasarkan Jadual 3.1 (Keperluan Pengguna) dan Keperluan Bukan Fungsian 3.4.1(b):
*"Staf dihalang daripada mengakses fungsi pentadbiran sensitif yang dikhaskan untuk
Pengurus, seperti pendaftaran tempahan dan penjanaan jadual."*

| Fungsi | Admin/Pengurus (`Manager`) | Staf (`Staff`) | Guard sebenar |
|---|---|---|---|
| Log masuk / keluar / profil sendiri | ✅ | ✅ | `verifyToken` sahaja |
| Daftar/lihat Tempahan | ✅ | ❌ | `requireRole('Manager')` |
| Menjana Jadual (AI/Round-Robin) | ✅ | ❌ | `requireRole('Manager')` |
| Urus akaun Staf (tambah/padam) | ✅ | ❌ | `requireRole('Manager')` |
| Lulus/tolak Cuti | ✅ | ❌ | `requireRole('Manager')` |
| Lihat papan pemuka & statistik | ✅ | ❌ | `requireRole('Manager')` |
| Lihat tugasan sendiri | — | ✅ (milik sendiri sahaja) | `requireRole('Staff','Manager')` + semakan `staffId` |
| Kemaskini status tugasan sendiri | — | ✅ (milik sendiri sahaja) | ownership check di baris kod (§6, §12) |
| Mohon Cuti | — | ✅ | `requireRole('Staff','Manager')` |
| Kemaskini profil sendiri | ✅ | ✅ | `requireRole('Staff','Manager')` |

Status: **RBAC dikuatkuasakan konsisten pada peringkat backend untuk semua 31 route**
(disahkan — lihat §6). Ini ialah salah satu bahagian sistem yang **paling patuh**
berbanding keperluan 3.4.1(b).

---

## 5. Skema Pangkalan Data (Disahkan daripada `Backend/schema.sql` v2.0)

Nama DB: `smarttask_db` · Engine: InnoDB · Charset: `utf8mb4_general_ci`

Setiap jadual di bawah ialah **struktur sebenar** dalam kod. Kotak "Perbezaan dengan
Kamus Data FYP" membandingkan dengan Jadual 3.17–3.22 rasmi.

### 5.1 `users` — (Kamus Data: Jadual 3.17 "Kelas Pengguna")

| Lajur | Jenis | Nota |
|---|---|---|
| id | INT PK, AUTO_INCREMENT | |
| username | VARCHAR(100) UNIQUE | |
| password | VARCHAR(255) | bcrypt hash SAHAJA |
| role | ENUM('Manager','Staff') | |
| name | VARCHAR(150) NULL | |
| email | VARCHAR(150) NULL | |
| is_active | TINYINT(1) DEFAULT 1 | |
| created_at | TIMESTAMP | |

> **Perbezaan dengan Kamus Data:** Jadual 3.17 tidak sebut lajur `name`/`email` pada
> `users` — kerana FYP mereka bentuk `Pengurus` sebagai jadual berasingan (Jadual 3.19)
> yang menyimpan `full_name`/`email` sendiri. Kod sebenar **tidak** ada jadual `Pengurus`
> — nama & emel Admin disimpan terus pada `users`. Lihat §12 untuk perbincangan.

### 5.2 `staff` — (Kamus Data: Jadual 3.18 "Kelas Staf")

| Lajur | Jenis | Nota |
|---|---|---|
| id | INT PK | |
| full_name | VARCHAR(150) | |
| job_title | VARCHAR(100) | Nilai sah: `Designer`, `Operator Digital`, `Operator Mesin (Banner/Bunting)`, `Finishing`, `Pengurusan / Admin` |
| status | ENUM('Aktif','Cuti','Tidak Aktif') DEFAULT 'Aktif' | Dipakai enjin AI untuk tapis staf tersedia |
| email | VARCHAR(150) NULL | |
| phone_number | VARCHAR(20) NULL | |
| user_id | INT NULL, FK → `users.id` **ON DELETE SET NULL** | |
| created_at | TIMESTAMP | |

> **Perbezaan dengan Kamus Data:**
> - ❌ **`staff_id_code`** (cth. "ST-001", disebut dalam UC-02) — **tiada** dalam DB sebenar.
> - ❌ **`profile_picture_url`** (F6.1, UC-02, UC-10) — **tiada** dalam DB sebenar, dan
>   **tiada langsung** dalam Frontend/Backend (0 padanan carian kod). Ciri gambar profil
>   **belum dibina** (§12, Keutamaan Sederhana).
> - ✅ `status` (`Aktif`/`Cuti`/`Tidak Aktif`) — tambahan berguna, **tiada** dalam kamus
>   data asal tetapi diperlukan enjin AI; patut ditambah secara rasmi ke kamus data FYP
>   dalam laporan (bukan isu kod).

### 5.3 `orders` (Tempahan) — (Kamus Data: Jadual 3.20 "Kelas Tempahan")

| Lajur | Jenis | Nota |
|---|---|---|
| id | INT PK | |
| order_number | VARCHAR(50) UNIQUE | Format `ORD-YYYYMMDD-XXXX`, dijana server |
| client_name | VARCHAR(150) | |
| item_type | VARCHAR(100) | |
| quantity | INT | |
| **price** | DECIMAL(10,2) | **Tambahan** — tiada dalam kamus data |
| due_date | DATE | |
| delivery_type | VARCHAR(50) | Nilai guna: `Internal`/`External` (bukan ENUM DB, hanya komen) |
| delivery_location | VARCHAR(255) NULL | |
| specifications | TEXT NULL | |
| status | ENUM('Pending','In Progress','Completed','**Cancelled**') | `Cancelled` **tambahan**, tiada dalam kamus data |
| created_at | TIMESTAMP | |

> **Perbezaan dengan Kamus Data:** `price` dan status `Cancelled` ialah tambahan
> berguna yang tidak didokumenkan dalam laporan asal — perlu direkodkan dalam
> kemas kini laporan FYP, bukan dibuang daripada kod.

### 5.4 `tasks` (Tugasan) — (Kamus Data: Jadual 3.21 "Kelas Tugasan")

| Lajur | Jenis | Nota |
|---|---|---|
| id | INT PK | |
| order_id | INT, FK → `orders.id` **ON DELETE CASCADE** | |
| task_type | VARCHAR(50) | Nilai sah: `Design`, `Printing`, `Packing`, `Delivery` (komen sahaja, bukan ENUM DB) |
| description | TEXT NULL | |
| assigned_staff_id | INT NULL, FK → `staff.id` **ON DELETE SET NULL** | NULL = belum diagihkan |
| start_time / end_time | DATETIME NULL | Diisi enjin AI/Round-Robin |
| status | ENUM('Pending','In Progress','Completed') | |
| **approval_status** | **ENUM('Draft','Confirmed') DEFAULT 'Confirmed'** | **Tiada dalam kamus data ATAU dokumentasi lama** — teras aliran draf-dan-sahkan (§11) |
| attachment_path | VARCHAR(255) NULL | Bukti kerja staf, cth. `/uploads/tasks/task-1-…pdf` |
| created_at | TIMESTAMP | |

> **Perbezaan dengan Kamus Data:**
> - ❌ **`staff_notes`** (kamus data + Jadual 3.1: *"Staf boleh menambah nota catatan
>   pada tugasan"*) — **lajur tiada dalam DB**. Ini bukan sekadar ketiadaan lajur —
>   ia satu jurang 3-lapisan aktif; lihat §12, Keutamaan Tinggi #2.
> - ✅ `approval_status` — mekanisme keselamatan tambahan (draf AI perlu disahkan
>   Admin dahulu sebelum staf nampak) yang **berfungsi dan diuji**, tetapi tidak
>   didokumenkan di mana-mana (bukan dalam kamus data, bukan dalam UC-04 teks).
>   Patut dimasukkan sebagai penambahbaikan dalam laporan FYP.
> - Nama lajur `completion_attachment_url` (kamus data) → sebenarnya `attachment_path`
>   dalam DB. Fungsi sama, nama berbeza — tiada isu fungsian, hanya nota untuk konsistensi
>   penulisan laporan.

### 5.5 `leaves` (Cuti) — (Kamus Data: Jadual 3.22 "Kelas Permohonan Cuti")

| Lajur | Jenis | Nota |
|---|---|---|
| id | INT PK | |
| staff_id | INT, FK → `staff.id` **ON DELETE CASCADE** | |
| start_date / end_date | DATE | |
| reason | TEXT NULL | |
| status | ENUM('Pending','Approved','Rejected') | |
| **rejection_reason** | VARCHAR(500) NULL | **Tambahan** (migrasi terkini) — sebab penolakan, tiada dalam kamus data |
| applied_at | TIMESTAMP | |

### 5.6 Ketiadaan jadual `Pengurus` (Kamus Data: Jadual 3.19)

Kamus data FYP mereka bentuk `Pengurus` sebagai jadual berasingan (`id`, `user_id` FK,
`full_name`, `email`). Kod sebenar **tidak** melaksanakan jadual ini — data Admin
(`name`, `email`) disimpan terus pada `users`. Ini satu **penyimpangan reka bentuk
yang disengajakan** (kemungkinan besar kerana Admin tidak perlukan `job_title`/
`phone_number` seperti Staf), tetapi ia perlu **diselaraskan dengan laporan FYP**
(sama ada kemas kini rajah kelas/ERD dalam laporan untuk cerminkan reka bentuk
ringkas ini, atau bina jadual `admins` berasingan jika penilai FYP menuntut skema
tepat seperti kamus data). Ini keputusan skop untuk Kalll — bukan bug teknikal.

---

## 6. API Endpoints (Disahkan — 31 route, semua dalam `Backend/server.js`)

Semua endpoint berprefiks `/api/`. Port lalai `5000`. **Semua route bawah ini disahkan
mempunyai `verifyToken`** (tiada lagi route yang "terlepas" middleware ini — isu ini
telah diperbetulkan sejak nota audit terdahulu).

### Pengesahan
| Kaedah | Endpoint | Guard | F / UC |
|---|---|---|---|
| POST | `/api/login` | — (awam) | F1, UC-01 |

### Tempahan (Orders)
| Kaedah | Endpoint | Guard | F / UC |
|---|---|---|---|
| POST | `/api/orders` | Manager | F2.1, F2.2, UC-03 |
| GET | `/api/orders` | Manager | F2.4 |

> ⚠️ **Tiada `PUT`/`PATCH /api/orders/:id`.** Lihat §12, Keutamaan Tinggi #1 — F2.3
> dan UC-11 (Mengemas Kini Status Tempahan) tidak mempunyai laluan API.
> Tiada juga `GET /api/orders/:id` — paparan detail kemungkinan guna data yang
> sudah dimuatkan pada senarai (client-side), memadai untuk skala semasa.

### Staf
| Kaedah | Endpoint | Guard | F / UC |
|---|---|---|---|
| GET | `/api/staff` | Manager | Jadual 3.1 (Admin lihat senarai staf) |
| POST | `/api/staff` | Manager | UC-02 |
| GET | `/api/staff/:id` | Staff **atau** Manager | UC-02 (alt), dipakai `ProfilStaf.jsx` juga |
| DELETE | `/api/staff/:id` | Manager | UC-02 (alt: "Padam Staf") — ada guard halang padam akaun sendiri |
| PUT | `/api/staff/update-profile/:id` | Staff atau Manager | F6.1/F6.2, UC-10 (had: email + phone sahaja) |
| PUT | `/api/staff/change-password/:userId` | Staff atau Manager | F6.2, UC-10 |

> ⚠️ **Tiada `PUT /api/staff/:id` untuk kemas kini penuh (nama/jawatan) oleh Admin.**
> Carta alir (Rajah aliran "Urus Staf") tunjukkan kotak "Kemaskini / Padam Staf",
> tetapi teks UC-02 sendiri hanya sebut butang "Kembali" atau "Padam Staf" dalam
> aliran alternatif — jadi dokumen sumber FYP sendiri kurang jelas di sini. Sahkan
> dengan Kalll sama ada "Kemaskini" bermaksud edit penuh atau sekadar view sebelum
> teruskan kerja pada bahagian ini.

### Cuti (Leaves)
| Kaedah | Endpoint | Guard | F / UC |
|---|---|---|---|
| GET | `/api/leaves` | Manager | |
| POST | `/api/leaves` | Manager | *(nota: laluan admin cipta rekod cuti — fungsi ini sengaja dibuang daripada UI, lihat §11)* |
| GET | `/api/manager/leaves` | Manager | F5.3, UC-05 |
| PUT | `/api/manager/leaves/:id` | Manager | F5.4, UC-05 |
| GET | `/api/staff/leaves/:staff_id` | Staff atau Manager | F5.2 |
| POST | `/api/staff/leaves` | Staff atau Manager | F5.1, UC-09 |

### Tugasan & Janaan Jadual
| Kaedah | Endpoint | Guard | F / UC |
|---|---|---|---|
| GET | `/api/tasks/board` | Manager | Papan agihan (kanban/staf view) |
| POST | `/api/generate-schedule` | Manager | F3.1, UC-04 (alt: Round-Robin) — transaksi ✅, semak cuti *hari ini sahaja* |
| POST | `/api/manager/auto-assign` | Manager | F3.1–F3.3, UC-04 (AI) — pulang cadangan sahaja, tak simpan |
| POST | `/api/tasks/save-assignments` | Manager | Sahkan cadangan AI → simpan dalam transaksi |
| PUT | `/api/tasks/:id` | Manager | F3.4 — **tiada semakan konflik cuti** (lihat §12 #6) |
| POST | `/api/tasks/confirm` | Manager | Sahkan draf → `approval_status = 'Confirmed'` |
| DELETE | `/api/tasks/:id` | Manager | Padam draf sahaja (reset ke kolam belum diagih, bukan hard-delete) |
| PATCH | `/api/tasks/:id/status` | Staff atau Manager | F4.3, F4.4, UC-08 — semak pemilikan (`staffId`), terima `status` + `file` (multer). **Tidak terima `notes`** (§12 #2) |
| GET | `/api/staff/tasks/:staff_id` | Staff atau Manager | F4.1, F4.2, UC-07 |

### Dashboard
| Kaedah | Endpoint | Guard | F / UC |
|---|---|---|---|
| GET | `/api/dashboard/stats` | Manager | UC-06 |
| GET | `/api/dashboard/audit-logs` | Manager | UC-06 (Jejak Audit) |
| GET | `/api/dashboard/order-trends` | Manager | *(tiada dalam FYP asal — ciri tambahan)* |
| GET | `/api/dashboard/staff-performance` | Manager | *(tiada dalam FYP asal — ciri tambahan)* |
| GET | `/api/dashboard/leave-stats` | Manager | *(tiada dalam FYP asal — ciri tambahan)* |

### Profil Admin
| Kaedah | Endpoint | Guard | F / UC |
|---|---|---|---|
| GET | `/api/admin/profile/:userId` | Manager | F6.1 |
| PUT | `/api/admin/update/:userId` | Manager | F6.2 |

---

## 7. Pemetaan Keperluan Fungsian (F1–F6) → Status Pelaksanaan

| ID | Ringkasan Keperluan | Status | Bukti / Nota |
|---|---|---|---|
| F1–F1.4 | Log masuk ikut peranan, mesej ralat, redirect | ✅ Patuh | `POST /api/login`, JWT, `PrivateRoute`/`StaffPrivateRoute` |
| F2.1–F2.2 | Daftar Tempahan (butiran, jenis penghantaran) | ✅ Patuh | `POST /api/orders` |
| F2.3 | Kemas kini status percetakan (tender luar) | ❌ **Tiada** | Tiada route kemas kini status order — §12 #1 |
| F2.4 | Papar senarai penuh tempahan + status | ✅ Patuh | `GET /api/orders` |
| F3.1–F3.2 | Jana tugasan (Reka Bentuk/Bungkus/Hantar), tetapkan staf & masa | ✅ Patuh | Round-Robin + Gemini AI, dua-dua ada |
| F3.3 | Semak status cuti staf sebelum tetapkan tugasan | ⚠️ **Separa** | Lengkap pada laluan AI; *hari-ini-sahaja* pada Round-Robin; **tiada** pada edit manual (§12 #6) |
| F3.4 | Sunting/padam tugasan berjadual | ✅ Patuh | `PUT`/`DELETE /api/tasks/:id` |
| F4.1–F4.2 | Papar tugasan khusus staf log masuk + butiran | ✅ Patuh | `GET /api/staff/tasks/:staff_id`, semakan pemilikan |
| F4.3 | Kemas kini status tugasan | ✅ Patuh | `PATCH /api/tasks/:id/status` |
| F4.4 | Muat naik bukti kerja | ✅ Patuh | multer, jenis fail + saiz disahkan |
| F5.1 | Staf hantar permohonan cuti | ✅ Patuh | `POST /api/staff/leaves` |
| F5.2 | Papar sejarah & status cuti kepada Staf | ✅ Patuh | `GET /api/staff/leaves/:staff_id` |
| F5.3 | Pengurus lihat senarai cuti tertunggak | ✅ Patuh | `GET /api/manager/leaves` |
| F5.4 | Pengurus lulus/tolak cuti | ✅ Patuh | `PUT /api/manager/leaves/:id`, ada `rejection_reason` |
| F6.1 | Papar profil (nama, jawatan, emel) | ⚠️ **Separa** | Teks/data ✅; **gambar profil ❌** — §12 #3 |
| F6.2 | Tukar kata laluan | ✅ Patuh | `PUT /api/staff/change-password/:userId`, `PUT /api/admin/update/:userId` |
| *(Jadual 3.1)* | *"Staf boleh menambah nota catatan pada tugasan"* | ❌ **Tiada** | UI kutip data, tapi tak sampai DB — §12 #2 |

**Ringkasan:** 12/17 patuh penuh, 3 separa, 2 tiada langsung.

---

## 8. Pemetaan Spesifikasi Kes Guna (UC-01–UC-11)

| UC | Nama | Status | Nota |
|---|---|---|---|
| UC-01 | Log Sesi Pengguna | ✅ Patuh | |
| UC-02 | Mengurus Akaun Staf | ⚠️ Separa | Tambah + padam ✅; gambar profil ❌; "Kemaskini" penuh tak jelas (§6) |
| UC-03 | Menambah Tempahan | ⚠️ **Berisiko rosak** | Logik ✅ tapi bug case-sensitivity aktif — §12 #4 |
| UC-04 | Menjana & Kemaskini Tugasan | ✅ Patuh (+ lebih) | Draf-sahkan tidak dalam spek asal tapi selamat & berfungsi |
| UC-05 | Meluluskan Cuti | ✅ Patuh | |
| UC-06 | Paparan Papan Muka | ✅ Patuh | + ciri tambahan (donut, trend) tiada dalam FYP asal |
| UC-07 | Melihat Tugasan Harian | ✅ Patuh | |
| UC-08 | Mengemas Kini Status Tugasan | ⚠️ Separa | Status + bukti kerja ✅; nota/catatan ❌ |
| UC-09 | Memohon Cuti | ✅ Patuh | |
| UC-10 | Mengurus Profil Diri | ⚠️ Separa | Emel/telefon/kata laluan ✅; gambar profil ❌ |
| UC-11 | Mengemas Kini Status Tempahan | ❌ **Tiada** | Tiada endpoint langsung — §12 #1 |

---

## 9. Keperluan Bukan Fungsian (Seksyen 3.4.1) — Status

**(a) Kebolehgunaan** — Antara muka responsif, semua teks Bahasa Melayu, portal
mudah alih-mesra untuk Staf. Tiada isu ketara dikesan semasa audit kod.

**(b) Keselamatan** — RBAC dikuatkuasakan penuh pada backend (§4, §6: 31/31 route
bergerbang). Kata laluan di-hash bcrypt (disahkan `seed.js` + route tukar kata
laluan). **Tetapi**: JWT secret ada fallback hardcode terdedah dalam repo awam
(§3.1) — ini secara langsung bertentangan dengan semangat 3.4.1(b) walaupun bukan
RBAC per se. **Keutamaan Tinggi** untuk dibetulkan (§12 #3).

**(c) Kecekapan** — Penjanaan jadual (Round-Robin & AI-simpan) dibalut transaksi
MySQL (`beginTransaction`/`commit`/`rollback`) — disahkan dalam kod, bukan sekadar
dakwaan. Keperluan "respons < 3 saat setiap kemaskini status" tidak boleh disahkan
secara statik — perlu ujian beban sebenar jika hendak dilaporkan dalam FYP.

---

## 10. Aliran Kerja Teras (dipetakan daripada carta alir asal)

### 10.1 Log Masuk (carta alir "Mula → Peranan?")
`Input ID & Kata Laluan` → `POST /api/login` → bcrypt.compare → **jana JWT** →
`Peranan?` (`role` dalam token) → redirect `/dashboard` (Manager) atau
`/staf/tugasan` (Staff). Padan carta alir sepenuhnya.

### 10.2 Urus Staf + Tempahan (carta alir Admin, dua lajur)
- **Urus Staf:** `Paparan Senarai Staf` (`GET /api/staff`) → `Tambah` (`POST /api/staff`)
  atau `Detail` → `Lihat Profil Staf` (`GET /api/staff/:id`) → `Padam Staf`
  (`DELETE /api/staff/:id`, ada pengesahan + halang padam sendiri). **"Kemaskini"**
  pada carta alir tiada padanan route penuh — lihat §6, §12.
- **Tempahan:** `Paparan Senarai Tempahan` (`GET /api/orders`) → `Baru` →
  `Isi Borang` → `Simpan Tempahan` (`POST /api/orders`, ⚠️ bug case-sensitivity).
  Cabang **"Status → Lihat Detail → Ubah Status Cetakan → Simpan Status Cetakan"**
  **tiada padanan backend langsung** — §12 #1.

### 10.3 Cuti + Janaan Jadual (carta alir Admin)
- **Cuti:** `Paparan Senarai Cuti` (`GET /api/manager/leaves`) → semak dokumen →
  `Lulus`/`Tolak` (`PUT /api/manager/leaves/:id`, dengan `rejection_reason`). Padan penuh.
- **Jadual:** `Paparan Janaan Jadual` → `Jana Jadual Automatik` (Round-Robin **atau**
  Gemini AI) → `Simpan dan Agih Tugasan`. **Nota:** kod sebenar tambah lapisan
  draf-sahkan yang tiada dalam carta alir asal (Admin sahkan cadangan AI dahulu
  sebelum ia "muncul dalam akaun staf") — penambahbaikan keselamatan yang wajar
  didokumenkan semula dalam carta alir FYP.

### 10.4 Papan Muka Staf (carta alir Staf)
`Tugasan` → `Lihat Senarai Tugasan` (`GET /api/staff/tasks/:staff_id`) →
`Kemaskini?` → `Input Status & Muat Naik Bukti` (`PATCH /api/tasks/:id/status`).
**Nota:** carta alir tidak tunjukkan medan nota/catatan secara eksplisit, tetapi
Jadual 3.1 (keperluan pengguna) ada nyatakannya — dan UI sebenar (`TugasanStaf.jsx`)
sudah bina medan itu tanpa backend menyokongnya (§12 #2).
`Mohon Cuti` dan `Profil` — padan carta alir sepenuhnya dengan route berkaitan.

---

## 11. Enjin AI — Aliran Kerja Terperinci

Endpoint: `POST /api/manager/auto-assign`

**Peringkat 1 — Kumpul Data (SQL):** orders `Pending`/`In Progress` → tasks tanpa
`assigned_staff_id` (JOIN orders) → staff `status='Aktif'` → kira beban kerja semasa
→ rekod cuti `Approved` yang `end_date >= hari ini`.

**Peringkat 2 — Semak Konflik Cuti (JS, `getLeaveStatusForTask()`):** untuk setiap
pasangan (tugasan × staf), kira pertindihan tempoh cuti dengan tempoh tugasan
(hari ini hingga `due_date`):
- **Cuti penuh** meliputi tempoh tugasan → staf **dikecualikan** daripada `available_staff`
- **Cuti separa** → staf **kekal disenaraikan** dengan amaran `compressed_window`

**Peringkat 3 — Payload ke Gemini:** setiap tugasan dihantar berstruktur (task_id,
task_type, order_number, client_name, item_type, quantity, due_date, delivery_type,
delivery_location, available_staff[] dengan workload + compressed_window).

**Peringkat 4 — Gemini Function Calling:**

| Parameter | Nilai |
|---|---|
| Model | `gemini-2.5-flash` |
| Mode | `ANY` — paksa panggil fungsi, bukan teks bebas |
| Fungsi | `assign_tasks` |
| Output | `assignments[]`: `task_id`, `staff_id`, `start_time`/`end_time` (ISO 8601) |
| Retry | Sehingga 3×, backoff linear 1s/2s/3s |

Arahan prompt: padanan kemahiran (Design→Designer, Printing→Operator, Packing/
Delivery→Finishing), keutamaan `due_date` terdekat, anggaran masa (Design 4–8 jam;
Printing/Packing 1 jam/100 unit, min 1 jam), waktu kerja 09:00–18:00.

**Peringkat 5 — Respons & Pengesahan:** AI pulang `assignments[]` sebagai
**cadangan sahaja** (tiada auto-simpan) → papar untuk semakan Admin → Admin terima/
ubah → `POST /api/tasks/save-assignments` simpan dalam **satu transaksi MySQL**.

**Peringkat 6 (Alternatif) — Round-Robin:** `POST /api/generate-schedule`, agihan
mudah `index % staffList.length`, dibalut transaksi, **tetapi** semakan cuti di sini
hanya "bercuti hari ini" — tidak selaras sepenuhnya dengan pendekatan tetingkap-tarikh
Peringkat 2 di atas (§12 #6).

**⚠️ Peringatan pembangunan (kekal daripada dokumentasi terdahulu, masih sah):**
Logik pemadanan kemahiran, pengiraan beban kerja, dan pemprosesan konflik cuti Gemini
ini **jangan ditulis semula**. Sebarang pembetulan/penambahbaikan mesti berbentuk
lapisan validasi TAMBAHAN di sekeliling logik sedia ada, bukan gantian logik teras.
Hook `PreToolUse` pra-commit (`.claude/settings.json`) sudah gerbang perkara ini
secara automatik — lihat §15.

---

## 12. Isu Pematuhan Dikenalpasti — Senarai Bertindak

Disenaraikan ikut keutamaan. Setiap item termasuk lokasi tepat dalam kod supaya
boleh dijadikan satu Claude Code prompt berasingan (ikut konvensyen satu-prompt-
satu-commit sedia ada).

### 🔴 Keutamaan Tinggi

**#1 — Tiada endpoint kemas kini status Tempahan (F2.3, F2.4, UC-11)**
Tiada `PUT`/`PATCH /api/orders/:id` di mana-mana dalam `server.js`. Hanya
`POST` (cipta) dan `GET` (senarai) wujud untuk `orders`. Seluruh UC-11
("Mengemas Kini Status Tempahan" — cth. Dihantar untuk Dicetak → Hasil Cetakan
Diterima) tiada sokongan API. Perlu: route baharu + UI pada `Tempahan.jsx`
(atau halaman detail tempahan) untuk tukar `status`.

**#2 — Nota/catatan tugasan staf hilang senyap (Jadual 3.1)**
Tiga lapisan: (a) `tasks` tiada lajur nota; (b) `PATCH /api/tasks/:id/status`
tidak baca/tulis medan nota; (c) `Frontend/src/pages/staff/TugasanStaf.jsx`
`handleSave()` (~baris 176–184) **sudah** bina UI + state `form.notes` dan
placeholder "Tambah nota atau catatan...", tapi `FormData` yang dihantar
cuma `status` + `file` — `notes` terus dibuang sebelum sampai ke rangkaian.
Ini paling teruk berbanding ciri hilang biasa: staf nampak medan, taip nota,
tekan simpan, dapat mesej "berjaya" — padahal nota tak pernah sampai DB.
Perlu: lajur `staff_notes` (migrasi baharu, ikut corak `add_task_attachment.sql`),
backend terima & simpan, frontend hantar dalam `formData.append('notes', …)`.

**#3 — JWT secret fallback hardcode (3.4.1.b)**
`middleware/auth.js`, `server.js`, dan `tests/login.test.js` semua guna
`process.env.JWT_SECRET || 'smarttask_dev_secret_TUKAR_DI_PRODUKSI'`. Sahkan
`.env` (root projek) benar-benar tetapkan `JWT_SECRET` rawak yang kuat; fallback
ini kekal dalam kod sebagai selamat-gagal untuk dev, tapi risiko jika terlupa
tetapkan pada persekitaran demo/produksi memandangkan repo bersifat awam.

**#4 — Bug case-sensitivity `Orders` masih aktif separa (UC-03)**
Commit terkini (`4443080`, hari ini) betulkan `GET /api/orders` (`FROM Orders`
→ `FROM orders`) tetapi **terlepas** `POST /api/orders` — baris 169 `server.js`
masih `INSERT INTO Orders` (huruf besar). Pada MySQL/Linux case-sensitive
(`lower_case_table_names=0`), cipta Tempahan baharu akan gagal walaupun
senarai tempahan berfungsi. Pembetulan satu baris, tapi ini fungsi teras
(F2.1) yang **rosak dalam sesetengah persekitaran sekarang juga**.

### 🟡 Keutamaan Sederhana

**#5 — Gambar profil staf langsung tiada (F6.1, UC-02, UC-10)**
Carian menyeluruh (`profile_picture`, `gambar_profil`, `fotoProfil`, `avatarUrl`)
memulangkan **sifar** padanan dalam Frontend, Backend, dan `schema.sql`. Ciri
belum dimulakan langsung — perlu lajur DB, endpoint upload (boleh guna corak
`multer` sedia ada untuk lampiran tugasan), dan UI pada `SenaraiStaf.jsx`/
`DetailStaf.jsx` (Admin) serta `ProfilStaf.jsx` (Staf).

**#6 — Semakan konflik cuti (F3.3) tak konsisten merentas 3 laluan agihan**
- Laluan AI (`/api/manager/auto-assign`): semakan penuh tetingkap-tarikh ✅
- Round-Robin (`/api/generate-schedule`): semakan "bercuti **hari ini** sahaja" ⚠️
- Edit manual (`PUT /api/tasks/:id`): **tiada semakan langsung** ❌

  F3.3 tidak hadkan keperluan ini kepada laluan AI sahaja — ia keperluan am
  bila "Pengurus menetapkan tugasan". Admin boleh manual-assign staf yang
  bercuti tanpa amaran melalui `PUT /api/tasks/:id` pada masa ini.

### 🟢 Keutamaan Rendah

**#7** — Tiada jadual `Pengurus` berasingan (Kamus Data 3.19) — keputusan
reka bentuk, perlu diselaraskan dengan laporan FYP (§5.6), bukan bug.

**#8** — `Frontend/src/pages/manager/PengurusanCuti.jsx` — disahkan **anak
yatim** (tiada import/route ke fail ini di mana-mana). Guna `Cuti.jsx` untuk
kelulusan cuti Admin. **Jangan** sambungkan logik baharu ke fail ini.

**#9** — CSS mati: `.kpi-card--cyan` dan `.kpi-card--red` (`smarttask.css`
baris 424, 428) tak lagi dirujuk selepas kad "Staf Aktif"/"Staf Cuti" ditukar
ke `.kpi-card--neutral` (perbaikan sudah dibuat — lihat §0.2/§13, hanya CSS
lama tak dibuang).

**#10** — `App.jsx` `PrivateRoute`: `isManager = role === 'Manager' || role
=== 'Admin'` — cabang `'Admin'` mati kod (DB/JWT hanya pernah keluarkan
`'Manager'`). Tidak menyebabkan bug, tapi selaraskan penamaan supaya tidak
mengelirukan bila baca kod bersama istilah FYP "Admin (Pengurus)".

**#11** — `CLAUDE.md` sedia ada perlu dikemas kini besar-besaran (§0.2) —
bukan isu kod, tapi akan terus mengelirukan sesi Claude Code akan datang
jika dibiarkan sedia ada.

---

## 13. Struktur Folder Frontend (Disahkan)

```
Frontend/src/
├── App.jsx                    # Semua Route + PrivateRoute/StaffPrivateRoute
├── main.jsx                   # Entry point + interceptor Axios (JWT, redirect 401/403)
├── config.js                  # API_BASE_URL
├── index.css / smarttask.css  # Gaya global, kelas BEM-like (kpi-card, badge--*, dsb.)
├── components/
│   ├── Layout.jsx              # Layout Admin (sidebar + topbar)
│   ├── StaffLayout.jsx         # Layout Staf
│   ├── Pagination.jsx
│   └── JsonLd.jsx               # Schema.org (SEO)
└── pages/
    ├── manager/
    │   ├── Login.jsx, Dashboard.jsx, Tempahan.jsx, TempahanBaru.jsx,
    │   │   JanaanJadual.jsx, SenaraiStaf.jsx, DetailStaf.jsx, Cuti.jsx,
    │   │   ProfilAdmin.jsx
    │   └── PengurusanCuti.jsx  # ⚠️ ANAK YATIM — lihat §12 #8
    └── staff/
        ├── LoginStaf.jsx, TugasanStaf.jsx, CutiStaf.jsx, ProfilStaf.jsx
```

**Ciri terkini yang SUDAH dibina** (disahkan git log — bukan lagi "on the horizon"):
- Warna progres per-lajur staf pada `JanaanJadual.jsx`: hijau ≥90%, kuning 50–89%,
  merah <50% (kira daripada tugasan `approval_status='Confirmed'` sahaja); lajur
  merah boleh diklik → tukar ke paparan kanban.
- Carta donut progres keseluruhan pada `Dashboard.jsx` (guna `stats.completionRate`
  sedia ada, tiada fetch baharu).
- Kad KPI "Permohonan Cuti" boleh diklik → navigasi.
- Butang "Rekod Cuti" oleh Admin **dibuang** daripada `Cuti.jsx` (Admin tak patut
  cipta rekod cuti bagi pihak staf — selaras F5.1 yang khususkan Staf sebagai pelakon).
- Padam Staf: butang aktif + dialog pengesahan + halang padam akaun sendiri +
  urutan padam yang betul (padam `users` dahulu, kemudian `staff`, elak akaun terbiar).
- Reka bentuk semula UI Tempahan: baris jadual boleh diklik (gantikan butang
  "Lihat Detail"), butang "+ Tambah Tempahan" pada header senarai (gantikan
  pautan sidebar "Tempahan Baru" berasingan).

**Belum dibina:** dropdown hover profil di bahagian bawah-kiri sidebar (item ini
**masih** dalam senarai tertunggak — tiada padanan `hover`/`dropdown`/
`sidebar-profile` dikesan dalam `Layout.jsx` semasa audit).

---

## 14. Pembolehubah Persekitaran & Konfigurasi DB (Dibetulkan)

Fail `.env` diletak di **root projek** (satu tahap atas `Backend/`), disahkan
`.gitignore` (`*.env` tidak dikomit).

| Pembolehubah | Kegunaan | Lalai jika tiada |
|---|---|---|
| `GEMINI_API_KEY` | Wajib untuk `/api/manager/auto-assign` | — |
| `JWT_SECRET` | **Wajib tetapkan** — lihat §12 #3 | `'smarttask_dev_secret_TUKAR_DI_PRODUKSI'` (tidak selamat) |
| `PORT` | Port Express | `5000` |
| `DB_HOST` | Host MySQL | `localhost` |
| `DB_USER` | Pengguna MySQL | `root` |
| `DB_PASSWORD` | Kata laluan MySQL | `''` (kosong, lalai XAMPP) |
| `DB_NAME` | Nama pangkalan data | `smarttask_db` |

> **Pembetulan daripada dokumen lama:** `db.js` **tidak** guna `DATABASE_URL`
> (dakwaan lama dalam `CLAUDE.md`) — ia baca 4 pembolehubah berasingan
> (`DB_HOST`/`DB_USER`/`DB_PASSWORD`/`DB_NAME`) dengan fallback selamat-untuk-XAMPP
> jika tiada `.env` langsung. Ini sebenarnya **lebih baik** daripada yang
> didokumenkan sebelum ini — kod sudah sokong konfigurasi persekitaran berbeza.

**Persediaan pangkalan data:** jalankan `Backend/schema.sql` (skema + data contoh),
kemudian `node Backend/seed.js` (cipta akaun dengan bcrypt hash — `admin`/`Admin@1234`
dan 5 akaun staf `Staff@1234`). Fail lama yang dirujuk `CLAUDE.md` (`database.sql`,
`setup_tables.sql`) **tidak lagi wujud** — `schema.sql` ialah satu-satunya fail skema.

---

## 15. Aliran Kerja Pembangunan

- **Satu-prompt-satu-commit** — setiap prompt Claude Code diskop kepada satu
  perubahan logik, dikomit berasingan. Fail berkaitan rapat (cth. `Layout.jsx` +
  `StaffLayout.jsx`) boleh digabung jika ia kurangkan duplikasi.
- **Hook pra-commit** (`.claude/settings.json`, `PreToolUse` pada `git commit`) —
  agen semakan automatik jalankan `git diff --staged`, semak liputan
  `verifyToken`/`requireRole`, SQL berparameter, pembalutan transaksi, dan sama
  ada Gemini AI logic ditulis semula. `BLOCK` jika isu KRITIKAL/TINGGI dikesan.
- **Subagent `code-reviewer`** (`.claude/agents/code-reviewer.md`) — semakan
  bebas tanpa konteks perbualan pembinaan, guna checklist sama seperti hook.
- **Ujian:** `Backend/tests/login.test.js` (Jest + Supertest, DB dimock) —
  liputan semasa terhad kepada aliran log masuk. **Tiada** ujian untuk route
  lain lagi — peluang pengembangan jika masa membenarkan.
- **Sempadan "Jangan Sentuh" berterusan:**
  - Jangan tulis semula logik pemadanan kemahiran/beban kerja/konflik cuti Gemini
    (§11) — hanya lapisan validasi tambahan.
  - Jangan sambung logik ke `PengurusanCuti.jsx` (anak yatim, §12 #8).
  - Jangan tambah `axios`/state ke ikon loceng dalam `Layout.jsx` — ia dekoratif
    dengan sengaja; guna mekanisme kad KPI untuk notifikasi cuti.
  - Guna `Cuti.jsx` untuk pengurusan cuti Admin, bukan `PengurusanCuti.jsx`.
- **Pemodulan `server.js`** (`routes/` berasingan) — masih ditangguh, disyorkan
  dijalankan **selepas** semua isu §12 dibetulkan (elak konflik gabung besar-besaran
  semasa logik masih berubah).
- **Sentiasa periksa kod sebenar sebelum tulis prompt/analisis baharu** — `git clone`
  atas HTTPS (bukan `gh` CLI, tak tersedia dalam persekitaran ini). Dokumen ini
  sendiri terbukti perlu — jangan ulang kesilapan percaya dokumentasi lama tanpa
  sahkan.

---

## 16. Glosari Pantas (FYP ↔ Kod)

| FYP | Kod |
|---|---|
| Admin / Pengurus | `role: 'Manager'` |
| Staf | `role: 'Staff'` |
| Tempahan | jadual `orders`, laluan `/api/orders`, halaman `Tempahan.jsx` |
| Tugasan | jadual `tasks`, laluan `/api/tasks/*` |
| Cuti | jadual `leaves`, laluan `/api/*/leaves*` |
| Janaan Jadual | `JanaanJadual.jsx`, `/api/generate-schedule` (Round-Robin) + `/api/manager/auto-assign` (AI) |
| Status Percetakan / Tender Luar | `orders.status`, `orders.delivery_type` — **tiada laluan kemas kini**, §12 #1 |
| Belum Mula / Dalam Proses / Selesai (paparan) | DB: `Pending` / `In Progress` / `Completed` |
| Lulus / Gagal (paparan cuti) | DB: `Approved` / `Rejected` |

---

*Dokumen ini disahkan terhadap commit `4443080` (2026-07-02). Kemas kini dokumen
ini setiap kali struktur route, skema, atau aliran teras berubah — jangan biarkan
ia lapuk seperti versi sebelumnya (§0.2).*

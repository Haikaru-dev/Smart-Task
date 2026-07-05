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

**Risiko keselamatan (dimitigasi — lihat §12 #3):**
```js
const JWT_SECRET = process.env.JWT_SECRET || 'smarttask_dev_secret_TUKAR_DI_PRODUKSI';
```
Fallback ini wujud dalam `server.js`, `middleware/auth.js`, **dan** `tests/login.test.js`
(dikekalkan sengaja untuk dev tempatan). Jika `.env` tidak menetapkan `JWT_SECRET`,
string fallback inilah secret sebenar yang digunakan — dan ia boleh dibaca sesiapa
sahaja dalam repo awam. Sejak 2026-07-02, `server.js` paparkan **amaran konsol**
semasa startup bila `JWT_SECRET` tiada; tetapkan nilai rawak kuat (rujuk
`Backend/.env.example`) sebelum demo/produksi.

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

Status: **RBAC dikuatkuasakan konsisten pada peringkat backend untuk semua 34 route**
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
| job_title | VARCHAR(100) | Nilai sah (model 2-peranan sejak 2026-07-05, §12 #15): `Designer`, `Operator Am`. Nilai `Manager` kekal untuk akaun pengurus (bukan peranan operasi). 5 jawatan lama dijajarkan melalui `migrations/migrate_to_two_roles.sql` (sudah dijalankan pada DB tempatan) |
| status | ENUM('Aktif','Cuti','Tidak Aktif') DEFAULT 'Aktif' | Dipakai enjin AI untuk tapis staf tersedia |
| email | VARCHAR(150) NULL | |
| phone_number | VARCHAR(20) NULL | |
| profile_picture_url | VARCHAR(255) NULL | Ditambah 2026-07-02 (migrasi `add_staff_profile_picture.sql` — §12 #5) |
| user_id | INT NULL, FK → `users.id` **ON DELETE SET NULL** | |
| created_at | TIMESTAMP | |

> **Perbezaan dengan Kamus Data:**
> - ❌ **`staff_id_code`** (cth. "ST-001", disebut dalam UC-02) — **tiada** dalam
>   `schema.sql`. *Tetapi lihat nota DB langsung di bawah.*
> - ✅ **`profile_picture_url`** (F6.1, UC-02, UC-10) — lajur, endpoint upload,
>   dan UI frontend (upload + paparan) **kini lengkap** (2026-07-02, §12 #5 selesai).
>
> **⚠️ Nota penting (ditemui 2026-07-02):** pangkalan data XAMPP *langsung* pada mesin
> pembangunan TIDAK sepadan dengan `schema.sql` v2.0 — jadual `staff` sebenar ada
> `staff_id_code` (UNIQUE), `profile_picture_url` (sedia wujud sebelum migrasi ini),
> ENUM `status` hanya `('Aktif','Cuti')` tanpa `'Tidak Aktif'`, dan saiz lajur berbeza
> (`full_name` 100 vs 150). DB itu kemungkinan dicipta daripada skema lama
> (`database.sql`/`setup_tables.sql`). Untuk konsistensi, pertimbang jana semula DB
> daripada `schema.sql` + `seed.js`, atau selaraskan `schema.sql` dengan DB sebenar.
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
| staff_notes | TEXT NULL | Nota/catatan staf semasa kemaskini status (ditambah 2026-07-02, migrasi `add_task_staff_notes.sql` — §12 #2 selesai) |
| created_at | TIMESTAMP | |

> **Perbezaan dengan Kamus Data:**
> - ✅ **`staff_notes`** (kamus data + Jadual 3.1: *"Staf boleh menambah nota catatan
>   pada tugasan"*) — **kini wujud** (2026-07-02): lajur DB + backend + frontend
>   ketiga-tiga lapisan lengkap; lihat §12 #2 (selesai).
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

## 6. API Endpoints (Disahkan — 35 route, semua dalam `Backend/server.js`)

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
| POST | `/api/orders` | Manager | F2.1, F2.2, UC-03 — kini turut jana **4 tugasan lalai** (Design/Printing/Packing/Delivery) dalam satu transaksi (§12 #12 selesai, 2026-07-03) |
| GET | `/api/orders` | Manager | F2.4 |
| GET | `/api/orders/:id/tasks` | Manager | Senarai tugasan satu tempahan, susunan `FIELD(Design→Delivery)` — untuk modal frontend (ditambah 2026-07-03, §12 #12) |
| PATCH | `/api/orders/:id/status` | Manager | F2.3, UC-11 — validasi terhadap 4 ENUM status, ditambah 2026-07-02 (§12 #1 selesai) |

> Tiada `GET /api/orders/:id` — paparan detail guna data yang
> sudah dimuatkan pada senarai (client-side), memadai untuk skala semasa.

### Staf
| Kaedah | Endpoint | Guard | F / UC |
|---|---|---|---|
| GET | `/api/staff` | Manager | Jadual 3.1 (Admin lihat senarai staf) — kini turut pulangkan lajur terbitan `is_on_leave_today` dan `leave_end_date` (subquery ke `leaves`, `CURDATE()` MySQL); susunan `ORDER BY is_on_leave_today DESC, full_name` — staf bercuti di atas (§12 #14, 2026-07-03/05) |
| POST | `/api/staff` | Manager | UC-02 |
| GET | `/api/staff/:id` | Staff (sendiri sahaja) **atau** Manager | UC-02 (alt), dipakai `ProfilStaf.jsx` juga — semakan pemilikan ditambah 2026-07-03 (§12 #13); turut pulangkan `is_on_leave_today` + `leave_end_date` (§12 #14) |
| PUT | `/api/staff/:id` | Manager | UC-02 — kemaskini penuh (nama + jawatan) oleh Admin, UI edit-in-place pada `DetailStaf.jsx` (ditambah 2026-07-02) |
| DELETE | `/api/staff/:id` | Manager | UC-02 (alt: "Padam Staf") — ada guard halang padam akaun sendiri |
| POST | `/api/staff/:id/profile-picture` | Staff (sendiri) atau Manager | F6.1, UC-02, UC-10 — multer berasingan (JPG/PNG, had 2MB, folder `/uploads/staff/`), fail dipadam jika 403/404 (§12 #5) |
| PUT | `/api/staff/update-profile/:id` | Staff (sendiri sahaja) atau Manager | F6.1/F6.2, UC-10 (had: email + phone sahaja) — semakan pemilikan ditambah 2026-07-03 (§12 #13) |
| PUT | `/api/staff/change-password/:userId` | Staff atau Manager | F6.2, UC-10 |

> ✅ *(Selesai 2026-07-02)* Kekaburan "Kemaskini" dalam UC-02 telah diputuskan:
> Admin boleh **edit penuh** (nama + jawatan) staf sedia ada melalui
> `PUT /api/staff/:id` dan borang edit-in-place pada kad profil `DetailStaf.jsx`
> (dropdown jawatan sama seperti borang Tambah Staf).

### Cuti (Leaves)
| Kaedah | Endpoint | Guard | F / UC |
|---|---|---|---|
| GET | `/api/leaves` | Manager | |
| POST | `/api/leaves` | Manager | *(nota: laluan admin cipta rekod cuti — fungsi ini sengaja dibuang daripada UI, lihat §11)* |
| GET | `/api/manager/leaves` | Manager | F5.3, UC-05 |
| PUT | `/api/manager/leaves/:id` | Manager | F5.4, UC-05 |
| GET | `/api/staff/leaves/:staff_id` | Staff (sendiri sahaja) atau Manager | F5.2 — semakan pemilikan ditambah 2026-07-03 (§12 #13) |
| POST | `/api/staff/leaves` | Staff atau Manager | F5.1, UC-09 |

### Tugasan & Janaan Jadual
| Kaedah | Endpoint | Guard | F / UC |
|---|---|---|---|
| GET | `/api/tasks/board` | Manager | Papan agihan (kanban/staf view) |
| POST | `/api/generate-schedule` | Manager | F3.1, UC-04 (alt: Round-Robin) — transaksi ✅, semakan cuti due_date-aware per-tugasan (§12 #6) |
| POST | `/api/manager/auto-assign` | Manager | F3.1–F3.3, UC-04 (AI) — pulang cadangan sahaja, tak simpan |
| POST | `/api/tasks/save-assignments` | Manager | Sahkan cadangan AI → simpan dalam transaksi |
| PUT | `/api/tasks/:id` | Manager | F3.4 — semakan konflik cuti: 409 jika cuti penuh, `warning` jika separa (§12 #6) |
| POST | `/api/tasks/confirm` | Manager | Sahkan draf → `approval_status = 'Confirmed'` |
| DELETE | `/api/tasks/:id` | Manager | Dua kes (2026-07-03, §12 #12): draf AI → reset ke kolam (tingkah laku lama); tugasan `Confirmed` **belum diagih** → hard-delete; sudah diagih → 404 |
| PATCH | `/api/tasks/:id/status` | Staff atau Manager | F4.3, F4.4, UC-08 — semak pemilikan (`staffId`), terima `status` + `file` (multer) + `notes` → `staff_notes` (§12 #2 selesai, 2026-07-02) |
| GET | `/api/staff/tasks/:staff_id` | Staff (sendiri sahaja) atau Manager | F4.1, F4.2, UC-07 — semakan pemilikan ditambah 2026-07-03 (§12 #13) |

### Dashboard
| Kaedah | Endpoint | Guard | F / UC |
|---|---|---|---|
| GET | `/api/dashboard/stats` | Manager | UC-06 — kiraan `onLeave` kini `COUNT(DISTINCT staff_id)` + `CURDATE()` MySQL (§12 #14, 2026-07-03); `activeStaff` kini bermaksud **"sedia bertugas hari ini"** (status `Aktif` DAN tiada cuti Approved meliputi hari ini, `NOT IN` subquery — 2026-07-05), supaya `activeStaff + onLeave` = jumlah staf Aktif sebenar |
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
| F2.3 | Kemas kini status percetakan (tender luar) | ✅ Patuh | `PATCH /api/orders/:id/status` + dropdown modal `Tempahan.jsx` (2026-07-02) |
| F2.4 | Papar senarai penuh tempahan + status | ✅ Patuh | `GET /api/orders` |
| F3.1–F3.2 | Jana tugasan (Reka Bentuk/Bungkus/Hantar), tetapkan staf & masa | ✅ Patuh | Penjanaan tugasan: **automatik semasa cipta Tempahan** (4 jenis lalai, §12 #12 selesai 2026-07-03 — sebelum ini hanya data seed yang beri ilusi berfungsi); agihan staf & masa: Round-Robin + Gemini AI, dua-dua ada |
| F3.3 | Semak status cuti staf sebelum tetapkan tugasan | ✅ Patuh | `getLeaveStatusForTask()` skop modul, dikongsi ketiga-tiga laluan (§12 #6 selesai, 2026-07-02) |
| F3.4 | Sunting/padam tugasan berjadual | ✅ Patuh | `PUT`/`DELETE /api/tasks/:id` |
| F4.1–F4.2 | Papar tugasan khusus staf log masuk + butiran | ✅ Patuh | `GET /api/staff/tasks/:staff_id`, semakan pemilikan |
| F4.3 | Kemas kini status tugasan | ✅ Patuh | `PATCH /api/tasks/:id/status` |
| F4.4 | Muat naik bukti kerja | ✅ Patuh | multer, jenis fail + saiz disahkan |
| F5.1 | Staf hantar permohonan cuti | ✅ Patuh | `POST /api/staff/leaves` |
| F5.2 | Papar sejarah & status cuti kepada Staf | ✅ Patuh | `GET /api/staff/leaves/:staff_id` |
| F5.3 | Pengurus lihat senarai cuti tertunggak | ✅ Patuh | `GET /api/manager/leaves` |
| F5.4 | Pengurus lulus/tolak cuti | ✅ Patuh | `PUT /api/manager/leaves/:id`, ada `rejection_reason` |
| F6.1 | Papar profil (nama, jawatan, emel) | ✅ Patuh | Teks/data ✅; gambar profil ✅ (§12 #5 selesai, 2026-07-02) |
| F6.2 | Tukar kata laluan | ✅ Patuh | `PUT /api/staff/change-password/:userId`, `PUT /api/admin/update/:userId` |
| *(Jadual 3.1)* | *"Staf boleh menambah nota catatan pada tugasan"* | ✅ Patuh | Laluan penuh DB→backend→frontend (2026-07-02) — §12 #2 selesai |

**Ringkasan:** 17/17 patuh penuh, 0 separa, 0 tiada langsung (2026-07-02).
*(Nota kiraan: dikira semula baris demi baris pada 2026-07-02 — ringkasan
terdahulu "12/17 + 3 separa" tersilap kira; jadual sentiasa jadi rujukan.)*

---

## 8. Pemetaan Spesifikasi Kes Guna (UC-01–UC-11)

| UC | Nama | Status | Nota |
|---|---|---|---|
| UC-01 | Log Sesi Pengguna | ✅ Patuh | |
| UC-02 | Mengurus Akaun Staf | ✅ Patuh | Tambah + kemaskini penuh + padam + gambar profil, semuanya lengkap (2026-07-02) |
| UC-03 | Menambah Tempahan | ✅ Patuh | Bug case-sensitivity dibetulkan (§12 #4 selesai, 2026-07-02) |
| UC-04 | Menjana & Kemaskini Tugasan | ✅ Patuh (+ lebih) | Draf-sahkan tidak dalam spek asal tapi selamat & berfungsi |
| UC-05 | Meluluskan Cuti | ✅ Patuh | |
| UC-06 | Paparan Papan Muka | ✅ Patuh | + ciri tambahan (donut, trend) tiada dalam FYP asal |
| UC-07 | Melihat Tugasan Harian | ✅ Patuh | |
| UC-08 | Mengemas Kini Status Tugasan | ✅ Patuh | Status + bukti kerja + nota/catatan (§12 #2 selesai, 2026-07-02) |
| UC-09 | Memohon Cuti | ✅ Patuh | |
| UC-10 | Mengurus Profil Diri | ✅ Patuh | Emel/telefon/kata laluan/gambar profil ✅ (§12 #5 selesai, 2026-07-02) |
| UC-11 | Mengemas Kini Status Tempahan | ✅ Patuh | `PATCH /api/orders/:id/status` + dropdown modal (2026-07-02, §12 #1 selesai) |

---

## 9. Keperluan Bukan Fungsian (Seksyen 3.4.1) — Status

**(a) Kebolehgunaan** — Antara muka responsif, semua teks Bahasa Melayu, portal
mudah alih-mesra untuk Staf. Tiada isu ketara dikesan semasa audit kod.

**(b) Keselamatan** — RBAC dikuatkuasakan penuh pada backend (§4, §6: 35/35 route
bergerbang; disahkan oleh 95 kes ujian `rbac.test.js`). Kata laluan di-hash bcrypt
(disahkan `seed.js` + route tukar kata laluan). **Semakan pemilikan (anti-IDOR)**
kini dikuatkuasakan pada kesemua 4 route data-staf yang sebelum ini terdedah
(§12 #13 selesai 2026-07-03; disahkan ujian — 148/148 lulus). **Tetapi**: JWT
secret ada fallback hardcode terdedah dalam repo awam (§3.1) — ini secara
langsung bertentangan dengan semangat 3.4.1(b) walaupun bukan RBAC per se.
**Keutamaan Tinggi** untuk dibetulkan (§12 #3 — `JWT_SECRET` dalam `.env`
tempatan masih belum ditetapkan).

**(c) Kecekapan** — Penjanaan jadual (Round-Robin & AI-simpan) dibalut transaksi
MySQL (`beginTransaction`/`commit`/`rollback`) — disahkan dalam kod, bukan sekadar
dakwaan. Keperluan "respons < 3 saat setiap kemaskini status" tidak boleh disahkan
secara statik — perlu ujian beban sebenar jika hendak dilaporkan dalam FYP.

**(d) Ketepatan data dashboard** *(ditambah 2026-07-05)* — KPI `activeStaff` pada
`/api/dashboard/stats` kini bermaksud **"sedia bertugas hari ini"** (status
pekerjaan `Aktif` DAN tiada cuti `Approved` yang meliputi hari ini), bukan sekadar
kiraan mentah status pekerjaan — selaras dengan footer kad "Bertugas hari ini"
yang sedia terpapar di `Dashboard.jsx`. Dengan itu `activeStaff + onLeave` =
jumlah staf `Aktif` sebenar (disahkan live: 8 staf, 2 bercuti → 6 + 2 = 8);
staf `Tidak Aktif` tidak dikira dalam mana-mana KPI ini. Kedua-dua kiraan guna
`CURDATE()` MySQL (satu sumber masa, §12 #14).

---

## 10. Aliran Kerja Teras (dipetakan daripada carta alir asal)

### 10.1 Log Masuk (carta alir "Mula → Peranan?")
`Input ID & Kata Laluan` → `POST /api/login` → bcrypt.compare → **jana JWT** →
`Peranan?` (`role` dalam token) → redirect `/dashboard` (Manager) atau
`/staf/tugasan` (Staff). Padan carta alir sepenuhnya.

### 10.2 Urus Staf + Tempahan (carta alir Admin, dua lajur)
- **Urus Staf:** `Paparan Senarai Staf` (`GET /api/staff`) → `Tambah` (`POST /api/staff`)
  atau `Detail` → `Lihat Profil Staf` (`GET /api/staff/:id`) → `Kemaskini`
  (`PUT /api/staff/:id`, edit-in-place nama + jawatan — selesai 2026-07-02) atau
  `Padam Staf` (`DELETE /api/staff/:id`, ada pengesahan + halang padam sendiri).
  Carta alir "Urus Staf" kini padan sepenuhnya.
- **Tempahan:** `Paparan Senarai Tempahan` (`GET /api/orders`) → `Baru` →
  `Isi Borang` → `Simpan Tempahan` (`POST /api/orders` — kini turut **jana
  4 tugasan lalai** Design/Printing/Packing/Delivery dalam transaksi yang sama;
  Admin padam yang tak perlu melalui `DELETE /api/tasks/:id`, dan senarai
  tugasan setiap tempahan boleh dipapar melalui `GET /api/orders/:id/tasks` —
  §12 #12 selesai, 2026-07-03).
  Cabang **"Status → Lihat Detail → Ubah Status Cetakan → Simpan Status Cetakan"**
  kini disokong `PATCH /api/orders/:id/status` melalui dropdown pada modal
  "Perincian Tempahan" (§12 #1 selesai, 2026-07-02).

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
Jadual 3.1 (keperluan pengguna) ada nyatakannya — medan nota kini disokong
hujung-ke-hujung (§12 #2 selesai, 2026-07-02).
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

Arahan prompt (model 2-peranan sejak 2026-07-05, §12 #15): padanan kemahiran
(Design→HANYA Designer; Printing/Packing/Delivery→HANYA Operator Am) + arahan
pembahagian rata (1a): beban Operator Am dikira merentas KETIGA-TIGA jenis
tugasan bersama, jangan bebankan satu Operator Am sementara yang lain kosong;
keutamaan `due_date` terdekat, anggaran masa (Design 4–8 jam; Printing/Packing
1 jam/100 unit, min 1 jam), waktu kerja 09:00–18:00.

**Peringkat 5 — Respons & Pengesahan:** AI pulang `assignments[]` sebagai
**cadangan sahaja** (tiada auto-simpan) → papar untuk semakan Admin → Admin terima/
ubah → `POST /api/tasks/save-assignments` simpan dalam **satu transaksi MySQL**.

**Peringkat 6 (Alternatif) — Round-Robin:** `POST /api/generate-schedule`, kini
**dua kumpulan giliran berasingan** (2026-07-05, §12 #15): kolam `Designer`
(tugasan Design) dan kolam `Operator Am` (Printing/Packing/Delivery), setiap satu
dengan kursor sendiri — kursor Operator Am kekal SAMA merentas ketiga-tiga jenis
supaya beban rata. Tugasan yang kolamnya kosong dilangkau (`skippedTaskIds`).
*Nota pembetulan:* sebelum ini round-robin TIDAK menyemak `task_type` vs
`job_title` langsung (pusing semua staf aktif termasuk Manager) — tugasan Design
boleh jatuh kepada operator; ini bug sebenar yang dibaiki, bukan sekadar
penambahbaikan. Dibalut transaksi seperti sedia ada. Sejak 2026-07-02, semakan
cuti guna `getLeaveStatusForTask()` yang sama dengan Peringkat 2 (kini fungsi
skop modul — §12 #6 selesai): staf yang bercuti penuh sepanjang tempoh tugasan
dilangkau per-tugasan, dan tugasan tanpa sebarang staf tersedia dilaporkan dalam
`skippedTaskIds` tanpa menggagalkan keseluruhan janaan.

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

**#1 — ✅ SELESAI (2026-07-02) — Endpoint kemas kini status Tempahan (F2.3, UC-11)**
`PATCH /api/orders/:id/status` ditambah dalam `server.js` (guard
`verifyToken` + `requireRole('Manager')`, validasi terhadap 4 nilai ENUM
`Pending`/`In Progress`/`Completed`/`Cancelled`, 404 jika ID tak wujud).
UI: dropdown status pada modal "Perincian Tempahan" (`Tempahan.jsx`,
`handleUpdateStatus`) — kemaskini `selectedOrder` dan senarai `orders`
serentak tanpa refresh, ralat backend dipaparkan melalui `alert`.

**#2 — ✅ SELESAI (2026-07-02) — Nota/catatan tugasan staf (Jadual 3.1)**
Ketiga-tiga lapisan dilengkapkan: (a) lajur `staff_notes TEXT NULL` ditambah
— migrasi `Backend/migrations/add_task_staff_notes.sql` **dan** `schema.sql`
dikemaskini serentak; (b) `PATCH /api/tasks/:id/status` kini destructure
`notes` dan simpan `staff_notes` (nilai `notes || null` — kekal pilihan,
tukar status tanpa nota masih sah); (c) `TugasanStaf.jsx` `handleSave()`
hantar `formData.append('notes', …)` dan kemaskini `staff_notes` dalam
state `tasks` selepas berjaya. `openModal()` sedia pra-isi textarea daripada
`task.staff_notes`, dan `GET /api/staff/tasks/:staff_id` guna `tasks.*` —
nota tersimpan muncul semula bila tugasan dibuka.

**#3 — ✅ DIMITIGASI (2026-07-02) — JWT secret fallback hardcode (3.4.1.b)**
Amaran startup ditambah dalam `server.js` (selepas `dotenv.config`): jika
`JWT_SECRET` tiada dalam `.env`, konsol paparkan amaran jelas merujuk
`Backend/.env.example` — tanpa menghalang startup (dev tempatan kekal jalan).
Fallback dalam `middleware/auth.js`/`server.js`/`tests/login.test.js`
**sengaja dikekalkan** sebagai selamat-gagal dev. Disahkan semasa ujian:
amaran muncul bila tiada, hilang bila ditetapkan.
⚠️ **Tindakan pengguna masih perlu:** `.env` tempatan disahkan (2026-07-02)
**belum** tetapkan `JWT_SECRET` — jana nilai rawak (arahan dalam
`Backend/.env.example`) sebelum sebarang demo/produksi.

**#12 — ✅ SELESAI (2026-07-03) — Tiada penjanaan tugasan automatik untuk Tempahan baharu (F3.1)**
Punca: `POST /api/orders` hanya INSERT ke `orders` — tiada `INSERT INTO tasks`
di mana-mana dalam `server.js`, jadi tempahan yang dicipta melalui UI sebenar
tidak pernah dapat tugasan; 11 baris seed `tasks` dalam `schema.sql` memberi
ilusi ciri ini berfungsi. Pembetulan (keputusan disahkan pengguna):
(a) `POST /api/orders` dibalut **transaksi** — INSERT order + 4 tugasan lalai
(`Design`/`Printing`/`Packing`/`Delivery`, `status='Pending'`,
`approval_status='Confirmed'` ikut lalai jadual), rollback jika mana-mana gagal;
(b) route baharu `GET /api/orders/:id/tasks` (Manager) untuk paparan modal,
susunan `FIELD('Design','Printing','Packing','Delivery')`;
(c) `DELETE /api/tasks/:id` diperluas kepada dua kes — draf AI (`Draft`) kekal
reset-ke-kolam seperti lama; tugasan `Confirmed` **belum diagih** kini
hard-delete; tugasan sudah diagih staf → 404 dengan mesej "nyahagih dahulu".
**Bukti (diuji sebenar, instance ujian port 5099 + MySQL langsung):**
POST cipta order → 4 baris `tasks` wujud serta-merta dengan `order_id` sepadan;
GET pulangkan 4 tugasan susunan Design→Delivery; DELETE auto-gen belum diagih
→ 200 dan baris hilang; DELETE draf AI → 200 dengan reset (assigned NULL,
`approval_status='Confirmed'`, tingkah laku lama tak berubah); DELETE tugasan
sudah diagih → 404 dan baris kekal. Kolam agihan `generate-schedule` (baris
~759) dan `auto-assign` (baris ~894) kedua-duanya pilih
`assigned_staff_id IS NULL` — tugasan auto-jana kini layak diagih.
Data ujian (order 20 + tugasannya) dibersihkan selepas ujian.
*Skop tidak disentuh:* `POST /api/tasks/save-assignments`, `POST /api/tasks/confirm`,
`PUT /api/tasks/:id` (logik draf-sahkan AI kekal).

**#13 — ✅ SELESAI (2026-07-03) — IDOR: 4 route data-staf tiada semakan pemilikan (NFR 3.4.1.b, TEST_REPORT.md Isu #A)**
Ditemui oleh sut ujian (kes gagal disengajakan dalam `tasks.test.js`):
token Staff boleh membaca/menulis data staf lain kerana handler terus guna
`req.params` tanpa banding dengan `staffId` dalam token. Empat route dibaiki
dengan corak sama seperti `PATCH /api/tasks/:id/status` dan
`POST /api/staff/:id/profile-picture` (yang sedia betul):
- `GET /api/staff/tasks/:staff_id` (tugasan staf lain — baca)
- `GET /api/staff/leaves/:staff_id` (sejarah cuti staf lain — baca)
- `PUT /api/staff/update-profile/:id` (emel/telefon staf lain — **TULIS**, paling teruk)
- `GET /api/staff/:id` (profil staf lain — baca)
Semakan diletakkan sebaik selepas `req.params` dibaca, sebelum sebarang query;
Manager kekal tanpa sekatan. **Bukti:** `npm test` = **148/148 lulus**
(139 asal termasuk kes IDOR yang dahulu gagal + 9 kes baharu: 403 staf-lain /
200 sendiri / 200 Manager untuk setiap route). Rujuk TEST_REPORT.md
"Ujian Semula — Isu #A".

**#14 — ✅ SELESAI (2026-07-03) — Percanggahan kiraan staf bercuti (3 sumber berbeza, tiada satu pun konsisten)**
Punca: tiga tempat cuba jawab "siapa bercuti hari ini" secara berasingan:
(a) `GET /api/dashboard/stats` guna `COUNT(*)` atas `leaves` — kira **baris**
cuti, bukan staf unik (staf dengan 2 rekod bertindih dikira 2×), dan guna
`new Date()` Node.js sebagai "hari ini" (terdedah anjakan zon waktu);
(b) `Cuti.jsx` kira semula sendiri di browser; (c) `GET /api/staff` dan
`GET /api/staff/:id` langsung tidak rujuk `leaves` — hanya papar
`staff.status` mentah yang **tidak pernah** dikemaskini oleh mana-mana kod
bila cuti diluluskan. Pembetulan (satu sumber kebenaran, kira LIVE setiap
bacaan):
(a) `dashboard/stats`: `COUNT(DISTINCT staff_id)` + `CURDATE() BETWEEN
start_date AND end_date` — staf unik, tarikh ikut jam DB, pembolehubah
`today` Node dibuang daripada handler ini;
(b) `GET /api/staff` dan `GET /api/staff/:id`: lajur terbitan
`is_on_leave_today` melalui `EXISTS` subquery ke `leaves` (corak sama,
`CURDATE()`), **tanpa** mengubah lajur `staff.status` sedia ada.
*Keputusan reka bentuk:* `staff.status` kekal medan status pekerjaan yang
ditetapkan admin (Aktif/Cuti/Tidak Aktif) dan kekal dipakai sebagai penapis
kelayakan agihan — cuti harian TIDAK menulis balik ke lajur ini kerana tiada
mekanisme nyahtulis automatik selepas cuti tamat (risiko staf terlekat
'Cuti' selamanya); sebaliknya dikira live melalui `CURDATE()`.
*Skop tidak disentuh:* `PUT /api/manager/leaves/:id` dan semakan konflik
cuti laluan agihan (`getLeaveStatusForTask`, §12 #6) — berasingan dan betul.
**Susulan frontend (2026-07-03, prompt kedua):** (c) `SenaraiStaf.jsx`
(senarai + modal detail) papar badge terbitan — keutamaan `Tidak Aktif` →
`is_on_leave_today` ("Cuti", `badge--warning` sedia ada dalam
`smarttask.css`) → "Aktif"; (d) `Cuti.jsx` buang kiraan client-side
`onLeaveToday` — kini fetch `onLeave` daripada `GET /api/dashboard/stats`
(state + `useEffect`), disegarkan dalam `useAutoRefresh` dan selepas
lulus/tolak cuti; `thisMonthCount`/`pendingCount` kekal client-side
(tiada isu konsistensi merentas halaman). **Bukti:** `npm run build` lulus;
ujian live (MySQL sebenar + supertest, logik badge verbatim): staf dengan
cuti Approved hari ini → "Cuti" pada senarai & modal, staf tanpa cuti →
"Aktif", `Tidak Aktif` kekal keutamaan tertinggi, `staff.status` DB tidak
berubah; `Cuti.jsx` & `Dashboard.jsx` baca medan `onLeave` yang sama —
sepadan secara binaan. Data ujian dibersihkan.
**Susulan paparan (2026-07-05):** (e) kedua-dua endpoint staf turut pulangkan
`leave_end_date` (subquery `MAX end_date` cuti aktif hari ini) dan senarai
disusun `is_on_leave_today DESC` — staf bercuti di atas; (f) badge
`SenaraiStaf.jsx` (senarai + modal) papar "Cuti hingga DD/MM"
(`toLocaleDateString('ms-MY')`), `Tidak Aktif` kekal tanpa tarikh; (g) kad KPI
"Staf Cuti" pada `Dashboard.jsx` kini `navigateTo: '/staf'` (corak sama kad
"Permohonan Cuti" → `/cuti`). Diuji sebenar: susunan, tarikh, dan medan
endpoint tunggal semuanya disahkan; build lulus.

**#15 — ✅ SELESAI (2026-07-05) — Model 2-peranan (Designer | Operator Am) + pembetulan round-robin tanpa semakan kemahiran**
Keputusan produk: 5 jawatan lama digantikan dengan 2 — `Designer` (Design
sahaja) dan `Operator Am` (Printing + Packing + Delivery). Perubahan serentak
merentas semua lapisan (disiplin §12 #6 — jangan biar laluan agihan terpesong):
(a) UI dropdown jawatan (`SenaraiStaf.jsx` Tambah Staf, `DetailStaf.jsx` edit)
→ 2 pilihan sahaja; (b) `checkSkillMatch()` → Design=Designer,
Printing/Packing/Delivery=Operator Am; (c) prompt Gemini → peraturan kemahiran
baharu + arahan pembahagian rata 1a (beban Operator Am dikira merentas ketiga-
tiga jenis tugasan bersama); (d) **pembetulan bug sebenar** —
`POST /api/generate-schedule` sebelum ini TIDAK menyemak `task_type` vs
`job_title` langsung (satu kursor pusing SEMUA staf aktif termasuk Manager);
kini dua kolam giliran berasingan dengan kursor sendiri (§11 Peringkat 6);
(e) migrasi data `migrations/migrate_to_two_roles.sql` — dijalankan pada DB
tempatan 2026-07-05: 3 baris dijajarkan ke 'Operator Am' (termasuk nilai tidak
rasmi `'Printing Operator'` yang ditemui dalam DB — ditambah ke senarai IN
kerana ia peranan operasi; `'Manager'` tidak disentuh); (f) komen + data seed
`schema.sql` diselaraskan; (g) `staff.test.js` payload `'Finishing'` →
`'Operator Am'`. **Bukti (diuji sebenar, MySQL + supertest):** 1 Design +
3 Printing/Packing/Delivery dengan 3 Operator Am → Design ke Designer sahaja,
3 tugasan operator ke 3 Operator Am BERBEZA (berselang-seli); cadangan Gemini
sebenar (API key aktif): kesemua 4 cadangan patuh peraturan baharu, agihan
operator merentas 2 staf berbeza; auto-assign disahkan tiada tulisan DB;
`npm test` 148/148; data ujian dibersihkan. *Nota:* `PREFIX_MAP` username
(`POST /api/staff`) tidak diubah — 'Operator Am' jatuh ke prefix lalai `staf`;
4 prefix lama kini kod mati (calon kemasan berasingan).

**#4 — ✅ SELESAI (2026-07-02) — Bug case-sensitivity `Orders` (UC-03)**
`INSERT INTO Orders` → `INSERT INTO orders` dalam `POST /api/orders`
(`server.js`). Disahkan tiada lagi rujukan `Orders` huruf besar dalam
mana-mana SQL (`FROM|INTO|UPDATE|JOIN`). Diuji sebenar: POST cipta tempahan
berjaya dan GET senarai masih berfungsi (instance ujian + MySQL langsung).

### 🟡 Keutamaan Sederhana

**#5 — ✅ SELESAI (2026-07-02) — Gambar profil staf (F6.1, UC-02, UC-10)**
**Backend lengkap:** lajur `profile_picture_url` (migrasi
`add_staff_profile_picture.sql` + `schema.sql`; *nota: DB XAMPP tempatan sudah
ada lajur ini — jangan jalankan migrasi di situ, lihat §5.2*), endpoint
`POST /api/staff/:id/profile-picture` (multer berasingan: JPG/PNG sahaja,
had 2MB, simpan ke `/uploads/staff/`, staf hanya boleh upload untuk diri
sendiri — 403 dengan fail dibersihkan, Manager untuk sesiapa sahaja), dan
`GET /api/staff` + `GET /api/staff/:id` kedua-duanya pulangkan lajur ini.
Diuji sebenar: 6 kes (jaya/jenis salah/saiz besar/403/404/GET) semuanya lulus.
**UI frontend (siap 2026-07-02):** upload melalui klik avatar / butang
"Tukar Gambar" (input fail tersembunyi, JPG/PNG) pada `DetailStaf.jsx` (Admin,
mana-mana staf) dan `ProfilStaf.jsx` (Staf sendiri, maklum balas toast);
paparan avatar (gambar atau placeholder inisial — tiada `<img>` pecah kerana
render bersyarat) pada baris senarai dan panel detail `SenaraiStaf.jsx`.
Nota: UI disahkan melalui build + endpoint diuji sebenar; klik-lalui penuh
dalam pelayar belum dibuat — sahkan visual semasa demo seterusnya.

**#6 — ✅ SELESAI (2026-07-02) — Semakan konflik cuti (F3.3) kini konsisten merentas 3 laluan agihan**
`getLeaveStatusForTask()` dinaikkan ke **skop modul** `server.js` (verbatim,
tiada perubahan logik) dan kini dipanggil oleh ketiga-tiga laluan:
- Laluan AI (`/api/manager/auto-assign`): seperti sedia ada ✅
- Round-Robin (`/api/generate-schedule`): per-tugasan, due_date-aware
  (query tugasan kini JOIN `orders` untuk `due_date`); tugasan tanpa staf
  tersedia **dilangkau** dan dilaporkan dalam `skippedTaskIds` ✅
- Edit manual (`PUT /api/tasks/:id`): staf bercuti **penuh** sepanjang tempoh
  tugasan → `409` (UPDATE dihalang); cuti **separa** → berjaya dengan medan
  `warning` dalam respons, dipaparkan sebagai toast oleh `JanaanJadual.jsx` ✅

  Diuji sebenar pada 2026-07-02 (instance ujian + MySQL): staf cuti penuh
  dilangkau/disekat 409, staf cuti separa diterima dengan amaran.
  *Nota kuirks sedia ada (dikekalkan, bukan regresi):* penukaran tarikh
  `toISOString()` pada objek `Date` MySQL boleh anjak -1 hari (UTC vs tempatan),
  menyebabkan semakan sedikit lebih konservatif — tingkah laku ini SAMA dengan
  laluan AI asal dan tidak diubah selaras sempadan "jangan tulis semula" (§11).

### 🟢 Keutamaan Rendah

**#7** — Tiada jadual `Pengurus` berasingan (Kamus Data 3.19) — keputusan
reka bentuk, perlu diselaraskan dengan laporan FYP (§5.6), bukan bug.

**#8 — ✅ SELESAI (2026-07-02)** — `Frontend/src/pages/manager/PengurusanCuti.jsx`
disahkan semula anak yatim (grep: tiada import/route di mana-mana dalam
`Frontend/src`) dan **dipadam**. Guna `Cuti.jsx` untuk kelulusan cuti Admin.

**#9 — ✅ SELESAI SEPARA (2026-07-02)** — `.kpi-card--cyan` disahkan CSS mati
dan **dibuang**. ⚠️ **Pembetulan audit:** `.kpi-card--red` **BUKAN CSS mati** —
masih dirujuk oleh kad KPI "Staf Bercuti Hari Ini" di `Cuti.jsx:125` (halaman
aktif, route `/cuti`), jadi ia **dikekalkan**. Hanya kad Dashboard yang
bertukar ke `.kpi-card--neutral`; premis audit asal yang mengatakan kedua-dua
kelas tak dirujuk adalah silap.

**#10 — ✅ SELESAI (2026-07-02)** — `App.jsx` `PrivateRoute`: cabang mati kod
`|| role === 'Admin'` dibuang; kini `isManager = userData?.role === 'Manager'`
sahaja.

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
    │   └── Login.jsx, Dashboard.jsx, Tempahan.jsx, TempahanBaru.jsx,
    │       JanaanJadual.jsx, SenaraiStaf.jsx, DetailStaf.jsx, Cuti.jsx,
    │       ProfilAdmin.jsx
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
- Papar status **terbitan** staf (§12 #14, 2026-07-03/05): `SenaraiStaf.jsx`
  (senarai + modal detail) kini pilih badge ikut keutamaan
  `Tidak Aktif` (`badge--danger`) → `is_on_leave_today` daripada backend
  ("Cuti hingga DD/MM" dengan `leave_end_date`, `badge--warning`) → "Aktif"
  (`badge--success`) — bukan lagi paparan mentah `staff.status` dua-nilai;
  staf bercuti disusun di ATAS senarai (ORDER BY backend). Kad KPI
  "Staf Bercuti Hari Ini" pada `Cuti.jsx` pula ambil `onLeave` daripada
  `GET /api/dashboard/stats` (sumber sama dengan `Dashboard.jsx` — nombor
  sentiasa sepadan), bukan kiraan semula client-side; disegarkan melalui
  `useAutoRefresh` dan selepas lulus/tolak cuti. Kad KPI "Staf Cuti"
  `Dashboard.jsx` boleh diklik → `/staf`.
- Model 2-peranan (§12 #15, 2026-07-05): dropdown jawatan pada
  `SenaraiStaf.jsx` (Tambah Staf) dan `DetailStaf.jsx` (edit) kini hanya
  `Designer` | `Operator Am`.

**Belum dibina:** dropdown hover profil di bahagian bawah-kiri sidebar (item ini
**masih** dalam senarai tertunggak — tiada padanan `hover`/`dropdown`/
`sidebar-profile` dikesan dalam `Layout.jsx` semasa audit).

---

## 14. Pembolehubah Persekitaran & Konfigurasi DB (Dibetulkan)

Fail `.env` diletak di **root projek** (satu tahap atas `Backend/`), disahkan
`.gitignore` (`*.env` tidak dikomit). Templat rujukan: **`Backend/.env.example`**
(lengkap, semua 7 pembolehubah + arahan jana `JWT_SECRET` rawak). ⚠️ Fail
`.env.example` di **root** pula lapuk — hanya ada `DATABASE_URL` yang langsung
tidak dibaca `db.js`; jangan rujuk fail itu (calon pemadaman/kemaskini).
`server.js` kini paparkan amaran konsol semasa startup jika `JWT_SECRET`
tidak ditetapkan (§12 #3).

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
  - `PengurusanCuti.jsx` sudah dipadam (anak yatim, §12 #8 — selesai 2026-07-02).
  - Jangan tambah `axios`/state ke ikon loceng dalam `Layout.jsx` — ia dekoratif
    dengan sengaja; guna mekanisme kad KPI untuk notifikasi cuti.
  - Guna `Cuti.jsx` untuk pengurusan cuti Admin.
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
| Status Percetakan / Tender Luar | `orders.status`, `orders.delivery_type` — kemas kini melalui `PATCH /api/orders/:id/status` (§12 #1 selesai) |
| Belum Mula / Dalam Proses / Selesai (paparan) | DB: `Pending` / `In Progress` / `Completed` |
| Lulus / Gagal (paparan cuti) | DB: `Approved` / `Rejected` |

---

*Dokumen ini disahkan terhadap commit `4443080` (2026-07-02). Kemas kini dokumen
ini setiap kali struktur route, skema, atau aliran teras berubah — jangan biarkan
ia lapuk seperti versi sebelumnya (§0.2).*

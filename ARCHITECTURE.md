# ARCHITECTURE.md

Dokumen rujukan teknikal rasmi untuk sistem SmartTask.
Sumber kebenaran (source of truth) untuk tech stack, skema pangkalan data, dan logik AI.

---

## 1. Gambaran Keseluruhan Sistem

SmartTask adalah sistem pengurusan tugasan harian berasaskan web yang dibina untuk
SH Design & Print Sdn. Bhd. Sistem ini mempunyai dua portal berasingan:

- **Portal Admin / Pengurus** — Urus tempahan, staf, cuti, dan janaan jadual AI
- **Portal Staf** — Lihat tugasan, mohon cuti, urus profil peribadi

Sistem menggunakan pendekatan hibrid:
- **Round-Robin** untuk agihan asas (cepat, tanpa API luar)
- **Gemini AI (Function Calling)** untuk cadangan agihan pintar berdasarkan kemahiran,
  beban kerja, dan konflik cuti

---

## 2. Tech Stack

| Lapisan | Teknologi | Versi (dari package.json) |
|---|---|---|
| **Backend Runtime** | Node.js (CommonJS) | — |
| **Backend Framework** | Express.js | ^5.2.1 |
| **Pangkalan Data** | MySQL via XAMPP (InnoDB, utf8mb4) | — |
| **MySQL Driver** | mysql2 | ^3.22.3 |
| **Pengesahan Kata Laluan** | bcrypt | ^6.0.0 |
| **AI Engine** | Google Gemini 2.5 Flash (Function Calling) | SDK ^0.24.1 |
| **Pembolehubah Persekitaran** | dotenv | ^17.4.2 |
| **CORS** | cors | ^2.8.6 |
| **Frontend Framework** | React | ^18.2.0 |
| **Build Tool** | Vite | ^4.4.5 |
| **Routing (Frontend)** | React Router DOM | ^7.14.2 |
| **HTTP Client** | Axios | ^1.15.2 |
| **Ikon** | lucide-react | ^0.263.1 |
| **Version Control** | Git / GitHub | — |

---

## 3. Senibina Sistem (MVC Pattern)

```
┌─────────────────────────────────────────────────────────┐
│                   BROWSER (React SPA)                   │
│   Portal Admin (/dashboard, /staf, /jadual, ...)        │
│   Portal Staf  (/staf/tugasan, /staf/cuti, ...)         │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP (Axios) → localhost:5000
┌────────────────────────▼────────────────────────────────┐
│              BACKEND (Express.js — server.js)           │
│   Controller: Route handlers dalam satu fail server.js  │
│   Middleware: cors(), express.json()                    │
│   Auth: bcrypt.compare() — tiada JWT/sesi pelayan       │
└────────┬─────────────────────────────┬──────────────────┘
         │ mysql2 (connection pool)    │ @google/generative-ai SDK
┌────────▼──────────┐        ┌────────▼──────────────────┐
│  MySQL (XAMPP)    │        │  Gemini 2.5 Flash API      │
│  smarttask_db     │        │  (Function Calling mode)   │
└───────────────────┘        └───────────────────────────┘
```

**Lapisan (Layer):**
- **View** — React 18 SPA, dua layout berasingan (`Layout.jsx` untuk admin,
  `StaffLayout.jsx` untuk staf). Routing diurus oleh React Router DOM v7.
- **Controller** — Semua route handler dalam `Backend/server.js` (fail tunggal).
  Tiada pemisahan router/controller ke fail berasingan.
- **Model** — MySQL pool (`Backend/db.js`). Tiada ORM — semua pertanyaan
  ditulis sebagai raw SQL.

**Pengesahan & Sesi:**
- Login melalui `POST /api/login` (endpoint berpusat).
- Kata laluan disahkan dengan `bcrypt.compare()`.
- Tiada sesi pelayan atau JWT. Data pengguna (`id`, `role`, `staffId`) disimpan
  dalam `localStorage` browser selepas log masuk berjaya.
- `<PrivateRoute>` dalam `App.jsx` menyemak `localStorage['user']` atau
  `localStorage['token']` — jika tiada, redirect ke `/login`.

---

## 4. Skema Pangkalan Data

Nama pangkalan data: `smarttask_db`  
Engine: **InnoDB** | Charset: **utf8mb4_general_ci**

### 4.1 Jadual `users`
Kelayakan log masuk untuk semua pengguna sistem.

```sql
CREATE TABLE `users` (
  `id`          int(11)                  NOT NULL AUTO_INCREMENT,
  `username`    varchar(50)              NOT NULL,
  `name`        varchar(255)             DEFAULT NULL,
  `email`       varchar(255)             DEFAULT NULL,
  `password`    varchar(255)             NOT NULL,
  `role`        enum('Manager','Staff')  NOT NULL,
  `is_active`   tinyint(1)               DEFAULT 1,
  `created_at`  timestamp                NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
)
```

### 4.2 Jadual `staff`
Profil pekerja. Disambungkan ke `users` melalui `user_id`.

```sql
CREATE TABLE `staff` (
  `id`                   int(11)              NOT NULL AUTO_INCREMENT,
  `user_id`              int(11)              DEFAULT NULL,
  `staff_id_code`        varchar(20)          DEFAULT NULL,
  `full_name`            varchar(100)         NOT NULL,
  `job_title`            varchar(50)          DEFAULT NULL,
  `email`                varchar(100)         DEFAULT NULL,
  `phone_number`         varchar(20)          DEFAULT NULL,
  `profile_picture_url`  varchar(255)         DEFAULT NULL,
  `status`               enum('Aktif','Cuti') DEFAULT 'Aktif',
  PRIMARY KEY (`id`),
  UNIQUE KEY `staff_id_code` (`staff_id_code`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `staff_ibfk_1` FOREIGN KEY (`user_id`)
    REFERENCES `users` (`id`) ON DELETE CASCADE
)
```

Nilai `job_title` yang digunakan dalam sistem:
`Designer` · `Operator Digital` · `Operator Mesin (Banner/Bunting)` · `Finishing` · `Pengurusan / Admin`

### 4.3 Jadual `orders`
Rekod tempahan / pesanan klien.

```sql
CREATE TABLE `orders` (
  `id`                 int(11)                          NOT NULL AUTO_INCREMENT,
  `order_number`       varchar(20)                      NOT NULL,
  `client_name`        varchar(100)                     NOT NULL,
  `item_type`          varchar(100)                     NOT NULL,
  `quantity`           int(11)                          NOT NULL,
  `price`              decimal(10,2)                    NOT NULL,
  `due_date`           date                             NOT NULL,
  `delivery_location`  varchar(255)                     DEFAULT NULL,
  `delivery_type`      enum('Internal','External')      NOT NULL,
  `specifications`     text                             DEFAULT NULL,
  `status`             enum('Pending','In Progress','Completed') DEFAULT 'Pending',
  `created_at`         timestamp                        NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_number` (`order_number`)
)
```

Format `order_number` dijanakan automatik: `ORD-YYYYMMDD-XXXX` (4 digit rawak).

### 4.4 Jadual `tasks`
Tugasan yang diagihkan kepada staf bagi setiap tempahan.

```sql
CREATE TABLE `tasks` (
  `id`                        int(11)                                     NOT NULL AUTO_INCREMENT,
  `order_id`                  int(11)                                     NOT NULL,
  `assigned_staff_id`         int(11)                                     DEFAULT NULL,
  `task_type`                 enum('Design','Printing','Packing','Delivery') NOT NULL,
  `description`               text                                        DEFAULT NULL,
  `start_time`                datetime                                    DEFAULT NULL,
  `end_time`                  datetime                                    DEFAULT NULL,
  `status`                    enum('Pending','In Progress','Completed')   DEFAULT 'Pending',
  `completion_attachment_url` varchar(255)                                DEFAULT NULL,
  `staff_notes`               text                                        DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `order_id` (`order_id`),
  KEY `assigned_staff_id` (`assigned_staff_id`),
  CONSTRAINT `tasks_ibfk_1` FOREIGN KEY (`order_id`)
    REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `tasks_ibfk_2` FOREIGN KEY (`assigned_staff_id`)
    REFERENCES `staff` (`id`) ON DELETE SET NULL
)
```

- `assigned_staff_id = NULL` bermakna tugasan belum diagihkan
- `start_time` / `end_time` diisi oleh enjin AI semasa cadangan agihan
- `completion_attachment_url` — lampiran bukti penyelesaian tugasan (portal staf)
- `staff_notes` — nota tambahan daripada staf semasa melaksanakan tugasan

### 4.5 Jadual `leaves`
Rekod permohonan cuti staf.

```sql
CREATE TABLE `leaves` (
  `id`          int(11)                              NOT NULL AUTO_INCREMENT,
  `staff_id`    int(11)                              NOT NULL,
  `start_date`  date                                 NOT NULL,
  `end_date`    date                                 NOT NULL,
  `reason`      text                                 NOT NULL,
  `status`      enum('Pending','Approved','Rejected') DEFAULT 'Pending',
  `applied_at`  timestamp                            NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `staff_id` (`staff_id`),
  CONSTRAINT `leaves_ibfk_1` FOREIGN KEY (`staff_id`)
    REFERENCES `staff` (`id`) ON DELETE CASCADE
)
```

### Hubungan Antara Jadual

```
users  (1) ──────── (0..1) staff          [staff.user_id → users.id, CASCADE DELETE]
orders (1) ──────── (N)    tasks          [tasks.order_id → orders.id, CASCADE DELETE]
staff  (1) ──────── (N)    tasks          [tasks.assigned_staff_id → staff.id, SET NULL]
staff  (1) ──────── (N)    leaves         [leaves.staff_id → staff.id, CASCADE DELETE]
```

---

## 5. API Endpoints

Semua endpoint berprefiks `/api/`. Backend berjalan pada port `5000` (lalai).

### Pengesahan
| Kaedah | Endpoint | Fungsi |
|---|---|---|
| POST | `/api/login` | Log masuk berpusat (Manager & Staff). Pulang `role`, `userId`, `staffId`, `name` |

### Tempahan (Orders)
| Kaedah | Endpoint | Fungsi |
|---|---|---|
| GET | `/api/orders` | Senarai semua tempahan (ORDER BY id DESC) |
| POST | `/api/orders` | Tambah tempahan baharu (auto-jana `order_number`) |

### Staf
| Kaedah | Endpoint | Fungsi |
|---|---|---|
| GET | `/api/staff` | Senarai semua staf (`full_name`, `job_title`, `status`) |
| POST | `/api/staff` | Tambah rekod staf baharu |
| GET | `/api/staff/:id` | Detail seorang staf (termasuk `email`, `phone_number`) |
| PUT | `/api/staff/update-profile/:id` | Staf kemaskini emel & telefon sendiri |
| PUT | `/api/staff/change-password/:userId` | Staf tukar kata laluan (semakan bcrypt wajib) |

### Cuti (Leaves)
| Kaedah | Endpoint | Fungsi |
|---|---|---|
| GET | `/api/leaves` | Semua rekod cuti (JOIN dengan `staff`) |
| POST | `/api/leaves` | Rekod cuti baharu |
| GET | `/api/manager/leaves` | Pengurus lihat semua permohonan cuti |
| PUT | `/api/manager/leaves/:id` | Pengurus luluskan / tolak cuti |
| GET | `/api/staff/leaves/:staff_id` | Staf lihat sejarah cuti sendiri |
| POST | `/api/staff/leaves` | Staf hantar permohonan cuti baharu |

### Tugasan & Janaan Jadual
| Kaedah | Endpoint | Fungsi |
|---|---|---|
| GET | `/api/tasks/board` | Papan agihan (tasks + orders + staff via JOIN) |
| POST | `/api/generate-schedule` | Agihan Round-Robin untuk tugasan belum diagih |
| POST | `/api/manager/auto-assign` | Cadangan agihan AI (Gemini) — pulang proposal sahaja, tidak simpan |
| POST | `/api/tasks/save-assignments` | Simpan cadangan AI yang disahkan admin (MySQL transaction) |

### Dashboard
| Kaedah | Endpoint | Fungsi |
|---|---|---|
| GET | `/api/dashboard/stats` | KPI: `pending`, `completed`, `activeStaff`, `onLeave` |
| GET | `/api/dashboard/audit-logs` | Log aktiviti terkini (5 cuti + 5 tempahan, gabung & susun) |

### Profil Admin
| Kaedah | Endpoint | Fungsi |
|---|---|---|
| GET | `/api/admin/profile/:userId` | Ambil profil admin dari jadual `users` |
| PUT | `/api/admin/update/:userId` | Kemaskini nama, emel, dan/atau kata laluan admin |

---

## 6. Enjin AI — Aliran Kerja Terperinci

Endpoint: `POST /api/manager/auto-assign`

### Peringkat 1: Pengumpulan Data (SQL)

1. Ambil semua `orders` berstatus `'Pending'` atau `'In Progress'`
2. Ambil semua `tasks` yang `assigned_staff_id IS NULL` bagi orders tersebut
   (JOIN ke `orders` untuk detail penuh: `item_type`, `quantity`, `due_date`, dll.)
3. Ambil senarai `staff` berstatus `'Aktif'`
4. Kira beban kerja (`workload`) semasa setiap staf:
   ```sql
   SELECT assigned_staff_id, COUNT(*) AS count FROM tasks
   WHERE status IN ('Pending', 'In Progress')
     AND assigned_staff_id IS NOT NULL
   GROUP BY assigned_staff_id
   ```
5. Ambil semua rekod cuti `status = 'Approved'` yang `end_date >= hari ini`

### Peringkat 2: Pemprosesan Konflik Cuti (JS — `getLeaveStatusForTask()`)

Untuk setiap pasangan `(tugasan × staf)`, fungsi ini mengira pertindihan antara
tempoh cuti staf dengan tempoh tugasan (dari hari ini hingga `due_date`):

- **Fully on leave** — tempoh cuti meliputi keseluruhan tempoh tugasan →
  staf **dikecualikan** terus dari `available_staff` tugasan tersebut
- **Compressed window** — cuti bertindih sebahagian → staf **dimasukkan**
  tetapi dengan mesej amaran `compressed_window` (AI diarahkan untuk jadualkan
  lebih awal atau agihkan ke staf lain)

### Peringkat 3: Penyediaan Payload untuk AI

Setiap tugasan dihantar ke Gemini dalam struktur ini:
```json
{
  "task_id": 1,
  "task_type": "Design",
  "order_number": "ORD-20260601-1234",
  "client_name": "Ahmad",
  "item_type": "Banner",
  "quantity": 5,
  "due_date": "2026-06-30",
  "delivery_type": "External",
  "delivery_location": "Kuala Lumpur",
  "available_staff": [
    {
      "id": 2,
      "full_name": "Siti Rahmah",
      "job_title": "Operator Digital",
      "workload": 2,
      "compressed_window": null
    }
  ]
}
```

### Peringkat 4: Gemini Function Calling

| Parameter | Nilai |
|---|---|
| Model | `gemini-2.5-flash` |
| Mode | `ANY` — memaksa model sentiasa memanggil fungsi, bukan teks bebas |
| Fungsi | `assign_tasks` |
| Output schema | `assignments[]` setiap satu mengandungi: `task_id`, `staff_id`, `start_time` (ISO 8601), `end_time` (ISO 8601) |
| Retry | Sehingga 3 percubaan, backoff linear 1s / 2s / 3s |

**Arahan dalam prompt kepada AI:**
- **Padanan kemahiran:** `Design → Designer` · `Printing → Operator Digital / Operator Mesin` · `Packing/Delivery → Finishing`
- **Keutamaan:** `due_date` paling dekat diutamakan
- **Anggaran masa:** Design 4–8 jam; Printing/Packing 1 jam per 100 unit (minimum 1 jam)
- **Masa bekerja:** 09:00–18:00 bermula hari semasa
- **Compressed window:** jadualkan lebih awal atau agihkan ke staf lain

### Peringkat 5: Respons & Pengesahan Admin

1. AI mengembalikan `assignments[]` sebagai **cadangan sahaja** — tidak disimpan ke DB
2. Frontend paparkan cadangan untuk semakan admin
3. Admin boleh terima atau ubah suai
4. Selepas disahkan → `POST /api/tasks/save-assignments` menyimpan ke DB dalam
   **satu transaksi MySQL** (`BEGIN → UPDATE tasks × N → COMMIT`, rollback jika gagal)

### Peringkat 6 (Alternatif): Round-Robin

Endpoint `POST /api/generate-schedule` menggunakan algoritma Round-Robin mudah
tanpa AI — sesuai apabila `GEMINI_API_KEY` tidak tersedia atau untuk agihan pantas:

```js
tasks.map((task, index) => {
  const assignedStaff = staffList[index % staffList.length];
  // UPDATE tasks SET assigned_staff_id = ? WHERE id = ?
});
```

---

## 7. Struktur Folder Frontend

```
Frontend/src/
├── App.jsx                  # Router utama (semua Route definitions)
├── main.jsx                 # Entry point React
├── index.css                # CSS asas
├── smarttask.css            # Gaya utama sistem (BEM-like class naming)
├── components/
│   ├── layout.jsx           # Layout admin (sidebar + topbar)
│   ├── StaffLayout.jsx      # Layout portal staf
│   └── JsonLd.jsx           # Schema.org structured data (SEO)
└── pages/
    ├── manager/             # Portal admin/pengurus
    │   ├── Login.jsx
    │   ├── Dashboard.jsx
    │   ├── Tempahan.jsx
    │   ├── TempahanBaru.jsx
    │   ├── JanaanJadual.jsx
    │   ├── SenaraiStaf.jsx
    │   ├── DetailStaf.jsx
    │   ├── Cuti.jsx
    │   ├── PengurusanCuti.jsx
    │   └── ProfilAdmin.jsx
    └── staff/               # Portal staf
        ├── LoginStaf.jsx
        ├── TugasanStaf.jsx
        ├── CutiStaf.jsx
        └── ProfilStaf.jsx
```

**Konvensyen Frontend:**
- Semua teks UI dalam Bahasa Melayu
- CSS: satu fail global (`smarttask.css`), penamaan kelas BEM-like
  (`kpi-card`, `badge--success`, `section-card`, `user-cell`, dsb.)
- Ikon: inline SVG — tiada perpustakaan ikon luar selain `lucide-react`
- Dua kumpulan route: admin di bawah `<Layout>` (protected), staf di bawah `<StaffLayout>`

---

## 8. Pembolehubah Persekitaran

Fail `.env` diletakkan di **root projek** (satu level atas folder `Backend/`).

| Pembolehubah | Kegunaan |
|---|---|
| `GEMINI_API_KEY` | Kunci API Google Gemini — wajib untuk fungsi AI auto-assign |
| `PORT` | Port pelayan Express (pilihan — lalai: `5000`) |
| `DATABASE_URL` | Rujukan sahaja — **tidak dibaca oleh `db.js`** (lihat nota di bawah) |

> **Nota penting:** `Backend/db.js` menggunakan nilai **hardcode** (`host: 'localhost'`,
> `user: 'root'`, `password: ''`, `database: 'smarttask_db'`). Nilai `DATABASE_URL`
> dalam `.env` tidak digunakan. Sekiranya persekitaran berbeza (contoh: server
> pengeluaran), nilai dalam `db.js` perlu dikemaskini secara langsung atau
> dikonfigurasi semula untuk membaca dari `process.env`.

---

## 9. Konfigurasi Pangkalan Data

| Parameter | Nilai |
|---|---|
| Host | `localhost` |
| Port | `3306` (XAMPP MySQL lalai) |
| Nama DB | `smarttask_db` |
| Pengguna | `root` |
| Kata Laluan | `''` (kosong — tetapan lalai XAMPP) |
| Connection Pool | 10 sambungan, `queueLimit: 0` (tiada had giliran) |
| Driver | `mysql2/promise` (untuk keserasian `async/await`) |

# SmartTask — Sistem Pengagihan Tugasan Harian Pintar Berasaskan AI

> Sistem Pengurusan Tugasan Automatik untuk SH Design & Print Sdn. Bhd.

---

## Pengenalan

SH Design & Print Sdn. Bhd. adalah syarikat percetakan yang mengendalikan pelbagai
tempahan harian — dari reka bentuk grafik hingga pencetakan dan penghantaran. Masalah
utama yang dihadapi ialah pengagihan tugasan kepada pekerja dilakukan secara manual,
menyebabkan beban kerja tidak seimbang, konflik dengan cuti staf, dan kelewatan
memenuhi tarikh akhir pelanggan.

**SmartTask** menyelesaikan masalah ini dengan menggabungkan tiga pendekatan:

- **TPS (Transaction Processing System)** — Merekod setiap tempahan, tugasan, dan
  permohonan cuti secara sistematik dalam pangkalan data
- **DSS (Decision Support System)** — Papan pemuka dengan KPI dan log aktiviti untuk
  membantu pengurus membuat keputusan berdasarkan data terkini
- **AI (Artificial Intelligence)** — Enjin cadangan agihan pintar menggunakan Google
  Gemini 2.5 Flash yang mempertimbangkan kemahiran staf, beban kerja semasa, dan
  konflik cuti sebelum mencadangkan jadual tugasan

---

## Ciri-ciri Utama

### Modul Admin / Pengurus

| Ciri | Penerangan |
|---|---|
| **Papan Pemuka** | KPI masa nyata: tempahan belum selesai, tugasan siap, staf aktif, staf bercuti |
| **Pengurusan Tempahan** | Cipta dan pantau tempahan klien dengan nombor rujukan automatik (`ORD-YYYYMMDD-XXXX`) |
| **Senarai Staf** | Lihat profil staf, klik nama untuk detail lengkap secara inline |
| **Janaan Jadual AI** | Gemini AI mencadangkan agihan tugasan berdasarkan kemahiran, beban kerja, dan cuti — admin sahkan sebelum disimpan |
| **Janaan Jadual Manual** | Agihan Round-Robin tanpa AI sebagai alternatif |
| **Pengurusan Cuti** | Semak dan luluskan / tolak permohonan cuti staf |
| **Log Aktiviti** | Aliran aktiviti terkini menggabungkan rekod cuti dan tempahan baharu |
| **Profil Admin** | Kemaskini nama, emel, dan kata laluan akaun pengurus |

### Modul Staf

| Ciri | Penerangan |
|---|---|
| **Senarai Tugasan** | Lihat semua tugasan yang diagihkan beserta detail tempahan (jenis item, pelanggan, tarikh akhir) |
| **Permohonan Cuti** | Hantar permohonan cuti baharu dengan tarikh dan sebab |
| **Sejarah Cuti** | Semak status permohonan cuti terdahulu (`Pending` / `Approved` / `Rejected`) |
| **Kemaskini Profil** | Kemaskini emel dan nombor telefon |
| **Tukar Kata Laluan** | Tukar kata laluan dengan pengesahan kata laluan semasa |

---

## Tech Stack

| Lapisan | Teknologi | Versi |
|---|---|---|
| **Backend Framework** | Express.js (Node.js, CommonJS) | ^5.2.1 |
| **AI Engine** | Google Gemini 2.5 Flash — Function Calling | SDK ^0.24.1 |
| **Pangkalan Data** | MySQL via XAMPP (InnoDB, utf8mb4) | — |
| **MySQL Driver** | mysql2/promise | ^3.22.3 |
| **Pengesahan Kata Laluan** | bcrypt | ^6.0.0 |
| **Frontend Framework** | React | ^18.2.0 |
| **Build Tool** | Vite | ^4.4.5 |
| **Routing (Frontend)** | React Router DOM | ^7.14.2 |
| **HTTP Client** | Axios | ^1.15.2 |
| **Version Control** | Git / GitHub | — |

---

## Senibina Sistem

SmartTask menggunakan corak **MVC (Model-View-Controller)**:

- **Model** — Pangkalan data MySQL diakses melalui connection pool `mysql2/promise`
  tanpa ORM. Semua pertanyaan ditulis sebagai raw SQL dalam `Backend/server.js`.
- **View** — React 18 SPA dengan dua layout berasingan: portal admin dan portal staf.
  Navigasi diurus oleh React Router DOM v7.
- **Controller** — Semua route handler Express berada dalam satu fail `Backend/server.js`.
  Tiada sesi pelayan atau JWT — data pengguna disimpan dalam `localStorage` browser
  selepas log masuk, dan kata laluan disahkan menggunakan `bcrypt.compare()`.

Untuk penjelasan teknikal penuh termasuk diagram aliran, senarai lengkap endpoint API,
dan spesifikasi skema pangkalan data, rujuk **[ARCHITECTURE.md](./ARCHITECTURE.md)**.

---

## Logik AI (Gambaran Tinggi)

Apabila pengurus menekan butang **"Jana Jadual AI"**, sistem melaksanakan urutan berikut:

```
1. SQL → Ambil tugasan belum diagih + detail tempahan
2. SQL → Ambil senarai staf aktif + beban kerja semasa
3. SQL → Ambil rekod cuti yang diluluskan
          ↓
4. JS  → Semak konflik cuti bagi setiap pasangan (tugasan × staf):
         • Cuti penuh merangkumi tempoh tugasan → staf dikecualikan
         • Cuti separa bertindih → staf dimasukkan dengan amaran "tetingkap terpadat"
          ↓
5. API → Hantar payload berstruktur ke Gemini 2.5 Flash (Function Calling)
         AI mempertimbangkan: padanan kemahiran, keutamaan tarikh akhir,
         anggaran masa kerja, dan konflik cuti
          ↓
6. UI  → Cadangan agihan dipaparkan kepada admin untuk disemak
7. Admin sahkan / ubah suai cadangan
          ↓
8. SQL → Simpan dalam transaksi MySQL (rollback automatik jika gagal)
```

AI tidak menyimpan sebarang data secara automatik — setiap cadangan **mesti disahkan
oleh admin** sebelum dikemaskini ke pangkalan data.

---

## Struktur Pangkalan Data

Nama pangkalan data: `smarttask_db`

| Jadual | Penerangan |
|---|---|
| `users` | Kelayakan log masuk semua pengguna sistem (username, kata laluan bcrypt, peranan) |
| `staff` | Profil pekerja — nama penuh, jawatan, emel, telefon, kod ID, gambar profil |
| `orders` | Rekod tempahan klien — jenis item, kuantiti, harga, tarikh akhir, lokasi hantar |
| `tasks` | Tugasan yang diagihkan bagi setiap tempahan — jenis, status, masa mula/tamat, nota staf |
| `leaves` | Permohonan cuti staf — tarikh, sebab, status kelulusan |

Skema penuh dengan jenis kolum, kekangan, dan hubungan FK tersedia dalam
**[ARCHITECTURE.md — Seksyen 4](./ARCHITECTURE.md)**.

---

## Cara Pemasangan

### Prasyarat

- [Node.js](https://nodejs.org/) (v18 atau lebih baharu)
- [XAMPP](https://www.apachefriends.org/) dengan MySQL aktif pada port `3306`
- Kunci API Google Gemini ([dapatkan di sini](https://aistudio.google.com/app/apikey))

### 1. Klon Repositori

```bash
git clone https://github.com/[USERNAME]/smarttask.git
cd smarttask
```

### 2. Sediakan Pangkalan Data

Buka **phpMyAdmin** (`http://localhost/phpmyadmin`) atau MySQL CLI, kemudian jalankan
fail SQL mengikut urutan:

```sql
-- Langkah 1: Cipta pangkalan data dan jadual orders (asas)
SOURCE Backend/database.sql;

-- Langkah 2: Cipta jadual staff, leaves, dan data contoh
SOURCE Backend/setup_tables.sql;
```

> **Nota:** Jadual `users` dan `tasks` perlu diwujudkan secara berasingan — rujuk
> skema penuh dalam [ARCHITECTURE.md](./ARCHITECTURE.md) untuk penyataan `CREATE TABLE`.

### 3. Tetapkan Pembolehubah Persekitaran

Salin fail contoh dan isi nilai yang diperlukan:

```bash
cp .env.example .env
```

Edit `.env`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=5000
```

### 4. Pasang Dependensi & Jalankan Backend

```bash
cd Backend
npm install
node server.js
```

Pelayan akan berjalan di `http://localhost:5000`

### 5. Pasang Dependensi & Jalankan Frontend

Buka terminal baharu:

```bash
cd Frontend
npm install
npm run dev
```

Aplikasi akan boleh diakses di `http://localhost:5173`

---

## Struktur Folder Projek

```
SmartTask/
├── Backend/
│   ├── server.js              # Pelayan Express — semua route & logik AI
│   ├── db.js                  # Konfigurasi MySQL connection pool
│   ├── database.sql           # Skrip SQL: jadual orders (asas)
│   ├── setup_tables.sql       # Skrip SQL: jadual staff & leaves + data contoh
│   ├── package.json
│   └── api/                   # Fail PHP legacy (tidak digunakan)
├── Frontend/
│   ├── src/
│   │   ├── App.jsx            # Konfigurasi router (semua Route)
│   │   ├── main.jsx           # Entry point React
│   │   ├── smarttask.css      # Helaian gaya utama sistem
│   │   ├── components/
│   │   │   ├── layout.jsx     # Layout admin (sidebar + topbar)
│   │   │   ├── StaffLayout.jsx
│   │   │   └── JsonLd.jsx
│   │   └── pages/
│   │       ├── manager/       # 10 halaman portal admin
│   │       └── staff/         # 4 halaman portal staf
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── .env                       # Pembolehubah persekitaran (tidak di-commit)
├── .env.example               # Templat .env
├── ARCHITECTURE.md            # Dokumentasi teknikal penuh
└── CLAUDE.md                  # Panduan untuk Claude Code AI
```

---

## Status Pembangunan

> Sistem ini sedang dalam **pembangunan aktif** sebagai projek Tahun Akhir (FYP).
> Sesetengah ciri mungkin belum lengkap atau masih dalam fasa pengujian.

---

## Pembangun

| | |
|---|---|
| **Nama** | [NAMA PELAJAR] |
| **No. Matrik** | [NO MATRIK] |
| **Universiti** | [NAMA UNIVERSITI] |
| **Penyelia** | [NAMA PENYELIA] |
| **Sesi** | [SESI AKADEMIK] |

---

## Lesen

[PERLU DISAHKAN]

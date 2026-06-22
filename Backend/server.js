const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const db = require('./db');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Muatkan pembolehubah persekitaran (environment variables)
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Tetapan Middleware
app.use(cors()); // Membenarkan permintaan Cross-Origin
app.use(express.json()); // Parsing body berformat JSON

// ── Endpoint Log Masuk Berpusat (Unified Login) ──────────────────
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    // Pastikan input disediakan
    if (!username || !password) {
        return res.status(400).json({
            success: false,
            error: 'Sila masukkan nama pengguna dan kata laluan.'
        });
    }

    try {
        // Cari pengguna berdasarkan username (semak juga is_active)
        const [users] = await db.query(
            `SELECT id, username, password, role, is_active FROM users WHERE username = ?`,
            [username]
        );

        // Pengguna tidak dijumpai
        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                error: 'ID Pengguna atau Kata Laluan salah.'
            });
        }

        const user = users[0];

        // Semak akaun aktif
        if (user.is_active === 0) {
            return res.status(403).json({
                success: false,
                error: 'Akaun anda telah dinyahaktifkan. Hubungi admin.'
            });
        }

        // Semak kata laluan dengan bcrypt (WAJIB — kata laluan sudah di-hash)
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                error: 'ID Pengguna atau Kata Laluan salah.'
            });
        }

        let staffId = null;
        let staffName = user.username;

        // Sekiranya pengguna adalah Staf, ambil ID mereka dari jadual staff
        if (user.role === 'Staff') {
            const [staffRows] = await db.query(
                `SELECT id, full_name FROM staff WHERE user_id = ? LIMIT 1`,
                [user.id]
            );
            if (staffRows.length > 0) {
                staffId = staffRows[0].id;
                staffName = staffRows[0].full_name;
            }
        }

        // Log masuk berjaya — pulangkan data pengguna berserta peranan
        res.status(200).json({
            success: true,
            message: 'Log masuk berjaya',
            role:   user.role,     // 'Manager' atau 'Staff'
            userId: user.id,       // ID dari jadual users
            staffId: staffId,      // ID dari jadual staff
            name:   staffName,     // Nama sebenar dari jadual staff (jika wujud)
            // Untuk keserasian dengan kod lama:
            user: {
                id:       user.id,
                username: user.username,
                role:     user.role
            }
        });

    } catch (err) {
        console.error('Ralat semasa log masuk:', err.message);
        res.status(500).json({
            success: false,
            error: 'Ralat pelayan dalaman.',
            detail: err.message
        });
    }
});

// API Endpoint ujian untuk mengambil semua data dari jadual Orders
app.get('/api/orders', async (req, res) => {
    try {
        // Laksanakan query
        const [rows] = await db.query('SELECT * FROM Orders');

        // Pulangkan respon JSON sekiranya berjaya
        res.status(200).json({
            success: true,
            message: 'Berjaya mengambil data dari jadual Orders',
            data: rows
        });
    } catch (error) {
        console.error('Ralat semasa mengambil data:', error.message);

        // Pulangkan ralat sekiranya query gagal
        res.status(500).json({
            success: false,
            message: 'Ralat pelayan dalaman',
            error: error.message
        });
    }
});

// Endpoint untuk menambah tempahan baharu
app.post('/api/orders', async (req, res) => {
    console.log("Data diterima:", req.body);

    // 1. Tangkap semua data dari Frontend
    const { namaKlien, jenisItem, kuantiti, harga, tarikhSiap, jenisHantar, lokasiHantar, nota } = req.body;

    // 2. Jana nombor tempahan
    const order_number = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    // 3. Masukkan 'delivery_location' ke dalam SQL (pastikan kolum ini wujud di MySQL anda)
    const sql = `INSERT INTO Orders 
                 (order_number, client_name, item_type, quantity, price, due_date, delivery_type, delivery_location, specifications, status) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')`;

    // 4. Susun 'values' mengikut urutan tanda soal (?) di atas
    const values = [
        order_number,
        namaKlien,
        jenisItem,
        kuantiti,
        harga,
        tarikhSiap,
        jenisHantar,
        lokasiHantar,  // <- Kita tambah lokasi di sini
        nota
    ];

    try {
        // 5. Laksanakan ke pangkalan data menggunakan async/await
        const [result] = await db.query(sql, values);

        console.log("Data berjaya disimpan dengan ID:", result.insertId);

        // PASTIKAN BARIS INI ADA DI DALAM KOD ANDA! INI JAWAPAN KEPADA REACT
        return res.status(201).json({ message: "Tempahan berjaya disimpan!", orderId: result.insertId });
    } catch (error) {
        console.error("Ralat MySQL:", error);
        return res.status(500).json({ error: "Gagal menyimpan data ke pangkalan data." });
    }
});

// Endpoint untuk mendapatkan semua senarai tempahan
app.get('/api/orders', async (req, res) => {
    try {
        // Susun data dari yang paling baharu (id paling besar) ke paling lama
        const sql = `SELECT * FROM Orders ORDER BY id DESC`;
        const [results] = await db.query(sql);

        // Pulangkan senarai data dalam format JSON
        res.status(200).json(results);
    } catch (error) {
        console.error("Ralat MySQL:", error);
        res.status(500).json({ error: "Gagal mengambil data tempahan." });
    }
});

// ── DASHBOARD ENDPOINTS ──────────────────────────────────────────

// Endpoint: statistik ringkasan untuk kad KPI dashboard
app.get('/api/dashboard/stats', async (req, res) => {
    try {
        // Kira tempahan Pending
        const [[{ pending }]] = await db.query(
            `SELECT COUNT(*) AS pending FROM orders WHERE status = 'Pending'`
        );
        // Kira tempahan Completed
        const [[{ completed }]] = await db.query(
            `SELECT COUNT(*) AS completed FROM orders WHERE status = 'Completed'`
        );
        // Kira staf Aktif
        const [[{ activeStaff }]] = await db.query(
            `SELECT COUNT(*) AS activeStaff FROM staff WHERE status = 'Aktif'`
        );
        // Kira staf sedang cuti hari ini (status Approved & tarikh merangkumi hari ini)
        const today = new Date().toISOString().slice(0, 10);
        const [[{ onLeave }]] = await db.query(
            `SELECT COUNT(*) AS onLeave FROM leaves 
             WHERE status = 'Approved' AND start_date <= ? AND end_date >= ?`,
            [today, today]
        );

        res.status(200).json({ pending, completed, activeStaff, onLeave });
    } catch (err) {
        console.error("Ralat dashboard/stats:", err);
        res.status(500).json({ error: "Gagal mengambil statistik dashboard." });
    }
});

// Endpoint: log aktiviti terkini (5 permohonan cuti terbaru + 5 tempahan terbaru)
app.get('/api/dashboard/audit-logs', async (req, res) => {
    try {
        // Ambil 5 rekod cuti terbaru
        const [leaveRows] = await db.query(`
            SELECT 
                leaves.id,
                TIME_FORMAT(leaves.applied_at, '%h:%i %p') AS time,
                staff.full_name AS user,
                CONCAT('Permohonan cuti: ', leaves.reason) AS activity,
                leaves.status AS status
            FROM leaves
            JOIN staff ON leaves.staff_id = staff.id
            ORDER BY leaves.applied_at DESC
            LIMIT 5
        `);

        // Ambil 5 tempahan terbaru
        const [orderRows] = await db.query(`
            SELECT 
                orders.id + 1000 AS id,
                TIME_FORMAT(orders.created_at, '%h:%i %p') AS time,
                orders.client_name AS user,
                CONCAT('Tempahan baharu: ', orders.item_type, ' (', orders.order_number, ')') AS activity,
                orders.status AS status
            FROM orders
            ORDER BY orders.created_at DESC
            LIMIT 5
        `);

        // Gabung dan susun
        const combined = [...leaveRows, ...orderRows].sort((a, b) =>
            a.time > b.time ? -1 : 1
        );

        res.status(200).json(combined);
    } catch (err) {
        console.error("Ralat dashboard/audit-logs:", err);
        res.status(500).json({ error: "Gagal mengambil log aktiviti." });
    }
});

// ── STAFF ENDPOINTS ──────────────────────────────────────────────

// Endpoint untuk mendapatkan senarai staf
app.get('/api/staff', async (req, res) => {
    try {
        const sql = `SELECT id, full_name AS name, job_title AS role, status FROM staff ORDER BY full_name ASC`;
        const [results] = await db.query(sql);
        res.status(200).json(results);
    } catch (err) {
        console.error("Ralat MySQL:", err);
        res.status(500).json({ error: "Gagal mengambil data staf." });
    }
});

// Endpoint untuk tambah staf baharu
app.post('/api/staff', async (req, res) => {
    try {
        const { name, role, status } = req.body;
        const sql = `INSERT INTO staff (full_name, job_title, status) VALUES (?, ?, ?)`;
        const [result] = await db.query(sql, [name, role, status]);
        res.status(201).json({ message: "Staf berjaya ditambah!", staffId: result.insertId });
    } catch (err) {
        console.error("Ralat MySQL:", err);
        res.status(500).json({ error: "Gagal menambah staf." });
    }
});

// Endpoint untuk mendapatkan detail SATU staf berdasarkan ID
app.get('/api/staff/:id', async (req, res) => {
    try {
        const staffId = req.params.id;
        const sql = `SELECT id, full_name AS name, job_title AS role, status, email, phone_number FROM staff WHERE id = ?`;
        const [results] = await db.query(sql, [staffId]);
        if (results.length === 0) {
            return res.status(404).json({ message: "Staf tidak dijumpai" });
        }
        res.status(200).json(results[0]);
    } catch (err) {
        console.error("Ralat MySQL:", err);
        res.status(500).json({ error: "Gagal mengambil data staf." });
    }
});

// Endpoint untuk mendapatkan semua rekod cuti
app.get('/api/leaves', async (req, res) => {
    try {
        const sql = `
            SELECT leaves.*, staff.full_name AS staff_name 
            FROM leaves 
            JOIN staff ON leaves.staff_id = staff.id 
            ORDER BY leaves.applied_at DESC`;
        const [results] = await db.query(sql);
        res.status(200).json(results);
    } catch (err) {
        console.error("Ralat MySQL:", err);
        res.status(500).json({ error: "Gagal mengambil rekod cuti." });
    }
});

// Endpoint untuk merekod cuti baharu
app.post('/api/leaves', async (req, res) => {
    try {
        const { staff_id, start_date, end_date, reason } = req.body;
        const sql = `INSERT INTO Leaves (staff_id, start_date, end_date, reason, status) VALUES (?, ?, ?, ?, 'Pending')`;
        const [result] = await db.query(sql, [staff_id, start_date, end_date, reason]);
        res.status(201).json({ message: "Cuti berjaya direkodkan!", leaveId: result.insertId });
    } catch (err) {
        console.error("Ralat MySQL:", err);
        res.status(500).json({ error: "Gagal merekod cuti." });
    }
});

// 1. Endpoint untuk Pengurus melihat semua permohonan cuti staf
app.get('/api/manager/leaves', async (req, res) => {
    try {
        // Menggunakan async/await (bertepatan dengan konfigurasi db.js projek)
        // Join jadual leaves dan staff untuk memaparkan nama staf dengan tepat
        const sql = `
            SELECT leaves.*, staff.full_name AS staff_name 
            FROM leaves 
            JOIN staff ON leaves.staff_id = staff.id 
            ORDER BY leaves.id DESC
        `;
        const [results] = await db.query(sql);
        res.status(200).json(results);
    } catch (err) {
        console.error("Ralat MySQL:", err);
        res.status(500).json({ error: "Gagal mengambil senarai cuti." });
    }
});

// 2. Endpoint untuk Pengurus mengemas kini status cuti (Lulus/Ditolak)
app.put('/api/manager/leaves/:id', async (req, res) => {
    try {
        const leaveId = req.params.id;
        const { status } = req.body; // 'Lulus', 'Ditolak', dsb.

        const sql = `UPDATE leaves SET status = ? WHERE id = ?`;
        await db.query(sql, [status, leaveId]);
        
        res.status(200).json({ message: `Cuti berjaya ${status}` });
    } catch (err) {
        console.error("Ralat MySQL:", err);
        res.status(500).json({ error: "Gagal mengemas kini status cuti." });
    }
});

// ==========================================
// MODUL JANAAN JADUAL (AI DISTRIBUTION)
// ==========================================

// 1. Endpoint untuk menjana agihan tugasan secara automatik (Round-Robin)
app.post('/api/generate-schedule', async (req, res) => {
    try {
        // A. Cari tugas yang belum diagihkan
        const [tasks] = await db.query(
            `SELECT * FROM tasks WHERE assigned_staff_id IS NULL AND status = 'Pending'`
        );

        if (tasks.length === 0) {
            return res.status(200).json({ message: "Tiada tugasan baharu untuk diagihkan." });
        }

        // B. Cari staf yang aktif dan tidak bercuti hari ini
        const today = new Date().toISOString().slice(0, 10);
        const [staffList] = await db.query(`
            SELECT staff.* FROM staff
            WHERE staff.status = 'Aktif'
            AND staff.id NOT IN (
                SELECT staff_id FROM leaves
                WHERE status = 'Approved'
                AND start_date <= ? AND end_date >= ?
            )
        `, [today, today]);

        if (staffList.length === 0) {
            return res.status(400).json({ error: "Tiada staf yang tersedia hari ini!" });
        }

        // C. ALGORITMA AGIHAN PINTAR: Round-Robin / Load Balancing
        const updatePromises = tasks.map((task, index) => {
            const assignedStaff = staffList[index % staffList.length];
            return db.query(
                `UPDATE tasks SET assigned_staff_id = ? WHERE id = ?`,
                [assignedStaff.id, task.id]
            );
        });

        // D. Jalankan semua kemaskini serentak
        await Promise.all(updatePromises);

        res.status(200).json({
            message: `Berjaya! Sistem telah mengagihkan ${tasks.length} tugasan baharu.`,
            assignedCount: tasks.length
        });

    } catch (err) {
        console.error("Ralat generate-schedule:", err);
        res.status(500).json({ error: "Ralat semasa menjana jadual." });
    }
});

// 2. Endpoint untuk memaparkan papan agihan (Kanban/Table view)
app.get('/api/tasks/board', async (req, res) => {
    try {
        // Gabungkan Tasks + Orders + Staff dengan nama kolum yang betul
        const [results] = await db.query(`
            SELECT 
                tasks.*,
                staff.full_name AS staff_name,
                staff.job_title AS staff_role,
                orders.order_number,
                orders.client_name,
                orders.item_type
            FROM tasks
            JOIN staff  ON tasks.assigned_staff_id = staff.id
            JOIN orders ON tasks.order_id = orders.id
            WHERE tasks.assigned_staff_id IS NOT NULL
            ORDER BY tasks.assigned_staff_id ASC, tasks.id ASC
        `);

        res.status(200).json(results);
    } catch (err) {
        console.error("Ralat tasks/board:", err);
        res.status(500).json({ error: "Ralat mengambil papan tugasan." });
    }
});

// 3. Endpoint untuk agihan tugasan menggunakan Gemini AI
app.post('/api/manager/auto-assign', async (req, res) => {
    try {
        // A. Dapatkan semua tugasan yang belum diagih
        const [tasks] = await db.query(
            `SELECT * FROM tasks WHERE assigned_staff_id IS NULL`
        );

        if (tasks.length === 0) {
            return res.status(200).json({ message: "Tiada tugasan yang perlu diagihkan." });
        }

        // B. Dapatkan staf yang aktif dan tidak cuti (Lulus) hari ini, beserta beban kerja
        const today = new Date().toISOString().slice(0, 10);
        const [staffList] = await db.query(`
            SELECT staff.*, 
                   (SELECT COUNT(*) FROM tasks WHERE tasks.assigned_staff_id = staff.id AND status IN ('In Progress', 'Pending')) AS workload
            FROM staff
            WHERE staff.status = 'Aktif'
            AND staff.id NOT IN (
                SELECT staff_id FROM leaves
                WHERE status = 'Approved'
                AND start_date <= ? AND end_date >= ?
            )
        `, [today, today]);

        if (staffList.length === 0) {
            return res.status(400).json({ error: "Tiada staf yang tersedia hari ini!" });
        }

        // C. Integrasi Gemini AI
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
            }
        });

        const prompt = `Anda adalah sistem agihan tugasan pintar. Berikut adalah senarai tugasan belum diagih: ${JSON.stringify(tasks)}. Berikut adalah staf yang hadir hari ini berserta beban kerja mereka: ${JSON.stringify(staffList)}. Tolong agihkan tugasan secara adil. Wajib pulangkan jawapan dalam format JSON Array seperti ini sahaja: [{"task_id": 1, "staff_id": 2}]. Jangan letak teks Markdown.`;

        const resultAI = await model.generateContent(prompt);
        const responseText = resultAI.response.text();
        
        // D. Parse JSON dari AI
        let assignments = [];
        try {
            assignments = JSON.parse(responseText);
        } catch (e) {
            return res.status(500).json({ error: "Gagal memproses respon AI", details: responseText });
        }

        // E. Kemaskini Pangkalan Data
        const updatePromises = assignments.map(assign => {
            return db.query(
                `UPDATE tasks SET assigned_staff_id = ? WHERE id = ?`,
                [assign.staff_id, assign.task_id]
            );
        });

        await Promise.all(updatePromises);

        // F. Pulangkan respon
        res.status(200).json({ 
            message: "Agihan AI berjaya dilaksanakan!", 
            data: assignments 
        });

    } catch (err) {
        console.error("Ralat auto-assign Gemini:", err);
        res.status(500).json({ error: "Ralat semasa mengagih tugasan dengan AI." });
    }
});

// Mulakan pelayan (Server)
app.listen(PORT, () => {
    console.log(`Pelayan utama sedang berjalan di http://localhost:${PORT}`);
});

// ── PORTAL STAF ENDPOINTS ─────────────────────────────────────────

// Endpoint: tugasan bagi staf tertentu berdasarkan staff_id
app.get('/api/staff/tasks/:staff_id', async (req, res) => {
    try {
        const staff_id = req.params.staff_id;

        // Join tasks + orders untuk detail penuh
        const sql = `
            SELECT 
                tasks.*,
                orders.order_number,
                orders.client_name,
                orders.item_type,
                orders.due_date
            FROM tasks
            JOIN orders ON tasks.order_id = orders.id
            WHERE tasks.assigned_staff_id = ?
            ORDER BY tasks.id DESC`;

        const [results] = await db.query(sql, [staff_id]);
        res.status(200).json(results);

    } catch (err) {
        console.error("Ralat MySQL tasks/staff_id:", err);
        res.status(500).json({ error: "Gagal mengambil tugasan staf." });
    }
});

// 1. Endpoint: staf lihat sejarah cuti sendiri
app.get('/api/staff/leaves/:staff_id', async (req, res) => {
    try {
        const staff_id = req.params.staff_id;
        const [results] = await db.query(
            `SELECT * FROM leaves WHERE staff_id = ? ORDER BY applied_at DESC`,
            [staff_id]
        );
        res.status(200).json(results);
    } catch (err) {
        console.error("Ralat MySQL staff/leaves GET:", err);
        res.status(500).json({ error: "Gagal mengambil sejarah cuti." });
    }
});

// 2. Endpoint: staf hantar permohonan cuti baharu
app.post('/api/staff/leaves', async (req, res) => {
    try {
        const { staff_id, start_date, end_date, reason } = req.body;

        if (!staff_id || !start_date || !end_date || !reason) {
            return res.status(400).json({ error: "Semua medan wajib diisi." });
        }

        const [result] = await db.query(
            `INSERT INTO leaves (staff_id, start_date, end_date, reason, status) VALUES (?, ?, ?, ?, 'Pending')`,
            [staff_id, start_date, end_date, reason]
        );

        res.status(201).json({
            message: "Permohonan cuti berjaya dihantar!",
            leaveId: result.insertId
        });
    } catch (err) {
        console.error("Ralat MySQL staff/leaves POST:", err);
        res.status(500).json({ error: "Gagal menghantar permohonan cuti." });
    }
});

// ── PORTAL STAF: PROFIL ENDPOINTS ────────────────────────────────

// 1. Endpoint: kemaskini maklumat profil staf (email & phone_number)
app.put('/api/staff/update-profile/:id', async (req, res) => {
    try {
        const staffId = req.params.id;
        const { email, phone } = req.body;

        if (!email && !phone) {
            return res.status(400).json({ error: "Tiada data untuk dikemaskini." });
        }

        // Nota: kolum sebenar dalam jadual staff ialah 'phone_number', bukan 'phone'
        const [result] = await db.query(
            `UPDATE staff SET email = ?, phone_number = ? WHERE id = ?`,
            [email || null, phone || null, staffId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Staf tidak dijumpai." });
        }

        res.status(200).json({ message: "Profil berjaya dikemaskini!" });
    } catch (err) {
        console.error("Ralat MySQL update-profile:", err);
        res.status(500).json({ error: "Gagal mengemaskini profil." });
    }
});

// 2. Endpoint: tukar kata laluan (dengan bcrypt hash — WAJIB untuk keselamatan)
app.put('/api/staff/change-password/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const { newPassword, currentPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ error: "Kata laluan baharu mestilah sekurang-kurangnya 6 aksara." });
        }

        // Semak kata laluan semasa (jika dihantar) sebelum tukar
        if (currentPassword) {
            const [users] = await db.query(
                `SELECT password FROM users WHERE id = ?`, [userId]
            );
            if (users.length === 0) {
                return res.status(404).json({ error: "Pengguna tidak dijumpai." });
            }
            const isMatch = await bcrypt.compare(currentPassword, users[0].password);
            if (!isMatch) {
                return res.status(401).json({ error: "Kata laluan semasa tidak tepat." });
            }
        }

        // Hash kata laluan baharu sebelum simpan (WAJIB)
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const [result] = await db.query(
            `UPDATE users SET password = ? WHERE id = ?`,
            [hashedPassword, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Pengguna tidak dijumpai." });
        }

        res.status(200).json({ message: "Kata laluan berjaya ditukar!" });
    } catch (err) {
        console.error("Ralat MySQL change-password:", err);
        res.status(500).json({ error: "Gagal menukar kata laluan." });
    }
});

// ── ADMIN: PROFIL ENDPOINTS ──────────────────────────────────────

// 1. Endpoint untuk mendapatkan profil Admin
app.get('/api/admin/profile/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const sql = `SELECT id, name, email, username, role FROM users WHERE id = ?`;
        
        const [results] = await db.query(sql, [userId]);
        
        if (results.length === 0) {
            return res.status(404).json({ error: "Admin tidak dijumpai." });
        }
        res.status(200).json(results[0]);
    } catch (err) {
        console.error("Ralat MySQL admin/profile:", err);
        res.status(500).json({ error: "Ralat pangkalan data." });
    }
});

// 2. Endpoint untuk mengemaskini profil & kata laluan Admin
app.put('/api/admin/update/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const { name, email, password } = req.body;

        if (password) {
            // Jika admin mahu tukar kata laluan sekali, hash kata laluan baru
            if (password.length < 6) {
                return res.status(400).json({ error: "Kata laluan baharu mestilah sekurang-kurangnya 6 aksara." });
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            await db.query(
                "UPDATE users SET name = ?, email = ?, password = ? WHERE id = ?",
                [name || null, email || null, hashedPassword, userId]
            );
        } else {
            // Hanya kemaskini nama dan emel
            await db.query(
                "UPDATE users SET name = ?, email = ? WHERE id = ?",
                [name || null, email || null, userId]
            );
        }

        res.status(200).json({ message: "Profil Admin berjaya dikemaskini!" });
    } catch (err) {
        console.error("Ralat MySQL admin/update:", err);
        res.status(500).json({ error: "Gagal mengemaskini profil Admin." });
    }
});

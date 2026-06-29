// test: trigger review gate
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('./db');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { verifyToken, requireRole } = require('./middleware/auth');

// Muatkan pembolehubah persekitaran (environment variables)
dotenv.config({ path: require('path').resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Tetapan Middleware
app.use(cors()); // Membenarkan permintaan Cross-Origin
app.use(express.json()); // Parsing body berformat JSON

// ── Static serving: fail lampiran tugasan (baca sahaja, tiada directory listing) ──
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { index: false }));

// ── Konfigurasi multer untuk muat naik lampiran tugasan ──
const uploadDir = path.join(__dirname, 'uploads', 'tasks');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const taskStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const taskId = req.params.id || 'unknown';
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `task-${taskId}-${Date.now()}${ext}`);
    }
});

const taskUpload = multer({
    storage: taskStorage,
    fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Jenis fail tidak dibenarkan. Hanya JPG, PNG, dan PDF diterima.'));
        }
    },
    limits: { fileSize: 5 * 1024 * 1024 }
});

// Pembungkus multer yang mengembalikan error JSON (bukan HTML)
function uploadSingle(field) {
    return (req, res, next) => {
        taskUpload.single(field)(req, res, (err) => {
            if (!err) return next();
            const msg = err.code === 'LIMIT_FILE_SIZE'
                ? 'Fail terlalu besar. Had maksimum ialah 5MB.'
                : (err.message || 'Ralat muat naik fail.');
            res.status(400).json({ error: msg });
        });
    };
}

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

        // Log masuk berjaya — jana JWT token dan pulangkan data pengguna
        const token = jwt.sign(
            { userId: user.id, role: user.role, staffId },
            process.env.JWT_SECRET || 'smarttask_dev_secret_TUKAR_DI_PRODUKSI',
            { expiresIn: '24h' }
        );
        res.status(200).json({
            success: true,
            message: 'Log masuk berjaya',
            token,
            role:    user.role,
            userId:  user.id,
            staffId: staffId,
            name:    staffName,
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

// Endpoint untuk menambah tempahan baharu
app.post('/api/orders', verifyToken, requireRole('Manager'), async (req, res) => {
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
app.get('/api/orders', verifyToken, requireRole('Manager'), async (req, res) => {
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
app.get('/api/dashboard/stats', verifyToken, requireRole('Manager'), async (req, res) => {
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

        // Kira tempahan In Progress
        const [[{ inProgress }]] = await db.query(
            `SELECT COUNT(*) AS inProgress FROM orders WHERE status = 'In Progress'`
        );
        // Kira permohonan cuti Pending
        const [[{ pendingLeaves }]] = await db.query(
            `SELECT COUNT(*) AS pendingLeaves FROM leaves WHERE status = 'Pending'`
        );
        // Kadar penyelesaian tugasan (tugasan Confirmed sahaja)
        const [[taskRow]] = await db.query(
            `SELECT COUNT(*) AS total,
                    SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS done
             FROM tasks WHERE approval_status = 'Confirmed'`
        );
        const completionRate = taskRow.total > 0
            ? Math.round((taskRow.done / taskRow.total) * 100)
            : 0;

        res.status(200).json({ pending, completed, activeStaff, onLeave, inProgress, pendingLeaves, completionRate });
    } catch (err) {
        console.error("Ralat dashboard/stats:", err);
        res.status(500).json({ error: "Gagal mengambil statistik dashboard." });
    }
});

// Endpoint: log aktiviti terkini (5 permohonan cuti terbaru + 5 tempahan terbaru)
app.get('/api/dashboard/audit-logs', verifyToken, requireRole('Manager'), async (req, res) => {
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

// Endpoint: trend tempahan bulanan (6 bulan lepas)
app.get('/api/dashboard/order-trends', verifyToken, requireRole('Manager'), async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT
              DATE_FORMAT(created_at, '%b %Y') AS month_label,
              DATE_FORMAT(created_at, '%Y-%m')  AS month_key,
              COUNT(*) AS total,
              SUM(CASE WHEN status = 'Completed'   THEN 1 ELSE 0 END) AS completed,
              SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) AS in_progress,
              SUM(CASE WHEN status = 'Pending'     THEN 1 ELSE 0 END) AS pending
            FROM orders
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            GROUP BY month_key, month_label
            ORDER BY month_key ASC
        `);
        res.status(200).json(rows);
    } catch (err) {
        console.error("Ralat dashboard/order-trends:", err);
        res.status(500).json({ error: "Gagal mengambil trend tempahan." });
    }
});

// Endpoint: prestasi tugasan per staf aktif
app.get('/api/dashboard/staff-performance', verifyToken, requireRole('Manager'), async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT
              s.full_name AS name,
              s.job_title,
              COUNT(t.id) AS total_tasks,
              COALESCE(SUM(CASE WHEN t.status = 'Completed'   THEN 1 ELSE 0 END), 0) AS completed,
              COALESCE(SUM(CASE WHEN t.status = 'In Progress' THEN 1 ELSE 0 END), 0) AS in_progress,
              COALESCE(SUM(CASE WHEN t.status = 'Pending'     THEN 1 ELSE 0 END), 0) AS pending
            FROM staff s
            LEFT JOIN tasks t
              ON t.assigned_staff_id = s.id AND t.approval_status = 'Confirmed'
            WHERE s.status = 'Aktif'
            GROUP BY s.id, s.full_name, s.job_title
            ORDER BY total_tasks DESC
            LIMIT 10
        `);
        res.status(200).json(rows);
    } catch (err) {
        console.error("Ralat dashboard/staff-performance:", err);
        res.status(500).json({ error: "Gagal mengambil prestasi staf." });
    }
});

// Endpoint: statistik cuti (mengikut status + bilangan menunggu bulan ini)
app.get('/api/dashboard/leave-stats', verifyToken, requireRole('Manager'), async (req, res) => {
    try {
        const [byStatus] = await db.query(
            `SELECT status, COUNT(*) AS count FROM leaves GROUP BY status`
        );
        const [[{ pending_this_month }]] = await db.query(
            `SELECT COUNT(*) AS pending_this_month FROM leaves
             WHERE status = 'Pending'
               AND MONTH(applied_at) = MONTH(NOW())
               AND YEAR(applied_at)  = YEAR(NOW())`
        );
        res.status(200).json({ byStatus, pendingThisMonth: pending_this_month });
    } catch (err) {
        console.error("Ralat dashboard/leave-stats:", err);
        res.status(500).json({ error: "Gagal mengambil statistik cuti." });
    }
});

// ── STAFF ENDPOINTS ──────────────────────────────────────────────

// Endpoint untuk mendapatkan senarai staf
app.get('/api/staff', verifyToken, requireRole('Manager'), async (req, res) => {
    try {
        const sql = `SELECT s.id, s.full_name AS name, s.job_title AS role, s.status, u.username FROM staff s LEFT JOIN users u ON u.id = s.user_id ORDER BY s.full_name ASC`;
        const [results] = await db.query(sql);
        res.status(200).json(results);
    } catch (err) {
        console.error("Ralat MySQL:", err);
        res.status(500).json({ error: "Gagal mengambil data staf." });
    }
});

// Endpoint untuk tambah staf baharu
app.post('/api/staff', verifyToken, requireRole('Manager'), async (req, res) => {
    const { name, role } = req.body;
    if (!name || !role) {
        return res.status(400).json({ error: "Nama dan peranan wajib diisi." });
    }

    const PREFIX_MAP = {
        'Designer':                        'designer',
        'Operator Mesin (Banner/Bunting)': 'opmesin',
        'Operator Digital':                'opdigital',
        'Finishing':                       'finishing',
        'Pengurusan / Admin':              'admin',
    };
    const prefix = PREFIX_MAP[role] ?? 'staf';

    const MAX_RETRIES = 3;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const [existing] = await connection.query(
                `SELECT username FROM users WHERE username LIKE ? ORDER BY username DESC LIMIT 1`,
                [`${prefix}%`]
            );
            let nextNum = 1;
            if (existing.length > 0) {
                const match = existing[0].username.match(/(\d+)$/);
                if (match) nextNum = parseInt(match[1], 10) + 1;
            }
            const username = `${prefix}${String(nextNum).padStart(2, '0')}`;

            const hashedPassword = await bcrypt.hash('123', 10);

            const [userResult] = await connection.query(
                `INSERT INTO users (username, password, role, name) VALUES (?, ?, 'Staff', ?)`,
                [username, hashedPassword, name]
            );

            const [staffResult] = await connection.query(
                `INSERT INTO staff (full_name, job_title, status, user_id) VALUES (?, ?, 'Aktif', ?)`,
                [name, role, userResult.insertId]
            );

            await connection.commit();
            return res.status(201).json({
                message: "Staf berjaya ditambah!",
                staffId: staffResult.insertId,
                username,
            });

        } catch (err) {
            await connection.rollback();
            if (err.code === 'ER_DUP_ENTRY' && attempt < MAX_RETRIES - 1) {
                connection.release();
                continue;
            }
            console.error("Ralat MySQL tambah staf:", err);
            return res.status(500).json({ error: "Gagal menambah staf." });
        } finally {
            connection.release();
        }
    }
});

// Endpoint untuk mendapatkan detail SATU staf berdasarkan ID
app.get('/api/staff/:id', verifyToken, requireRole('Staff', 'Manager'), async (req, res) => {
    try {
        const staffId = req.params.id;
        const sql = `SELECT s.id, s.full_name AS name, s.job_title AS role, s.status, s.email, s.phone_number, u.username FROM staff s LEFT JOIN users u ON u.id = s.user_id WHERE s.id = ?`;
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

// Endpoint untuk padam staf dan akaun login berkaitan
app.delete('/api/staff/:id', verifyToken, requireRole('Manager'), async (req, res) => {
    const staffId = req.params.id;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Ambil user_id sebelum padam (untuk padam akaun login selepas)
        const [[staffRow]] = await connection.query(
            `SELECT user_id FROM staff WHERE id = ?`, [staffId]
        );
        if (!staffRow) {
            await connection.rollback();
            return res.status(404).json({ error: "Staf tidak dijumpai." });
        }

        // Halang admin memadam akaun sendiri
        if (staffRow.user_id && staffRow.user_id === req.user.userId) {
            await connection.rollback();
            return res.status(400).json({ error: "Tidak boleh memadam akaun kakitangan yang dipautkan kepada akaun anda sendiri." });
        }

        // Padam akaun login dahulu — jika proses terhenti, akaun tidak boleh digunakan lagi
        if (staffRow.user_id) {
            await connection.query(`DELETE FROM users WHERE id = ?`, [staffRow.user_id]);
        }

        // Padam rekod staff — FK CASCADE padam leaves, FK SET NULL nullkan tasks
        await connection.query(`DELETE FROM staff WHERE id = ?`, [staffId]);

        await connection.commit();
        res.status(200).json({ message: "Staf berjaya dipadam." });
    } catch (err) {
        await connection.rollback();
        console.error("Ralat DELETE /api/staff/:id:", err);
        res.status(500).json({ error: "Gagal memadam staf." });
    } finally {
        connection.release();
    }
});

// Endpoint untuk mendapatkan semua rekod cuti
app.get('/api/leaves', verifyToken, requireRole('Manager'), async (req, res) => {
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
app.post('/api/leaves', verifyToken, requireRole('Manager'), async (req, res) => {
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
app.get('/api/manager/leaves', verifyToken, requireRole('Manager'), async (req, res) => {
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

// 2. Endpoint untuk Pengurus mengemas kini status cuti (Approved/Rejected)
app.put('/api/manager/leaves/:id', verifyToken, requireRole('Manager'), async (req, res) => {
    try {
        const leaveId = req.params.id;
        const { status, rejection_reason } = req.body;

        const allowed = ['Approved', 'Rejected', 'Pending'];
        if (!status || !allowed.includes(status)) {
            return res.status(400).json({ error: `Status tidak sah. Nilai dibenarkan: ${allowed.join(', ')}.` });
        }

        await db.query(
            `UPDATE leaves SET status = ?, rejection_reason = ? WHERE id = ?`,
            [status, status === 'Rejected' ? (rejection_reason || null) : null, leaveId]
        );

        res.status(200).json({ success: true, message: `Status cuti berjaya dikemaskini kepada ${status}.` });
    } catch (err) {
        console.error("Ralat PUT /api/manager/leaves/:id:", err);
        res.status(500).json({ error: "Gagal mengemas kini status cuti." });
    }
});

// ==========================================
// MODUL JANAAN JADUAL (AI DISTRIBUTION)
// ==========================================

// 1. Endpoint untuk menjana agihan tugasan secara automatik (Round-Robin)
app.post('/api/generate-schedule', verifyToken, requireRole('Manager'), async (req, res) => {
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
        const assignments = tasks.map((task, index) => ({
            taskId: task.id,
            staffId: staffList[index % staffList.length].id
        }));

        // D. Jalankan semua kemaskini dalam satu transaksi
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            for (const { taskId, staffId } of assignments) {
                await connection.query(
                    `UPDATE tasks SET assigned_staff_id = ? WHERE id = ?`,
                    [staffId, taskId]
                );
            }

            await connection.commit();
            res.status(200).json({
                message: `Berjaya! Sistem telah mengagihkan ${tasks.length} tugasan baharu.`,
                assignedCount: tasks.length
            });

        } catch (txErr) {
            await connection.rollback();
            throw txErr;
        } finally {
            connection.release();
        }

    } catch (err) {
        console.error("Ralat generate-schedule:", err);
        res.status(500).json({ error: "Ralat semasa menjana jadual." });
    }
});

// 2. Endpoint untuk memaparkan papan agihan (Kanban/Table view)
app.get('/api/tasks/board', verifyToken, requireRole('Manager'), async (req, res) => {
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

// 3. Endpoint untuk agihan tugasan menggunakan Gemini AI (Function Calling & Proposal Mode)
app.post('/api/manager/auto-assign', verifyToken, requireRole('Manager'), async (req, res) => {
    try {
        // A. Ambil semua Orders yang berstatus 'Pending' atau 'In Progress'
        const [activeOrders] = await db.query(
            `SELECT id FROM orders WHERE status IN ('Pending', 'In Progress')`
        );

        if (activeOrders.length === 0) {
            return res.status(200).json({ 
                success: true, 
                message: "Tiada tempahan berstatus 'Pending' atau 'In Progress' untuk diagihkan.", 
                assignments: [] 
            });
        }

        const activeOrderIds = activeOrders.map(o => o.id);

        // B. Dapatkan semua tugasan yang belum diagih bagi tempahan aktif tersebut
        const [tasks] = await db.query(`
            SELECT tasks.*, 
                   orders.order_number, orders.client_name, orders.item_type, 
                   orders.quantity, orders.due_date, orders.delivery_location, 
                   orders.delivery_type, orders.specifications
            FROM tasks
            JOIN orders ON tasks.order_id = orders.id
            WHERE tasks.assigned_staff_id IS NULL 
              AND tasks.order_id IN (?)
        `, [activeOrderIds]);

        if (tasks.length === 0) {
            return res.status(200).json({ 
                success: true, 
                message: "Tiada tugasan baharu yang perlu diagihkan.", 
                assignments: [] 
            });
        }

        // C. Dapatkan senarai staf yang aktif
        const [staffRows] = await db.query(
            `SELECT id, full_name, job_title, status FROM staff WHERE status = 'Aktif'`
        );

        if (staffRows.length === 0) {
            return res.status(400).json({ error: "Tiada staf yang aktif dalam sistem!" });
        }

        // D. Ambil beban kerja semasa (workload) bagi setiap staf
        const [workloads] = await db.query(`
            SELECT assigned_staff_id, COUNT(*) AS count 
            FROM tasks 
            WHERE status IN ('Pending', 'In Progress') 
              AND assigned_staff_id IS NOT NULL
            GROUP BY assigned_staff_id
        `);
        const workloadMap = {};
        workloads.forEach(w => {
            workloadMap[w.assigned_staff_id] = w.count;
        });

        // E. Ambil rekod cuti yang diluluskan (leaves.status = 'Approved')
        const todayStr = new Date().toISOString().slice(0, 10);
        const [leaveRows] = await db.query(`
            SELECT * FROM leaves 
            WHERE status = 'Approved' AND end_date >= ?
        `, [todayStr]);

        // F. Bina data terstruktur dengan filter SQL/JS dan pengesanan Compressed Window
        function getLeaveStatusForTask(staffId, dueDateStr, leavesList, todayDateStr) {
            const today = new Date(todayDateStr);
            const dueDate = new Date(dueDateStr);
            const staffLeaves = leavesList.filter(l => l.staff_id === staffId);
            
            let isFullyOnLeave = false;
            let compressedWindowMessage = null;
            
            for (const leave of staffLeaves) {
                const leaveStart = new Date(leave.start_date);
                const leaveEnd = new Date(leave.end_date);
                
                const overlapStart = new Date(Math.max(today, leaveStart));
                const overlapEnd = new Date(Math.min(dueDate, leaveEnd));
                
                if (overlapStart <= overlapEnd) {
                    const totalPeriodDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24)) + 1;
                    const overlapDays = Math.ceil((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)) + 1;
                    
                    if (overlapDays >= totalPeriodDays) {
                        isFullyOnLeave = true;
                        break;
                    } else {
                        const startStr = leave.start_date instanceof Date ? leave.start_date.toISOString().slice(0, 10) : new String(leave.start_date).slice(0, 10);
                        const endStr = leave.end_date instanceof Date ? leave.end_date.toISOString().slice(0, 10) : new String(leave.end_date).slice(0, 10);
                        compressedWindowMessage = `Staf bercuti dari ${startStr} hingga ${endStr} (bertindih dengan tempoh tugasan). Tempoh kerja efektif menjadi lebih singkat. Sila awalkan tugasan atau agihkan ke staf lain jika perlu.`;
                    }
                }
            }
            return { isFullyOnLeave, compressedWindowMessage };
        }

        const tasksForAI = tasks.map(task => {
            const dueDateStr = task.due_date instanceof Date ? task.due_date.toISOString().slice(0, 10) : new String(task.due_date).slice(0, 10);
            const availableStaff = [];
            
            for (const s of staffRows) {
                const { isFullyOnLeave, compressedWindowMessage } = getLeaveStatusForTask(s.id, dueDateStr, leaveRows, todayStr);
                if (!isFullyOnLeave) {
                    availableStaff.push({
                        id: s.id,
                        full_name: s.full_name,
                        job_title: s.job_title,
                        workload: workloadMap[s.id] || 0,
                        compressed_window: compressedWindowMessage
                    });
                }
            }
            
            return {
                task_id: task.id,
                task_type: task.task_type,
                description: task.description,
                order_number: task.order_number,
                client_name: task.client_name,
                item_type: task.item_type,
                quantity: task.quantity,
                due_date: dueDateStr,
                delivery_location: task.delivery_location,
                delivery_type: task.delivery_type,
                specifications: task.specifications,
                available_staff: availableStaff
            };
        });

        // G. Integrasi Gemini AI menggunakan Function Calling
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash",
            tools: [
                {
                    functionDeclarations: [
                        {
                            name: "assign_tasks",
                            description: "Assigns unassigned tasks to available staff members, scheduling their start and end times optimally.",
                            parameters: {
                                type: "OBJECT",
                                properties: {
                                    assignments: {
                                        type: "ARRAY",
                                        description: "The list of optimal task assignments.",
                                        items: {
                                            type: "OBJECT",
                                            properties: {
                                                task_id: { type: "INTEGER", description: "The ID of the task being assigned." },
                                                staff_id: { type: "INTEGER", description: "The ID of the staff member assigned to the task." },
                                                start_time: { type: "STRING", description: "ISO 8601 datetime string representing when the task starts." },
                                                end_time: { type: "STRING", description: "ISO 8601 datetime string representing when the task ends." }
                                            },
                                            required: ["task_id", "staff_id", "start_time", "end_time"]
                                        }
                                    }
                                },
                                required: ["assignments"]
                            }
                        }
                    ]
                }
            ],
            toolConfig: {
                functionCallingConfig: {
                    mode: "ANY",
                    allowedFunctionNames: ["assign_tasks"]
                }
            }
        });

        const prompt = `Anda adalah AI penjadualan pintar untuk syarikat percetakan SH Design & Print Sdn. Bhd.
Tugas anda adalah untuk mengagihkan tugasan berikut kepada staf yang paling sesuai dengan memanggil fungsi 'assign_tasks'.

Berikut adalah tugasan belum diagih berserta staf yang tersedia:
${JSON.stringify(tasksForAI, null, 2)}

Sila patuhi kriteria berikut:
1. Padanan Kemahiran (Skill Matching):
   - 'Design' -> 'Designer'
   - 'Printing' -> 'Operator Digital' atau 'Operator Mesin (Banner/Bunting)'
   - 'Packing' / 'Delivery' -> 'Finishing' atau Operator
2. Keutamaan Tarikh (Deadline Urgency): Dahulukan tugasan yang tarikh akhirnya (due_date) lebih dekat.
3. Anggaran Masa (Duration Estimation):
   - Design: 4-8 jam (bergantung kepada maklum balas pelanggan / customer consultation dependency).
   - Printing/Packing: 1 jam bagi setiap 100 unit (minimum 1 jam).
4. Pengesanan Konflik Cuti (Compressed Window):
   - Jika staf mempunyai 'compressed_window', jadualkan tugasan staf tersebut ke tarikh LEBIH AWAL (pre-leave) atau agihkan tugasan tersebut kepada staf lain yang tersedia.
5. Masa Bekerja: Jadualkan tugas pada waktu pejabat biasa (09:00 - 18:00) bermula dari ${todayStr}.

Panggil fungsi 'assign_tasks' dengan jawapan anda.`;

        // Uji dengan cubaan semula (retry) jika mendapat ralat pelayan
        let resultAI;
        let attempts = 0;
        const maxAttempts = 3;
        while (attempts < maxAttempts) {
            try {
                resultAI = await model.generateContent(prompt);
                break;
            } catch (err) {
                attempts++;
                console.warn(`Gemini API Call attempt ${attempts} failed: ${err.message}`);
                if (attempts >= maxAttempts) throw err;
                await new Promise(resolve => setTimeout(resolve, attempts * 1000));
            }
        }

        // H. Ekstrak cadangan daripada calls
        let assignments = [];
        let aiExtractionFailed = false;
        try {
            const calls = (typeof resultAI.response.functionCalls === 'function') ? resultAI.response.functionCalls() : null;
            if (calls && calls.length > 0) {
                assignments = calls[0].args.assignments || [];
            } else {
                // Fallback
                const candidate = resultAI.response.candidates?.[0];
                const part = candidate?.content?.parts?.[0];
                if (part?.functionCall?.args?.assignments) {
                    assignments = part.functionCall.args.assignments;
                } else {
                    const text = resultAI.response.text();
                    const parsed = JSON.parse(text);
                    assignments = Array.isArray(parsed) ? parsed : (parsed.assignments || []);
                }
            }
        } catch (e) {
            console.warn("Ralat semasa mengekstrak cadangan AI:", e.message);
            aiExtractionFailed = true;
        }

        // Pulangkan cadangan kepada UI untuk semakan admin sebelum disimpan ke pangkalan data
        const responsePayload = {
            success: true,
            message: `${assignments.length} cadangan agihan tugasan berjaya dijana oleh AI!`,
            data: assignments,
            tasks: tasksForAI
        };
        if (assignments.length === 0) {
            responsePayload.warning = aiExtractionFailed
                ? 'AI menghadapi masalah semasa memproses cadangan. Sila cuba sekali lagi atau agih tugasan secara manual.'
                : 'AI tidak memberikan sebarang cadangan. Sila cuba sekali lagi atau agih tugasan secara manual.';
        }
        res.status(200).json(responsePayload);

    } catch (err) {
        console.error("Ralat auto-assign Gemini:", err);
        res.status(500).json({ error: "Ralat semasa mengagih tugasan dengan AI.", detail: err.message });
    }
});

// ── Pembantu: Padanan Kemahiran ───────────────────────────────────
function checkSkillMatch(taskType, jobTitle) {
    switch (taskType) {
        case 'Design':   return jobTitle === 'Designer';
        case 'Printing': return jobTitle === 'Operator Digital' || jobTitle === 'Operator Mesin (Banner/Bunting)';
        case 'Packing':
        case 'Delivery': return jobTitle === 'Finishing' || jobTitle.startsWith('Operator');
        default:         return true; // jenis tugasan tidak dikenali — biarkan lulus
    }
}

// ── Pembantu: Pengesahan agihan (kemahiran + konflik cuti) ────────
async function validateAssignment(task_id, staff_id, start_time, end_time) {
    const [[taskRow]] = await db.query(
        `SELECT task_type FROM tasks WHERE id = ?`, [task_id]
    );
    if (!taskRow) return { valid: false, reason: `Tugasan #${task_id} tidak dijumpai.` };

    const [[staffRow]] = await db.query(
        `SELECT full_name, job_title FROM staff WHERE id = ?`, [staff_id]
    );
    if (!staffRow) return { valid: false, reason: `Staf #${staff_id} tidak dijumpai.` };

    if (!checkSkillMatch(taskRow.task_type, staffRow.job_title)) {
        return {
            valid: false,
            reason: `Staf "${staffRow.full_name}" (${staffRow.job_title}) tidak sepadan dengan jenis tugasan "${taskRow.task_type}".`
        };
    }

    if (start_time && end_time) {
        const startDate = new Date(start_time).toISOString().slice(0, 10);
        const endDate   = new Date(end_time).toISOString().slice(0, 10);
        const [conflicts] = await db.query(
            `SELECT start_date, end_date FROM leaves
             WHERE staff_id = ? AND status = 'Approved'
               AND start_date <= ? AND end_date >= ?`,
            [staff_id, endDate, startDate]
        );
        if (conflicts.length > 0) {
            const lv = conflicts[0];
            const s = lv.start_date instanceof Date ? lv.start_date.toISOString().slice(0, 10) : String(lv.start_date).slice(0, 10);
            const e = lv.end_date   instanceof Date ? lv.end_date.toISOString().slice(0, 10)   : String(lv.end_date).slice(0, 10);
            return {
                valid: false,
                reason: `Staf "${staffRow.full_name}" bercuti dari ${s} hingga ${e} — bertindih dengan tempoh tugasan.`
            };
        }
    }

    return { valid: true };
}

// Simpan cadangan agihan yang telah disemak dan disahkan oleh admin ke pangkalan data
app.post('/api/tasks/save-assignments', verifyToken, requireRole('Manager'), async (req, res) => {
    const { assignments } = req.body;

    if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
        return res.status(400).json({
            success: false,
            error: "Format data tidak sah. Perlu menghantar senarai assignments."
        });
    }

    // Validasi sisi-server: masa tamat mesti lebih lewat daripada masa mula
    for (const assign of assignments) {
        const { task_id, start_time, end_time } = assign;
        if (start_time && end_time && new Date(end_time) <= new Date(start_time)) {
            return res.status(400).json({
                success: false,
                error: `Tugasan #${task_id}: masa tamat tidak boleh sebelum atau sama dengan masa mula.`
            });
        }
    }

    // Validasi kemahiran dan konflik cuti sebelum transaksi
    const validationErrors = [];
    for (const assign of assignments) {
        const { task_id, staff_id, start_time, end_time } = assign;
        if (staff_id) {
            const check = await validateAssignment(task_id, staff_id, start_time, end_time);
            if (!check.valid) validationErrors.push({ task_id, reason: check.reason });
        }
    }
    if (validationErrors.length > 0) {
        return res.status(422).json({
            success: false,
            error: `${validationErrors.length} tugasan gagal pengesahan kemahiran/cuti. Sila semak dan betulkan sebelum simpan.`,
            validation_errors: validationErrors
        });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        for (const assign of assignments) {
            // order_id TIDAK disentuh — perlindungan automatik kerana tiada dalam SET
            const { task_id, staff_id, task_type, description, start_time, end_time } = assign;

            const formattedStart = start_time ? new Date(start_time).toISOString().slice(0, 19).replace('T', ' ') : null;
            const formattedEnd   = end_time   ? new Date(end_time).toISOString().slice(0, 19).replace('T', ' ')   : null;

            await connection.query(
                `UPDATE tasks
                 SET assigned_staff_id = ?, task_type = ?, description = ?,
                     start_time = ?, end_time = ?,
                     status = 'Pending', approval_status = 'Confirmed'
                 WHERE id = ?`,
                [staff_id || null, task_type, description, formattedStart, formattedEnd, task_id]
            );
        }

        await connection.commit();
        res.status(200).json({
            success: true,
            message: `${assignments.length} tugasan berjaya disimpan dan staf boleh melihatnya sekarang!`
        });

    } catch (error) {
        await connection.rollback();
        console.error("Ralat menyimpan agihan tugasan:", error);
        res.status(500).json({
            success: false,
            error: "Gagal menyimpan jadual.",
            detail: error.message
        });
    } finally {
        connection.release();
    }
});

// Mulakan pelayan (Server) — hanya jika dijalankan terus, bukan semasa ujian
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Pelayan utama sedang berjalan di http://localhost:${PORT}`);
    });
}

module.exports = app;

// ── PORTAL STAF ENDPOINTS ─────────────────────────────────────────

// Endpoint: tugasan bagi staf tertentu berdasarkan staff_id
app.get('/api/staff/tasks/:staff_id', verifyToken, requireRole('Staff', 'Manager'), async (req, res) => {
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
              AND tasks.approval_status = 'Confirmed'
            ORDER BY tasks.id DESC`;

        const [results] = await db.query(sql, [staff_id]);
        res.status(200).json(results);

    } catch (err) {
        console.error("Ralat MySQL tasks/staff_id:", err);
        res.status(500).json({ error: "Gagal mengambil tugasan staf." });
    }
});

// 1. Endpoint: staf lihat sejarah cuti sendiri
app.get('/api/staff/leaves/:staff_id', verifyToken, requireRole('Staff', 'Manager'), async (req, res) => {
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
app.post('/api/staff/leaves', verifyToken, requireRole('Staff', 'Manager'), async (req, res) => {
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
app.put('/api/staff/update-profile/:id', verifyToken, requireRole('Staff', 'Manager'), async (req, res) => {
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
app.put('/api/staff/change-password/:userId', verifyToken, requireRole('Staff', 'Manager'), async (req, res) => {
    try {
        const userId = req.params.userId;
        const { newPassword, currentPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ error: "Kata laluan baharu mestilah sekurang-kurangnya 6 aksara." });
        }

                // Kata laluan semasa WAJIB dihantar sebelum menukar kata laluan
        if (!currentPassword) {
            return res.status(400).json({ error: "Kata laluan semasa diperlukan untuk menukar kata laluan." });
        }
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
app.get('/api/admin/profile/:userId', verifyToken, requireRole('Manager'), async (req, res) => {
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

// 2. Endpoint untuk mengemaskini profil Admin (nama & emel sahaja)
// Penukaran kata laluan dikendalikan oleh PUT /api/staff/change-password/:userId
app.put('/api/admin/update/:userId', verifyToken, requireRole('Manager'), async (req, res) => {
    try {
        const userId = req.params.userId;
        const { name, email } = req.body;

        await db.query(
            "UPDATE users SET name = ?, email = ? WHERE id = ?",
            [name || null, email || null, userId]
        );

        res.status(200).json({ message: "Profil Admin berjaya dikemaskini!" });
    } catch (err) {
        console.error("Ralat MySQL admin/update:", err);
        res.status(500).json({ error: "Gagal mengemaskini profil Admin." });
    }
});

// Kemaskini status tugasan (Staff: tugasan sendiri sahaja; Manager: mana-mana tugasan)
app.patch('/api/tasks/:id/status', verifyToken, requireRole('Staff', 'Manager'), uploadSingle('file'), async (req, res) => {
    try {
        const taskId = parseInt(req.params.id, 10);
        const { status } = req.body;

        const ALLOWED = ['Pending', 'In Progress', 'Completed'];
        if (!status || !ALLOWED.includes(status)) {
            return res.status(400).json({
                error: `Status tidak sah. Nilai yang dibenarkan: ${ALLOWED.join(', ')}.`
            });
        }

        // Dapatkan task beserta order_id dan semak pemilikan (Staff)
        const [[task]] = await db.query(
            `SELECT assigned_staff_id, order_id FROM tasks WHERE id = ? AND approval_status = 'Confirmed'`,
            [taskId]
        );
        if (!task) return res.status(404).json({ error: 'Tugasan tidak dijumpai.' });

        if (req.user.role === 'Staff' && String(task.assigned_staff_id) !== String(req.user.staffId)) {
            return res.status(403).json({ error: 'Akses ditolak. Anda hanya boleh kemaskini tugasan sendiri.' });
        }

        // Kemaskini status — sertakan attachment_path hanya jika fail baharu dimuatnaik
        let attachmentPath = null;
        if (req.file) {
            attachmentPath = `/uploads/tasks/${req.file.filename}`;
            await db.query(
                `UPDATE tasks SET status = ?, attachment_path = ? WHERE id = ?`,
                [status, attachmentPath, taskId]
            );
        } else {
            await db.query(
                `UPDATE tasks SET status = ? WHERE id = ?`,
                [status, taskId]
            );
        }

        const response = { success: true, message: 'Status tugasan berjaya dikemaskini.', taskId, status };
        if (attachmentPath) response.attachment_path = attachmentPath;
        res.status(200).json(response);
    } catch (err) {
        console.error('Ralat PATCH /api/tasks/:id/status:', err);
        res.status(500).json({ error: 'Gagal mengemaskini status tugasan.' });
    }
});

// ── TUGASAN: DRAF MANAGEMENT ─────────────────────────────────────

// Edit satu tugasan (admin ubah staf, jenis, deskripsi, masa)
app.put('/api/tasks/:id', verifyToken, requireRole('Manager'), async (req, res) => {
    try {
        const taskId = req.params.id;
        const { assigned_staff_id, task_type, description, start_time, end_time } = req.body;
        const fmtStart = start_time ? new Date(start_time).toISOString().slice(0, 19).replace('T', ' ') : null;
        const fmtEnd   = end_time   ? new Date(end_time).toISOString().slice(0, 19).replace('T', ' ')   : null;

        const [result] = await db.query(
            `UPDATE tasks
             SET assigned_staff_id = ?, task_type = ?, description = ?, start_time = ?, end_time = ?
             WHERE id = ?`,
            [assigned_staff_id || null, task_type, description, fmtStart, fmtEnd, taskId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Tugasan tidak dijumpai." });
        }
        res.status(200).json({ message: "Tugasan berjaya dikemaskini!" });
    } catch (err) {
        console.error("Ralat PUT /api/tasks/:id:", err);
        res.status(500).json({ error: "Gagal mengemaskini tugasan." });
    }
});

// Sahkan draf: tukar approval_status → 'Confirmed' (semua atau terpilih)
app.post('/api/tasks/confirm', verifyToken, requireRole('Manager'), async (req, res) => {
    try {
        const { task_ids } = req.body || {};
        let result;

        if (Array.isArray(task_ids) && task_ids.length > 0) {
            [result] = await db.query(
                `UPDATE tasks SET approval_status = 'Confirmed'
                 WHERE approval_status = 'Draft' AND id IN (?)`,
                [task_ids]
            );
        } else {
            [result] = await db.query(
                `UPDATE tasks SET approval_status = 'Confirmed' WHERE approval_status = 'Draft'`
            );
        }

        res.status(200).json({
            success: true,
            message: `${result.affectedRows} tugasan berjaya disahkan! Staf kini boleh melihat tugasan mereka.`,
            confirmed: result.affectedRows
        });
    } catch (err) {
        console.error("Ralat POST /api/tasks/confirm:", err);
        res.status(500).json({ error: "Gagal mengesahkan tugasan." });
    }
});

// Padam draf: reset tugasan ke pool belum diagih (tiada hard delete)
app.delete('/api/tasks/:id', verifyToken, requireRole('Manager'), async (req, res) => {
    try {
        const taskId = req.params.id;
        const [result] = await db.query(
            `UPDATE tasks
             SET assigned_staff_id = NULL, start_time = NULL, end_time = NULL, approval_status = 'Confirmed'
             WHERE id = ? AND approval_status = 'Draft'`,
            [taskId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Tugasan draf tidak dijumpai atau sudah disahkan." });
        }
        res.status(200).json({ message: "Draf tugasan berjaya dipadam dan dikembalikan ke senarai belum diagih." });
    } catch (err) {
        console.error("Ralat DELETE /api/tasks/:id:", err);
        res.status(500).json({ error: "Gagal memadam draf tugasan." });
    }
});

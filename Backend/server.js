// Muatkan pembolehubah persekitaran DAHULU — middleware/auth.js membaca
// process.env.JWT_SECRET semasa dimuatkan (require), jadi dotenv.config()
// MESTI jalan sebelum mana-mana require yang bergantung kepada process.env.
const dotenv = require('dotenv');
dotenv.config({ path: require('path').resolve(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('./db');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { verifyToken, requireRole } = require('./middleware/auth');

if (!process.env.JWT_SECRET) {
    console.warn(
        '\n⚠️  AMARAN: JWT_SECRET tidak ditetapkan dalam .env — sistem guna ' +
        'fallback awam yang tidak selamat. Tetapkan sebelum guna dalam ' +
        'demo/produksi (rujuk Backend/.env.example).\n'
    );
}

// Semakan konflik cuti dikongsi oleh KETIGA-TIGA laluan agihan tugasan:
// auto-assign (AI), generate-schedule (Round-Robin), dan PUT /api/tasks/:id (manual)
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

// ── Konfigurasi multer untuk fail design pelanggan (tempahan Product Only) ──
const orderDesignDir = path.join(__dirname, 'uploads', 'orders');
if (!fs.existsSync(orderDesignDir)) fs.mkdirSync(orderDesignDir, { recursive: true });

const orderDesignStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, orderDesignDir),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `order-design-${Date.now()}${ext}`);
    }
});

const orderDesignUpload = multer({
    storage: orderDesignStorage,
    fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
        if (allowed.includes(file.mimetype)) cb(null, true);
        else cb(new Error('Jenis fail tidak dibenarkan. Hanya JPG, PNG, dan PDF diterima.'));
    },
    limits: { fileSize: 5 * 1024 * 1024 }
});

function uploadOrderDesign(field) {
    return (req, res, next) => {
        orderDesignUpload.single(field)(req, res, (err) => {
            if (!err) return next();
            const msg = err.code === 'LIMIT_FILE_SIZE'
                ? 'Fail terlalu besar. Had maksimum ialah 5MB.'
                : (err.message || 'Ralat muat naik fail.');
            res.status(400).json({ error: msg });
        });
    };
}

// ── Konfigurasi multer untuk gambar profil staf (berasingan daripada lampiran tugasan) ──
const staffPhotoDir = path.join(__dirname, 'uploads', 'staff');
if (!fs.existsSync(staffPhotoDir)) fs.mkdirSync(staffPhotoDir, { recursive: true });

const staffPhotoStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, staffPhotoDir),
    filename: (req, file, cb) => {
        const staffId = req.params.id || 'unknown';
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `staff-${staffId}-${Date.now()}${ext}`);
    }
});

const staffPhotoUpload = multer({
    storage: staffPhotoStorage,
    fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png'];
        if (allowed.includes(file.mimetype)) cb(null, true);
        else cb(new Error('Jenis fail tidak dibenarkan. Hanya JPG dan PNG diterima.'));
    },
    limits: { fileSize: 2 * 1024 * 1024 }
});

function uploadStaffPhoto(field) {
    return (req, res, next) => {
        staffPhotoUpload.single(field)(req, res, (err) => {
            if (!err) return next();
            const msg = err.code === 'LIMIT_FILE_SIZE'
                ? 'Fail terlalu besar. Had maksimum ialah 2MB.'
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

// Endpoint untuk menambah tempahan baharu (berserta 4 tugasan lalai, dalam satu transaksi)
app.post('/api/orders', verifyToken, requireRole('Manager'), uploadOrderDesign('design_file'), async (req, res) => {
    const { namaKlien, jenisItem, kuantiti, harga, tarikhSiap, jenisHantar, lokasiHantar, nota } = req.body;
    const orderType = req.body.order_type || 'Design & Product';
    const order_number = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    // multer simpan fail SEBELUM handler — padam semula jika permintaan ditolak
    const cleanupFile = () => {
        if (req.file) fs.unlink(req.file.path, () => {});
    };

    if (!TASKS_BY_ORDER_TYPE[orderType]) {
        cleanupFile();
        return res.status(400).json({
            error: `Jenis tempahan tidak sah. Nilai dibenarkan: ${Object.keys(TASKS_BY_ORDER_TYPE).join(', ')}.`
        });
    }
    if (orderType === 'Product Only' && !req.file) {
        return res.status(400).json({
            error: "Tempahan 'Product Only' wajib disertakan fail design pelanggan (JPG/PNG/PDF)."
        });
    }
    const designFilePath = req.file ? `/uploads/orders/${req.file.filename}` : null;

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const orderSql = `INSERT INTO orders
                     (order_number, client_name, item_type, order_type, quantity, price, due_date, delivery_type, delivery_location, specifications, design_file_path, status)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')`;
        const orderValues = [order_number, namaKlien, jenisItem, orderType, kuantiti, harga, tarikhSiap, jenisHantar, lokasiHantar, nota, designFilePath];
        const [orderResult] = await connection.query(orderSql, orderValues);
        const orderId = orderResult.insertId;

        // Jana tugasan mengikut jenis tempahan (aliran kerja berperingkat)
        const taskValues = TASKS_BY_ORDER_TYPE[orderType].map(type => [orderId, type]);
        await connection.query(`INSERT INTO tasks (order_id, task_type) VALUES ?`, [taskValues]);

        await connection.commit();
        console.log(`Tempahan (${orderType}) + ${taskValues.length} tugasan berjaya disimpan dengan ID:`, orderId);
        return res.status(201).json({ message: "Tempahan berjaya disimpan!", orderId, orderType });

    } catch (error) {
        await connection.rollback();
        cleanupFile();
        console.error("Ralat MySQL:", error);
        return res.status(500).json({ error: "Gagal menyimpan data ke pangkalan data." });
    } finally {
        connection.release();
    }
});

// Senaraikan tugasan bagi satu tempahan (untuk paparan di modal frontend)
app.get('/api/orders/:id/tasks', verifyToken, requireRole('Manager'), async (req, res) => {
    try {
        const [results] = await db.query(
            `SELECT t.id, t.task_type, t.status, t.approval_status, t.assigned_staff_id,
                    t.staff_notes, t.attachment_path, t.rejection_reason,
                    s.full_name AS staff_name
             FROM tasks t LEFT JOIN staff s ON s.id = t.assigned_staff_id
             WHERE t.order_id = ? ORDER BY FIELD(t.task_type, 'Design','Printing','Packing','Delivery')`,
            [req.params.id]
        );
        res.status(200).json(results);
    } catch (err) {
        console.error("Ralat GET /api/orders/:id/tasks:", err);
        res.status(500).json({ error: "Gagal mengambil senarai tugasan." });
    }
});

// Endpoint untuk mendapatkan semua senarai tempahan
app.get('/api/orders', verifyToken, requireRole('Manager'), async (req, res) => {
    try {
        // Susun data dari yang paling baharu (id paling besar) ke paling lama
        const sql = `SELECT * FROM orders ORDER BY id DESC`;
        const [results] = await db.query(sql);

        // Pulangkan senarai data dalam format JSON
        res.status(200).json(results);
    } catch (error) {
        console.error("Ralat MySQL:", error);
        res.status(500).json({ error: "Gagal mengambil data tempahan." });
    }
});

// Batalkan tempahan (butang 'Terminate') — padam SEMUA tugasan order & set Cancelled.
// Menggantikan PATCH /api/orders/:id/status (status kini automatik, lihat syncOrderStatus).
app.post('/api/orders/:id/terminate', verifyToken, requireRole('Manager'), async (req, res) => {
    const orderId = req.params.id;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [[order]] = await connection.query(
            `SELECT status FROM orders WHERE id = ? FOR UPDATE`, [orderId]
        );
        if (!order) {
            await connection.rollback();
            return res.status(404).json({ error: 'Tempahan tidak dijumpai.' });
        }
        if (order.status === 'Cancelled' || order.status === 'Completed') {
            await connection.rollback();
            return res.status(409).json({
                error: `Tempahan berstatus '${order.status}' tidak boleh dibatalkan.`
            });
        }

        const [del] = await connection.query(`DELETE FROM tasks WHERE order_id = ?`, [orderId]);
        await connection.query(`UPDATE orders SET status = 'Cancelled' WHERE id = ?`, [orderId]);

        await connection.commit();
        res.status(200).json({
            message: `Tempahan dibatalkan. ${del.affectedRows} tugasan dipadam daripada sistem.`,
            orderId,
            deletedTasks: del.affectedRows
        });
    } catch (err) {
        await connection.rollback();
        console.error('Ralat POST /api/orders/:id/terminate:', err);
        res.status(500).json({ error: 'Gagal membatalkan tempahan.' });
    } finally {
        connection.release();
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
        // Kira staf sedia bertugas hari ini (Aktif DAN bukan sedang bercuti)
        const [[{ activeStaff }]] = await db.query(
            `SELECT COUNT(*) AS activeStaff FROM staff
             WHERE status = 'Aktif'
             AND id NOT IN (
                 SELECT staff_id FROM leaves
                 WHERE status = 'Approved' AND CURDATE() BETWEEN start_date AND end_date
             )`
        );
        // Kira staf UNIK sedang cuti hari ini (CURDATE() MySQL elak isu zon waktu Node)
        const [[{ onLeave }]] = await db.query(
            `SELECT COUNT(DISTINCT staff_id) AS onLeave FROM leaves
             WHERE status = 'Approved' AND CURDATE() BETWEEN start_date AND end_date`
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
        const sql = `SELECT s.id, s.full_name AS name, s.job_title AS role, s.status,
                            s.profile_picture_url, u.username,
                            EXISTS(
                                SELECT 1 FROM leaves l
                                WHERE l.staff_id = s.id AND l.status = 'Approved'
                                AND CURDATE() BETWEEN l.start_date AND l.end_date
                            ) AS is_on_leave_today,
                            (SELECT l.end_date FROM leaves l
                             WHERE l.staff_id = s.id AND l.status = 'Approved'
                             AND CURDATE() BETWEEN l.start_date AND l.end_date
                             ORDER BY l.end_date DESC LIMIT 1) AS leave_end_date
                     FROM staff s LEFT JOIN users u ON u.id = s.user_id
                     ORDER BY is_on_leave_today DESC, s.full_name ASC`;
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

        // Semakan pemilikan (IDOR): staf hanya boleh lihat profil sendiri
        if (req.user.role === 'Staff' && String(req.user.staffId) !== String(staffId)) {
            return res.status(403).json({ error: 'Akses ditolak. Anda hanya boleh akses data sendiri.' });
        }

        const sql = `SELECT s.id, s.full_name AS name, s.job_title AS role, s.status,
                            s.email, s.phone_number, s.profile_picture_url, u.username,
                            EXISTS(
                                SELECT 1 FROM leaves l
                                WHERE l.staff_id = s.id AND l.status = 'Approved'
                                AND CURDATE() BETWEEN l.start_date AND l.end_date
                            ) AS is_on_leave_today,
                            (SELECT l.end_date FROM leaves l
                             WHERE l.staff_id = s.id AND l.status = 'Approved'
                             AND CURDATE() BETWEEN l.start_date AND l.end_date
                             ORDER BY l.end_date DESC LIMIT 1) AS leave_end_date
                     FROM staff s LEFT JOIN users u ON u.id = s.user_id
                     WHERE s.id = ?`;
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

// Endpoint untuk kemaskini penuh maklumat staf oleh Admin (UC-02: nama + jawatan)
app.put('/api/staff/:id', verifyToken, requireRole('Manager'), async (req, res) => {
    try {
        const staffId = req.params.id;
        const { name, role } = req.body;

        if (!name || !role) {
            return res.status(400).json({ error: 'Nama dan peranan wajib diisi.' });
        }

        const [result] = await db.query(
            `UPDATE staff SET full_name = ?, job_title = ? WHERE id = ?`,
            [name, role, staffId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Staf tidak dijumpai.' });
        }
        res.status(200).json({ message: 'Maklumat staf berjaya dikemaskini.', name, role });
    } catch (err) {
        console.error('Ralat PUT /api/staff/:id:', err);
        res.status(500).json({ error: 'Gagal mengemaskini maklumat staf.' });
    }
});

// Endpoint untuk muat naik gambar profil staf (F6.1, UC-02, UC-10)
app.post('/api/staff/:id/profile-picture', verifyToken, requireRole('Staff', 'Manager'), uploadStaffPhoto('photo'), async (req, res) => {
    try {
        const staffId = req.params.id;
        // multer simpan fail SEBELUM handler — padam semula jika permintaan ditolak
        if (req.user.role === 'Staff' && String(req.user.staffId) !== String(staffId)) {
            if (req.file) fs.unlink(req.file.path, () => {});
            return res.status(403).json({ error: 'Akses ditolak. Anda hanya boleh kemaskini gambar profil sendiri.' });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'Tiada fail gambar diterima.' });
        }
        const photoUrl = `/uploads/staff/${req.file.filename}`;
        const [result] = await db.query(`UPDATE staff SET profile_picture_url = ? WHERE id = ?`, [photoUrl, staffId]);
        if (result.affectedRows === 0) {
            fs.unlink(req.file.path, () => {});
            return res.status(404).json({ error: 'Staf tidak dijumpai.' });
        }
        res.status(200).json({ message: 'Gambar profil berjaya dikemaskini.', profile_picture_url: photoUrl });
    } catch (err) {
        console.error('Ralat POST /api/staff/:id/profile-picture:', err);
        res.status(500).json({ error: 'Gagal memuat naik gambar profil.' });
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

        if (!staff_id || !start_date || !end_date || !reason) {
            return res.status(400).json({ error: "Semua medan wajib diisi: staff_id, start_date, end_date, reason." });
        }
        if (new Date(end_date) < new Date(start_date)) {
            return res.status(400).json({ error: "Tarikh tamat tidak boleh lebih awal daripada tarikh mula." });
        }

        const sql = `INSERT INTO leaves (staff_id, start_date, end_date, reason, status) VALUES (?, ?, ?, ?, 'Pending')`;
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
        // A. Cari tugas yang belum diagihkan (JOIN orders untuk due_date —
        //    diperlukan oleh semakan cuti per-tugasan di bawah)
        const [allUnassigned] = await db.query(
            `SELECT tasks.*, orders.due_date, orders.delivery_type
             FROM tasks
             JOIN orders ON tasks.order_id = orders.id
             WHERE tasks.assigned_staff_id IS NULL AND tasks.status = 'Pending'`
        );

        if (allUnassigned.length === 0) {
            return res.status(200).json({ message: "Tiada tugasan baharu untuk diagihkan." });
        }

        // Gerbang peringkat (workflow.jpg) — sama seperti laluan AI: hanya peringkat
        // aktif setiap order layak masuk giliran round-robin.
        const rrOrderIds = [...new Set(allUnassigned.map(t => t.order_id))];
        const [rrSiblingRows] = await db.query(
            `SELECT id, order_id, task_type, status FROM tasks WHERE order_id IN (?)`,
            [rrOrderIds]
        );
        const rrSiblingsByOrder = {};
        rrSiblingRows.forEach(t => (rrSiblingsByOrder[t.order_id] = rrSiblingsByOrder[t.order_id] || []).push(t));
        const tasks = allUnassigned.filter(t =>
            isTaskAssignable(t, rrSiblingsByOrder[t.order_id] || [], t.delivery_type)
        );

        if (tasks.length === 0) {
            return res.status(200).json({ message: "Tiada tugasan pada peringkat aktif untuk diagihkan — peringkat semasa masih menunggu hantaran staf / kelulusan admin." });
        }

        // B. Cari SEMUA staf aktif, bahagikan ikut peranan (Designer / Operator Am)
        const [staffList] = await db.query(`SELECT * FROM staff WHERE status = 'Aktif'`);
        if (staffList.length === 0) {
            return res.status(400).json({ error: "Tiada staf aktif dalam sistem!" });
        }
        const designers = staffList.filter(s => s.job_title === 'Designer');
        const generalOps = staffList.filter(s => s.job_title === 'Operator Am');

        const todayStr = new Date().toISOString().slice(0, 10);
        const [leaveRows] = await db.query(
            `SELECT * FROM leaves WHERE status = 'Approved' AND end_date >= ?`,
            [todayStr]
        );

        // C. Round-Robin BERASINGAN ikut kumpulan kemahiran — kursor giliran Operator Am
        //    kekal SAMA merentas Printing/Packing/Delivery supaya beban rata
        let designerCursor = 0;
        let opCursor = 0;
        const assignments = [];
        const skippedTaskIds = [];
        for (const task of tasks) {
            const dueDateStr = task.due_date instanceof Date
                ? task.due_date.toISOString().slice(0, 10)
                : String(task.due_date).slice(0, 10);

            const isDesignTask = task.task_type === 'Design';
            const pool = isDesignTask ? designers : generalOps;

            if (pool.length === 0) { skippedTaskIds.push(task.id); continue; }

            const startCursor = isDesignTask ? designerCursor : opCursor;
            let picked = null;
            for (let i = 0; i < pool.length; i++) {
                const candidate = pool[(startCursor + i) % pool.length];
                const { isFullyOnLeave } = getLeaveStatusForTask(candidate.id, dueDateStr, leaveRows, todayStr);
                if (!isFullyOnLeave) {
                    picked = candidate;
                    const nextCursor = (startCursor + i + 1) % pool.length;
                    if (isDesignTask) designerCursor = nextCursor; else opCursor = nextCursor;
                    break;
                }
            }
            if (picked) {
                assignments.push({ taskId: task.id, staffId: picked.id });
            } else {
                skippedTaskIds.push(task.id);
            }
        }

        if (assignments.length === 0) {
            return res.status(400).json({ error: "Semua staf bercuti sepanjang tempoh tugasan yang belum diagih." });
        }

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

            // Status order automatik: agihan round-robin = "distributed" → In Progress
            const assignedTaskIds = assignments.map(a => a.taskId);
            const [rrOrders] = await db.query(
                `SELECT DISTINCT order_id FROM tasks WHERE id IN (?)`, [assignedTaskIds]
            );
            for (const { order_id } of rrOrders) await syncOrderStatus(db, order_id);

            res.status(200).json({
                message: `Berjaya! ${assignments.length} tugasan diagihkan.` +
                         (skippedTaskIds.length ? ` ${skippedTaskIds.length} tugasan dilangkau (semua staf bercuti sepanjang tempoh tugasan).` : ''),
                assignedCount: assignments.length,
                skippedTaskIds
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
        const [allUnassigned] = await db.query(`
            SELECT tasks.*,
                   orders.order_number, orders.client_name, orders.item_type,
                   orders.quantity, orders.due_date, orders.delivery_location,
                   orders.delivery_type, orders.specifications
            FROM tasks
            JOIN orders ON tasks.order_id = orders.id
            WHERE tasks.assigned_staff_id IS NULL
              AND tasks.order_id IN (?)
        `, [activeOrderIds]);

        if (allUnassigned.length === 0) {
            return res.status(200).json({
                success: true,
                message: "Tiada tugasan baharu yang perlu diagihkan.",
                assignments: []
            });
        }

        // Gerbang peringkat (workflow.jpg): hanya tugasan pada peringkat AKTIF setiap
        // order boleh dicadang — peringkat seterusnya menunggu kelulusan admin dahulu.
        const [siblingRows] = await db.query(
            `SELECT id, order_id, task_type, status FROM tasks WHERE order_id IN (?)`,
            [activeOrderIds]
        );
        const siblingsByOrder = {};
        siblingRows.forEach(t => (siblingsByOrder[t.order_id] = siblingsByOrder[t.order_id] || []).push(t));
        const tasks = allUnassigned.filter(t =>
            isTaskAssignable(t, siblingsByOrder[t.order_id] || [], t.delivery_type)
        );

        if (tasks.length === 0) {
            return res.status(200).json({
                success: true,
                message: "Tiada tugasan pada peringkat aktif untuk diagihkan — peringkat semasa masih menunggu hantaran staf / kelulusan admin.",
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
            WHERE status IN ('Pending', 'In Progress', 'Submitted')
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
        //    (getLeaveStatusForTask kini di skop modul — dikongsi semua laluan agihan)
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

Berikut adalah tugasan belum diagih berserta staf yang tersedia (NOTA: senarai ini
sudah ditapis kepada PERINGKAT AKTIF sahaja bagi setiap tempahan — peringkat seterusnya
hanya akan muncul selepas peringkat semasa diluluskan oleh admin):
${JSON.stringify(tasksForAI, null, 2)}

Sila patuhi kriteria berikut:
1. Padanan Kemahiran (Skill Matching):
   - 'Design' -> HANYA staf 'Designer'
   - 'Printing' / 'Packing' / 'Delivery' -> HANYA staf 'Operator Am'
1a. Pembahagian Rata (Load Balancing): Operator Am mengendalikan TIGA jenis
    tugasan (Printing, Packing, Delivery) — skop lebih luas daripada
    Designer. JANGAN bebankan satu Operator Am dengan pelbagai tugasan
    sementara Operator Am lain kosong. Agihkan secara SEIMBANG merentas
    kesemua Operator Am yang tersedia, kira SEMUA jenis tugasan bersama
    (bukan berasingan ikut jenis) bila nilai beban kerja (workload).
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
        case 'Printing':
        case 'Packing':
        case 'Delivery': return jobTitle === 'Operator Am';
        default:         return true; // jenis tugasan tidak dikenali — biarkan lulus
    }
}

// ── Aliran kerja berperingkat (workflow.jpg) ──────────────────────
const STAGE_ORDER = ['Design', 'Printing', 'Packing', 'Delivery'];
const TASKS_BY_ORDER_TYPE = {
    'Design Only':      ['Design'],
    'Product Only':     ['Printing', 'Packing', 'Delivery'],
    'Design & Product': STAGE_ORDER,
};

// Tugasan hanya boleh diagih (AI/round-robin/manual) jika SEMUA peringkat lebih
// awal dalam order sama sudah Completed (diluluskan admin). Tugasan Delivery bagi
// penghantaran External dikecualikan terus — admin sahkan sendiri (carta alir).
function isExternalDelivery(deliveryType) {
    return String(deliveryType || '').toLowerCase() === 'external';
}

function isTaskAssignable(task, siblingTasks, deliveryType) {
    if (task.task_type === 'Delivery' && isExternalDelivery(deliveryType)) return false;
    const stageIdx = STAGE_ORDER.indexOf(task.task_type);
    if (stageIdx <= 0) return true; // Design atau jenis tidak dikenali — tiada peringkat awal
    return siblingTasks.every(t => {
        if (t.id === task.id) return true;
        const i = STAGE_ORDER.indexOf(t.task_type);
        return i === -1 || i >= stageIdx || t.status === 'Completed';
    });
}

// Selaraskan status order secara AUTOMATIK daripada keadaan tugasannya.
// Pending = belum ada tugasan diagih; In Progress = >=1 tugasan Confirmed sudah
// diagih (atau sudah siap); Completed = SEMUA tugasan Completed. Order Cancelled
// tidak disentuh. `conn` boleh jadi pool `db` atau connection dalam transaksi.
async function syncOrderStatus(conn, orderId) {
    const [[order]] = await conn.query(`SELECT status FROM orders WHERE id = ?`, [orderId]);
    if (!order || order.status === 'Cancelled') return;
    const [taskRows] = await conn.query(
        `SELECT status, approval_status, assigned_staff_id FROM tasks WHERE order_id = ?`,
        [orderId]
    );
    let newStatus = 'Pending';
    if (taskRows.length > 0 && taskRows.every(t => t.status === 'Completed')) {
        newStatus = 'Completed';
    } else if (taskRows.some(t => t.approval_status === 'Confirmed'
            && (t.assigned_staff_id !== null || t.status === 'Completed'))) {
        newStatus = 'In Progress';
    }
    if (newStatus !== order.status) {
        await conn.query(`UPDATE orders SET status = ? WHERE id = ?`, [newStatus, orderId]);
    }
}

// ── Pembantu: Pengesahan agihan (kemahiran + konflik cuti) ────────
async function validateAssignment(task_id, staff_id, start_time, end_time) {
    const [[taskRow]] = await db.query(
        `SELECT tasks.task_type, tasks.order_id, orders.delivery_type
         FROM tasks JOIN orders ON tasks.order_id = orders.id
         WHERE tasks.id = ?`, [task_id]
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

    // Delivery External — admin sahkan sendiri, tidak boleh diagih kepada staf (carta alir)
    if (taskRow.task_type === 'Delivery' && isExternalDelivery(taskRow.delivery_type)) {
        return {
            valid: false,
            reason: `Penghantaran External (kurier) — tugasan Delivery disahkan sendiri oleh admin, tidak perlu diagih kepada staf.`
        };
    }

    // Gerbang peringkat: semua peringkat lebih awal dalam order sama mesti Completed
    const stageIdx = STAGE_ORDER.indexOf(taskRow.task_type);
    if (stageIdx > 0) {
        const [siblings] = await db.query(
            `SELECT id, task_type, status FROM tasks WHERE order_id = ? AND id != ?`,
            [taskRow.order_id, task_id]
        );
        const blocker = siblings.find(t => {
            const i = STAGE_ORDER.indexOf(t.task_type);
            return i > -1 && i < stageIdx && t.status !== 'Completed';
        });
        if (blocker) {
            return {
                valid: false,
                reason: `Peringkat '${blocker.task_type}' belum diluluskan admin — tugasan '${taskRow.task_type}' hanya boleh diagih selepas peringkat sebelumnya siap.`
            };
        }
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

        // Status order automatik: agihan disimpan+Confirmed = "distributed" → In Progress
        const [orderRows] = await db.query(
            `SELECT DISTINCT order_id FROM tasks WHERE id IN (?)`,
            [assignments.map(a => a.task_id)]
        );
        for (const { order_id } of orderRows) await syncOrderStatus(db, order_id);

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

        // Semakan pemilikan (IDOR): staf hanya boleh lihat tugasan sendiri
        if (req.user.role === 'Staff' && String(req.user.staffId) !== String(staff_id)) {
            return res.status(403).json({ error: 'Akses ditolak. Anda hanya boleh akses data sendiri.' });
        }

        // Join tasks + orders untuk detail penuh
        const sql = `
            SELECT
                tasks.*,
                orders.order_number,
                orders.client_name,
                orders.item_type,
                orders.due_date,
                orders.order_type,
                orders.design_file_path
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

        // Semakan pemilikan (IDOR): staf hanya boleh lihat sejarah cuti sendiri
        if (req.user.role === 'Staff' && String(req.user.staffId) !== String(staff_id)) {
            return res.status(403).json({ error: 'Akses ditolak. Anda hanya boleh akses data sendiri.' });
        }

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

        // Semakan pemilikan (IDOR): staf hanya boleh kemaskini profil sendiri
        if (req.user.role === 'Staff' && String(req.user.staffId) !== String(staffId)) {
            return res.status(403).json({ error: 'Akses ditolak. Anda hanya boleh akses data sendiri.' });
        }

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
        const { status, notes } = req.body;

        // Staf HANTAR ('Submitted') dan bukan lagi menanda 'Completed' terus —
        // 'Completed' hanya melalui kelulusan admin (PATCH /api/tasks/:id/review).
        const ALLOWED = ['Pending', 'In Progress', 'Submitted'];
        if (!status || !ALLOWED.includes(status)) {
            return res.status(400).json({
                error: `Status tidak sah. Nilai yang dibenarkan: ${ALLOWED.join(', ')}.`
            });
        }

        // Dapatkan task beserta order_id dan semak pemilikan (Staff)
        const [[task]] = await db.query(
            `SELECT assigned_staff_id, order_id, status AS current_status FROM tasks WHERE id = ? AND approval_status = 'Confirmed'`,
            [taskId]
        );
        if (!task) return res.status(404).json({ error: 'Tugasan tidak dijumpai.' });

        if (req.user.role === 'Staff' && String(task.assigned_staff_id) !== String(req.user.staffId)) {
            return res.status(403).json({ error: 'Akses ditolak. Anda hanya boleh kemaskini tugasan sendiri.' });
        }

        // Tugasan yang sedang menunggu kelulusan / sudah diluluskan dikunci daripada staf
        if (task.current_status === 'Submitted' || task.current_status === 'Completed') {
            if (req.file) fs.unlink(req.file.path, () => {});
            return res.status(409).json({
                error: task.current_status === 'Submitted'
                    ? 'Tugasan sedang menunggu kelulusan admin — tidak boleh diubah.'
                    : 'Tugasan sudah diluluskan (Completed) — tidak boleh diubah.'
            });
        }

        // Kemaskini status — sertakan attachment_path hanya jika fail baharu dimuatnaik.
        // Hantar semula ('Submitted') mengosongkan sebab penolakan terdahulu.
        const clearRejection = status === 'Submitted' ? `, rejection_reason = NULL` : '';
        let attachmentPath = null;
        if (req.file) {
            attachmentPath = `/uploads/tasks/${req.file.filename}`;
            await db.query(
                `UPDATE tasks SET status = ?, attachment_path = ?, staff_notes = ?${clearRejection} WHERE id = ?`,
                [status, attachmentPath, notes || null, taskId]
            );
        } else {
            await db.query(
                `UPDATE tasks SET status = ?, staff_notes = ?${clearRejection} WHERE id = ?`,
                [status, notes || null, taskId]
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

// Semakan admin ke atas hantaran staf (carta alir: 'admin sahkan tugasan dihantar')
// approve → Completed (peringkat seterusnya terbuka); reject → kembali In Progress + sebab.
app.patch('/api/tasks/:id/review', verifyToken, requireRole('Manager'), async (req, res) => {
    try {
        const taskId = req.params.id;
        const { decision, reason } = req.body || {};

        if (!['approve', 'reject'].includes(decision)) {
            return res.status(400).json({ error: "Keputusan tidak sah. Nilai dibenarkan: 'approve' atau 'reject'." });
        }
        if (decision === 'reject' && (!reason || !String(reason).trim())) {
            return res.status(400).json({ error: 'Sebab penolakan wajib diisi.' });
        }

        const [[task]] = await db.query(
            `SELECT status, order_id FROM tasks WHERE id = ?`, [taskId]
        );
        if (!task) return res.status(404).json({ error: 'Tugasan tidak dijumpai.' });
        if (task.status !== 'Submitted') {
            return res.status(409).json({ error: "Hanya tugasan berstatus 'Submitted' (menunggu kelulusan) boleh disemak." });
        }

        if (decision === 'approve') {
            await db.query(
                `UPDATE tasks SET status = 'Completed', rejection_reason = NULL WHERE id = ?`, [taskId]
            );
            await syncOrderStatus(db, task.order_id);
            return res.status(200).json({ message: 'Tugasan diluluskan.', taskId, status: 'Completed' });
        }

        await db.query(
            `UPDATE tasks SET status = 'In Progress', rejection_reason = ? WHERE id = ?`,
            [String(reason).trim(), taskId]
        );
        res.status(200).json({ message: 'Tugasan ditolak dan dikembalikan kepada staf.', taskId, status: 'In Progress' });
    } catch (err) {
        console.error('Ralat PATCH /api/tasks/:id/review:', err);
        res.status(500).json({ error: 'Gagal menyemak tugasan.' });
    }
});

// Delivery External (JNT dsb.) — admin sahkan sendiri tanpa assign staf (carta alir).
app.patch('/api/tasks/:id/complete-delivery', verifyToken, requireRole('Manager'), async (req, res) => {
    try {
        const taskId = req.params.id;
        const [[task]] = await db.query(
            `SELECT tasks.status, tasks.task_type, tasks.order_id, orders.delivery_type
             FROM tasks JOIN orders ON tasks.order_id = orders.id
             WHERE tasks.id = ?`, [taskId]
        );
        if (!task) return res.status(404).json({ error: 'Tugasan tidak dijumpai.' });
        if (task.task_type !== 'Delivery' || !isExternalDelivery(task.delivery_type)) {
            return res.status(409).json({
                error: "Hanya tugasan Delivery bagi penghantaran External boleh disahkan terus oleh admin."
            });
        }
        if (task.status === 'Completed') {
            return res.status(409).json({ error: 'Tugasan Delivery ini sudah siap.' });
        }

        // Gerbang peringkat: semua peringkat sebelum Delivery mesti Completed dahulu
        const [siblings] = await db.query(
            `SELECT id, task_type, status FROM tasks WHERE order_id = ?`, [task.order_id]
        );
        const deliveryIdx = STAGE_ORDER.indexOf('Delivery');
        const blocker = siblings.find(t => {
            const i = STAGE_ORDER.indexOf(t.task_type);
            return i > -1 && i < deliveryIdx && t.status !== 'Completed';
        });
        if (blocker) {
            return res.status(409).json({
                error: `Peringkat '${blocker.task_type}' belum selesai — Delivery hanya boleh disahkan selepas semua peringkat sebelumnya diluluskan.`
            });
        }

        await db.query(
            `UPDATE tasks SET status = 'Completed', rejection_reason = NULL WHERE id = ?`, [taskId]
        );
        await syncOrderStatus(db, task.order_id);
        res.status(200).json({ message: 'Penghantaran external disahkan siap.', taskId, status: 'Completed' });
    } catch (err) {
        console.error('Ralat PATCH /api/tasks/:id/complete-delivery:', err);
        res.status(500).json({ error: 'Gagal mengesahkan penghantaran.' });
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

        // Semakan kemahiran + gerbang peringkat + Delivery External (guna validateAssignment
        // yang sama dengan save-assignments; masa null → semakan cuti kekal logik asal di bawah)
        if (assigned_staff_id) {
            const gateCheck = await validateAssignment(taskId, assigned_staff_id, null, null);
            if (!gateCheck.valid) {
                return res.status(409).json({ error: gateCheck.reason });
            }
        }

        // Semakan konflik cuti (F3.3) — logik sama dengan auto-assign & generate-schedule
        let leaveWarning = null;
        if (assigned_staff_id) {
            const [[orderInfo]] = await db.query(
                `SELECT orders.due_date FROM tasks JOIN orders ON tasks.order_id = orders.id WHERE tasks.id = ?`,
                [taskId]
            );
            if (orderInfo) {
                const dueDateStr = orderInfo.due_date instanceof Date
                    ? orderInfo.due_date.toISOString().slice(0, 10)
                    : String(orderInfo.due_date).slice(0, 10);
                const todayStr = new Date().toISOString().slice(0, 10);
                const [leaveRows] = await db.query(
                    `SELECT * FROM leaves WHERE staff_id = ? AND status = 'Approved' AND end_date >= ?`,
                    [assigned_staff_id, todayStr]
                );
                const { isFullyOnLeave, compressedWindowMessage } =
                    getLeaveStatusForTask(Number(assigned_staff_id), dueDateStr, leaveRows, todayStr);

                if (isFullyOnLeave) {
                    return res.status(409).json({
                        error: 'Staf ini bercuti sepanjang tempoh tugasan (hingga tarikh siap tempahan). Pilih staf lain atau ubah tarikh.'
                    });
                }
                leaveWarning = compressedWindowMessage;
            }
        }

        const [result] = await db.query(
            `UPDATE tasks
             SET assigned_staff_id = ?, task_type = ?, description = ?, start_time = ?, end_time = ?
             WHERE id = ?`,
            [assigned_staff_id || null, task_type, description, fmtStart, fmtEnd, taskId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Tugasan tidak dijumpai." });
        }

        // Status order automatik — agihan mungkin ditambah/dibuang melalui edit ini
        const [[edited]] = await db.query(`SELECT order_id FROM tasks WHERE id = ?`, [taskId]);
        if (edited) await syncOrderStatus(db, edited.order_id);

        res.status(200).json({
            message: "Tugasan berjaya dikemaskini!",
            ...(leaveWarning ? { warning: leaveWarning } : {})
        });
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

        // Rekod order terlibat SEBELUM update — untuk penyelarasan status automatik
        const [draftOrders] = Array.isArray(task_ids) && task_ids.length > 0
            ? await db.query(`SELECT DISTINCT order_id FROM tasks WHERE approval_status = 'Draft' AND id IN (?)`, [task_ids])
            : await db.query(`SELECT DISTINCT order_id FROM tasks WHERE approval_status = 'Draft'`);

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

        for (const { order_id } of draftOrders) await syncOrderStatus(db, order_id);

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

// Padam tugasan: kendali dua kes — draf AI (reset ke pool) atau tugasan lalai belum diagih (padam terus)
app.delete('/api/tasks/:id', verifyToken, requireRole('Manager'), async (req, res) => {
    try {
        const taskId = req.params.id;

        // order_id diperlukan untuk penyelarasan status automatik selepas padam/reset
        const [[taskRef]] = await db.query(`SELECT order_id FROM tasks WHERE id = ?`, [taskId]);

        // Kes 1: draf AI belum disahkan — reset ke kolam belum diagih (tingkah laku sedia ada, tak berubah)
        const [draftResult] = await db.query(
            `UPDATE tasks
             SET assigned_staff_id = NULL, start_time = NULL, end_time = NULL, approval_status = 'Confirmed'
             WHERE id = ? AND approval_status = 'Draft'`,
            [taskId]
        );
        if (draftResult.affectedRows > 0) {
            if (taskRef) await syncOrderStatus(db, taskRef.order_id);
            return res.status(200).json({ message: "Draf tugasan berjaya dipadam dan dikembalikan ke senarai belum diagih." });
        }

        // Kes 2: tugasan lalai (auto-generated) belum diagih staf — padam terus
        const [hardDeleteResult] = await db.query(
            `DELETE FROM tasks WHERE id = ? AND approval_status = 'Confirmed' AND assigned_staff_id IS NULL`,
            [taskId]
        );
        if (hardDeleteResult.affectedRows > 0) {
            if (taskRef) await syncOrderStatus(db, taskRef.order_id);
            return res.status(200).json({ message: "Tugasan berjaya dipadam." });
        }

        return res.status(404).json({
            error: "Tugasan tidak dijumpai, atau sudah diagihkan kepada staf (nyahagih dahulu sebelum padam)."
        });
    } catch (err) {
        console.error("Ralat DELETE /api/tasks/:id:", err);
        res.status(500).json({ error: "Gagal memadam tugasan." });
    }
});

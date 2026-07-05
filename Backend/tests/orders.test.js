'use strict';
// Ujian domain Tempahan (F2, UC-03, UC-11 — isu §12 #4, #12)
const request = require('supertest');

jest.mock('../db');
const db = require('../db');

jest.mock('@google/generative-ai', () => ({
    GoogleGenerativeAI: jest.fn(() => ({ getGenerativeModel: jest.fn() }))
}));

const app = require('../server');
const { tokenManager, tokenStaff, mockConnection } = require('./helpers');

beforeEach(() => {
    jest.clearAllMocks();
});

const BODY_TEMPAHAN_SAH = {
    namaKlien:   'Syarikat Ujian Sdn Bhd',
    jenisItem:   'Banner Vinyl',
    kuantiti:    2,
    harga:       150.0,
    tarikhSiap:  '2026-08-01',
    jenisHantar: 'Internal',
    lokasiHantar: null,
    nota:        'Ujian automatik'
};

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/orders — cipta tempahan + 4 tugasan lalai (isu #12)', () => {

    it('berjaya (201) dan INSERT ke orders DAN tasks dalam satu transaksi', async () => {
        const conn = mockConnection();
        conn.query
            .mockResolvedValueOnce([{ insertId: 42 }])   // INSERT INTO orders
            .mockResolvedValueOnce([{}]);                // INSERT INTO tasks (bulk)
        db.getConnection.mockResolvedValue(conn);

        const res = await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${tokenManager()}`)
            .send(BODY_TEMPAHAN_SAH);

        expect(res.status).toBe(201);
        expect(res.body.orderId).toBe(42);

        // Transaksi mesti dibuka dan di-commit
        expect(conn.beginTransaction).toHaveBeenCalledTimes(1);
        expect(conn.commit).toHaveBeenCalledTimes(1);
        expect(conn.rollback).not.toHaveBeenCalled();
        expect(conn.release).toHaveBeenCalledTimes(1);

        // Panggilan 1: INSERT INTO orders
        expect(conn.query.mock.calls[0][0]).toMatch(/INSERT INTO orders/i);

        // Panggilan 2: INSERT INTO tasks (VALUES ?) dengan 4 baris tugasan lalai
        expect(conn.query.mock.calls[1][0]).toMatch(/INSERT INTO tasks/i);
        expect(conn.query.mock.calls[1][1]).toEqual([[
            [42, 'Design'],
            [42, 'Printing'],
            [42, 'Packing'],
            [42, 'Delivery']
        ]]);
    });

    it('tolak (403) jika peranan Staff', async () => {
        const res = await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${tokenStaff()}`)
            .send(BODY_TEMPAHAN_SAH);

        expect(res.status).toBe(403);
        expect(db.getConnection).not.toHaveBeenCalled();
    });

    it('rollback + 500 jika INSERT tasks gagal (tiada order "separuh siap")', async () => {
        const conn = mockConnection();
        conn.query
            .mockResolvedValueOnce([{ insertId: 42 }])            // orders berjaya
            .mockRejectedValueOnce(new Error('Ralat DB rekaan')); // tasks gagal
        db.getConnection.mockResolvedValue(conn);

        const res = await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${tokenManager()}`)
            .send(BODY_TEMPAHAN_SAH);

        expect(res.status).toBe(500);
        expect(conn.rollback).toHaveBeenCalledTimes(1);
        expect(conn.commit).not.toHaveBeenCalled();
        expect(conn.release).toHaveBeenCalledTimes(1);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/orders/:id/status DIBUANG — status order kini automatik (syncOrderStatus).
// Digantikan POST /api/orders/:id/terminate (butang 'Batalkan Tempahan').
describe('POST /api/orders/:id/terminate — batalkan tempahan (aliran berperingkat)', () => {

    it('berjaya (200): padam SEMUA tugasan + set Cancelled dalam transaksi', async () => {
        const conn = mockConnection();
        conn.query
            .mockResolvedValueOnce([[{ status: 'In Progress' }]]) // SELECT ... FOR UPDATE
            .mockResolvedValueOnce([{ affectedRows: 4 }])         // DELETE FROM tasks
            .mockResolvedValueOnce([{}]);                         // UPDATE orders → Cancelled
        db.getConnection.mockResolvedValue(conn);

        const res = await request(app)
            .post('/api/orders/9/terminate')
            .set('Authorization', `Bearer ${tokenManager()}`);

        expect(res.status).toBe(200);
        expect(res.body.deletedTasks).toBe(4);
        expect(conn.beginTransaction).toHaveBeenCalledTimes(1);
        expect(conn.commit).toHaveBeenCalledTimes(1);
        expect(conn.query.mock.calls[1][0]).toMatch(/DELETE FROM tasks/i);
        expect(conn.query.mock.calls[2][0]).toMatch(/SET status = 'Cancelled'/i);
    });

    it('tolak (409) — tempahan sudah Completed tidak boleh dibatalkan', async () => {
        const conn = mockConnection();
        conn.query.mockResolvedValueOnce([[{ status: 'Completed' }]]);
        db.getConnection.mockResolvedValue(conn);

        const res = await request(app)
            .post('/api/orders/9/terminate')
            .set('Authorization', `Bearer ${tokenManager()}`);

        expect(res.status).toBe(409);
        expect(conn.rollback).toHaveBeenCalledTimes(1);
        expect(conn.commit).not.toHaveBeenCalled();
    });

    it('tolak (404) — tempahan tidak wujud', async () => {
        const conn = mockConnection();
        conn.query.mockResolvedValueOnce([[]]);
        db.getConnection.mockResolvedValue(conn);

        const res = await request(app)
            .post('/api/orders/99/terminate')
            .set('Authorization', `Bearer ${tokenManager()}`);

        expect(res.status).toBe(404);
    });

    it('tolak (403) jika peranan Staff', async () => {
        const res = await request(app)
            .post('/api/orders/9/terminate')
            .set('Authorization', `Bearer ${tokenStaff()}`);

        expect(res.status).toBe(403);
        expect(db.getConnection).not.toHaveBeenCalled();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/orders — penjanaan tugasan bersyarat ikut order_type (aliran berperingkat)', () => {

    it("'Design Only' → HANYA 1 tugasan Design dijana", async () => {
        const conn = mockConnection();
        conn.query
            .mockResolvedValueOnce([{ insertId: 43 }])
            .mockResolvedValueOnce([{}]);
        db.getConnection.mockResolvedValue(conn);

        const res = await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${tokenManager()}`)
            .send({ ...BODY_TEMPAHAN_SAH, order_type: 'Design Only' });

        expect(res.status).toBe(201);
        expect(conn.query.mock.calls[1][1]).toEqual([[[43, 'Design']]]);
    });

    it("'Product Only' TANPA fail design → 400, tiada transaksi dibuka", async () => {
        const res = await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${tokenManager()}`)
            .send({ ...BODY_TEMPAHAN_SAH, order_type: 'Product Only' });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/fail design/i);
        expect(db.getConnection).not.toHaveBeenCalled();
    });

    it('order_type tidak sah → 400', async () => {
        const res = await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${tokenManager()}`)
            .send({ ...BODY_TEMPAHAN_SAH, order_type: 'Cetak Sahaja' });

        expect(res.status).toBe(400);
        expect(db.getConnection).not.toHaveBeenCalled();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/orders — senarai tempahan (F2.4)', () => {

    it('berjaya (200) dan pulangkan array', async () => {
        db.query.mockResolvedValueOnce([[{ id: 2 }, { id: 1 }]]);

        const res = await request(app)
            .get('/api/orders')
            .set('Authorization', `Bearer ${tokenManager()}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body).toHaveLength(2);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/orders/:id/tasks — tugasan satu tempahan (isu #12)', () => {

    it('berjaya (200), array tersusun Design→Delivery, query guna FIELD()', async () => {
        db.query.mockResolvedValueOnce([[
            { id: 11, task_type: 'Design',   status: 'Pending', approval_status: 'Confirmed', assigned_staff_id: null },
            { id: 12, task_type: 'Printing', status: 'Pending', approval_status: 'Confirmed', assigned_staff_id: null },
            { id: 13, task_type: 'Packing',  status: 'Pending', approval_status: 'Confirmed', assigned_staff_id: null },
            { id: 14, task_type: 'Delivery', status: 'Pending', approval_status: 'Confirmed', assigned_staff_id: null }
        ]]);

        const res = await request(app)
            .get('/api/orders/42/tasks')
            .set('Authorization', `Bearer ${tokenManager()}`);

        expect(res.status).toBe(200);
        expect(res.body.map(t => t.task_type)).toEqual(['Design', 'Printing', 'Packing', 'Delivery']);

        // Susunan dijamin oleh ORDER BY FIELD(...) dalam SQL, dan param ialah id tempahan
        expect(db.query.mock.calls[0][0]).toMatch(/ORDER BY FIELD\(t\.task_type/i);
        expect(db.query.mock.calls[0][1]).toEqual(['42']);
    });
});

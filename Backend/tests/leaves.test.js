'use strict';
// Ujian domain Cuti (F5, UC-05, UC-09)
const request = require('supertest');

jest.mock('../db');
const db = require('../db');

jest.mock('@google/generative-ai', () => ({
    GoogleGenerativeAI: jest.fn(() => ({ getGenerativeModel: jest.fn() }))
}));

const app = require('../server');
const { tokenManager, tokenStaff } = require('./helpers');

beforeEach(() => {
    jest.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/staff/leaves — staf mohon cuti (F5.1, UC-09)', () => {

    it('berjaya (201) dengan data sah, status lalai Pending dalam SQL', async () => {
        db.query.mockResolvedValueOnce([{ insertId: 33 }]);

        const res = await request(app)
            .post('/api/staff/leaves')
            .set('Authorization', `Bearer ${tokenStaff()}`)
            .send({
                staff_id:   4,
                start_date: '2026-08-10',
                end_date:   '2026-08-11',
                reason:     'Cuti Tahunan — ujian automatik'
            });

        expect(res.status).toBe(201);
        expect(res.body.leaveId).toBe(33);
        // Status ditetapkan 'Pending' terus dalam SQL (bukan daripada input pengguna)
        expect(db.query.mock.calls[0][0]).toMatch(/'Pending'/);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/staff/leaves/:staff_id — sejarah cuti staf (F5.2)', () => {

    it('berjaya (200) dan pulangkan array rekod', async () => {
        db.query.mockResolvedValueOnce([[{ id: 1, staff_id: 4, status: 'Approved' }]]);

        const res = await request(app)
            .get('/api/staff/leaves/4')
            .set('Authorization', `Bearer ${tokenStaff()}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(db.query.mock.calls[0][1]).toEqual(['4']);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/manager/leaves — senarai cuti untuk Pengurus (F5.3, UC-05)', () => {

    it('berjaya (200) sebagai Manager', async () => {
        db.query.mockResolvedValueOnce([[{ id: 2, staff_name: 'Ahmad Ali', status: 'Pending' }]]);

        const res = await request(app)
            .get('/api/manager/leaves')
            .set('Authorization', `Bearer ${tokenManager()}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    it('tolak (403) jika peranan Staff', async () => {
        const res = await request(app)
            .get('/api/manager/leaves')
            .set('Authorization', `Bearer ${tokenStaff()}`);

        expect(res.status).toBe(403);
        expect(db.query).not.toHaveBeenCalled();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('PUT /api/manager/leaves/:id — lulus/tolak cuti (F5.4, UC-05)', () => {

    it('lulus (200) — status Approved, rejection_reason dikosongkan', async () => {
        db.query.mockResolvedValueOnce([{}]);

        const res = await request(app)
            .put('/api/manager/leaves/3')
            .set('Authorization', `Bearer ${tokenManager()}`)
            .send({ status: 'Approved' });

        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/Approved/);
        expect(db.query.mock.calls[0][1]).toEqual(['Approved', null, '3']);
    });

    it('tolak permohonan (200) — rejection_reason disimpan bersama status Rejected', async () => {
        db.query.mockResolvedValueOnce([{}]);

        const res = await request(app)
            .put('/api/manager/leaves/3')
            .set('Authorization', `Bearer ${tokenManager()}`)
            .send({ status: 'Rejected', rejection_reason: 'Ramai staf bercuti minggu itu' });

        expect(res.status).toBe(200);
        expect(db.query.mock.calls[0][1]).toEqual(
            ['Rejected', 'Ramai staf bercuti minggu itu', '3']
        );
    });
});

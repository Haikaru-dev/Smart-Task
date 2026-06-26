'use strict';
const request = require('supertest');
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');

// Mock the DB pool before app is loaded so every db.query call is intercepted
jest.mock('../db');
const db = require('../db');

// Stub GoogleGenerativeAI — server.js imports it at module level
jest.mock('@google/generative-ai', () => ({
    GoogleGenerativeAI: jest.fn(() => ({ getGenerativeModel: jest.fn() }))
}));

const app = require('../server');

const JWT_SECRET = 'smarttask_dev_secret_TUKAR_DI_PRODUKSI';

let katalaluanHash; // bcrypt hash of 'kataLaluan123'

beforeAll(async () => {
    katalaluanHash = await bcrypt.hash('kataLaluan123', 10);
});

beforeEach(() => {
    jest.clearAllMocks();
});

// ── Helper: stub DB responses for a staff login ───────────────────────────────
function stubStaffLogin({ is_active = 1, hasStaffRow = true } = {}) {
    db.query
        .mockResolvedValueOnce([[{       // jadual users
            id:        7,
            username:  'staf_baru',
            password:  katalaluanHash,
            role:      'Staff',
            is_active
        }]]);

    if (is_active && hasStaffRow) {
        db.query.mockResolvedValueOnce([[{   // jadual staff
            id:        4,
            full_name: 'Nurul Aina Binti Hassan'
        }]]);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/login — Staf Baharu', () => {

    it('berjaya log masuk dengan kelayakan betul', async () => {
        stubStaffLogin();

        const res = await request(app)
            .post('/api/login')
            .send({ username: 'staf_baru', password: 'kataLaluan123' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.role).toBe('Staff');
        expect(res.body.staffId).toBe(4);
        expect(res.body.name).toBe('Nurul Aina Binti Hassan');
        expect(res.body.token).toBeDefined();
    });

    it('token JWT yang dikembalikan mengandungi maklumat pengguna yang betul', async () => {
        stubStaffLogin();

        const res = await request(app)
            .post('/api/login')
            .send({ username: 'staf_baru', password: 'kataLaluan123' });

        const decoded = jwt.verify(res.body.token, JWT_SECRET);
        expect(decoded.role).toBe('Staff');
        expect(decoded.userId).toBe(7);
        expect(decoded.staffId).toBe(4);
    });

    it('tolak (401) jika kata laluan salah', async () => {
        db.query.mockResolvedValueOnce([[{
            id:        7,
            username:  'staf_baru',
            password:  katalaluanHash,
            role:      'Staff',
            is_active: 1
        }]]);

        const res = await request(app)
            .post('/api/login')
            .send({ username: 'staf_baru', password: 'kataLaluanSalah' });

        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
        expect(res.body.token).toBeUndefined();
    });

    it('tolak (401) jika nama pengguna tidak wujud dalam sistem', async () => {
        db.query.mockResolvedValueOnce([[]]);   // tiada baris dikembalikan

        const res = await request(app)
            .post('/api/login')
            .send({ username: 'pengguna_hantu', password: 'apa_sahaja' });

        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
    });

    it('tolak (403) jika akaun staf telah dinyahaktifkan', async () => {
        stubStaffLogin({ is_active: 0 });

        const res = await request(app)
            .post('/api/login')
            .send({ username: 'staf_baru', password: 'kataLaluan123' });

        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
    });

    it('tolak (400) jika nama pengguna atau kata laluan tidak dihantar', async () => {
        const res = await request(app)
            .post('/api/login')
            .send({ username: '', password: '' });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        // DB tidak sepatutnya dipanggil langsung
        expect(db.query).not.toHaveBeenCalled();
    });

    it('tolak (400) jika body permintaan kosong sepenuhnya', async () => {
        const res = await request(app)
            .post('/api/login')
            .send({});

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });
});

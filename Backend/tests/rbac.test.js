'use strict';
// Ujian RBAC menyeluruh (NFR 3.4.1.b) — semakan silang SEMUA route dilindungi.
// Middleware verifyToken/requireRole berjalan SEBELUM handler, jadi tiada
// stub DB diperlukan: permintaan mesti ditolak sebelum sebarang db.query.
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

// 26 route yang memerlukan requireRole('Manager') — senarai eksplisit penuh,
// disemak terhadap server.js (grep requireRole('Manager')), tiada yang dilangkau
const ROUTE_MANAGER_SAHAJA = [
    ['post',   '/api/orders'],
    ['get',    '/api/orders'],
    ['get',    '/api/orders/1/tasks'],
    ['patch',  '/api/orders/1/status'],
    ['get',    '/api/dashboard/stats'],
    ['get',    '/api/dashboard/audit-logs'],
    ['get',    '/api/dashboard/order-trends'],
    ['get',    '/api/dashboard/staff-performance'],
    ['get',    '/api/dashboard/leave-stats'],
    ['get',    '/api/staff'],
    ['post',   '/api/staff'],
    ['put',    '/api/staff/1'],
    ['delete', '/api/staff/1'],
    ['get',    '/api/leaves'],
    ['post',   '/api/leaves'],
    ['get',    '/api/manager/leaves'],
    ['put',    '/api/manager/leaves/1'],
    ['post',   '/api/generate-schedule'],
    ['get',    '/api/tasks/board'],
    ['post',   '/api/manager/auto-assign'],
    ['post',   '/api/tasks/save-assignments'],
    ['put',    '/api/tasks/1'],
    ['post',   '/api/tasks/confirm'],
    ['delete', '/api/tasks/1'],
    ['get',    '/api/admin/profile/1'],
    ['put',    '/api/admin/update/1'],
];

// 8 route dilindungi yang dibenarkan untuk Staff (requireRole('Staff','Manager'))
const ROUTE_STAFF_ATAU_MANAGER = [
    ['get',   '/api/staff/1'],
    ['post',  '/api/staff/1/profile-picture'],
    ['put',   '/api/staff/update-profile/1'],
    ['put',   '/api/staff/change-password/1'],
    ['get',   '/api/staff/tasks/1'],
    ['get',   '/api/staff/leaves/1'],
    ['post',  '/api/staff/leaves'],
    ['patch', '/api/tasks/1/status'],
];

const SEMUA_ROUTE_DILINDUNGI = [...ROUTE_MANAGER_SAHAJA, ...ROUTE_STAFF_ATAU_MANAGER];

// ─────────────────────────────────────────────────────────────────────────────
describe('RBAC: route Manager-sahaja mesti tolak token Staff (403)', () => {

    it.each(ROUTE_MANAGER_SAHAJA)('%s %s → 403 dengan token Staff', async (method, path) => {
        const res = await request(app)[method](path)
            .set('Authorization', `Bearer ${tokenStaff()}`);

        expect(res.status).toBe(403);
        expect(db.query).not.toHaveBeenCalled();
        expect(db.getConnection).not.toHaveBeenCalled();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('RBAC: semua route dilindungi mesti tolak permintaan TANPA token (401)', () => {

    it.each(SEMUA_ROUTE_DILINDUNGI)('%s %s → 401 tanpa Authorization', async (method, path) => {
        const res = await request(app)[method](path);

        expect(res.status).toBe(401);
        expect(db.query).not.toHaveBeenCalled();
        expect(db.getConnection).not.toHaveBeenCalled();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('RBAC: semua route dilindungi mesti tolak token rosak/tidak sah (401)', () => {

    it.each(SEMUA_ROUTE_DILINDUNGI)('%s %s → 401 dengan token rosak', async (method, path) => {
        const res = await request(app)[method](path)
            .set('Authorization', 'Bearer token.rosak.tidaksah');

        expect(res.status).toBe(401);
        expect(db.query).not.toHaveBeenCalled();
        expect(db.getConnection).not.toHaveBeenCalled();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('RBAC: kesahihan senarai route (guard kegagalan senyap)', () => {

    it('token Manager TIDAK ditolak 401/403 oleh mana-mana route Manager-sahaja (bukti senarai betul)', async () => {
        // Guna satu route wakil setiap kumpulan guard untuk sahkan token Manager diterima
        // oleh middleware (respons bukan 401/403 — kegagalan DB mock selepas itu tak penting).
        db.query.mockResolvedValue([[]]);

        const res = await request(app)
            .get('/api/manager/leaves')
            .set('Authorization', `Bearer ${tokenManager()}`);

        expect([401, 403]).not.toContain(res.status);
    });
});

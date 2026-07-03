'use strict';
// Ujian domain Tugasan (F3, F4, UC-04, UC-07, UC-08 — isu §12 #2, #6, #12)
const request = require('supertest');

jest.mock('../db');
const db = require('../db');

jest.mock('@google/generative-ai', () => ({
    GoogleGenerativeAI: jest.fn(() => ({ getGenerativeModel: jest.fn() }))
}));

const app = require('../server');
const { tokenManager, tokenStaff, tarikhOffset } = require('./helpers');

beforeEach(() => {
    jest.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
describe('PATCH /api/tasks/:id/status — kemaskini status oleh staf (UC-08, isu #2)', () => {

    it('berjaya (200) — staf kemaskini tugasan SENDIRI dengan nota, staff_notes dalam parameter UPDATE', async () => {
        db.query
            .mockResolvedValueOnce([[{ assigned_staff_id: 4, order_id: 1 }]]) // SELECT pemilikan
            .mockResolvedValueOnce([{}]);                                     // UPDATE

        const res = await request(app)
            .patch('/api/tasks/5/status')
            .set('Authorization', `Bearer ${tokenStaff()}`)   // staffId = 4
            .send({ status: 'In Progress', notes: 'Nota ujian automatik' });

        expect(res.status).toBe(200);
        expect(db.query.mock.calls[1][0]).toMatch(/staff_notes/);
        expect(db.query.mock.calls[1][1]).toEqual(['In Progress', 'Nota ujian automatik', 5]);
    });

    it('berjaya (200) — TANPA nota, staff_notes disimpan sebagai null (nota tidak wajib)', async () => {
        db.query
            .mockResolvedValueOnce([[{ assigned_staff_id: 4, order_id: 1 }]])
            .mockResolvedValueOnce([{}]);

        const res = await request(app)
            .patch('/api/tasks/5/status')
            .set('Authorization', `Bearer ${tokenStaff()}`)
            .send({ status: 'Completed' });

        expect(res.status).toBe(200);
        expect(db.query.mock.calls[1][1]).toEqual(['Completed', null, 5]);
    });

    it('tolak (403) — staf cuba kemaskini tugasan staf LAIN', async () => {
        db.query.mockResolvedValueOnce([[{ assigned_staff_id: 9, order_id: 1 }]]); // milik staf 9

        const res = await request(app)
            .patch('/api/tasks/5/status')
            .set('Authorization', `Bearer ${tokenStaff()}`)   // staffId = 4
            .send({ status: 'Completed' });

        expect(res.status).toBe(403);
        expect(db.query).toHaveBeenCalledTimes(1); // hanya SELECT, tiada UPDATE
    });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('PUT /api/tasks/:id — edit manual + semakan konflik cuti (F3.3, isu #6)', () => {

    const bodyEdit = (staffId) => ({
        assigned_staff_id: staffId,
        task_type:  'Design',
        description: 'Ujian konflik cuti',
        start_time: null,
        end_time:   null
    });

    it('tolak (409) — staf bercuti PENUH sepanjang tempoh tugasan', async () => {
        db.query
            .mockResolvedValueOnce([[{ due_date: tarikhOffset(2) }]])          // due_date order
            .mockResolvedValueOnce([[{                                          // cuti meliputi seluruh tempoh
                staff_id: 4, status: 'Approved',
                start_date: tarikhOffset(-1), end_date: tarikhOffset(5)
            }]]);

        const res = await request(app)
            .put('/api/tasks/5')
            .set('Authorization', `Bearer ${tokenManager()}`)
            .send(bodyEdit(4));

        expect(res.status).toBe(409);
        expect(res.body.error).toMatch(/bercuti sepanjang tempoh/);
        expect(db.query).toHaveBeenCalledTimes(2); // tiada UPDATE dilaksanakan
    });

    it('berjaya (200) + medan `warning` — staf bercuti SEPARA', async () => {
        db.query
            .mockResolvedValueOnce([[{ due_date: tarikhOffset(5) }]])          // tempoh 6 hari
            .mockResolvedValueOnce([[{                                          // cuti 2 hari sahaja
                staff_id: 4, status: 'Approved',
                start_date: tarikhOffset(0), end_date: tarikhOffset(1)
            }]])
            .mockResolvedValueOnce([{ affectedRows: 1 }]);                      // UPDATE berjaya

        const res = await request(app)
            .put('/api/tasks/5')
            .set('Authorization', `Bearer ${tokenManager()}`)
            .send(bodyEdit(4));

        expect(res.status).toBe(200);
        expect(res.body.warning).toBeDefined();
        expect(res.body.warning).toMatch(/bercuti dari/);
    });

    it('berjaya (200) tanpa warning — staf TIADA cuti', async () => {
        db.query
            .mockResolvedValueOnce([[{ due_date: tarikhOffset(5) }]])
            .mockResolvedValueOnce([[]])                                        // tiada rekod cuti
            .mockResolvedValueOnce([{ affectedRows: 1 }]);

        const res = await request(app)
            .put('/api/tasks/5')
            .set('Authorization', `Bearer ${tokenManager()}`)
            .send(bodyEdit(4));

        expect(res.status).toBe(200);
        expect(res.body.warning).toBeUndefined();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('DELETE /api/tasks/:id — dua kes padam (isu #12)', () => {

    it('draf AI (Draft) → reset ke kolam belum diagih, bukan hard delete', async () => {
        db.query.mockResolvedValueOnce([{ affectedRows: 1 }]); // UPDATE Draft berjaya

        const res = await request(app)
            .delete('/api/tasks/7')
            .set('Authorization', `Bearer ${tokenManager()}`);

        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/dikembalikan ke senarai belum diagih/);
        expect(db.query).toHaveBeenCalledTimes(1);
        expect(db.query.mock.calls[0][0]).toMatch(/UPDATE tasks/i);
    });

    it('Confirmed + BELUM diagih → hard delete (200)', async () => {
        db.query
            .mockResolvedValueOnce([{ affectedRows: 0 }])  // bukan Draft
            .mockResolvedValueOnce([{ affectedRows: 1 }]); // DELETE berjaya

        const res = await request(app)
            .delete('/api/tasks/7')
            .set('Authorization', `Bearer ${tokenManager()}`);

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Tugasan berjaya dipadam.');
        expect(db.query.mock.calls[1][0]).toMatch(/DELETE FROM tasks/i);
        expect(db.query.mock.calls[1][0]).toMatch(/assigned_staff_id IS NULL/i);
    });

    it('SUDAH diagih staf → 404 dengan mesej jelas', async () => {
        db.query
            .mockResolvedValueOnce([{ affectedRows: 0 }])  // bukan Draft
            .mockResolvedValueOnce([{ affectedRows: 0 }]); // DELETE tak jumpa (sudah diagih)

        const res = await request(app)
            .delete('/api/tasks/7')
            .set('Authorization', `Bearer ${tokenManager()}`);

        expect(res.status).toBe(404);
        expect(res.body.error).toMatch(/nyahagih dahulu/);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/staff/tasks/:staff_id — tugasan staf sendiri (F4.1, UC-07)', () => {

    it('berjaya (200) — staf lihat tugasan SENDIRI (staffId token = param URL)', async () => {
        db.query.mockResolvedValueOnce([[
            { id: 3, assigned_staff_id: 4, approval_status: 'Confirmed' }
        ]]);

        const res = await request(app)
            .get('/api/staff/tasks/4')
            .set('Authorization', `Bearer ${tokenStaff()}`);  // staffId = 4

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(db.query.mock.calls[0][1]).toEqual(['4']);
    });

    it('SEKAT — staf TIDAK boleh lihat tugasan staf LAIN (staffId token ≠ param URL)', async () => {
        // Tingkah laku selamat yang DIJANGKA: 403 tanpa mendedahkan data staf lain.
        // Jika ujian ini GAGAL, ia mendedahkan isu IDOR sebenar — rekod dalam
        // TEST_REPORT.md, JANGAN baiki dalam sesi ujian ini.
        db.query.mockResolvedValueOnce([[
            { id: 8, assigned_staff_id: 9, approval_status: 'Confirmed' }
        ]]);

        const res = await request(app)
            .get('/api/staff/tasks/9')
            .set('Authorization', `Bearer ${tokenStaff()}`);  // staffId = 4, minta data staf 9

        expect(res.status).toBe(403);
    });

    it('berjaya (200) — Manager lihat tugasan MANA-MANA staf', async () => {
        db.query.mockResolvedValueOnce([[
            { id: 8, assigned_staff_id: 9, approval_status: 'Confirmed' }
        ]]);

        const res = await request(app)
            .get('/api/staff/tasks/9')
            .set('Authorization', `Bearer ${tokenManager()}`);

        expect(res.status).toBe(200);
    });
});

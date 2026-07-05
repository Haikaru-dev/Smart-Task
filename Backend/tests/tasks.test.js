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
            .mockResolvedValueOnce([[{ assigned_staff_id: 4, order_id: 1, current_status: 'Pending' }]]) // SELECT pemilikan
            .mockResolvedValueOnce([{}]);                                                                // UPDATE

        const res = await request(app)
            .patch('/api/tasks/5/status')
            .set('Authorization', `Bearer ${tokenStaff()}`)   // staffId = 4
            .send({ status: 'In Progress', notes: 'Nota ujian automatik' });

        expect(res.status).toBe(200);
        expect(db.query.mock.calls[1][0]).toMatch(/staff_notes/);
        expect(db.query.mock.calls[1][1]).toEqual(['In Progress', 'Nota ujian automatik', 5]);
    });

    it("berjaya (200) — staf HANTAR ('Submitted') tanpa nota; rejection_reason dikosongkan", async () => {
        db.query
            .mockResolvedValueOnce([[{ assigned_staff_id: 4, order_id: 1, current_status: 'In Progress' }]])
            .mockResolvedValueOnce([{}]);

        const res = await request(app)
            .patch('/api/tasks/5/status')
            .set('Authorization', `Bearer ${tokenStaff()}`)
            .send({ status: 'Submitted' });

        expect(res.status).toBe(200);
        expect(db.query.mock.calls[1][0]).toMatch(/rejection_reason = NULL/i);
        expect(db.query.mock.calls[1][1]).toEqual(['Submitted', null, 5]);
    });

    it("tolak (400) — staf TIDAK boleh set 'Completed' terus (hanya melalui kelulusan admin)", async () => {
        const res = await request(app)
            .patch('/api/tasks/5/status')
            .set('Authorization', `Bearer ${tokenStaff()}`)
            .send({ status: 'Completed' });

        expect(res.status).toBe(400);
        expect(db.query).not.toHaveBeenCalled();
    });

    it("tolak (409) — tugasan 'Submitted' dikunci daripada perubahan staf", async () => {
        db.query.mockResolvedValueOnce([[{ assigned_staff_id: 4, order_id: 1, current_status: 'Submitted' }]]);

        const res = await request(app)
            .patch('/api/tasks/5/status')
            .set('Authorization', `Bearer ${tokenStaff()}`)
            .send({ status: 'In Progress' });

        expect(res.status).toBe(409);
        expect(db.query).toHaveBeenCalledTimes(1);
    });

    it('tolak (403) — staf cuba kemaskini tugasan staf LAIN', async () => {
        db.query.mockResolvedValueOnce([[{ assigned_staff_id: 9, order_id: 1, current_status: 'Pending' }]]); // milik staf 9

        const res = await request(app)
            .patch('/api/tasks/5/status')
            .set('Authorization', `Bearer ${tokenStaff()}`)   // staffId = 4
            .send({ status: 'Submitted' });

        expect(res.status).toBe(403);
        expect(db.query).toHaveBeenCalledTimes(1); // hanya SELECT, tiada UPDATE
    });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('PATCH /api/tasks/:id/review — kelulusan admin ke atas hantaran staf', () => {

    it('approve → status Completed + rejection_reason NULL + syncOrderStatus dipanggil', async () => {
        db.query
            .mockResolvedValueOnce([[{ status: 'Submitted', order_id: 3 }]])  // SELECT task
            .mockResolvedValueOnce([{}])                                       // UPDATE → Completed
            .mockResolvedValueOnce([[{ status: 'In Progress' }]])              // sync: SELECT orders
            .mockResolvedValueOnce([[{ status: 'Completed', approval_status: 'Confirmed', assigned_staff_id: 4 }]]) // sync: tasks
            .mockResolvedValueOnce([{}]);                                      // sync: UPDATE orders → Completed

        const res = await request(app)
            .patch('/api/tasks/5/review')
            .set('Authorization', `Bearer ${tokenManager()}`)
            .send({ decision: 'approve' });

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('Completed');
        expect(db.query.mock.calls[1][0]).toMatch(/status = 'Completed', rejection_reason = NULL/i);
    });

    it('reject dengan sebab → status In Progress + rejection_reason disimpan', async () => {
        db.query
            .mockResolvedValueOnce([[{ status: 'Submitted', order_id: 3 }]])
            .mockResolvedValueOnce([{}]);

        const res = await request(app)
            .patch('/api/tasks/5/review')
            .set('Authorization', `Bearer ${tokenManager()}`)
            .send({ decision: 'reject', reason: 'Warna tidak mengikut spesifikasi' });

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('In Progress');
        expect(db.query.mock.calls[1][1]).toEqual(['Warna tidak mengikut spesifikasi', '5']);
    });

    it('tolak (400) — reject TANPA sebab', async () => {
        const res = await request(app)
            .patch('/api/tasks/5/review')
            .set('Authorization', `Bearer ${tokenManager()}`)
            .send({ decision: 'reject', reason: '   ' });

        expect(res.status).toBe(400);
        expect(db.query).not.toHaveBeenCalled();
    });

    it("tolak (409) — tugasan BUKAN 'Submitted' tidak boleh disemak", async () => {
        db.query.mockResolvedValueOnce([[{ status: 'In Progress', order_id: 3 }]]);

        const res = await request(app)
            .patch('/api/tasks/5/review')
            .set('Authorization', `Bearer ${tokenManager()}`)
            .send({ decision: 'approve' });

        expect(res.status).toBe(409);
    });

    it('tolak (403) jika peranan Staff', async () => {
        const res = await request(app)
            .patch('/api/tasks/5/review')
            .set('Authorization', `Bearer ${tokenStaff()}`)
            .send({ decision: 'approve' });

        expect(res.status).toBe(403);
        expect(db.query).not.toHaveBeenCalled();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('PATCH /api/tasks/:id/complete-delivery — Delivery External disahkan admin', () => {

    it('berjaya (200) — Delivery external, semua peringkat awal Completed', async () => {
        db.query
            .mockResolvedValueOnce([[{ status: 'Pending', task_type: 'Delivery', order_id: 3, delivery_type: 'external' }]])
            .mockResolvedValueOnce([[
                { id: 1, task_type: 'Printing', status: 'Completed' },
                { id: 2, task_type: 'Packing',  status: 'Completed' },
                { id: 5, task_type: 'Delivery', status: 'Pending' },
            ]])
            .mockResolvedValueOnce([{}])                                       // UPDATE → Completed
            .mockResolvedValueOnce([[{ status: 'In Progress' }]])              // sync: SELECT orders
            .mockResolvedValueOnce([[{ status: 'Completed', approval_status: 'Confirmed', assigned_staff_id: null }]])
            .mockResolvedValueOnce([{}]);                                      // sync: UPDATE orders

        const res = await request(app)
            .patch('/api/tasks/5/complete-delivery')
            .set('Authorization', `Bearer ${tokenManager()}`);

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('Completed');
    });

    it('tolak (409) — peringkat sebelum Delivery belum selesai (gerbang peringkat)', async () => {
        db.query
            .mockResolvedValueOnce([[{ status: 'Pending', task_type: 'Delivery', order_id: 3, delivery_type: 'External' }]])
            .mockResolvedValueOnce([[
                { id: 1, task_type: 'Printing', status: 'Submitted' },
                { id: 5, task_type: 'Delivery', status: 'Pending' },
            ]]);

        const res = await request(app)
            .patch('/api/tasks/5/complete-delivery')
            .set('Authorization', `Bearer ${tokenManager()}`);

        expect(res.status).toBe(409);
        expect(res.body.error).toMatch(/belum selesai/);
    });

    it('tolak (409) — bukan Delivery external (penghantaran Internal oleh staf)', async () => {
        db.query.mockResolvedValueOnce([[{ status: 'Pending', task_type: 'Delivery', order_id: 3, delivery_type: 'internal' }]]);

        const res = await request(app)
            .patch('/api/tasks/5/complete-delivery')
            .set('Authorization', `Bearer ${tokenManager()}`);

        expect(res.status).toBe(409);
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

    // PUT kini memanggil validateAssignment dahulu (kemahiran + gerbang peringkat +
    // Delivery external) sebelum semakan cuti — 2 kueri tambahan di hadapan;
    // dan syncOrderStatus selepas UPDATE (status order automatik).
    const mockGateOk = () => {
        db.query
            .mockResolvedValueOnce([[{ task_type: 'Design', order_id: 1, delivery_type: 'internal' }]]) // validate: task+order
            .mockResolvedValueOnce([[{ full_name: 'Ali', job_title: 'Designer' }]]);                    // validate: staf
    };
    const mockSyncNoChange = () => {
        db.query
            .mockResolvedValueOnce([[{ order_id: 1 }]])              // SELECT order_id selepas UPDATE
            .mockResolvedValueOnce([[{ status: 'In Progress' }]])    // sync: SELECT orders
            .mockResolvedValueOnce([[{ status: 'Pending', approval_status: 'Confirmed', assigned_staff_id: 4 }]]); // sync: tasks (kekal In Progress)
    };

    it('tolak (409) — staf bercuti PENUH sepanjang tempoh tugasan', async () => {
        mockGateOk();
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
        expect(db.query).toHaveBeenCalledTimes(4); // tiada UPDATE dilaksanakan
    });

    it('tolak (409) — gerbang peringkat: peringkat awal belum diluluskan', async () => {
        db.query
            .mockResolvedValueOnce([[{ task_type: 'Printing', order_id: 1, delivery_type: 'internal' }]])
            .mockResolvedValueOnce([[{ full_name: 'Siti', job_title: 'Operator Am' }]])
            .mockResolvedValueOnce([[{ id: 4, task_type: 'Design', status: 'Submitted' }]]); // sibling belum Completed

        const res = await request(app)
            .put('/api/tasks/5')
            .set('Authorization', `Bearer ${tokenManager()}`)
            .send({ ...bodyEdit(4), task_type: 'Printing' });

        expect(res.status).toBe(409);
        expect(res.body.error).toMatch(/belum diluluskan/);
    });

    it('berjaya (200) + medan `warning` — staf bercuti SEPARA', async () => {
        mockGateOk();
        db.query
            .mockResolvedValueOnce([[{ due_date: tarikhOffset(5) }]])          // tempoh 6 hari
            .mockResolvedValueOnce([[{                                          // cuti 2 hari sahaja
                staff_id: 4, status: 'Approved',
                start_date: tarikhOffset(0), end_date: tarikhOffset(1)
            }]])
            .mockResolvedValueOnce([{ affectedRows: 1 }]);                      // UPDATE berjaya
        mockSyncNoChange();

        const res = await request(app)
            .put('/api/tasks/5')
            .set('Authorization', `Bearer ${tokenManager()}`)
            .send(bodyEdit(4));

        expect(res.status).toBe(200);
        expect(res.body.warning).toBeDefined();
        expect(res.body.warning).toMatch(/bercuti dari/);
    });

    it('berjaya (200) tanpa warning — staf TIADA cuti', async () => {
        mockGateOk();
        db.query
            .mockResolvedValueOnce([[{ due_date: tarikhOffset(5) }]])
            .mockResolvedValueOnce([[]])                                        // tiada rekod cuti
            .mockResolvedValueOnce([{ affectedRows: 1 }]);
        mockSyncNoChange();

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

    // DELETE kini fetch order_id dahulu (kueri #1) dan panggil syncOrderStatus
    // selepas reset/padam berjaya (status order automatik).
    const mockDeleteSync = () => {
        db.query
            .mockResolvedValueOnce([[{ status: 'Pending' }]])  // sync: SELECT orders
            .mockResolvedValueOnce([[]]);                       // sync: tiada tugasan → kekal Pending
    };

    it('draf AI (Draft) → reset ke kolam belum diagih, bukan hard delete', async () => {
        db.query
            .mockResolvedValueOnce([[{ order_id: 1 }]])        // SELECT order_id
            .mockResolvedValueOnce([{ affectedRows: 1 }]);     // UPDATE Draft berjaya
        mockDeleteSync();

        const res = await request(app)
            .delete('/api/tasks/7')
            .set('Authorization', `Bearer ${tokenManager()}`);

        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/dikembalikan ke senarai belum diagih/);
        expect(db.query.mock.calls[1][0]).toMatch(/UPDATE tasks/i);
    });

    it('Confirmed + BELUM diagih → hard delete (200)', async () => {
        db.query
            .mockResolvedValueOnce([[{ order_id: 1 }]])        // SELECT order_id
            .mockResolvedValueOnce([{ affectedRows: 0 }])      // bukan Draft
            .mockResolvedValueOnce([{ affectedRows: 1 }]);     // DELETE berjaya
        mockDeleteSync();

        const res = await request(app)
            .delete('/api/tasks/7')
            .set('Authorization', `Bearer ${tokenManager()}`);

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Tugasan berjaya dipadam.');
        expect(db.query.mock.calls[2][0]).toMatch(/DELETE FROM tasks/i);
        expect(db.query.mock.calls[2][0]).toMatch(/assigned_staff_id IS NULL/i);
    });

    it('SUDAH diagih staf → 404 dengan mesej jelas', async () => {
        db.query
            .mockResolvedValueOnce([[{ order_id: 1 }]])        // SELECT order_id
            .mockResolvedValueOnce([{ affectedRows: 0 }])      // bukan Draft
            .mockResolvedValueOnce([{ affectedRows: 0 }]);     // DELETE tak jumpa (sudah diagih)

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

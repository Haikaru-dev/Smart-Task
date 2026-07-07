'use strict';
// Ujian domain Staf (F6, UC-02, UC-10 — isu §12 #5)
const request = require('supertest');
const bcrypt  = require('bcrypt');
const fs      = require('fs');
const path    = require('path');

jest.mock('../db');
const db = require('../db');

jest.mock('@google/generative-ai', () => ({
    GoogleGenerativeAI: jest.fn(() => ({ getGenerativeModel: jest.fn() }))
}));

const app = require('../server');
const { tokenManager, tokenStaff, mockConnection, tarikhOffset } = require('./helpers');

// Bait minimum JPEG (fileFilter hanya semak mimetype, kandungan tak penting)
const JPG_PALSU = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);

// ID staf tinggi sengaja dipilih supaya fail ujian di uploads/staff/ tidak
// berlanggar dengan fail gambar profil sebenar — dibersihkan dalam afterAll
const ID_STAF_SENDIRI = 99998;
const ID_STAF_LAIN    = 99997;
const ID_STAF_MANAGER = 99996;

afterAll(() => {
    const dir = path.join(__dirname, '..', 'uploads', 'staff');
    if (!fs.existsSync(dir)) return;
    for (const f of fs.readdirSync(dir)) {
        if (/^staff-999(96|97|98)-/.test(f)) fs.unlinkSync(path.join(dir, f));
    }
});

beforeEach(() => {
    jest.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/staff — tambah staf baharu (UC-02)', () => {

    it('berjaya (201) — akaun users + rekod staff dicipta dalam transaksi', async () => {
        const conn = mockConnection();
        conn.query
            .mockResolvedValueOnce([[{ username: 'designer03' }]]) // SELECT username sedia ada
            .mockResolvedValueOnce([{ insertId: 88 }])             // INSERT users
            .mockResolvedValueOnce([{ insertId: 12 }]);            // INSERT staff
        db.getConnection.mockResolvedValue(conn);

        const res = await request(app)
            .post('/api/staff')
            .set('Authorization', `Bearer ${tokenManager()}`)
            .send({ name: 'Aiman Ujian', role: 'Designer' });

        expect(res.status).toBe(201);
        expect(res.body.staffId).toBe(12);
        expect(res.body.username).toBe('designer04'); // nombor berturutan selepas designer03
        expect(conn.commit).toHaveBeenCalledTimes(1);
    });

    it('tolak (403) jika peranan Staff', async () => {
        const res = await request(app)
            .post('/api/staff')
            .set('Authorization', `Bearer ${tokenStaff()}`)
            .send({ name: 'Aiman Ujian', role: 'Designer' });

        expect(res.status).toBe(403);
        expect(db.getConnection).not.toHaveBeenCalled();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('PUT /api/staff/:id — kemaskini nama + jawatan (UC-02)', () => {

    it('berjaya (200) sebagai Manager', async () => {
        db.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

        const res = await request(app)
            .put('/api/staff/5')
            .set('Authorization', `Bearer ${tokenManager()}`)
            .send({ name: 'Nama Baharu', role: 'Operator Am' });

        expect(res.status).toBe(200);
        expect(db.query.mock.calls[0][1]).toEqual(['Nama Baharu', 'Operator Am', '5']);
    });

    it('tolak (403) jika peranan Staff', async () => {
        const res = await request(app)
            .put('/api/staff/5')
            .set('Authorization', `Bearer ${tokenStaff()}`)
            .send({ name: 'Nama Baharu', role: 'Operator Am' });

        expect(res.status).toBe(403);
        expect(db.query).not.toHaveBeenCalled();
    });

    it('tolak (400) jika nama/jawatan kosong', async () => {
        const res = await request(app)
            .put('/api/staff/5')
            .set('Authorization', `Bearer ${tokenManager()}`)
            .send({ name: '', role: '' });

        expect(res.status).toBe(400);
        expect(db.query).not.toHaveBeenCalled();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('DELETE /api/staff/:id — padam staf (UC-02)', () => {

    it('berjaya (200) — Manager padam staf LAIN tiada tugasan aktif (users + staff dipadam)', async () => {
        const conn = mockConnection();
        conn.query
            .mockResolvedValueOnce([[{ user_id: 99, job_title: 'Designer' }]]) // SELECT user_id/job_title
            .mockResolvedValueOnce([[]])                 // SELECT openTasks — tiada tugasan aktif
            .mockResolvedValueOnce([{}])                 // DELETE users
            .mockResolvedValueOnce([{}]);                // DELETE staff
        db.getConnection.mockResolvedValue(conn);

        const res = await request(app)
            .delete('/api/staff/5')
            .set('Authorization', `Bearer ${tokenManager()}`);

        expect(res.status).toBe(200);
        expect(res.body.reassigned).toBe(0);
        expect(res.body.unassigned).toBe(0);
        expect(conn.commit).toHaveBeenCalledTimes(1);
        expect(conn.query.mock.calls[2][0]).toMatch(/DELETE FROM users/i);
        expect(conn.query.mock.calls[3][0]).toMatch(/DELETE FROM staff/i);
    });

    it('berjaya (200) — tugasan Pending/In Progress diagih semula ke staf sama job_title (Round-Robin + skip cuti)', async () => {
        const conn = mockConnection();
        conn.query
            .mockResolvedValueOnce([[{ user_id: 99, job_title: 'Designer' }]]) // SELECT user_id/job_title
            .mockResolvedValueOnce([[                                          // SELECT openTasks
                { id: 501, due_date: tarikhOffset(5) },
                { id: 502, due_date: tarikhOffset(5) },
            ]])
            .mockResolvedValueOnce([[{ id: 10 }, { id: 11 }]])                 // SELECT pool (Designer Aktif)
            .mockResolvedValueOnce([[                                         // SELECT leaveRows — staf 10 bercuti penuh
                { staff_id: 10, start_date: tarikhOffset(-1), end_date: tarikhOffset(10), status: 'Approved' },
            ]])
            .mockResolvedValueOnce([{}])   // UPDATE tasks (task 501 -> staf 11, skip staf 10 bercuti)
            .mockResolvedValueOnce([{}])   // UPDATE tasks (task 502 -> staf 11, kursor pusing semula)
            .mockResolvedValueOnce([{}])   // DELETE users
            .mockResolvedValueOnce([{}]);  // DELETE staff
        db.getConnection.mockResolvedValue(conn);

        const res = await request(app)
            .delete('/api/staff/5')
            .set('Authorization', `Bearer ${tokenManager()}`);

        expect(res.status).toBe(200);
        expect(res.body.reassigned).toBe(2);
        expect(res.body.unassigned).toBe(0);
        // Kedua-dua tugasan diagih ke staf 11 (staf 10 diskip kerana bercuti penuh)
        expect(conn.query.mock.calls[4][0]).toMatch(/UPDATE tasks SET assigned_staff_id/i);
        expect(conn.query.mock.calls[4][1]).toEqual([11, 501]);
        expect(conn.query.mock.calls[5][1]).toEqual([11, 502]);
        expect(conn.commit).toHaveBeenCalledTimes(1);
    });

    it('berjaya (200) — pool staf sama job_title KOSONG, tugasan dibiarkan (FK SET NULL uruskan)', async () => {
        const conn = mockConnection();
        conn.query
            .mockResolvedValueOnce([[{ user_id: 99, job_title: 'Designer' }]]) // SELECT user_id/job_title
            .mockResolvedValueOnce([[{ id: 501, due_date: tarikhOffset(5) }]]) // SELECT openTasks
            .mockResolvedValueOnce([[]])                                      // SELECT pool — tiada staf lain
            .mockResolvedValueOnce([[]])                                      // SELECT leaveRows
            .mockResolvedValueOnce([{}])                                      // DELETE users
            .mockResolvedValueOnce([{}]);                                     // DELETE staff
        db.getConnection.mockResolvedValue(conn);

        const res = await request(app)
            .delete('/api/staff/5')
            .set('Authorization', `Bearer ${tokenManager()}`);

        expect(res.status).toBe(200);
        expect(res.body.reassigned).toBe(0);
        expect(res.body.unassigned).toBe(1);
        // Tiada UPDATE tasks dilaksanakan — terus ke DELETE users
        expect(conn.query.mock.calls[4][0]).toMatch(/DELETE FROM users/i);
        expect(conn.commit).toHaveBeenCalledTimes(1);
    });

    it('sekat (400) jika Manager cuba padam akaun SENDIRI', async () => {
        const conn = mockConnection();
        // user_id staf = userId dalam token Manager (1) → mesti disekat
        conn.query.mockResolvedValueOnce([[{ user_id: 1, job_title: 'Designer' }]]);
        db.getConnection.mockResolvedValue(conn);

        const res = await request(app)
            .delete('/api/staff/5')
            .set('Authorization', `Bearer ${tokenManager()}`);

        expect(res.status).toBe(400);
        expect(res.body.error).toBe(
            'Tidak boleh memadam akaun kakitangan yang dipautkan kepada akaun anda sendiri.'
        );
        expect(conn.rollback).toHaveBeenCalledTimes(1);
        expect(conn.commit).not.toHaveBeenCalled();
        // Tiada query lanjut dilaksanakan — hanya SELECT awal
        expect(conn.query).toHaveBeenCalledTimes(1);
    });

    it('tolak (404) jika staf tidak wujud', async () => {
        const conn = mockConnection();
        conn.query.mockResolvedValueOnce([[]]); // SELECT user_id/job_title — tiada baris
        db.getConnection.mockResolvedValue(conn);

        const res = await request(app)
            .delete('/api/staff/9999')
            .set('Authorization', `Bearer ${tokenManager()}`);

        expect(res.status).toBe(404);
        expect(res.body.error).toBe('Staf tidak dijumpai.');
        expect(conn.rollback).toHaveBeenCalledTimes(1);
        expect(conn.commit).not.toHaveBeenCalled();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/staff/:id/profile-picture — gambar profil (isu #5)', () => {

    it('berjaya (200) — staf muat naik gambar SENDIRI', async () => {
        db.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

        const res = await request(app)
            .post(`/api/staff/${ID_STAF_SENDIRI}/profile-picture`)
            .set('Authorization', `Bearer ${tokenStaff({ staffId: ID_STAF_SENDIRI })}`)
            .attach('photo', JPG_PALSU, 'gambar.jpg');

        expect(res.status).toBe(200);
        expect(res.body.profile_picture_url).toMatch(
            new RegExp(`^/uploads/staff/staff-${ID_STAF_SENDIRI}-\\d+\\.jpg$`)
        );
    });

    it('tolak (403) — staf cuba muat naik untuk staf LAIN', async () => {
        const res = await request(app)
            .post(`/api/staff/${ID_STAF_LAIN}/profile-picture`)
            .set('Authorization', `Bearer ${tokenStaff({ staffId: ID_STAF_SENDIRI })}`)
            .attach('photo', JPG_PALSU, 'gambar.jpg');

        expect(res.status).toBe(403);
        expect(db.query).not.toHaveBeenCalled();
    });

    it('berjaya (200) — Manager muat naik untuk mana-mana staf', async () => {
        db.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

        const res = await request(app)
            .post(`/api/staff/${ID_STAF_MANAGER}/profile-picture`)
            .set('Authorization', `Bearer ${tokenManager()}`)
            .attach('photo', JPG_PALSU, 'gambar.jpg');

        expect(res.status).toBe(200);
    });

    it('tolak (400) — fail bukan JPG/PNG', async () => {
        const res = await request(app)
            .post(`/api/staff/${ID_STAF_SENDIRI}/profile-picture`)
            .set('Authorization', `Bearer ${tokenStaff({ staffId: ID_STAF_SENDIRI })}`)
            .attach('photo', Buffer.from('bukan gambar'), 'nota.txt');

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/Hanya JPG dan PNG/);
        expect(db.query).not.toHaveBeenCalled();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/staff/:id — profil staf, semakan pemilikan (isu IDOR #A)', () => {

    it('tolak (403) — staf cuba lihat profil staf LAIN', async () => {
        const res = await request(app)
            .get('/api/staff/9')
            .set('Authorization', `Bearer ${tokenStaff()}`);  // staffId = 4

        expect(res.status).toBe(403);
        expect(db.query).not.toHaveBeenCalled();
    });

    it('berjaya (200) — staf lihat profil SENDIRI', async () => {
        db.query.mockResolvedValueOnce([[{ id: 4, name: 'Nurul Aina', role: 'Designer' }]]);

        const res = await request(app)
            .get('/api/staff/4')
            .set('Authorization', `Bearer ${tokenStaff()}`);

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(4);
    });

    it('berjaya (200) — Manager lihat profil MANA-MANA staf', async () => {
        db.query.mockResolvedValueOnce([[{ id: 9, name: 'Staf Lain', role: 'Finishing' }]]);

        const res = await request(app)
            .get('/api/staff/9')
            .set('Authorization', `Bearer ${tokenManager()}`);

        expect(res.status).toBe(200);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('PUT /api/staff/update-profile/:id — semakan pemilikan (isu IDOR #A, WRITE)', () => {

    it('tolak (403) — staf cuba ubah emel/telefon staf LAIN', async () => {
        const res = await request(app)
            .put('/api/staff/update-profile/9')
            .set('Authorization', `Bearer ${tokenStaff()}`)   // staffId = 4
            .send({ email: 'jahat@contoh.com', phone: '0100000000' });

        expect(res.status).toBe(403);
        expect(db.query).not.toHaveBeenCalled();
    });

    it('berjaya (200) — staf kemaskini profil SENDIRI', async () => {
        db.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

        const res = await request(app)
            .put('/api/staff/update-profile/4')
            .set('Authorization', `Bearer ${tokenStaff()}`)
            .send({ email: 'saya@contoh.com', phone: '0111111111' });

        expect(res.status).toBe(200);
        expect(db.query.mock.calls[0][1]).toEqual(['saya@contoh.com', '0111111111', '4']);
    });

    it('berjaya (200) — Manager kemaskini profil MANA-MANA staf', async () => {
        db.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

        const res = await request(app)
            .put('/api/staff/update-profile/9')
            .set('Authorization', `Bearer ${tokenManager()}`)
            .send({ email: 'admin.ubah@contoh.com', phone: '0122222222' });

        expect(res.status).toBe(200);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('PUT /api/staff/change-password/:userId — tukar kata laluan (F6.2)', () => {

    it('berjaya (200) dengan kata laluan semasa yang betul', async () => {
        const hashLama = await bcrypt.hash('lama123', 10);
        db.query
            .mockResolvedValueOnce([[{ password: hashLama }]])  // SELECT password
            .mockResolvedValueOnce([{ affectedRows: 1 }]);      // UPDATE password

        const res = await request(app)
            .put('/api/staff/change-password/7')
            .set('Authorization', `Bearer ${tokenStaff()}`)
            .send({ currentPassword: 'lama123', newPassword: 'baru456' });

        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/berjaya/i);
        // Kata laluan baharu MESTI di-hash (bukan plain text) sebelum UPDATE
        const paramUpdate = db.query.mock.calls[1][1][0];
        expect(paramUpdate).not.toBe('baru456');
        expect(await bcrypt.compare('baru456', paramUpdate)).toBe(true);
    });
});

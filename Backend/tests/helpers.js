'use strict';
// Utiliti kongsi untuk semua fail ujian — token JWT palsu + mock connection pool.
// Fail ini TIDAK berakhir dengan .test.js, jadi jest tidak menganggapnya sut ujian.
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'smarttask_dev_secret_TUKAR_DI_PRODUKSI';

// Token Manager sah (userId 1, tiada staffId — sama seperti akaun admin sebenar)
function tokenManager(overrides = {}) {
    return jwt.sign(
        { userId: 1, role: 'Manager', staffId: null, ...overrides },
        JWT_SECRET,
        { expiresIn: '1h' }
    );
}

// Token Staff sah (userId 7 → staff.id 4, selari dengan stub login.test.js)
function tokenStaff(overrides = {}) {
    return jwt.sign(
        { userId: 7, role: 'Staff', staffId: 4, ...overrides },
        JWT_SECRET,
        { expiresIn: '1h' }
    );
}

// Mock connection untuk route bertransaksi (db.getConnection())
function mockConnection() {
    return {
        beginTransaction: jest.fn().mockResolvedValue(undefined),
        query:            jest.fn(),
        commit:           jest.fn().mockResolvedValue(undefined),
        rollback:         jest.fn().mockResolvedValue(undefined),
        release:          jest.fn()
    };
}

// Tarikh relatif hari ini dalam format YYYY-MM-DD (untuk ujian konflik cuti)
function tarikhOffset(hari) {
    const t = new Date();
    t.setDate(t.getDate() + hari);
    return t.toISOString().slice(0, 10);
}

module.exports = { JWT_SECRET, tokenManager, tokenStaff, mockConnection, tarikhOffset };

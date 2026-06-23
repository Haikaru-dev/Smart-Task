// seed.js — Cipta akaun pengguna pertama dengan bcrypt hash
// Jalankan SEKALI selepas schema.sql:   node Backend/seed.js
'use strict';
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const bcrypt = require('bcrypt');
const db = require('./db');

const ACCOUNTS = [
    { username: 'admin',       password: 'Admin@1234',  role: 'Manager', name: 'Admin SmartTask',  email: 'admin@shdesign.com',   staffName: null },
    { username: 'ahmad.ali',   password: 'Staff@1234',  role: 'Staff',   name: 'Ahmad Ali',         email: 'ahmad@shdesign.com',   staffName: 'Ahmad Ali' },
    { username: 'siti.rahmah', password: 'Staff@1234',  role: 'Staff',   name: 'Siti Rahmah',       email: 'siti@shdesign.com',    staffName: 'Siti Rahmah' },
    { username: 'farid',       password: 'Staff@1234',  role: 'Staff',   name: 'Farid Hassan',      email: 'farid@shdesign.com',   staffName: 'Farid Hassan' },
    { username: 'nurul.ain',   password: 'Staff@1234',  role: 'Staff',   name: 'Nurul Ain',         email: 'nurul@shdesign.com',   staffName: 'Nurul Ain' },
    { username: 'halimah',     password: 'Staff@1234',  role: 'Staff',   name: 'Halimah Yusof',     email: 'halimah@shdesign.com', staffName: 'Halimah Yusof' },
];

async function seed() {
    console.log('SmartTask DB Seeder — mula...\n');
    try {
        for (const acct of ACCOUNTS) {
            const hash = await bcrypt.hash(acct.password, 10);
            const [result] = await db.query(
                `INSERT IGNORE INTO users (username, password, role, name, email) VALUES (?, ?, ?, ?, ?)`,
                [acct.username, hash, acct.role, acct.name, acct.email]
            );
            if (result.affectedRows > 0) {
                console.log(`✓ Dicipta: ${acct.role.padEnd(7)} | ${acct.username.padEnd(12)} | ${acct.password}`);
                if (acct.staffName) {
                    const [[user]] = await db.query(`SELECT id FROM users WHERE username = ?`, [acct.username]);
                    await db.query(`UPDATE staff SET user_id = ? WHERE full_name = ? LIMIT 1`, [user.id, acct.staffName]);
                    console.log(`  → Dikaitkan dengan rekod staf: "${acct.staffName}"`);
                }
            } else {
                console.log(`⚠ Skip (sudah wujud): ${acct.username}`);
            }
        }
        console.log('\nSeeder selesai. Akaun sedia untuk digunakan.');
    } catch (err) {
        console.error('\nRalat seeder:', err.message);
        console.error('Pastikan DB "smarttask_db" sudah dibuat dan schema.sql sudah dijalankan.');
    } finally {
        process.exit(0);
    }
}

seed();

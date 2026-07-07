'use strict';
// Jalankan query SQL ad-hoc terhadap DB sebenar melalui pool sedia ada (db.js),
// supaya kredential & logik sambungan sentiasa konsisten dengan server.js.
//
// Penggunaan:
//   node scripts/db-query.js "SELECT * FROM staff LIMIT 5"
//   node scripts/db-query.js --allow-write "UPDATE ..."   (perlu kelulusan eksplisit dahulu)

const db = require('../db');

const DESTRUCTIVE_PATTERN = /^\s*(DROP|DELETE|ALTER|TRUNCATE)\b/i;

async function main() {
    const args = process.argv.slice(2);
    const allowWrite = args.includes('--allow-write');
    const query = args.filter((a) => a !== '--allow-write').join(' ').trim();

    if (!query) {
        console.error('Penggunaan: node scripts/db-query.js "SELECT * FROM staff LIMIT 5"');
        console.error('Untuk DROP/DELETE/ALTER/TRUNCATE, tambah --allow-write selepas kelulusan eksplisit.');
        process.exitCode = 1;
        return;
    }

    if (DESTRUCTIVE_PATTERN.test(query) && !allowWrite) {
        console.error(`Diblok: query ini kelihatan seperti DROP/DELETE/ALTER/TRUNCATE.`);
        console.error('Dapatkan kelulusan eksplisit daripada pemilik data dahulu, kemudian jalankan semula dengan --allow-write.');
        process.exitCode = 1;
        return;
    }

    try {
        const [rows] = await db.query(query);
        console.log(JSON.stringify(rows, null, 2));
    } catch (err) {
        console.error('Ralat query:', err.message);
        process.exitCode = 1;
    } finally {
        await db.end();
    }
}

main();

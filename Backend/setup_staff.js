const mysql = require('mysql2/promise');

async function createStaffTable() {
    const db = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'smarttask_db'
    });

    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS Staff (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                role VARCHAR(100) NOT NULL,
                status ENUM('Aktif', 'Cuti') DEFAULT 'Aktif',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("Jadual Staff berjaya dicipta atau sudah wujud.");
    } catch (e) {
        console.error("Ralat:", e);
    } finally {
        await db.end();
    }
}
createStaffTable();

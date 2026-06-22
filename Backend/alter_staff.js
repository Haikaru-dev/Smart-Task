const mysql = require('mysql2/promise');
(async () => {
    const db = await mysql.createConnection({host:'localhost', user:'root', database:'smarttask_db'});
    try {
        await db.query("ALTER TABLE Staff MODIFY user_id INT(11) NULL;");
        try {
            await db.query("ALTER TABLE Staff ADD COLUMN status ENUM('Aktif', 'Cuti') DEFAULT 'Aktif';");
        } catch(e) {
            // ignore if column already exists
        }
        console.log("Berjaya ubah suai jadual Staff");
    } catch(e) {
        console.error(e.message);
    }
    db.end();
})();

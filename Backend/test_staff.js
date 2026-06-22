const mysql = require('mysql2/promise');
(async () => {
    const db = await mysql.createConnection({host:'localhost', user:'root', database:'smarttask_db'});
    try {
        const [rows] = await db.query('SELECT * FROM Staff ORDER BY name ASC');
        console.log(rows);
    } catch(e) {
        console.error(e.message);
    }
    db.end();
})();

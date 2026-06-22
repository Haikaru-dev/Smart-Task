const mysql = require('mysql2/promise');
(async () => {
    const db = await mysql.createConnection({host:'localhost', user:'root', database:'smarttask_db'});
    const [rows] = await db.query('DESCRIBE Staff');
    console.log(rows);
    db.end();
})();

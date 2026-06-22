const mysql = require('mysql2/promise');
(async () => {
    const db = await mysql.createConnection({host:'localhost', user:'root', database:'smarttask_db'});
    const [rows] = await db.query('SELECT * FROM Staff');
    console.log("Total rows:", rows.length);
    db.end();
})();

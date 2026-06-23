'use strict';
// db.js memuatkan dotenv sendiri supaya pemboleh ubah persekitaran tersedia
// walaupun db.js di-require sebelum dotenv.config() dipanggil dalam server.js
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mysql = require('mysql2');

const db = mysql.createPool({
    host:              process.env.DB_HOST     || 'localhost',
    user:              process.env.DB_USER     || 'root',
    password:          process.env.DB_PASSWORD || '',
    database:          process.env.DB_NAME     || 'smarttask_db',
    waitForConnections: true,
    connectionLimit:   10,
    queueLimit:        0
});

db.getConnection((err, connection) => {
    if (err) {
        console.error('Ralat sambungan pangkalan data:', err.message);
    } else {
        console.log(`Berjaya disambungkan ke pangkalan data ${process.env.DB_NAME || 'smarttask_db'}!`);
        connection.release();
    }
});

module.exports = db.promise();

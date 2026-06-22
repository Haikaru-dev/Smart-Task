const mysql = require('mysql2');

// Konfigurasi sambungan pangkalan data ke XAMPP lokal
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'smarttask_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Semak sambungan
db.getConnection((err, connection) => {
    if (err) {
        console.error('Ralat sambungan pangkalan data:', err.message);
    } else {
        console.log('Berjaya disambungkan ke pangkalan data smarttask_db!');
        connection.release(); // Lepaskan sambungan semula ke pool
    }
});

// Eksport sebagai promise supaya boleh guna async/await di server.js
module.exports = db.promise();

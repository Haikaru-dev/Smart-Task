const mysql = require('mysql2');
const bcrypt = require('bcrypt');

// Sambungan ke pangkalan data MySQL
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'smarttask_db'
});

const kemaskiniKataLaluan = async () => {
    try {
        // 1. Sulitkan (Hash) kata laluan baharu mengikut format anda
        const hashAdmin = await bcrypt.hash('Admin@12', 10);
        const hashDesigner = await bcrypt.hash('Desgn!34', 10);
        const hashOperator = await bcrypt.hash('Cetak#56', 10);

        // 2. Kemas kini di dalam pangkalan data
        db.query(`UPDATE Users SET password = ? WHERE username = 'admin01'`, [hashAdmin]);
        db.query(`UPDATE Users SET password = ? WHERE username = 'designer01'`, [hashDesigner]);
        db.query(`UPDATE Users SET password = ? WHERE username = 'operator01'`, [hashOperator], (err) => {
            if (err) {
                console.error("Ralat pangkalan data:", err);
                return;
            }
            console.log("✅ Berjaya! Semua kata laluan telah dikemas kini dan disulitkan (hashed).");
            console.log("1. admin01 -> Admin@12");
            console.log("2. designer01 -> Desgn!34");
            console.log("3. operator01 -> Cetak#56");
            process.exit();
        });
    } catch (error) {
        console.error("Ralat berlaku:", error);
    }
};

kemaskiniKataLaluan();
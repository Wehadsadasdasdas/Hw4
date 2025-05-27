// Import necessary modules
const express = require('express'); // Express.js framework for building web applications
const sqlite3 = require('sqlite3').verbose(); // SQLite3 for database interaction, verbose mode for detailed logs
const cors = require('cors'); // This is already in your code, assuming you'll use it for front-end access later.
const https = require('https'); // Node.js built-in module for making HTTPS requests

// Initialize the Express application
const app = express();
const port = 3000; // Port for the Express server to listen on

app.use(cors());


// Define the path for the SQLite database file
const DB_PATH = './duck_egg_prices.db';

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

// Route to fetch all data from the 'duck_egg_prices' table
app.get('/prices', (req, res) => {
    const specificDate = req.query.date; // Get the 'date' query parameter from the URL

    let query;
    let params = [];

    if (specificDate) {
        query = `SELECT * FROM duck_egg_prices WHERE 日期 = ?`;
        params = [specificDate];
        console.log(`Searching for date: ${specificDate}`);
    } else {
        query = `SELECT * FROM duck_egg_prices ORDER BY 日期 ASC`;
        console.log('Fetching all prices data.');
    }

    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (rows.length === 0 && specificDate) {
            res.status(404).json({
                message: `No data found for date: ${specificDate}`,
                data: []
            });
        } else {
            res.json({
                message: "成功",
                data: rows
            });
        }
    });
});

// New route to manually trigger data insertion
app.get('/fetch-and-insert', (req, res) => {
    fetchAndInsertData(); // Call the function to fetch and insert data
    res.send('<h1>資料抓取與插入已觸發！</h1><p>請檢查控制台輸出以獲取詳細資訊。</p><p>請訪問 <a href="/prices">/prices</a> 查看更新後的資料。</p>');
});

// Start the Express server
app.listen(port, () => {
    console.log(`伺服器運行於 http://localhost:${port}`);
    console.log('在瀏覽器中開啟 http://localhost:3000 以查看訊息。');
});

// Graceful shutdown for the database connection
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('關閉資料庫時發生錯誤:', err.message);
        } else {
            console.log('資料庫連接已關閉。');
        }
        process.exit(0);
    });
});
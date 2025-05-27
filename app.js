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

/**
 * Fetches data from the external URL and then inserts it into the database.
 */
function fetchAndInsertData() {
    console.log('Fetching data from external URL...');
    https.get(DATA_URL, (res) => {
        let data = '';

        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            try {
                const parsedData = JSON.parse(data);
                // Filter and transform data to only include '日期' and '鴨蛋(新蛋)(台南)'
                const relevantData = parsedData.map(item => ({
                    "日期": item["日期"],
                    "鴨蛋(新蛋)(台南)": parseFloat(item["鴨蛋(新蛋)(台南)"]) // Ensure it's a number
                })).filter(item => item["日期"] && item["鴨蛋(新蛋)(台南)"] !== undefined && !isNaN(item["鴨蛋(新蛋)(台南)"]));

                if (relevantData.length > 0) {
                    insertDataIntoDB(relevantData);
                } else {
                    console.log('No relevant data found in the fetched response.');
                }
            } catch (jsonParseError) {
                console.error('Error parsing JSON from external URL:', jsonParseError.message);
            }
        });

    }).on('error', (fetchErr) => {
        console.error('Error fetching data from external URL:', fetchErr.message);
    });
}

function insertDataIntoDB(dataToInsert) {
    const INSERT_SQL = `INSERT OR IGNORE INTO duck_egg_prices ("日期", "鴨蛋(新蛋)(台南)") VALUES (?, ?)`;

    db.serialize(() => {
        dataToInsert.forEach(item => {
            db.run(INSERT_SQL, [item["日期"], item["鴨蛋(新蛋)(台南)"]], function(insertErr) {
                if (insertErr) {
                    console.error(`Error inserting data for ${item["日期"]}:`, insertErr.message);
                } else if (this.changes > 0) {
                    console.log(`Inserted row with 日期: ${item["日期"]}`);
                } else {
                    console.log(`Row with 日期: ${item["日期"]} already exists, skipped insertion.`);
                }
            });
        });
        console.log('Data insertion process completed.');
    });
}

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

// Add this route to your Express app
app.post('/add-price', express.json(), (req, res) => {
    const { "日期": date, "鴨蛋(新蛋)(台南)": price } = req.body;

    if (!date || price === undefined) {
        return res.status(400).json({ error: "Missing '日期' or '鴨蛋(新蛋)(台南)' in request body." });
    }

    const INSERT_SQL = `INSERT OR IGNORE INTO duck_egg_prices ("日期", "鴨蛋(新蛋)(台南)") VALUES (?, ?)`;

    db.run(INSERT_SQL, [date, price], function(err) {
        if (err) {
            console.error('Error inserting manual data:', err.message);
            return res.status(500).json({ error: err.message });
        }
        if (this.changes > 0) {
            res.status(201).json({ message: "價格資料已成功添加/更新", data: { date, price, id: this.lastID } });
        } else {
            res.status(200).json({ message: "該日期資料已存在，未進行新插入。", data: { date, price } });
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
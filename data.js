// Import necessary modules
const express = require('express'); // Express.js framework for building web applications
const sqlite3 = require('sqlite3').verbose(); // SQLite3 for database interaction, verbose mode for detailed logs
const cors = require('cors'); // This is already in your code, assuming you'll use it for front-end access later.
const https = require('https'); // Node.js built-in module for making HTTPS requests

// Initialize the Express application
const app = express();
const port = 3000; // Port for the Express server to listen on

// Define the path for the SQLite database file
const DB_PATH = './duck_egg_prices.db';
// Define the URL for the external data
const DATA_URL = 'https://data.moa.gov.tw/Service/OpenData/FromM/PoultryTransGooseDuckData.aspx?IsTransData=1&UnitId=058';

// SQL statement to create the 'duck_egg_prices' table
const CREATE_TABLE_SQL = `
CREATE TABLE duck_egg_prices (
    日期 TEXT PRIMARY KEY,
    "鴨蛋(新蛋)(台南)" REAL NOT NULL
);
`;

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        db.run(CREATE_TABLE_SQL, (createErr) => {
            if (createErr) {
                console.warn('Table creation warning (may already exist):', createErr.message);
            } else {
                console.log('Table "duck_egg_prices" created or already exists.');
            }
            // After ensuring the table exists, fetch and insert the initial data
            fetchAndInsertData();
        });
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

/**
 * Inserts the provided array of data into the 'duck_egg_prices' table.
 * Uses a serialized transaction for efficient multiple insertions.
 * @param {Array<Object>} dataToInsert - An array of objects with "日期" and "鴨蛋(新蛋)(台南)" properties.
 */
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


// db/build.js - Script to create/reset the database schema

const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "..", "database.db"); // Path to your main database file
const SCHEMA_PATH = path.join(__dirname, "schema.sql"); // Path to your SQL schema file

// Delete existing database file if it exists
if (fs.existsSync(DB_PATH)) {
  fs.unlinkSync(DB_PATH);
  console.log(`Deleted existing database: ${DB_PATH}`);
}

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("Error connecting to database for build:", err.message);
  } else {
    console.log("Connected to new/empty SQLite database for build.");
    // Read the SQL schema file
    const schema = fs.readFileSync(SCHEMA_PATH, "utf8");

    // Run the SQL commands
    db.exec(schema, (err) => {
      if (err) {
        console.error("Error executing schema SQL:", err.message);
      } else {
        console.log("Database schema built successfully.");
      }
      db.close(); // Close the database connection after schema creation
    });
  }
});
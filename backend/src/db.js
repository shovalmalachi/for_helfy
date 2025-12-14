const mysql = require("mysql2/promise");

async function makePool() {
  return mysql.createPool({
    host: process.env.DB_HOST || "tidb",
    port: Number(process.env.DB_PORT || 4000),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "appdb",
    waitForConnections: true,
    connectionLimit: 10,
  });
}

module.exports = { makePool };


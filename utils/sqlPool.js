const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_USER,
  port: process.env.SQL_PORT,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
});

module.exports = pool;

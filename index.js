/**
 * ===============================
 *   TAPDESK CLEAN BACKEND SERVER
 * ===============================
 */

require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mysql = require("mysql2");
const dotenv = require("dotenv");


// ---------------------------
// Load correct env file based on argument
// ---------------------------
const environment = process.argv[2] || "development";

const envFile =
  environment === "production" ? ".env.prod" :
  environment === "swipeproduction" ? ".env.prodswipe" :
  environment === "uat" ? ".env.uat" :
  environment === "swipe" ? ".env.swipe" : ".env";

dotenv.config({ path: envFile });

console.log(`Environment: ${environment}`);
console.log(`Environment file loaded: ${envFile}`);
console.log(process.env.FRONTEND_URL);


// ---------------------------
// Database Connections
// ---------------------------
const connectDB = require("./utils/connectDB");
const connectOldDB = require("./utils/connectOldDB");


// ---------------------------
// MySQL Connection (Now moved to .env)
// ---------------------------
const db = mysql.createConnection({
  host: process.env.SQL_HOST,
  port: process.env.SQL_PORT,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DATABASE,
});

// Check MySQL Connection
db.connect((err) => {
  if (err) {
    console.error("❌ MySQL connection failed:", err.stack);
    return;
  }
  console.log("✅ Connected to MySQL as ID", db.threadId);
});


// ---------------------------
// Express App Setup
// ---------------------------
const app = express();

const allowedOrigins = [
  "http://localhost:3000",
  "https://tapdesk.biz",
  "https://tapdesk-frontend.vercel.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS blocked: " + origin));
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(bodyParser.json());

app.use("/file", express.static("uploads"));


// ---------------------------
// Handlebars
// ---------------------------
const { engine } = require("express-handlebars");
app.engine("handlebars", engine());
app.set("view engine", "handlebars");
app.set("views", "./views");


// ---------------------------
// Socket.io Setup
// ---------------------------
const { setupSocket, getIo, getUserSocket } = require("./utils/socketConfig");


// ---------------------------
// Start Server + MongoDB
// ---------------------------
const PORT = process.env.PORT || 4000;

(async () => {
  try {
    await connectDB(); // connects to MongoDB
    const server = app.listen(PORT, () =>
      console.log("🚀 Server running on port", PORT)
    );
    setupSocket(server);
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
})();


// Attach io instance to all requests
app.use((req, res, next) => {
  req.io = getIo();
  next();
});


// ---------------------------
// Routes
// ---------------------------
app.use("/api", require("./routes/auth/auth"));
app.use("/api", require("./routes/account/account"));
app.use("/api", require("./routes/services/services"));
app.use("/api", require("./routes/emails/email"));
app.use("/api", require("./routes/reports/reports"));
app.use("/api", require("./routes/notification/notification"));

// Migrator Route
app.use("/api/migrate", require("./routes/migrate"));


// ---------------------------
// Root Route
// ---------------------------
app.get("/", (req, res) => {
  res.send("TERP - Tapdesk");
});


// ---------------------------
// Cron Jobs (Disabled as per your file)
// ---------------------------
// const cron = require("node-cron");
// const { fetchAndSendReport } = require("./utils/reportEmailScheduler");
// cron.schedule("30 20 * * *", fetchAndSendReport);


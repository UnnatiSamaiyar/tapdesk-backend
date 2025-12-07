/**
 * ===============================
 *       TAPDESK BACKEND API
 * ===============================
 */

const path = require("path");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");

// -------------------------------------
// Load ENV only ONCE
// -------------------------------------
const environment = process.argv[2] || "development";

const envFile =
  environment === "production" ? ".env.prod" :
  environment === "swipeproduction" ? ".env.prodswipe" :
  environment === "uat" ? ".env.uat" :
  environment === "swipe" ? ".env.swipe" :
  ".env";

dotenv.config({ path: envFile });

console.log(`Environment: ${environment}`);
console.log(`Environment file loaded: ${envFile}`);
console.log(`Frontend: ${process.env.FRONTEND_URL}`);

// -------------------------------------
// DB connectors
// -------------------------------------
const connectDB = require("./utils/connectDB");
const connectOldDB = require("./utils/connectOldDB");
// global MySQL pool (used in routes, e.g. email.js)
const pool = require("./utils/sqlPool");

// -------------------------------------
// EXPRESS SETUP
// -------------------------------------
const app = express();

const allowedOrigins = [
  "http://localhost:3000",
  "https://tapdesk.biz",
  "https://tapdesk-frontend.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("CORS blocked: " + origin));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(bodyParser.json());

app.use("/file", express.static("uploads"));

// -------------------------------------
// HANDLEBARS
// -------------------------------------
const { engine } = require("express-handlebars");
app.engine("handlebars", engine());
app.set("view engine", "handlebars");
app.set("views", "./views");

// -------------------------------------
// SOCKET.IO
// -------------------------------------
const { setupSocket, getIo } = require("./utils/socketConfig");

app.use((req, res, next) => {
  req.io = getIo();
  next();
});

// -------------------------------------
// ROUTES
// -------------------------------------
app.use("/api", require("./routes/auth/auth"));
app.use("/api", require("./routes/account/account"));
app.use("/api", require("./routes/services/services"));
app.use("/api", require("./routes/emails/email"));
app.use("/api", require("./routes/reports/reports"));
app.use("/api", require("./routes/notification/notification"));
app.use("/api/migrate", require("./routes/migrate"));

app.get("/", (req, res) => {
  res.send("TERP - Tapdesk");
});

// -------------------------------------
// START SERVER SAFELY
// -------------------------------------
const PORT = process.env.PORT || 4000;

async function startServer() {
  try {
    await connectDB();      // Main Mongo
    await connectOldDB();   // Old Mongo

    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

    setupSocket(server);
  } catch (err) {
    console.error("❌ Server startup failure:", err);
    process.exit(1);
  }
}

startServer();

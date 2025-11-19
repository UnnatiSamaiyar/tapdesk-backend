const express = require("express");
const router = express.Router();
const Account = require("../../models/Accounts");
const AccountSchema = require("../../models/Accounts").schema;
const { default: mongoose } = require("mongoose");
const multer = require("multer");
const storage = multer.memoryStorage(); // ← THIS LINE
const upload = multer({ storage });
const nodemailer = require("nodemailer");
const EmailEntry = require("../../models/Master/MasterServices");
const RateService = require("../../models/Master/RateService");
const getModel = require("../../models/Master/ModelFactory");
const mysql = require("mysql2/promise");
const connectOldDB = require("../../utils/connectOldDB");

let OldAccountModel;

router.get("/accounts", async (req, res) => {
  try {
    // Create old DB connection if not already established
    const oldDB = await connectOldDB();

    // Ensure model is initialized once
    if (!OldAccountModel) {
      OldAccountModel = oldDB.model("Account", AccountSchema);
    }

    const accounts = await OldAccountModel.find(
      {},
      {
        name: 1,
        email: 1,
        billingEmail: 1,
        salesEmail: 1,
        companyName: 1,
      }
    ).lean();

    res.status(200).json(accounts);
  } catch (error) {
    console.error("❌ Error fetching accounts from OLD DB:", error);
    res.status(500).json({ error: "Failed to fetch accounts" });
  }
});

// router.post('/upload', async (req, res) => {
//   try {
//     const entries = req.body.data;

//     if (!Array.isArray(entries) || entries.length === 0) {
//       return res.status(400).json({ message: 'No data provided' });
//     }

//     const formattedEntries = entries.map(entry => ({
//       locationName: entry['Location Name'] || null,
//       dialCode: entry['Dial Code'] || null,
//       platinumUSD: entry['Platinum $ USD'] || null,
//       status: entry['Status'] || null,
//       effectiveDate: entry['Effective Date'] || null,
//     }));

//     await EmailEntry.insertMany(formattedEntries);

//     res.status(200).json({ message: 'Data inserted successfully' });
//   } catch (err) {
//     console.error('Upload error:', err);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// });

// router.post("/upload", async (req, res) => {
//   try {
//     const entries = req.body.data;
//     const type = req.query.type;

//     if (!["premium", "cli", "noncli", "cc"].includes(type)) {
//       return res.status(400).json({ message: "Invalid type" });
//     }

//     if (!Array.isArray(entries) || entries.length === 0) {
//       return res.status(400).json({ message: "No data provided" });
//     }

//     const formattedEntries = entries.map((entry) => ({
//       locationName: entry["Location Name"] || null,
//       dialCode: entry["Dial Code"] || null,
//       platinumUSD: entry["Platinum $ USD"] || null,
//       status: entry["Status"] || null,
//       effectiveDate: entry["Effective Date"] || null,
//     }));

//     let model;
//     switch (type) {
//       case "premium":
//         model = PremiumServices;
//         break;
//       case "cli":
//         model = CliServices;
//         break;
//       case "noncli":
//         model = NonCliServices;
//         break;
//       case "cc":
//         model = CcServices;
//         break;
//     }

//     await model.insertMany(formattedEntries);

//     res
//       .status(200)
//       .json({ message: `Data inserted into ${type} successfully.` });
//   } catch (err) {
//     console.error("Upload error:", err);
//     res.status(500).json({ message: "Internal server error" });
//   }
// });

// replace the start of /get-services route with this
router.get("/get-services", async (req, res) => {
  try {
    const { page = 1, limit = 100, companyName } = req.query;
    let type = (req.query.type || "").toString().trim().toLowerCase();
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const locationFilter = req.query.locationFilter?.toLowerCase() || "";
    const dialCodeFilter = req.query.dialCodeFilter?.toLowerCase() || "";

    // If no type provided, try infer from companyName
    if (!type) {
      if (!companyName) {
        return res.status(400).json({ message: "Missing 'type' or 'companyName' parameter" });
      }
      const record = await RateManagement.findOne({ company_name: companyName.toLowerCase() }).lean();
      if (!record || !Array.isArray(record.services) || record.services.length === 0) {
        return res.status(404).json({ message: "No services found for this company" });
      }
      if (record.services.length === 1) {
        type = record.services[0]; // already full table name like 'ncli_service_beox'
      } else {
        // multiple services -> return list so frontend can choose
        return res.status(200).json({ availableServices: record.services });
      }
    }

    // if type looks like a shorthand (premium/cli/etc) convert to table name
    const fullServiceName = type.includes("_service_") ? type : type.replace(/\s+/g, "_");

    console.log("Fetching services from table:", fullServiceName);

    const connection = await pool.getConnection();
    try {
      let whereClauses = [];
      let values = [];

      if (locationFilter) {
        whereClauses.push("LOWER(locationName) LIKE ?");
        values.push(`%${locationFilter}%`);
      }

      if (dialCodeFilter) {
        whereClauses.push("LOWER(dialCode) LIKE ?");
        values.push(`%${dialCodeFilter}%`);
      }

      const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

      const [countRows] = await connection.query(
        `SELECT COUNT(*) AS total FROM \`${fullServiceName}\` ${whereSQL}`,
        values
      );
      const total = countRows[0].total;

      const [entries] = await connection.query(
        `SELECT * FROM \`${fullServiceName}\` ${whereSQL} LIMIT ? OFFSET ?`,
        [...values, parseInt(limit), skip]
      );

      res.status(200).json({
        data: entries,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
      });
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error("Pagination error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});


router.delete("/delete-services", async (req, res) => {
  try {
    const { type = "premium" } = req.query;
    const { ids, locationName } = req.body;

    const model = getModel(type);
    let result;

    if (Array.isArray(ids) && ids.length > 0) {
      result = await model.deleteMany({ _id: { $in: ids } });
    } else if (locationName) {
      result = await model.deleteMany({ locationName });
    } else if (typeof ids === "string") {
      result = await model.findByIdAndDelete(ids);
    } else {
      result = await model.deleteMany({});
    }

    res.status(200).json({
      message: "Deletion successful",
      deletedCount: result?.deletedCount || (result ? 1 : 0),
    });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/get-all-services", async (req, res) => {
  try {
    const { type = "premium" } = req.query;
    const model = getModel(type);

    const allEntries = await model.find({});
    res.status(200).json({ data: allEntries });
  } catch (err) {
    console.error("Full fetch error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/get-services-by-location", async (req, res) => {
  try {
    const { type, location } = req.query;

    if (!type || !location) {
      return res
        .status(400)
        .json({ message: "Missing 'type' or 'location' parameter" });
    }

    // ⚠️ SQL table naming convention
    const tableName = `${type}`; // Example: services_premium, services_basic

    // Safe query with placeholders
    const [rows] = await pool.query(
      `SELECT * FROM \`${tableName}\` WHERE locationName = ?`,
      [location]
    );

    res.status(200).json({ data: rows });
  } catch (err) {
    console.error("Error fetching services by location (SQL):", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

const RateManagement = require("../../models/Master/RateManagement");

const pool = mysql.createPool({
  host: "31.97.232.96",
  user: "tapuser",
  port: 3306,
  password: "Tapdesk@123",
  database: "tapdesk",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// const pool = mysql.createPool({
//   host: "localhost",
//   user: "tapuser",
//   port: 3307,
//   password: "9078",
//   database: "tapdesk",
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0,
// });

router.post("/create-service-type", async (req, res) => {
  try {
    const { serviceName, companyName } = req.body;

    if (!serviceName || !companyName) {
      return res
        .status(400)
        .json({ message: "Service and company name are required" });
    }

    // ✅ Replace spaces with underscores and lowercase the table name
    const rawServiceName = `${serviceName}_service_${companyName}`;
    const fullServiceName = rawServiceName.toLowerCase().replace(/\s+/g, "_");

    const MasterModel = mongoose.model("MasterServices");

    // ✅ Step 1: Insert service reference in MongoDB rate_managements
    await RateManagement.updateOne(
      { company_name: companyName },
      { $addToSet: { services: fullServiceName } },
      { upsert: true }
    );

    // ✅ Step 2: Respond instantly
    res.status(202).json({
      message: `Service creation started for ${companyName}`,
      table: fullServiceName,
    });

    // ✅ Step 3: Background SQL insert
    setImmediate(async () => {
      const connection = await pool.getConnection();
      console.log(`🔄 Starting SQL migration for ${fullServiceName}`);
      try {
        // create table dynamically if not exists
        await connection.query(`
          CREATE TABLE IF NOT EXISTS \`${fullServiceName}\` (
            id INT AUTO_INCREMENT PRIMARY KEY,
            locationName VARCHAR(255),
            dialCode VARCHAR(50),
            platinumUSD VARCHAR(50),
            status VARCHAR(50),
            effectiveDate VARCHAR(50),
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          )
        `);
        console.log(`✅ Table ensured: ${fullServiceName}`);

        const masterCursor = MasterModel.find({}).cursor();
        const batchSize = 500;
        let batch = [];

        for await (const doc of masterCursor) {
          batch.push([
            doc.locationName || null,
            doc.dialCode || null,
            doc.platinumUSD || null,
            doc.status || null,
            doc.effectiveDate || null,
          ]);

          if (batch.length === batchSize) {
            await connection.query(
              `INSERT INTO \`${fullServiceName}\` 
                (locationName, dialCode, platinumUSD, status, effectiveDate) 
               VALUES ?`,
              [batch]
            );
            console.log(`Inserted batch of ${batch.length}`);
            batch = [];
          }
        }

        // insert remaining docs
        if (batch.length > 0) {
          await connection.query(
            `INSERT INTO \`${fullServiceName}\` 
              (locationName, dialCode, platinumUSD, status, effectiveDate) 
             VALUES ?`,
            [batch]
          );
          console.log(`Inserted final batch of ${batch.length}`);
        }

        console.log(`✅ Service ${fullServiceName} copied successfully to SQL`);
      } catch (err) {
        console.error(`❌ Batch insert failed for ${fullServiceName}:`, err);
      } finally {
        connection.release();
      }
    });
  } catch (err) {
    console.error("❌ Route level error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/get-company-services", async (req, res) => {
  try {
    const { companyName } = req.query;

    if (!companyName) {
      return res.status(400).json({ message: "Company name is required" });
    }

    const record = await RateManagement.findOne({
      company_name: companyName.toLowerCase(),
    });

    if (!record) {
      return res
        .status(404)
        .json({ message: "No services found for this company" });
    }

    res.status(200).json({ services: record.services });
  } catch (err) {
    console.error("Error fetching company services:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});
// assumes mysql2 pool configured as `pool`
router.post("/update-service-entries", async (req, res) => {
  try {
    console.log("🔔 /update-service-entries called");
    console.log("📥 Body:", JSON.stringify(req.body).slice(0, 2000));

    const {
      serviceName,
      companyName,
      updates,
      fullServiceName: providedFull,
    } = req.body;

    // Basic validation
    if (
      !providedFull &&
      (!serviceName || !companyName || !Array.isArray(updates))
    ) {
      return res.status(400).json({
        message: "Missing required fields",
        received: {
          serviceName,
          companyName,
          updatesLength: Array.isArray(updates) ? updates.length : null,
        },
      });
    }

    // Build full table name OR use provided full table name
    const fullServiceName = providedFull
      ? String(providedFull).toLowerCase()
      : `${String(serviceName).toLowerCase()}_service_${String(companyName)
          .toLowerCase()
          .replace(/\s+/g, "_")}`;

    // Sanitize table name: allow only a-z0-9 and underscore
    if (!/^[a-z0-9_]+$/.test(fullServiceName)) {
      console.warn(
        "⚠️ Invalid table name after sanitization:",
        fullServiceName
      );
      return res
        .status(400)
        .json({ message: "Invalid table name", fullServiceName });
    }

    const connection = await pool.getConnection();
    try {
      // CHECK 1: table exists
      const [tables] = await connection.query("SHOW TABLES LIKE ?", [
        fullServiceName,
      ]);
      console.log("🔎 SHOW TABLES result length:", tables.length);
      if (!tables || tables.length === 0) {
        return res
          .status(400)
          .json({ message: "Table not found", table: fullServiceName });
      }

      // OPTIONAL: inspect columns
      try {
        const [cols] = await connection.query(
          `DESCRIBE \`${fullServiceName}\``
        );
        console.log(
          "🔎 Columns for",
          fullServiceName,
          "->",
          cols.map((c) => c.Field).join(", ")
        );
      } catch (descErr) {
        console.warn("⚠️ Could not DESCRIBE table:", descErr?.message);
      }

      // Filter valid updates
      const validUpdates = (updates || []).filter((u) => u && u.dialCode);
      if (validUpdates.length === 0) {
        return res.status(400).json({ message: "No valid dialCodes provided" });
      }

      // Build parameterized CASE ... WHEN ... THEN ... END statements
      const platParts = [];
      const statusParts = [];
      const effParts = [];
      const dialCodes = [];
      const values = []; // parameters in order

      const formatDateForMySQL = (d) => {
        if (!d) return null;
        const dt = new Date(d);
        if (isNaN(dt)) return null;
        return dt.toISOString().slice(0, 10); // YYYY-MM-DD
      };

      for (const item of validUpdates) {
        const dc = String(item.dialCode);
        dialCodes.push(dc);

        // platinumUSD (number)
        platParts.push("WHEN ? THEN ?");
        values.push(dc, Number(item.platinumUSD ?? 0));

        // status (string or null)
        statusParts.push("WHEN ? THEN ?");
        values.push(dc, item.status ?? null);

        // effectiveDate (date string or null)
        effParts.push("WHEN ? THEN ?");
        values.push(dc, formatDateForMySQL(item.effectiveDate));
      }

      const updatePlatinum = `CASE dialCode ${platParts.join(
        " "
      )} ELSE platinumUSD END`;
      const updateStatus = `CASE dialCode ${statusParts.join(
        " "
      )} ELSE status END`;
      const updateEffective = `CASE dialCode ${effParts.join(
        " "
      )} ELSE effectiveDate END`;

      // WHERE placeholders for dial codes
      const wherePlaceholders = dialCodes.map(() => "?").join(", ");
      // final values array: CASE placeholders already pushed; now push WHERE values
      const finalValues = values.concat(dialCodes);

      const sql = `
        UPDATE \`${fullServiceName}\`
        SET
          platinumUSD = ${updatePlatinum},
          status = ${updateStatus},
          effectiveDate = ${updateEffective},
          updatedAt = CURRENT_TIMESTAMP
        WHERE dialCode IN (${wherePlaceholders})
      `;

      console.log("🧾 Generated SQL (truncated):", sql.slice(0, 1000));
      console.log(
        "🔢 Values length:",
        finalValues.length,
        "sample:",
        finalValues.slice(0, 12)
      );

      // Run query
      try {
        const [result] = await connection.query(sql, finalValues);
        console.log("✅ Update result:", {
          affectedRows: result.affectedRows,
          changedRows: result.changedRows,
          info: result.info,
        });
        return res.status(200).json({
          message: "Entries updated",
          modifiedCount: result.affectedRows,
        });
      } catch (sqlErr) {
        console.error("❌ SQL execution error:", {
          code: sqlErr.code,
          errno: sqlErr.errno,
          sqlMessage: sqlErr.sqlMessage,
          sql: sqlErr.sql ? sqlErr.sql.slice(0, 2000) : undefined,
        });
        // give a helpful debug message (remove in prod)
        return res
          .status(500)
          .json({ message: "SQL execution error", error: sqlErr.message });
      }
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error("❌ Update service entries error (outer):", err);
    return res
      .status(500)
      .json({ message: "Internal server error", error: err.message });
  }
});

// GET /list-service-types
// router.get("/list-service-types", async (req, res) => {
//   try {
//     const collections = await mongoose.connection.db
//       .listCollections()
//       .toArray();
//     const serviceTypes = collections
//       .map((col) => col.name)
//       .filter((name) => name.endsWith("Services") && name !== "MasterServices")
//       .map((name) => name.replace("Services", "").toLowerCase());

//     res.status(200).json({ serviceTypes });
//   } catch (err) {
//     console.error("Error fetching service types:", err);
//     res.status(500).json({ message: "Internal server error" });
//   }
// });

router.post("/send-email", upload.single("attachment"), async (req, res) => {
  const { to, cc, bcc, subject, text } = req.body;
  const attachment = req.file;

  const ccList = (cc || "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: true,
    auth: {
      user: process.env.EMAIL_FROM,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to,
    subject,
    text, // fallback for non-HTML clients
    cc: ccList.length > 0 ? ccList : undefined,
    bcc: bcc && bcc.trim() ? bcc : undefined,
    attachments: attachment
      ? [{ filename: attachment.originalname, content: attachment.buffer }]
      : [],
    html: `
    <div style="font-family: Arial, sans-serif; font-size: 14px; color: #333;">
      <p>${text.replace(/\n/g, "<br>")}</p>
      
      <br><br>
      <p>Regards,</p>
      <p><b>Tapvox Limited (HK)</b></p>
      <p>
        Email: 
        <a href="mailto:rates@tapvox.net">rates@tapvox.net</a> / 
        <a href="mailto:sellrates@tapvox.net">sellrates@tapvox.net</a>
      </p>
      <br>
      <img src="https://tapvox.net/assets/tapvox-Dj-ep3jz.png" alt="Tapvox Logo" style="max-width:150px; height:auto;" />
    </div>
  `,
  };

  const connection = await pool.getConnection();
  try {
    // ✅ Step 1: Try to send email
    await transporter.sendMail(mailOptions);

    // ✅ Step 2: Log success in SQL
    await connection.query(
      `CREATE TABLE IF NOT EXISTS email_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        recipient_to TEXT,
        recipient_cc TEXT,
        recipient_bcc TEXT,
        subject VARCHAR(255),
        body TEXT,
        attachment_name VARCHAR(255),
        status VARCHAR(50),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    );

    await connection.query(
      `INSERT INTO email_logs 
        (recipient_to, recipient_cc, recipient_bcc, subject, body, attachment_name, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        to,
        ccList.join(","),
        bcc || null,
        subject,
        text,
        attachment ? attachment.originalname : null,
        "SENT",
      ]
    );

    res.status(200).json({ message: "Email sent successfully." });
  } catch (err) {
    console.error("❌ Email send error:", err);

    // ✅ Step 3: Log failure in SQL
    await connection.query(
      `INSERT INTO email_logs 
        (recipient_to, recipient_cc, recipient_bcc, subject, body, attachment_name, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        to,
        ccList.join(","),
        bcc || null,
        subject,
        text,
        attachment ? attachment.originalname : null,
        "FAILED",
      ]
    );

    res.status(500).json({ message: "Failed to send email." });
  } finally {
    connection.release();
  }
});

// router.post("/send-email", upload.single("attachment"), async (req, res) => {
//   const { to, subject, text } = req.body;
//   const attachment = req.file;

//   const transporter = nodemailer.createTransport({
//     host: process.env.SMTP_HOST,
//     port: parseInt(process.env.SMTP_PORT),
//     secure: true,
//     auth: {
//       user: process.env.EMAIL_FROM,
//       pass: process.env.EMAIL_PASS,
//     },
//   });

//   const mailOptions = {
//     from: process.env.EMAIL_FROM,
//     to,
//     subject,
//     text,
//     attachments: attachment
//       ? [
//           {
//             filename: attachment.originalname,
//             content: attachment.buffer,
//           },
//         ]
//       : [],
//   };

//   const connection = await pool.getConnection();
//   try {
//     // ✅ Step 1: Send email
//     await transporter.sendMail(mailOptions);

//     // ✅ Step 2: Create log table if not exists
//     await connection.query(
//       `CREATE TABLE IF NOT EXISTS email_logs (
//         id INT AUTO_INCREMENT PRIMARY KEY,
//         recipient_to TEXT,
//         subject VARCHAR(255),
//         body TEXT,
//         attachment_name VARCHAR(255),
//         status VARCHAR(50),
//         createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
//       )`
//     );

//     // ✅ Step 3: Log success
//     await connection.query(
//       `INSERT INTO email_logs
//         (recipient_to, subject, body, attachment_name, status)
//        VALUES (?, ?, ?, ?, ?)`,
//       [
//         to,
//         subject,
//         text,
//         attachment ? attachment.originalname : null,
//         "SENT",
//       ]
//     );

//     res.status(200).json({ message: "Email sent successfully." });
//   } catch (err) {
//     console.error("❌ Email send error:", err);

//     // ✅ Step 4: Log failure
//     await connection.query(
//       `INSERT INTO email_logs
//         (recipient_to, subject, body, attachment_name, status)
//        VALUES (?, ?, ?, ?, ?)`,
//       [
//         to,
//         subject,
//         text,
//         attachment ? attachment.originalname : null,
//         "FAILED",
//       ]
//     );

//     res.status(500).json({ message: "Failed to send email." });
//   } finally {
//     connection.release();
//   }
// });

module.exports = router;

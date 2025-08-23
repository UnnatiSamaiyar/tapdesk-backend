const express = require("express");
const router = express.Router();
const Account = require("../../models/Accounts");
const { default: mongoose } = require("mongoose");
const multer = require("multer");
const storage = multer.memoryStorage(); // ← THIS LINE
const upload = multer({ storage });
const nodemailer = require("nodemailer");
const EmailEntry = require("../../models/Master/MasterServices");
const RateService = require("../../models/Master/RateService"); 
const getModel = require("../../models/Master/ModelFactory");
const mysql = require("mysql2/promise");

router.get("/accounts", async (req, res) => {
  try {
    const accounts = await Account.find({}, {
      name: 1,
      email: 1,
      billingEmail: 1,
      salesEmail: 1,
      companyName: 1
    }).lean(); // Use lean for better performance (returns plain JS objects)

    res.status(200).json(accounts);
  } catch (error) {
    console.error("Error fetching accounts:", error);
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

router.get("/get-services", async (req, res) => {
  try {
    const { type, page = 1, limit = 100 } = req.query;
    const safeType = (type && type.trim() !== "") ? type : "premium";
    const fullServiceName = safeType.toLowerCase().replace(/\s+/g, "_");

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const locationFilter = req.query.locationFilter?.toLowerCase() || "";
    const dialCodeFilter = req.query.dialCodeFilter?.toLowerCase() || "";

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

    const Model = getModel(type);
    const results = await Model.find({ locationName: location });

    res.status(200).json({ data: results });
  } catch (err) {
    console.error("Error fetching services by location:", err);
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

router.post("/create-service-type", async (req, res) => {
  try {
    const { serviceName, companyName } = req.body;

    if (!serviceName || !companyName) {
      return res
        .status(400)
        .json({ message: "Service and company name are required" });
    }

    // ✅ Replace spaces with underscores and lowercase the table name
    const rawServiceName = `${serviceName}_${companyName}`;
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

    const record = await RateManagement.findOne({ company_name: companyName.toLowerCase() });

    if (!record) {
      return res.status(404).json({ message: "No services found for this company" });
    }

    res.status(200).json({ services: record.services });
  } catch (err) {
    console.error("Error fetching company services:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/update-service-entries", async (req, res) => {
  try {
    const { serviceName, companyName, updates } = req.body;

    if (!serviceName || !companyName || !Array.isArray(updates)) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // ✅ sanitize table name: lowercase + replace spaces with _
    const fullServiceName = `${serviceName.toLowerCase()}_${companyName
      .toLowerCase()
      .replace(/\s+/g, "_")}`;

    const connection = await pool.getConnection();
    try {
      let modifiedCount = 0;

      for (const item of updates) {
        const [result] = await connection.query(
          `UPDATE \`${fullServiceName}\` 
           SET platinumUSD = ?, status = ?, effectiveDate = ?, updatedAt = CURRENT_TIMESTAMP
           WHERE dialCode = ?`,
          [item.platinumUSD, item.status || null, item.effectiveDate || null, item.dialCode]
        );

        modifiedCount += result.affectedRows;
      }

      res.status(200).json({
        message: "Entries updated",
        modifiedCount,
      });
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error("❌ Update service entries error:", err);
    res.status(500).json({ message: "Internal server error" });
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

  const ccList = cc
    ? cc.split(",").map((email) => email.trim()).filter(Boolean)
    : [];

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
    text,
    cc: ccList.length > 0 ? ccList : undefined,
    bcc: bcc || undefined,
    attachments: attachment
      ? [
          {
            filename: attachment.originalname,
            content: attachment.buffer,
          },
        ]
      : [],
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

module.exports = router;
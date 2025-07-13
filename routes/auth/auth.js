const router = require("express").Router();
const Employee = require("../../models/Employee");
const LoginHistory = require("../../models/LoginHistory");
const CryptoJS = require("crypto-js");
const jwt = require("jsonwebtoken");
const {
  verifyTokenAndRoles,
  verifyTokenAndAdmin,
  verifyToken,
} = require("../../utils/verifyToken");
const emailTransporter = require("../../utils/emailConfig");
const { upperPartHtml, lowerPartHtml } = require("../../utils/utilsMethod");
// this is auth route for login, add employee,  update employee, get all employee and delete

router.post("/employee", async (req, res) => {
  try {
    console.log(req.body);
    const hashedPassword = CryptoJS.SHA256(req.body.password).toString(
      CryptoJS.enc.Hex
    );

    if (req.body.role === "admin" && req.body.productCategory !== "ADMIN") {
      return res
        .status(400)
        .json({ message: "For Admin Role, Chose ADMIN Emp Category" });
    }

    if (req.body.role !== "admin" && req.body.productCategory === "ADMIN") {
      return res
        .status(400)
        .json({ message: "ADMIN category only for admin role!" });
    }

    const newEmployee = new Employee({
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      role: req.body.role,
      productCategory:
        req.body.role === "admin" ? null : req.body.productCategory,
      password: hashedPassword,
      createdBy: req.body.createdBy,
    });

    const savedEmployee = await newEmployee.save();

    const creator = await Employee.findById(req.employee._id);

    try {
      //   const html = await res.render('newAccTemplate',{layout: false}, {
      //     name: savedEmployee.name,
      //     email: savedEmployee.email,
      //     phone: savedEmployee.phone,
      //     role: savedEmployee.role,
      //     productCategory: savedEmployee.productCategory,
      //     createdAt: savedEmployee.createdAt,
      //     createdByName: creator.name,
      //     forgotPasswordLink: "https://www.google.com"
      // });

      const contentHtml = ` <div class="header">
  <h1>Account Created Successfully</h1>
</div>
          <div class="content">
              <p>Dear ${savedEmployee.name},</p>
              <p>We are pleased to inform you that your employee account has been created. Below are your account details:</p>
              <table class="details-table">
                  <tr>
                      <th>Name:</th>
                      <td>${savedEmployee.name}</td>
                  </tr>
                  <tr>
                      <th>Email:</th>
                      <td>${savedEmployee.email}</td>
                  </tr>
                  <tr>
                      <th>Phone:</th>
                      <td>${savedEmployee.phone}</td>
                  </tr>
                  <tr>
                      <th>Role:</th>
                      <td>${savedEmployee.role}</td>
                  </tr>
                  <tr>
                      <th>Product Category:</th>
                      <td>${savedEmployee.productCategory}</td>
                  </tr>
                  <tr>
                      <th>Created At:</th>
                      <td>${savedEmployee.createdAt.toLocaleDateString()}</td>
                  </tr>
                  <tr>
                      <th>Created By:</th>
                      <td>${creator.name}</td>
                  </tr>
              </table>
              <p class="note">If you haven't received the password from the admin, please use the <a href="${
                process.env.FRONTEND_URL
              }" class="btn">Forgot Password</a> option to create a new one.</p>
          </div> `;

      const html = upperPartHtml + contentHtml + lowerPartHtml;

      await emailTransporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: savedEmployee.email,
        subject: "Your Employee Account has been Created",
        html: html,
      });
    } catch (error) {
      console.log("error in sending mail", error.message);
    }

    res.status(201).json(savedEmployee);
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
});

// Route to update employee details kartikey
router.put(
  "/employee/:id",
  verifyTokenAndRoles(["admin"]),
  async (req, res) => {
    try {
      //name, email ,phone , password, role, productCategory,createdBy,
      const { id } = req.params;
      const { name, email, phone, role, productCategory, updatedBy } = req.body;

      // Find the employee by ID
      const employee = await Employee.findById(id);
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }

      if (req.body.role === "admin" && req.body.productCategory !== "ADMIN") {
        return res
          .status(400)
          .json({ message: "For Admin Role, Chose ADMIN Emp Category" });
      }

      if (req.body.role !== "admin" && req.body.productCategory === "ADMIN") {
        return res
          .status(400)
          .json({ message: "ADMIN category only for admin role!" });
      }

      if (
        employee.role !== "admin" &&
        req.body.productCategory !== employee.productCategory
      ) {
        return res
          .status(400)
          .json({
            message: "Emp category can not be changed for non-admin role!",
          });
      }

      // if(req.body.productCategory==='' || (req.body.productCategory!=='VOICE' && req.body.productCategory!=='SMS')){
      //   return res.status(400).json({message:"productCategory required with SMS or VOICE"});
      // }

      // Update employee details
      if (name) {
        employee.name = name;
      }
      if (email) {
        employee.email = email;
      }
      if (phone) {
        employee.phone = phone;
      }
      if (role) {
        employee.role = role;
      }

      employee.updatedBy = updatedBy;
      employee.updatedAt = new Date();
      employee.productCategory =
        req.body.role === "admin" ? null : req.body.productCategory;
      const updatedEmployee = await employee.save();
      res.json(updatedEmployee);
    } catch (err) {
      console.log(err);
      res.status(500).json(err);
    }
  }
);

router.get(
  "/employee",
  verifyTokenAndRoles(["admin", "Account Manager", "NOC Manager"]),
  async (req, res) => {
    try {
      // Fetch all employees from the database
      let employees;

      // Check if the user is an admin
      if (req.employee.role === "admin") {
        // Fetch all employees from the database
        employees = await Employee.find()
          .populate("createdBy updatedBy")
          .sort({ createdAt: "desc" });
      } else if (req.employee.role === "Account Manager") {
        // Account Managers can access users with the roles 'Account Manager' or 'NOC Manager'
        employees = await Employee.find({
          role: { $in: ["Account Manager", "NOC Manager"] },
        }).sort({ createdAt: "desc" });
      } else {
        // NOC can only access employees with the role 'NOC Manager'
        employees = await Employee.find({ role: "NOC Manager" }).sort({
          createdAt: "desc",
        });
      }

      // Respond with the list of employees
      res.status(200).json(employees);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.get("/employeeActiveAM_VOICE", verifyToken, async (req, res) => {
  try {
    let employees;
    employees = await Employee.find({
      role: { $in: ["Account Manager"] },
      status: true,
      productCategory: "VOICE",
    }).sort({ cretedAt: "desc" });
    res.status(200).json(employees);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/employeeActiveAM_SMS", verifyToken, async (req, res) => {
  try {
    let employees;
    employees = await Employee.find({
      role: { $in: ["Account Manager"] },
      status: true,
      productCategory: "SMS",
    }).sort({ cretedAt: "desc" });
    res.status(200).json(employees);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});
router.get("/employeeActiveNOC_VOICE", verifyToken, async (req, res) => {
  try {
    let employees;
    employees = await Employee.find({
      role: { $in: ["NOC Manager"] },
      status: true,
      productCategory: "VOICE",
    }).sort({ cretedAt: "desc" });
    res.status(200).json(employees);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/employeeActiveNOC_SMS", verifyToken, async (req, res) => {
  try {
    let employees;
    employees = await Employee.find({
      role: { $in: ["NOC Manager"] },
      status: true,
      productCategory: "SMS",
    }).sort({ cretedAt: "desc" });
    res.status(200).json(employees);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/employee/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch employee details by ID
    const employee = await Employee.findById(id);

    // Check if employee exists
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }
    // Respond with the employee details
    res.status(200).json(employee);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { role } = req.body;
    const employee = await Employee.findOne({
      email: req.body.email,
    });

    if (!employee) {
      // toast.error("Wrong Email")
      return res.status(401).json({ message: "Wrong Email" });
    }

    if (!employee.status) {
      // toast.error("Wrong Email")
      return res
        .status(401)
        .json({ message: "Account Disabled, Contact Admin!" });
    }

    const hashedInputPassword = CryptoJS.SHA256(req.body.password).toString(
      CryptoJS.enc.Hex
    );

    if (hashedInputPassword !== employee.password) {
      return res.status(401).json({ message: "Wrong Password" });
    }
    console.log("a");

    if (role !== employee.role) {
      return res.status(401).json({ message: "No user exists" });
    }

    const token = jwt.sign(
      {
        _id: employee._id,
        role: employee.role,
      },
      process.env.JWT_SEC,
      { expiresIn: "3d" }
    );

    const { password, ...employeeDetails } = employee._doc;
    const loginHistory = new LoginHistory({
      employeeId: employee._id,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });
    await loginHistory.save();

    res.status(200).json({ ...employeeDetails, token });
  } catch (err) {
    console.error(err);
    res.status(500).json(err);
  }
});

router.post("/resetPasswordRequest", async (req, res) => {
  try {
    const { email } = req.body;
    console.log(email);
    const user = await Employee.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Email not found" });
    }

    const token = jwt.sign({ emp_id: user._id }, process.env.JWT_SEC, {
      expiresIn: "1h",
    });
    user.passwordResetToken = token;
    (user.passwordResetTokenExpiry = Date.now() + 3600000), // 1 hour
      await user.save();

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}&id=${user._id}`;

    // return new Promise((resolve, reject) =>
    //    transporter.sendMail(mailOptions, (err) => { if (err) { reject(err); } else { resolve(); } }); });

    try {
      const contentHtml = ` <div class="header">
  <h1>Reset Password Link</h1>
</div>
          <div class="content">
              <p>Dear ${user.name},</p>
              <p>Please use below link to reset the password</p>
              
              <p class="note"> Click to create new password <a href="${resetLink}" class="btn">Change Password</a>  .</p>
          </div> `;

      const html = upperPartHtml + contentHtml + lowerPartHtml;

      await emailTransporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: user.email,
        subject: "Password Changed",
        html: html,
      });

      res
        .status(200)
        .json({ message: "Password reset link sent to your email" });
    } catch (error) {
      console.error("Error sending email:", error);
      res.status(500).json({ message: "Failed to send password reset email" });
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post("/resetPassword", async (req, res) => {
  try {
    const { userId, token, newPassword } = req.body;
    console.log(req.body);
    const resetToken = await Employee.findOne({
      _id: userId,
      passwordResetToken: token,
      passwordResetTokenExpiry: { $gt: Date.now() },
    });
    if (!resetToken) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }
    const hashedPassword = CryptoJS.SHA256(newPassword).toString(
      CryptoJS.enc.Hex
    );

    const user = await Employee.findById(userId);
    user.password = hashedPassword;
    user.passwordResetToken = null;
    user.passwordResetTokenExpiry = null;
    user.lastPasswordChangedAt = new Date(); // Ensure to hash the password before saving
    await user.save();

    res.status(200).json({ message: "Password has been reset" });
    try {
      const contentHtml = ` <div class="header">
      <h1>Password Changed</h1>
    </div>
              <div class="content">
                  <p>Dear ${user.name},</p>
                  <p>Your password has been changed successfully. If you haven't changed, Please contact admin and use forgot password to create new one.</p>
                  
                   
              </div> `;

      const html = upperPartHtml + contentHtml + lowerPartHtml;

      await emailTransporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: user.email,
        subject: "Password updated",
        html: html,
      });
    } catch (error) {
      console.log(error.message);
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post("/changePassword", verifyToken, async (req, res) => {
  try {
    let requester = await Employee.findById(req.employee._id);

    if (!requester) {
      return res.status(400).json({ message: "User not found" });
    }

    const { oldPassword, newPassword } = req.body;
    console.log(oldPassword, " ", newPassword);

    const hashedPasswordOld = CryptoJS.SHA256(oldPassword).toString(
      CryptoJS.enc.Hex
    );
    if (requester.password !== hashedPasswordOld) {
      return res.status(400).json({ message: "Old Password not matched!" });
    }

    const hashedPasswordNew = CryptoJS.SHA256(newPassword).toString(
      CryptoJS.enc.Hex
    );

    requester.password = hashedPasswordNew;
    requester.lastPasswordChangedAt = new Date(); // Ensure to hash the password before saving
    await requester.save();

    res.status(200).json({ message: "Password has been changed!" });
    try {
      const contentHtml = ` <div class="header">
      <h1>Password Changed</h1>
    </div>
              <div class="content">
                  <p>Dear ${requester.name},</p>
                  <p>Your password has been changed successfully. If you haven't changed, Please contact admin and use forgot password to create new one.</p>
                  
                   
              </div> `;

      const html = upperPartHtml + contentHtml + lowerPartHtml;

      await emailTransporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: requester.email,
        subject: "Password Reset",
        html: html,
      });
    } catch (error) {
      console.log(error.message);
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post(
  "/changePermissions/:id",
  verifyTokenAndRoles(["admin", "Account Manager"]),
  async (req, res) => {
    try {
      const { canEdit, canView } = req.body;
      const employeeToUpdate = await Employee.findById(req.params.id);

      if (!employeeToUpdate) {
        return res.status(404).json("Employee not found");
      }

      // Update the permissions
      employeeToUpdate.canEdit = canEdit;
      employeeToUpdate.canView = canView;

      // Save the changes
      await employeeToUpdate.save();

      res.status(200).json("Permissions updated successfully");
    } catch (err) {
      console.error(err);
      res.status(500).json(err);
    }
  }
);

// router.delete("/deleteEmployee/:id", verifyTokenAndAdmin, async (req, res) => {
//   try {
//     const employeeToDelete = await Employee.findById(req.params._id);

//     if (!employeeToDelete) {
//       return res.status(404).json("Employee not found");
//     }

//     await Employee.deleteOne({ _id: req.params.id });

//     res.status(200).json("Employee deleted successfully");
//   } catch (err) {
//     console.error(err);
//     res.status(500).json(err);
//   }
// });

//Disable
router.put("/employee/disable/:id", verifyTokenAndAdmin, async (req, res) => {
  try {
    let obj = await Employee.findById(req.params.id);
    if (!obj) return res.status(400).json({ message: "Employee Not found" });
    obj.updatedAt = new Date();
    obj.updatedBy = req.employee._id;
    const status = obj.status ? "Disabled" : "Enabled";
    obj.status = !obj.status;
    await obj.save();
    return res.status(200).json({ message: `Successfully ${status}!` });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;

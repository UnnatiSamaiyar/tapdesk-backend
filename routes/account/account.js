const router = require("express").Router();
const Services = require("../../models/Services");
const Country = require("../../models/Master/Country");
const Currency = require("../../models/Master/Currency");
const Employee = require("../../models/Employee");
const PaymentCycle = require("../../models/Master/PaymentCycle");
const TimeZone = require("../../models/Master/TimeZone");
const Requirement = require("../../models/Requirement");
const QualityCategory = require("../../models/Master/QualityCategory");
const {
  verifyTokenAndRoles,
  verifyToken,
  verifyTokenAndAdmin,
} = require("../../utils/verifyToken");
const Account = require("../../models/Accounts");
const { getUserSocket } = require("../../utils/socketConfig");
const Notification = require("../../models/Notification");
const Task = require("../../models/Task");
const Thread = require("../../models/Thread");

// here we are adding the client like NOC and Acoount manager also

const employeeFields = "_id name email role productCategory";
const masterDataFields = "_id name";
const populateFields = [
  { path: "currency", select: masterDataFields },
  { path: "country", select: masterDataFields },
  { path: "timeZone", select: masterDataFields },
  { path: "paymentCycle", select: masterDataFields },
  { path: "createdBy", select: employeeFields },
  { path: "assignedTo", select: employeeFields },
  { path: "updatedBy", select: employeeFields },
];

router.post("/account", async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      address,
      country,
      companyName,
      ghostName,
      skypeId,
      timeZone,
      billingEmail,
      salesEmail,
      paymentCycle,
      currency,
      createdBy,
      assignedTo,
      accountType,
      remarks,
    } = req.body;
    const ctry = await Country.findById(country);
    const crncy = await Currency.findById(currency);
    const tz = await TimeZone.findById(timeZone);
    const pymtCycle = await PaymentCycle.findById(paymentCycle);

    const emp = await Employee.findById(createdBy);
    const assgn = await Employee.findById(assignedTo);

    if (!ctry) {
      return res.status(404).json({ message: "Country not found" });
    }
    if (!crncy) {
      return res.status(404).json({ message: "Currency not found" });
    }
    if (!emp) {
      return res.status(404).json({ message: "Employee not found" });
    }
    if (!assgn) {
      return res.status(404).json({ message: "Assigned Employee not found" });
    }
    if (!tz) {
      return res.status(404).json({ message: "TimeZone not found" });
    }
    if (!pymtCycle) {
      return res.status(404).json({ message: "Payment cycle not found" });
    }

    if (!name) {
      return res.status(400).json({ message: "name tag manadatory" });
    }

    const newAccount = new Account({
      name,
      email,
      phone,
      address,
      country,
      currency,
      companyName,
      ghostName,
      timeZone,
      skypeId,
      billingEmail,
      salesEmail,
      paymentCycle,
      createdBy,
      assignedTo,
      accountType,
      remarks,
    });

    const savedAccount = await newAccount.save();
    res.status(201).json(savedAccount);

    const notification = new Notification({
      message:
        "New Account : " + savedAccount.ghostName + " created by " + emp.name,
      notificationType: "AC_CREATION",
      product: accountType,
      accountId: savedAccount._id,
      emitter: req.employee._id,
      toShow: ["ALL_ADMIN", "ALL_AM"],
    });
    await notification.save();

    req.io.emit("admin", notification);
    if (accountType === "VOICE") req.io.emit("AM_VOICE", notification);
    else if (accountType === "SMS") req.io.emit("AM_SMS", notification);
    //  const userSocket = getUserSocket(req.employee._id.toString());
    // if (userSocket) {
    //   userSocket.emit('newAccount', notification);
    // }
    //  await notification.save();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

router.get("/account", verifyToken, async (req, res) => {
  try {
    const requester = await Employee.findById(req.employee._id);
    if (!requester) return res.status(401).json({ message: "Not Authorized" });

    let accounts = [];
    // if(requester.role==='admin' && ( !requester?.productCategory ||requester?.productCategory ===null )){
    //    accounts = await Account.find()
    //    .populate([{ path:'currency',select : masterDataFields },{path:'country'  ,select : masterDataFields} , {path:'timeZone' , select : masterDataFields}, {path:'paymentCycle',  select : masterDataFields}])
    //   .populate([{ path:'createdBy',select:employeeFields},{ path:'assignedTo',select:employeeFields},{ path:'updatedBy',select:employeeFields}])
    //    .sort({ updatedAt: -1 });
    // }else{
    //    accounts = await Account.find({accountType:requester.productCategory, status: true })
    //    .populate([{ path:'currency',select : masterDataFields },{path:'country'  ,select : masterDataFields} , {path:'timeZone' , select : masterDataFields}, {path:'paymentCycle',  select : masterDataFields}])
    //    .populate([{ path:'createdBy',select:employeeFields},{ path:'assignedTo',select:employeeFields},{ path:'updatedBy',select:employeeFields}])
    //     .sort({ updatedAt: -1 });
    // }

    const query =
      requester.role === "admin" &&
      (!requester?.productCategory || requester?.productCategory === null)
        ? {}
        : { accountType: requester.productCategory, status: true };

    accounts = await Account.find(query)
      .populate(populateFields)
      .sort({ updatedAt: -1 });

    const populateServices = async (account) => {
      const services = await Services.find({ accountId: account._id });
      return services;
    };

    const populateReq = async (account) => {
      const req = await Requirement.find({ accountId: account._id });
      return req;
    };

    // Process each account to append services and servicesCount
    const accountsWithServices = await Promise.all(
      accounts.map(async (account) => {
        const services = await populateServices(account);
        const servicesCount = services.length;
        const requirements = await populateReq(account);
        const reqCount = requirements.length;

        return {
          ...account.toObject(),
          services,
          servicesCount,
          reqCount,
          requirements,
        };
      })
    );

    res.status(200).json(accountsWithServices);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

router.get("/account/:id", verifyToken, async (req, res) => {
  try {
    const account = await Account.findById(req.params.id)
      .populate(populateFields)
      //   populate('currency country  timeZone paymentCycle')
      // .populate({ path:'createdBy',select:'_id name email role productCategory'}).populate({ path:'assignedTo',select:'_id name email role productCategory'})
      // .populate({ path:'updatedBy',select:'_id name email role productCategory'})
      .sort({ updatedAt: -1 });

    const populateServices = async (account) => {
      const services = await Services.find({ accountId: account._id });
      return services;
    };

    // Append services and servicesCount to the account object
    const services = await populateServices(account);
    const servicesCount = services.length;
    account.services = services;
    account.servicesCount = servicesCount;
    account.reqCount = 0;
    account.reuirements = [];

    res.status(200).json(account);
  } catch (err) {
    console.error(err);
    res.status(500).json(err);
  }
});

router.put("/account/changeAssignedTo", verifyToken, async (req, res) => {
  try {
    const { accountId, assignedTo, empId } = req.body;
    const account = await Account.findById(accountId);
    const empAssigned = await Employee.findById(assignedTo);
    const empBy = await Employee.findById(empId);
    if (!account) return res.status(404).json({ message: "Account not Exist" });
    if (!empAssigned)
      return res.status(404).json({ message: "empAssigned not Exist" });
    if (!empBy) return res.status(404).json({ message: "empBy not Exist" });

    account.assignedTo = assignedTo;

    const accountUpated = await account.save();
    res.status(200).json(accountUpated);
  } catch (err) {
    console.error(err);
    res.status(500).json(err);
  }
});

router.put(
  "/account/:id",
  verifyTokenAndRoles(["admin", "Account Manager"]),
  async (req, res) => {
    try {
      const {
        name,
        email,
        phone,
        address,
        country,
        companyName,
        ghostName,
        skypeId,
        timeZone,
        billingEmail,
        salesEmail,
        paymentCycle,
        currency,
        remarks,
      } = req.body;

      let account = await Account.findById(req.params?.id);
      if (!account) res.status(400).json({ message: "Account not found" });

      const ctry = await Country.findById(country);
      const crncy = await Currency.findById(currency);
      const tz = await TimeZone.findById(timeZone);
      const pymtCycle = await PaymentCycle.findById(paymentCycle);

      const emp = await Employee.findById(req.employee._id);

      if (!ctry) {
        return res.status(404).json({ message: "Country not found" });
      }
      if (!crncy) {
        return res.status(404).json({ message: "Currency not found" });
      }
      if (!emp) {
        return res.status(404).json({ message: "Employee not found" });
      }

      if (!tz) {
        return res.status(404).json({ message: "TimeZone not found" });
      }
      if (!pymtCycle) {
        return res.status(404).json({ message: "Payment cycle not found" });
      }

      if (!name) {
        return res.status(400).json({ message: "name tag manadatory" });
      }

      account.name = name;
      account.email = email;
      account.phone = phone;
      account.address = address;
      account.country = country;
      account.currency = currency;

      //real name can only be updated by admin
      if (emp.role === "admin") account.companyName = companyName;

      account.ghostName = ghostName;
      account.timeZone = timeZone;
      account.skypeId = skypeId;
      account.billingEmail = billingEmail;
      account.salesEmail = salesEmail;
      account.paymentCycle = paymentCycle;
      account.updatedAt = new Date();
      account.updatedBy = emp._id;
      account.remarks = remarks;

      const udpdatedAccount = await account.save();
      res.status(200).json(udpdatedAccount);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: err.message });
    }
  }
);

//Disable
router.put("/account/disable/:id", verifyTokenAndAdmin, async (req, res) => {
  try {
    let obj = await Account.findById(req.params.id);
    if (!obj) return res.status(400).json({ message: "Object Not found" });
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

router.delete("/account/flush/:id", verifyTokenAndAdmin, async (req, res) => {
  try {
    let obj = await Account.findById(req.params.id);
    if (!obj) return res.status(400).json({ message: "Object Not found" });

    const resultReq = await Requirement.deleteMany({ accountId: obj._id });

    const servicesObjList = await Services.find({ accountId: obj._id });

    const taskObjList = await Task.find({
      service: { $in: servicesObjList.map((service) => service._id) },
    });

    const resultThread = await Thread.deleteMany({
      task: { $in: taskObjList.map((task) => task._id) },
    });

    const resultTask = await Task.deleteMany({
      service: { $in: servicesObjList.map((service) => service._id) },
    });

    const resultServices = await Services.deleteMany({ accountId: obj._id });

    const resultAccount = await Account.deleteOne({ _id: obj._id });

    return res
      .status(200)
      .json({
        message: "Deleted",
        resultThread,
        resultTask,
        resultServices,
        resultAccount,
      });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;

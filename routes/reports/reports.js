const router = require('express').Router();
const LoginHistory = require('../../models/LoginHistory');
const Employee = require('../../models/Employee');
const Destination =require('../../models/Master/Destination')
const { verifyTokenAndRoles, verifyTokenAndAdmin, verifyToken } = require('../../utils/verifyToken');
const Report = require('../../models/Report');

const moment = require('moment');
// here we got the login history of the NOC and the acoount manager and it is accebile by only admin 

router.get('/login-history', verifyTokenAndRoles(['admin']), async (req, res) => {
  try {
    const loginHistory = await LoginHistory.find()
      .sort({ loginTime: 'desc' })
      // .limit(10);

    const loginDetails = await Promise.all(loginHistory.map(async (record) => {
      const employee = await Employee.findById(record.employeeId);
      return {
        employeeName: employee.name,
        employeeEmail: employee.email,
        employeeRole: employee.role,
        loginTime: moment(record.loginTime).format("h:mm A"),
        loginDate: formatDate(record.loginTime), 
      };
    }));

    res.status(200).json(loginDetails);
  } catch (err) {
    console.error(err);
    res.status(500).json(err);
  }
});



router.get('/login-historyByDate/:date', verifyToken, async (req, res) => {
  try {

    const requestedDate = req.params.date; // Date parameter from the request

    // Construct the start and end of the requested date
    const startOfDay = moment(requestedDate).startOf('day');
    const endOfDay = moment(requestedDate).endOf('day');
    let loginHistory=[]
if(req.employee.role=='admin') {
     loginHistory = await LoginHistory.find({
      loginTime: {
        $gte: startOfDay.toDate(), // Greater than or equal to start of requested date
        $lte: endOfDay.toDate()    // Less than or equal to end of requested date
      }
    }).sort({ loginTime: 'desc' });
}else{
   loginHistory = await LoginHistory.find({
    loginTime: {
      $gte: startOfDay.toDate(), // Greater than or equal to start of requested date
      $lte: endOfDay.toDate()    // Less than or equal to end of requested date
    },employeeId:req.employee._id
  }).sort({ loginTime: 'desc' });
}
    const loginDetails = await Promise.all(loginHistory.map(async (record) => {
      const employee = await Employee.findById(record.employeeId);
      return {
        employeeName: employee.name,
        employeeEmail: employee.email,
        employeeRole: employee.role,
        loginTime: moment(record.loginTime).format("h:mm A"),
        loginDate: formatDate(record.loginTime), 
      };
    }));

    res.status(200).json(loginDetails);
  } catch (err) {
    console.error(err);
    res.status(500).json(err);
  }
});

router.post('/report',verifyToken, async (req, res) => {
  try {
    const {  companyName, destination, type, remark } = req.body;

    const dest = await Destination.findById(destination);
    if(!dest)
      {res.status(400).json({message:"Destination not found!"})}

    const newReport = new Report({
      companyName,
      destination,
      type,
      remark,
      createdBy:req.employee._id
    });


    const savedReport = await newReport.save();

    res.status(201).json(savedReport);
  } catch (error) {
    // If there's an error, send a 500 internal server error response
    res.status(500).json({ message: error.message });
  }
});


router.put('/report/:id',verifyToken, async (req, res) => {
  try {

    const report = await Report.findById(req.params.id);

    const {  companyName, destination, type, remark } = req.body;

    const dest = await Destination.findById(destination);
    if(!dest)
      {res.status(400).json({message:"Destination not found!"})}

     
      report.companyName=companyName
      report.destination=destination
      report.type=type
      report.remark=remark
      report.updatedBy=req.employee._id
      report.updatedAt=new Date();
  
    const updatedReport = await report.save();

    res.status(200).json(updatedReport);
  } catch (error) {
    // If there's an error, send a 500 internal server error response
    res.status(500).json({ message: error.message });
  }
});





router.get('/fetchAllReports',verifyTokenAndRoles(['admin']), async (req, res) => {
  try {
      const reports = await Report.find().populate('destination createdBy') .sort({ updatedAt: -1 });
      res.status(200).json(reports);
  } catch (error) {
      console.error('Error fetching reports:', error);
      res.status(500).json({ error: 'Error fetching reports' });
  }
});

router.get('/fetchMyReports',verifyToken, async (req, res) => {
  const currentEmployeeId = req.employee._id; 
  const requester = await Employee.findById(req.employee._id);

  try {

  
      // const reports = await Report.find({ createdBy: currentEmployeeId }).populate("destination createdBy").sort({ updatedAt: -1 });;
  
      //const reports = await Report.find({ createdBy: currentEmployeeId }).populate("destination createdBy").sort({ updatedAt: -1 });;
      const reports = await Report.find().populate('destination', 'name') .populate('createdBy', 'name role productCategory').sort({ updatedAt: -1 })
      let reportToSend=[];
      if(requester.role==='Account Manager')
       reportToSend = reports.filter((item)=> item.createdBy.productCategory ===requester.productCategory);
      else  if(requester.role==='NOC Manager'){
        reportToSend = reports.filter((item)=> item.createdBy.productCategory ===requester.productCategory  && item.createdBy.role === requester.role );

      }
    
      res.status(200).json(reportToSend);
  } catch (error) {
      console.error('Error fetching reports for current user:', error);
      res.status(500).json({ error: 'Error fetching reports for current user' });
  }
});


function formatDate(date) {
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Intl.DateTimeFormat('en-US', options).format(date);
}

module.exports = router;

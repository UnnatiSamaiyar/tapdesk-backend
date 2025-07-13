// taskScheduler.js
// const cron = require('node-cron');
const emailTransporter = require('./emailConfig');
const Report = require('../models/Report');
const Employee = require('../models/Employee')
 
//  const myTask = () => {
//   console.log('Task is running at 6 PM!');
//   // Add the actual task logic here
// };

// // Schedule the task to run daily at 6 PM
// const scheduleDailyTask = () => {
//   cron.schedule('0 18 * * *', myTask, {
//     scheduled: true,
//     timezone: "America/New_York" // Adjust to your timezone if needed
//   });
// };

 


async function fetchAndSendReport() {
  try {
    // Calculate start and end of the current date
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

      const reports = await Report.find({
        createdAt: {
          $gte: startOfDay,
          $lte: endOfDay
        }
      }).populate('destination', 'name') .populate('createdBy', 'name role productCategory').sort({ updatedAt: -1 })

      const voiceReport = reports.filter((item)=> item.createdBy.productCategory ==='VOICE');
      const smsReport = reports.filter((item) => item.createdBy.productCategory==='SMS' );



    let voiceEmailContent;
    let smsEmailContent;
    if (voiceReport.length === 0) {
       voiceEmailContent="No Report found Today!"
    }else{

                  voiceEmailContent = `
                  <h2>Daily Report</h2>
                  <table border="1">
                    <tr>
                      <th>Company Name</th>
                      <th>Destination</th>
                      <th>Type</th>
                      <th>Remark</th>
                      <th>Created At</th>
                      <th>Emp Name</th>
                      <th>Role</th>
                    </tr>`;

                voiceReport.forEach(report => {
                  voiceEmailContent += `
                    <tr>
                      <td>${report.companyName}</td>
                      <td>${report.destination?.name}</td>
                      <td>${report.type}</td>
                      <td>${report.remark}</td>
                      <td>${new Date(report.createdAt).toLocaleString()}</td>
                      <td>${report.createdBy.name}</td>
                      <td>${report.createdBy.role}</td>
                    </tr>`;
                });

                voiceEmailContent += '</table>';

    }

    if (smsReport.length === 0) {
      smsEmailContent="No Report found Today!"
    }else{
            smsEmailContent = `
            <h2>Daily Report</h2>
            <table border="1">
              <tr>
                <th>Company Name</th>
                <th>Destination</th>
                <th>Type</th>
                <th>Remark</th>
                <th>Created At</th>
                <th>Emp Name</th>
                <th>Role</th>
              </tr>`;

          smsReport.forEach(report => {
            smsEmailContent += `
              <tr>
                <td>${report.companyName}</td>
                <td>${report.destination?.name}</td>
                <td>${report.type}</td>
                <td>${report.remark}</td>
                <td>${new Date(report.createdAt).toLocaleString()}</td>
                <td>${report.createdBy.name}</td>
                <td>${report.createdBy.role}</td>
              </tr>`;
          });

          smsEmailContent += '</table>';
    }

    
    const adminsEmail = await Employee.find({ role: 'admin',status:true}).select('email -_id').exec();
    const adminsEmailList = adminsEmail.map(employee => employee.email);

    const amEmail_VOICE = await Employee.find({ role: 'Account Manager', productCategory: 'VOICE',status:true }).select('email -_id').exec();
    const amEmailList_VOICE = amEmail_VOICE.map(employee => employee.email);

    const amEmail_SMS = await Employee.find({ role: 'Account Manager', productCategory: 'SMS',status:true }).select('email -_id').exec();
    const amEmailList_SMS = amEmail_SMS.map(employee => employee.email);

    console.log("adminsEmailList", adminsEmailList)
    console.log("amEmailList_VOICE", amEmailList_VOICE)
    console.log("amEmailList_SMS", amEmailList_SMS)

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: amEmailList_VOICE,
      cc: adminsEmailList,
      subject: 'VOICE Daily Report '+new Date().toDateString(),
      html: voiceEmailContent
    };

    const mailOptionsSMS = {
      from: process.env.EMAIL_FROM,
      to: amEmailList_SMS,
      cc: adminsEmailList,
      subject: 'SMS Daily Report '+new Date().toDateString(),
      html: smsEmailContent
    };

    if(process.env.REPORT_MAIL==="VOICE")
     await emailTransporter.sendMail(mailOptions);
    else if(process.env.REPORT_MAIL==="SMS")
     await emailTransporter.sendMail(mailOptionsSMS);


    console.log('Email sent successfully');
  } catch (error) {
    console.error('Error fetching reports or sending email:', error);
  }
};


module.exports =  {fetchAndSendReport};
 
 
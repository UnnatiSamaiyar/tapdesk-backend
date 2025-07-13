const Employee = require("../models/Employee");


async function adminsEmails() {

    const adminsEmail = await Employee.find({ role: 'admin',status:true}).select('email -_id').exec();
    const adminsEmailList = adminsEmail.map(employee => employee.email);

    return adminsEmailList

}

async function amEmails(productType) {

    const amEmail = await Employee.find({ role: 'Account Manager',productCategory:productType, status: true}).select('email -_id').exec();
    const amEmailList = amEmail.map(employee => employee.email);

    return amEmailList;

}

async function emilsByEmpId(ids) {

    const emails = await Employee.find({ _id :{ $in :ids },status:true}).select('email -_id').exec();
    const emailsList = emails.map(employee => employee.email);

    return emailsList;

}



const upperPartHtml=`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
     
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f6f6f6;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background-color: #007bff;
            color: white;
            padding: 20px;
            text-align: center;
        }
        .content {
            padding: 20px;
        }
        .footer {
            background-color: #f1f1f1;
            color: #555555;
            padding: 20px;
            text-align: center;
            font-size: 12px;
        }
        .details-table {
            width: 100%;
            border-collapse: collapse;
        }
        .details-table th, .details-table td {
            padding: 8px;
            text-align: left;
            border-bottom: 1px solid #dddddd;
        }
        .details-table th {
            background-color: #f2f2f2;
        }
        .btn {
            display: inline-block;
            padding: 10px 20px;
            margin: 10px 0;
            color: white;
            background-color: #007bff;
            text-decoration: none;
            border-radius: 5px;
        }
        .note {
            margin-top: 20px;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
       `

const cname = process.env.REPORT_MAIL==="VOICE" ? 'Tapvox' : process.env.REPORT_MAIL==="SMS" ?'SwipeMessage' :'';
const year_d= new Date().getFullYear();
const lowerPartHtml=`<div class="footer">
<p>&copy; `+year_d+`-`+cname+` All rights reserved.</p>
</div>
</div>
</body>
</html>`




module.exports = {adminsEmails,emilsByEmpId,amEmails,upperPartHtml,lowerPartHtml }
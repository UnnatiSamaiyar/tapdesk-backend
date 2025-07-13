const nodemailer = require("nodemailer"); 
// Method to send email

try{

         const emailTransporter = nodemailer.createTransport({
    
         host: process.env.SMTP_HOST, 
         port: process.env.SMTP_PORT,
         secure: true,
         auth: { user: process.env.EMAIL_FROM, pass: process.env.EMAIL_PASS } 
        
        }); 
    
        module.exports = emailTransporter;

 }catch(error){
        console.log(error)
}

    
   
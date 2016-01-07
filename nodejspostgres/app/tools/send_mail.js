var nodemailer = require('nodemailer');
var Fs = require('fs');
var smtpTransport = require('nodemailer-smtp-transport');

function sendEmail( from, to , subject, html_text, config ){
  var transporter = nodemailer.createTransport(smtpTransport({
      host: config.smtp_host,
      port: config.smtp_port,
      auth: {
          user: config.smtp_user,
          pass: config.smtp_pass
      }
  }));

  var wrapperHtml = Fs.readFileSync('./app/views/email/template.html').toString();

  html_text = wrapperHtml.replace("{content}", html_text);

  console.log(html_text);

  var mailOptions = {
    from: from,
    to: to,
    subject: subject,
    html: html_text
  };




  transporter.sendMail(mailOptions, function(error, info){
    if(error){
      showError("Error while sending email:"+error);
    }else{
      showSucc('Message sent: ' + info.response);
    }
  });  
}

module.exports.sendEmail = sendEmail;
const nodemailer = require('nodemailer');

const smtpConfig = {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'venkatw053@gmail.com',
    pass: 'teip ylok gzrh ngif',
  },
  connectionTimeout: 5000,
  greetingTimeout: 5000,
  socketTimeout: 8000,
  debug: true, // enable debugging output
  logger: true, // log SMTP traffic to console
};

const transporter = nodemailer.createTransport(smtpConfig);

async function testMail() {
  console.log('Sending test email to sriabarna.aids23@mamcet.com...');
  try {
    const info = await transporter.sendMail({
      from: 'venkatw053@gmail.com',
      to: 'sriabarna.aids23@mamcet.com',
      subject: 'RuralSwift Test SMTP Email',
      text: 'This is a test email from the RuralSwift server to verify SMTP settings.',
    });
    console.log('Success! Message sent:', info);
  } catch (error) {
    console.error('Error sending email:', error);
  } finally {
    transporter.close();
  }
}

testMail();

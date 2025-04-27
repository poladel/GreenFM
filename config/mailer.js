const nodemailer = require('nodemailer');

// Configure the transporter using environment variables
const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE, // e.g., 'gmail'
    auth: {
        user: process.env.EMAIL_USER, // Your email address
        pass: process.env.EMAIL_PASS, // Your email password or app password
    },
});

const sendEmail = async (to, subject, htmlContent) => {
    const mailOptions = {
        from: `"GreenFM Admin" <${process.env.EMAIL_USER}>`,
        to: to, // Recipient email address
        subject: subject,
        html: htmlContent, // HTML body content
    };

    try {
        let info = await transporter.sendMail(mailOptions);
        console.log('Email sent: %s', info.messageId);
        return info;
    } catch (error) {
        console.error('Error sending email:', error);
        throw error; // Re-throw the error to be handled by the caller
    }
};

module.exports = sendEmail;
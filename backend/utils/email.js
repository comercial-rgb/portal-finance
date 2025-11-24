const nodemailer = require('nodemailer');

exports.sendEmail = async (options) => {
  // Criar transporter
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });

  // Opções do email
  const mailOptions = {
    from: `${process.env.EMAIL_FROM || 'Sistema Financeiro'} <${process.env.EMAIL_USER}>`,
    to: options.to,
    subject: options.subject,
    html: options.html
  };

  // Enviar email
  await transporter.sendMail(mailOptions);
};

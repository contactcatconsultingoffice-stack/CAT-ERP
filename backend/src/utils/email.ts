import nodemailer from 'nodemailer';

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false, // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export const sendWelcomeEmail = async (email: string, password: string, name: string, role: string) => {
  const mailOptions = {
    from: `"CAT Consulting Office ERP" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `Bienvenue chez CAT ERP - Votre compte ${role}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
        <h2 style="color: #2563eb; text-align: center;">Bienvenue chez CAT ERP !</h2>
        <p>Bonjour <strong>${name}</strong>,</p>
        <p>Votre compte <strong>${role}</strong> a été créé avec succès sur notre plateforme de gestion.</p>
        <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
          <p style="margin: 0; font-size: 0.9rem; color: #6b7280;">Vos identifiants de connexion :</p>
          <p style="margin: 10px 0 5px 0;"><strong>Identifiant (Email) :</strong> ${email}</p>
          <p style="margin: 0;"><strong>Mot de passe :</strong> ${password}</p>
        </div>
        <p>Vous pouvez vous connecter dès maintenant en cliquant sur le bouton ci-dessous :</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Se connecter à CAT ERP</a>
        </div>
        <p style="font-size: 0.85rem; color: #9ca3af; text-align: center;">
          Pour des raisons de sécurité, nous vous recommandons de changer votre mot de passe après votre première connexion.
        </p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 0.8rem; color: #9ca3af; text-align: center; margin: 0;">
          &copy; 2024 CAT Consulting Office. Tous droits réservés.
        </p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent to ${email}`);
  } catch (error) {
    console.error(`Error sending welcome email to ${email}:`, error);
  }
};

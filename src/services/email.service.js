// src/services/email.service.js
import sgMail from "@sendgrid/mail";
import "dotenv/config";

// Configuramos SendGrid con nuestra API Key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const FROM_EMAIL = process.env.EMAIL_FROM;

export const sendWelcomeEmail = async (toEmail, name) => {
  const msg = {
    to: toEmail,
    from: FROM_EMAIL, // Tu email verificado en SendGrid
    subject: "¡Bienvenido/a a Makip! 🎉",
    html: `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>¡Hola, ${name}!</h2>
        <p>Gracias por registrarte en <strong>Makip</strong>. ¡Estamos muy contentos de tenerte con nosotros!</p>
        <p>A partir de ahora, puedes explorar nuestro catálogo, personalizar productos y seguir el estado de tus pedidos directamente desde tu perfil.</p>
        <p>¡Que tengas un día genial!</p>
        <br>
        <p>Atentamente,<br>El equipo de Makip</p>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log(`Correo de bienvenida enviado a ${toEmail}`);
  } catch (error) {
    console.error("Error al enviar correo de bienvenida:", error);
    if (error.response) {
      console.error(error.response.body);
    }
  }
};

// 💡 --- ¡NUEVA FUNCIÓN! ---
/**
 * Envía un correo con el enlace para resetear la contraseña
 */
export const sendPasswordResetEmail = async (toEmail, token) => {
  // (Importante: El frontend debe tener esta ruta: /reset-password)
  const resetUrl = `http://localhost:5173/reset-password?token=${token}`;

  const msg = {
    to: toEmail,
    from: FROM_EMAIL,
    subject: "Restablece tu contraseña de Makip",
    html: `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>¿Olvidaste tu contraseña?</h2>
        <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
        <p>Haz clic en el siguiente enlace para crear una nueva contraseña (el enlace expira en 1 hora):</p>
        <a href="${resetUrl}" style="background-color: #1E63FF; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Restablecer Contraseña
        </a>
        <p style="margin-top: 20px;">Si no solicitaste esto, puedes ignorar este correo.</p>
        <p>Atentamente,<br>El equipo de Makip</p>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log(`Correo de reseteo enviado a ${toEmail}`);
  } catch (error) {
    console.error("Error al enviar correo de reseteo:", error);
    if (error.response) {
      console.error(error.response.body);
    }
  }
};

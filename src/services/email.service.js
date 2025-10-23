import sgMail from "@sendgrid/mail";
import "dotenv/config";

// Configuramos SendGrid con nuestra API Key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const sendWelcomeEmail = async (toEmail, name) => {
  const msg = {
    to: toEmail,
    from: process.env.EMAIL_FROM, // Tu email verificado en SendGrid
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

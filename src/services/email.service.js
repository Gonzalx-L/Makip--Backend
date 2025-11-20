import sgMail from "@sendgrid/mail";
import "dotenv/config";
import axios from "axios"; // Para PDF

sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const FROM_EMAIL = process.env.EMAIL_FROM; // Ejemplo: "aljijluz15@gmail.com"

// --- CORREO DE BIENVENIDA ---
export const sendWelcomeEmail = async (toEmail, name) => {
  console.log("[DEBUG] FROM_EMAIL:", FROM_EMAIL);
  console.log(`[EMAIL] Intentando enviar correo de bienvenida a: ${toEmail}`);
  try {
    const msg = {
      to: toEmail,
      from: {
        name: "Makip",
        email: FROM_EMAIL,
      },
      subject: "¡Bienvenido/a a Makip! 🎉",
      html: `
        <div style="background: #f7fafc; padding: 36px 0; font-family: 'Segoe UI', Arial, sans-serif;">
          <div style="max-width: 500px; background: #fff; margin: auto; border-radius: 16px; box-shadow: 0 2px 12px #0001; padding: 32px;">
            <div style="text-align:center; margin-bottom: 20px;">
              <img src="https://i.imgur.com/5YQfdDW.png" alt="Makip Logo" style="max-width:120px; margin-bottom:8px;" />
              <h2 style="color: #1E63FF; font-size: 28px; margin: 0 0 8px 0;">¡Bienvenido/a a Makip!</h2>
            </div>
            <p style="font-size: 18px; color: #333;">Hola <b>${name}</b>,</p>
            <p style="font-size: 16px; color: #333;">
              Gracias por registrarte en <b>Makip</b>, tu plataforma de pedidos personalizados.<br>
              Ya puedes explorar nuestros productos, hacer pedidos únicos y vivir la experiencia Makip.
            </p>
            <div style="margin: 26px 0;">
              <a href="https://makip.pe" style="display:inline-block; padding:12px 28px; background:#1E63FF; color:#fff; text-decoration:none; border-radius:8px; font-size:16px; font-weight:bold;">
                Ir a Makip
              </a>
            </div>
            <p style="color: #888; font-size: 14px;">
              Si tienes dudas, puedes responder a este correo o escribirnos por WhatsApp.<br>
              ¡Gracias por confiar en nosotros!<br>
              <b>El equipo Makip</b>
            </p>
            <hr style="margin:32px 0; border:none; border-top:1px solid #eee;">
            <div style="text-align: center; color: #bbb; font-size: 12px;">
              © ${new Date().getFullYear()} Makip. Todos los derechos reservados.
            </div>
          </div>
        </div>
      `,
    };
    await sgMail.send(msg);
    console.log(`[EMAIL] Correo de bienvenida ENVIADO a: ${toEmail}`);
  } catch (error) {
    console.error("[EMAIL] Error al enviar correo de bienvenida:", error);
    if (error.response) {
      console.error(error.response.body);
    }
  }
};

// --- CORREO DE RESETEO DE CONTRASEÑA ---
export const sendPasswordResetEmail = async (toEmail, token) => {
  console.log(`[DEBUG] Enviando correo de reseteo a: ${toEmail}, token: ${token}`);
  try {
    const resetUrl = `https://makip.pe/reset-password?token=${token}`;
    const msg = {
      to: toEmail,
      from: {
        name: "Makip",
        email: FROM_EMAIL,
      },
      subject: "Restablece tu contraseña en Makip",
      html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2>Restablece tu contraseña</h2>
          <p>Hola,</p>
          <p>Haz clic en el siguiente botón para restablecer tu contraseña. Este enlace expirará en 1 hora.</p>
          <p>
            <a href="${resetUrl}" style="background:#1E63FF; color:#fff; padding:10px 20px; border-radius:6px; text-decoration:none;">
              Restablecer Contraseña
            </a>
          </p>
          <p>Si no solicitaste esto, ignora este correo.</p>
        </div>
      `,
    };
    await sgMail.send(msg);
    console.log(`[EMAIL] Correo de reseteo ENVIADO a: ${toEmail}`);
  } catch (error) {
    console.error("[EMAIL] Error al enviar correo de reseteo:", error);
    if (error.response) {
      console.error(error.response.body);
    }
  }
};

// --- CORREO DE CONFIRMACIÓN DE PAGO CON PDF ---
export const sendOrderConfirmationEmail = async (
  toEmail,
  name,
  orderId,
  pdfUrl
) => {
  let pdfAttachment = undefined;

  try {
    // Descargar el PDF desde la URL pública de GCS
    const response = await axios.get(pdfUrl, { responseType: "arraybuffer" });
    const pdfBuffer = Buffer.from(response.data, "binary");

    // Convertir a Base64 para SendGrid
    pdfAttachment = pdfBuffer.toString("base64");
  } catch (error) {
    console.error(
      `[Email] Error al descargar el PDF ${pdfUrl} para adjuntar:`,
      error
    );
    // (Si falla, el correo se enviará sin el adjunto)
  }

  const msg = {
    to: toEmail,
    from: {
      name: "Makip",
      email: FROM_EMAIL,
    },
    subject: `Confirmación de Pago: Pedido Makip #${orderId}`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>¡Hola, ${name}! Tu pago ha sido aprobado.</h2>
        <p>Hemos confirmado tu pago para el pedido <strong>#${orderId}</strong>.</p>
        <p>Tu pedido ha pasado al estado 'Pendiente' y pronto comenzaremos con la producción.</p>
        <p>Adjuntamos la boleta/factura de tu pedido para tus registros.</p>
        <br>
        <p>Atentamente,<br>El equipo de Makip</p>
      </div>
    `,
    attachments: pdfAttachment
      ? [
          {
            content: pdfAttachment,
            filename: `Pedido_Makip_${orderId}.pdf`,
            type: "application/pdf",
            disposition: "attachment",
          },
        ]
      : [], // Array vacío si falla la descarga
  };

  try {
    await sgMail.send(msg);
    console.log(
      `Correo de confirmación de orden #${orderId} enviado a ${toEmail}`
    );
  } catch (error) {
    console.error("Error al enviar correo de confirmación:", error);
    if (error.response) {
      console.error(error.response.body);
    }
  }
};

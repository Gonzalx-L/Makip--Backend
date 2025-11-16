import sgMail from "@sendgrid/mail";
import "dotenv/config";
import axios from "axios"; // 💡 1. Necesitamos axios para descargar el PDF

sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const FROM_EMAIL = process.env.EMAIL_FROM;

export const sendWelcomeEmail = async (toEmail, name) => {
  // ... (código existente sin cambios) ...
};

export const sendPasswordResetEmail = async (toEmail, token) => {
  // ... (código existente sin cambios) ...
};

// 💡 --- ¡NUEVA FUNCIÓN! ---
/**
 * Envía un correo de confirmación de pago con el PDF adjunto
 */
export const sendOrderConfirmationEmail = async (
  toEmail,
  name,
  orderId,
  pdfUrl
) => {
  let pdfAttachment = undefined;

  try {
    // 1. Descargar el PDF desde la URL pública de GCS
    const response = await axios.get(pdfUrl, { responseType: "arraybuffer" });
    const pdfBuffer = Buffer.from(response.data, "binary");

    // 2. Convertir a Base64 para SendGrid
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
    from: FROM_EMAIL,
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

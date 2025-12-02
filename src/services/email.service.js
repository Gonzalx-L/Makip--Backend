import sgMail from "@sendgrid/mail";
import "dotenv/config";
import axios from "axios";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const FROM_EMAIL = process.env.EMAIL_FROM;

// --- HELPER: Convertir logo a base64 ---
const LOGO_URL = "https://storage.googleapis.com/makip-archivos-2025/logos/Makip-logo.png";
let logoBase64Cache = null;

const getLogoBase64 = async () => {
  if (logoBase64Cache) return logoBase64Cache;
  
  try {
    const response = await axios.get(LOGO_URL, { responseType: "arraybuffer" });
    const base64 = Buffer.from(response.data, "binary").toString("base64");
    logoBase64Cache = `data:image/png;base64,${base64}`;
    console.log("[EMAIL] Logo convertido a base64 exitosamente");
    return logoBase64Cache;
  } catch (error) {
    console.error("[EMAIL] Error al convertir logo a base64:", error);
    // Fallback a URL externa
    return LOGO_URL;
  }
};

// --- CORREO DE BIENVENIDA ---
export const sendWelcomeEmail = async (toEmail, name) => {
  console.log("[DEBUG] FROM_EMAIL:", FROM_EMAIL);
  console.log(`[EMAIL] Intentando enviar correo de bienvenida a: ${toEmail}`);
  try {
    const msg = {
      to: toEmail,
      from: { name: "Makip", email: FROM_EMAIL },
      subject: "¡Bienvenido/a a Makip! 🎉",
      html: `
        <div style="background: #f7fafc; padding: 36px 0; font-family: 'Segoe UI', Arial, sans-serif;">
          <div style="max-width: 500px; background: #fff; margin: auto; border-radius: 16px; box-shadow: 0 2px 12px #0001; padding: 32px;">
            <div style="text-align:center; margin-bottom: 20px;">
              <img src="https://storage.googleapis.com/makip-archivos-2025/logos/Makip-logo.png" alt="Makip Logo" style="max-width:120px; margin-bottom:8px;" />
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
      from: { name: "Makip", email: FROM_EMAIL },
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
  const logoSrc = await getLogoBase64();
  
  let pdfAttachment = undefined;
  try {
    console.log(`[EMAIL] Descargando PDF desde: ${pdfUrl}`);
    const response = await axios.get(pdfUrl, { responseType: "arraybuffer" });
    const pdfBuffer = Buffer.from(response.data, "binary");
    pdfAttachment = pdfBuffer.toString("base64");
    console.log(`[EMAIL] PDF descargado y convertido a base64, tamaño: ${pdfAttachment.length} caracteres`);
  } catch (error) {
    console.error(`[EMAIL] ❌ Error al descargar el PDF ${pdfUrl} para adjuntar:`, error.message);
    console.error(`[EMAIL] Stack trace:`, error.stack);
  }

  const msg = {
    to: toEmail,
    from: { name: "Makip", email: FROM_EMAIL },
    subject: `¡Pago confirmado! Pedido #${orderId} ✅`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f4f7fa; font-family: 'Segoe UI', Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7fa; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;">
                
                <!-- Header con logo -->
                <tr>
                  <td style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 32px 40px; text-align: center;">
                    <img src="${logoSrc}" alt="Makip" style="max-width: 120px; margin-bottom: 16px; display: block; margin-left: auto; margin-right: auto;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">¡Pago Confirmado! ✅</h1>
                  </td>
                </tr>
                
                <!-- Contenido principal -->
                <tr>
                  <td style="padding: 40px 40px 32px 40px;">
                    <p style="color: #333333; font-size: 18px; margin: 0 0 24px 0; line-height: 1.6;">
                      ¡Hola <strong style="color: #059669;">${name}</strong>!
                    </p>
                    
                    <div style="background: #d1fae5; border-left: 4px solid #059669; padding: 20px; border-radius: 8px; margin: 24px 0;">
                      <p style="margin: 0; color: #555; font-size: 16px; line-height: 1.6;">
                        ✅ Hemos confirmado tu pago para el pedido <strong>#${orderId}</strong>.<br><br>
                        Tu pedido ha pasado al estado <strong style="color: #059669;">"Pendiente"</strong> y pronto comenzaremos con la producción.
                      </p>
                    </div>
                    
                    <p style="color: #666; font-size: 15px; line-height: 1.6; margin: 24px 0;">
                      ${pdfAttachment ? '📄 Adjuntamos la boleta/factura de tu pedido para tus registros.' : ''}
                      Te mantendremos informado sobre el progreso de tu pedido.
                    </p>
                    
                    <!-- Botón -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                      <tr>
                        <td align="center">
                          <a href="https://makip.pe" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff; text-decoration: none; border-radius: 50px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(5,150,105,0.3);">
                            Ver mis pedidos →
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="color: #888; font-size: 14px; line-height: 1.6; margin: 32px 0 0 0;">
                      ¡Gracias por tu confianza! 💚<br>
                      <strong>El equipo Makip</strong>
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background: #f8fafc; padding: 24px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0 0 8px 0; color: #999; font-size: 13px;">
                      ¿Tienes preguntas? Escríbenos a <a href="mailto:${FROM_EMAIL}" style="color: #059669; text-decoration: none;">${FROM_EMAIL}</a>
                    </p>
                    <p style="margin: 0; color: #bbb; font-size: 12px;">
                      © ${new Date().getFullYear()} Makip. Todos los derechos reservados.
                    </p>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
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
      : [],
  };

  try {
    console.log(`[EMAIL] Intentando enviar correo de confirmación a: ${toEmail}`);
    console.log(`[EMAIL] - Orden: #${orderId}`);
    console.log(`[EMAIL] - Cliente: ${name}`);
    console.log(`[EMAIL] - PDF URL: ${pdfUrl}`);
    console.log(`[EMAIL] - PDF adjunto: ${pdfAttachment ? 'SÍ' : 'NO'}`);
    
    await sgMail.send(msg);
    console.log(`[EMAIL] ✅ Correo de confirmación enviado exitosamente a ${toEmail}`);
  } catch (error) {
    console.error("[EMAIL] ❌ Error al enviar correo de confirmación:", error);
    if (error.response) {
      console.error("[EMAIL] Detalle de SendGrid:", error.response.body);
    }
  }
};

// --- CORREO DE PEDIDO EN PRODUCCIÓN ---
export const sendOrderInProductionEmail = async (toEmail, name, orderId) => {
  const logoSrc = await getLogoBase64();
  
  try {
    const msg = {
      to: toEmail,
      from: { name: "Makip", email: FROM_EMAIL },
      subject: `¡Tu pedido #${orderId} está en producción! 🚀`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f4f7fa; font-family: 'Segoe UI', Arial, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7fa; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;">
                  
                  <!-- Header con logo -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #1E63FF 0%, #0D47A1 100%); padding: 32px 40px; text-align: center;">
                      <img src="${logoSrc}" alt="Makip" style="max-width: 120px; margin-bottom: 16px; display: block; margin-left: auto; margin-right: auto;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">¡Tu pedido está en producción! 🚀</h1>
                    </td>
                  </tr>
                  
                  <!-- Contenido principal -->
                  <tr>
                    <td style="padding: 40px 40px 32px 40px;">
                      <p style="color: #333333; font-size: 18px; margin: 0 0 24px 0; line-height: 1.6;">
                        Hola <strong style="color: #1E63FF;">${name}</strong>,
                      </p>
                      
                      <div style="background: #f8fafc; border-left: 4px solid #1E63FF; padding: 20px; border-radius: 8px; margin: 24px 0;">
                        <p style="margin: 0; color: #555; font-size: 16px; line-height: 1.6;">
                          ✅ Tu pedido <strong>#${orderId}</strong> ha pasado a la fase de <strong style="color: #1E63FF;">producción</strong>.<br><br>
                          Nuestro equipo está trabajando en tu producto personalizado con mucho cuidado y dedicación.
                        </p>
                      </div>
                      
                      <p style="color: #666; font-size: 15px; line-height: 1.6; margin: 24px 0;">
                        Te mantendremos informado de cada avance y te avisaremos en cuanto tu pedido esté terminado y listo para entrega o recojo.
                      </p>
                      
                      <!-- Botón -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                        <tr>
                          <td align="center">
                            <a href="https://makip.pe" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #1E63FF 0%, #0D47A1 100%); color: #ffffff; text-decoration: none; border-radius: 50px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(30,99,255,0.3);">
                              Ver estado de mi pedido →
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="color: #888; font-size: 14px; line-height: 1.6; margin: 32px 0 0 0;">
                        Gracias por confiar en nosotros. 💙<br>
                        <strong>El equipo Makip</strong>
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background: #f8fafc; padding: 24px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                      <p style="margin: 0 0 8px 0; color: #999; font-size: 13px;">
                        ¿Tienes preguntas? Escríbenos a <a href="mailto:${FROM_EMAIL}" style="color: #1E63FF; text-decoration: none;">${FROM_EMAIL}</a>
                      </p>
                      <p style="margin: 0; color: #bbb; font-size: 12px;">
                        © ${new Date().getFullYear()} Makip. Todos los derechos reservados.
                      </p>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    };
    await sgMail.send(msg);
    console.log(`[EMAIL] ✅ Correo de producción enviado a: ${toEmail}`);
  } catch (error) {
    console.error("[EMAIL] ❌ Error en correo de producción:", error);
    if (error.response) {
      console.error(error.response.body);
    }
  }
};

// --- CORREO DE PEDIDO COMPLETADO CON PDF ---
export const sendOrderCompletedEmail = async (toEmail, name, orderId, pdfUrl) => {
  const logoSrc = await getLogoBase64();
  
  let pdfAttachment = undefined;
  try {
    const response = await axios.get(pdfUrl, { responseType: "arraybuffer" });
    const pdfBuffer = Buffer.from(response.data, "binary");
    pdfAttachment = pdfBuffer.toString("base64");
  } catch (error) {
    console.error(`[Email] Error al descargar el PDF ${pdfUrl} para adjuntar:`, error);
  }

  try {
    const msg = {
      to: toEmail,
      from: { name: "Makip", email: FROM_EMAIL },
      subject: `¡Tu pedido #${orderId} está listo! 🎉`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f4f7fa; font-family: 'Segoe UI', Arial, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7fa; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;">
                  
                  <!-- Header con logo -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 32px 40px; text-align: center;">
                      <img src="${logoSrc}" alt="Makip" style="max-width: 120px; margin-bottom: 16px; display: block; margin-left: auto; margin-right: auto;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">¡Tu pedido está listo! 🎉</h1>
                    </td>
                  </tr>
                  
                  <!-- Contenido principal -->
                  <tr>
                    <td style="padding: 40px 40px 32px 40px;">
                      <p style="color: #333333; font-size: 18px; margin: 0 0 24px 0; line-height: 1.6;">
                        Hola <strong style="color: #10B981;">${name}</strong>,
                      </p>
                      
                      <div style="background: #f0fdf4; border-left: 4px solid #10B981; padding: 20px; border-radius: 8px; margin: 24px 0;">
                        <p style="margin: 0; color: #555; font-size: 16px; line-height: 1.6;">
                          ✅ ¡Excelentes noticias! Tu pedido <strong>#${orderId}</strong> ha sido <strong style="color: #10B981;">completado</strong> y está listo.<br><br>
                          ${pdfAttachment ? '📄 Hemos adjuntado tu comprobante de pago en este correo.' : ''}
                        </p>
                      </div>
                      
                      <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 16px; margin: 24px 0;">
                        <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
                          <strong>📍 Próximos pasos:</strong><br>
                          • Si elegiste <strong>delivery</strong>, te contactaremos para coordinar la entrega<br>
                          • Si elegiste <strong>recojo</strong>, puedes pasar a recogerlo cuando gustes
                        </p>
                      </div>
                      
                      <!-- Botón -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                        <tr>
                          <td align="center">
                            <a href="https://makip.pe" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: #ffffff; text-decoration: none; border-radius: 50px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(16,185,129,0.3);">
                              Volver a la tienda →
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="color: #888; font-size: 14px; line-height: 1.6; margin: 32px 0 0 0;">
                        ¡Gracias por tu preferencia! 💚<br>
                        <strong>El equipo Makip</strong>
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background: #f8fafc; padding: 24px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                      <p style="margin: 0 0 8px 0; color: #999; font-size: 13px;">
                        ¿Tienes preguntas? Escríbenos a <a href="mailto:${FROM_EMAIL}" style="color: #10B981; text-decoration: none;">${FROM_EMAIL}</a>
                      </p>
                      <p style="margin: 0; color: #bbb; font-size: 12px;">
                        © ${new Date().getFullYear()} Makip. Todos los derechos reservados.
                      </p>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
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
        : [],
    };
    await sgMail.send(msg);
    console.log(`[EMAIL] Correo de completado enviado a: ${toEmail}`);
  } catch (error) {
    console.error("[EMAIL] Error en correo de completado:", error);
    if (error.response) {
      console.error(error.response.body);
    }
  }
};

// --- CORREO DE CONFIRMACIÓN DE ENVÍO CON BOLETA ---
export const sendShippingConfirmationEmail = async (order, shippingData, shippingReceiptUrl) => {
  try {
    console.log(`[EMAIL SHIPPING] Enviando confirmación de envío para orden #${order.order_id}...`);
    
    const logoBase64 = await getLogoBase64();
    
    // Descargar imagen de la boleta y convertirla a base64
    let receiptBase64 = null;
    try {
      console.log(`[EMAIL SHIPPING] Descargando boleta desde: ${shippingReceiptUrl}`);
      const response = await axios.get(shippingReceiptUrl, { responseType: "arraybuffer" });
      receiptBase64 = Buffer.from(response.data, "binary").toString("base64");
      console.log(`[EMAIL SHIPPING] Boleta descargada y convertida a base64`);
    } catch (error) {
      console.error("[EMAIL SHIPPING] Error al descargar boleta:", error);
    }

    const trackingCode = `MKP${String(order.order_id).padStart(6, "0")}`;
    
    const msg = {
      to: order.client_email,
      from: { name: "Makip", email: FROM_EMAIL },
      subject: `📦 ¡Tu pedido ${trackingCode} está en camino!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { margin: 0; padding: 0; background: #f7fafc; font-family: 'Segoe UI', Arial, sans-serif; }
            .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #1E63FF 0%, #0D47A1 100%); padding: 40px 30px; text-align: center; color: #fff; }
            .logo { max-width: 120px; margin-bottom: 16px; }
            .title { font-size: 28px; font-weight: bold; margin: 0 0 8px 0; }
            .subtitle { font-size: 16px; opacity: 0.95; margin: 0; }
            .content { padding: 40px 30px; }
            .greeting { font-size: 20px; color: #333; margin: 0 0 20px 0; }
            .text { font-size: 16px; color: #555; line-height: 1.6; margin: 0 0 20px 0; }
            .tracking-box { background: #EFF6FF; border-left: 4px solid #1E63FF; padding: 20px; margin: 24px 0; border-radius: 8px; }
            .tracking-label { font-size: 14px; color: #666; margin: 0 0 8px 0; }
            .tracking-number { font-size: 24px; font-weight: bold; color: #1E63FF; margin: 0; font-family: 'Courier New', monospace; }
            .shipping-info { background: #F9FAFB; padding: 24px; border-radius: 12px; margin: 24px 0; }
            .info-row { display: flex; margin-bottom: 12px; }
            .info-label { font-weight: bold; color: #333; min-width: 140px; font-size: 15px; }
            .info-value { color: #555; font-size: 15px; }
            .receipt-section { margin: 30px 0; text-align: center; }
            .receipt-title { font-size: 18px; font-weight: bold; color: #333; margin: 0 0 16px 0; }
            .receipt-image { max-width: 100%; height: auto; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
            .footer { background: #F9FAFB; padding: 30px; text-align: center; border-top: 1px solid #E5E7EB; }
            .footer-text { font-size: 14px; color: #666; margin: 0; }
            .emoji { font-size: 48px; margin: 0 0 16px 0; }
          </style>
        </head>
        <body>
          <table class="container" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td class="header">
                <img src="${logoBase64}" alt="Makip Logo" class="logo" />
                <div class="title">¡Tu pedido está en camino! 📦</div>
                <div class="subtitle">Tu paquete ha sido enviado</div>
              </td>
            </tr>
            <tr>
              <td class="content">
                <div class="emoji">🚚</div>
                <p class="greeting">¡Hola ${order.client_name}!</p>
                <p class="text">
                  Nos complace informarte que tu pedido <b>${trackingCode}</b> ha sido enviado 
                  y está en camino hacia ti.
                </p>

                <div class="tracking-box">
                  <p class="tracking-label">📍 Código de Seguimiento:</p>
                  <p class="tracking-number">${trackingCode}</p>
                </div>

                <div class="shipping-info">
                  <div class="info-row">
                    <span class="info-label">🚚 Empresa de envío:</span>
                    <span class="info-value">${shippingData.company}</span>
                  </div>
                  ${shippingData.trackingNumber && shippingData.trackingNumber !== 'N/A' ? `
                  <div class="info-row">
                    <span class="info-label">📦 N° de Guía:</span>
                    <span class="info-value">${shippingData.trackingNumber}</span>
                  </div>
                  ` : ''}
                  ${shippingData.destination && shippingData.destination !== 'N/A' ? `
                  <div class="info-row">
                    <span class="info-label">📍 Destino:</span>
                    <span class="info-value">${shippingData.destination}</span>
                  </div>
                  ` : ''}
                  <div class="info-row">
                    <span class="info-label">📅 Fecha de envío:</span>
                    <span class="info-value">${shippingData.shippingDate}</span>
                  </div>
                </div>

                ${(shippingData.senderName || shippingData.recipientName) ? `
                <div class="shipping-info" style="margin-top: 20px;">
                  <h4 style="color: #333; margin: 0 0 12px 0; font-size: 16px;">👤 Información de Envío</h4>
                  
                  ${shippingData.senderName && shippingData.senderName !== 'N/A' ? `
                  <p style="font-weight: bold; color: #1E63FF; margin: 12px 0 8px 0;">📤 Remitente</p>
                  <div class="info-row">
                    <span class="info-label">Nombre:</span>
                    <span class="info-value">${shippingData.senderName}</span>
                  </div>
                  ${shippingData.senderDni && shippingData.senderDni !== 'N/A' ? `
                  <div class="info-row">
                    <span class="info-label">DNI/RUC:</span>
                    <span class="info-value">${shippingData.senderDni}</span>
                  </div>
                  ` : ''}
                  ${shippingData.senderPhone && shippingData.senderPhone !== 'N/A' ? `
                  <div class="info-row">
                    <span class="info-label">Teléfono:</span>
                    <span class="info-value">${shippingData.senderPhone}</span>
                  </div>
                  ` : ''}
                  ` : ''}
                  
                  ${shippingData.recipientName && shippingData.recipientName !== 'N/A' ? `
                  <p style="font-weight: bold; color: #1E63FF; margin: 16px 0 8px 0;">📥 Destinatario</p>
                  <div class="info-row">
                    <span class="info-label">Nombre:</span>
                    <span class="info-value">${shippingData.recipientName}</span>
                  </div>
                  ${shippingData.recipientDni && shippingData.recipientDni !== 'N/A' ? `
                  <div class="info-row">
                    <span class="info-label">DNI/RUC:</span>
                    <span class="info-value">${shippingData.recipientDni}</span>
                  </div>
                  ` : ''}
                  ${shippingData.recipientPhone && shippingData.recipientPhone !== 'N/A' ? `
                  <div class="info-row">
                    <span class="info-label">Teléfono:</span>
                    <span class="info-value">${shippingData.recipientPhone}</span>
                  </div>
                  ` : ''}
                  ` : ''}
                </div>
                ` : ''}

                ${receiptBase64 ? `
                <div class="receipt-section">
                  <p class="receipt-title">📄 Boleta de Envío</p>
                  <img src="data:image/jpeg;base64,${receiptBase64}" alt="Boleta de Envío" class="receipt-image" />
                </div>
                ` : ''}

                <p class="text">
                  Te notificaremos cuando tu pedido esté listo para ser recogido o llegue a tu domicilio.
                </p>

                <p class="text" style="margin-top: 30px;">
                  <b>¿Tienes alguna pregunta?</b><br>
                  Contáctanos a través de WhatsApp: <a href="https://wa.me/51981266608" style="color: #1E63FF;">+51 981 266 608</a>
                </p>
              </td>
            </tr>
            <tr>
              <td class="footer">
                <p class="footer-text">Gracias por confiar en <b>Makip</b> 💙</p>
                <p class="footer-text" style="margin-top: 8px;">
                  <a href="https://makip.pe" style="color: #1E63FF; text-decoration: none;">makip.pe</a>
                </p>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    };

    await sgMail.send(msg);
    console.log(`[EMAIL SHIPPING] ✅ Correo de envío enviado exitosamente a: ${order.client_email}`);
    
  } catch (error) {
    console.error("[EMAIL SHIPPING] ❌ Error al enviar correo:", error);
    if (error.response) {
      console.error(error.response.body);
    }
    throw error;
  }
};

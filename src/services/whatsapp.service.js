import axios from "axios";
import "dotenv/config";
import { query } from "../config/db.js";

const { META_API_TOKEN, META_PHONE_NUMBER_ID } = process.env;

// Función base para enviar mensajes
const sendWhatsAppMessage = async (to, data) => {
  if (!META_API_TOKEN || !META_PHONE_NUMBER_ID) {
    console.warn(
      "Faltan variables de entorno de WhatsApp. Mensaje no enviado."
    );
    return;
  }
  // 💡 Asegurarse que el número tenga el prefijo de país (ej. 51)
  if (!to.startsWith("51")) {
    console.warn(
      `Número de teléfono (${to}) no tiene prefijo 51. Añadiendo...`
    );
    to = `51${to}`;
  }

  try {
    await axios.post(
      `https://graph.facebook.com/v19.0/${META_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: to, // Número del cliente (ej: '51999888777')
        ...data, // El cuerpo del mensaje
      },
      {
        headers: {
          Authorization: `Bearer ${META_API_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log(`Mensaje de WhatsApp enviado a ${to}`);
  } catch (error) {
    console.error(
      `Error al enviar WhatsApp a ${to}:`,
      error.response?.data || error.message
    );
  }
};

// --- OBTENER TELÉFONO ---
const getClientPhone = async (clientId) => {
  try {
    const result = await query(
      "SELECT phone FROM clients WHERE client_id = $1",
      [clientId]
    );
    if (result.rows.length > 0 && result.rows[0].phone) {
      return result.rows[0].phone.replace(/[^0-9]/g, ""); // Limpia el número
    }
    console.warn(
      `[WhatsApp] No se encontró teléfono para el client_id: ${clientId}`
    );
    return null;
  } catch (error) {
    console.error("Error al obtener teléfono del cliente:", error);
    return null;
  }
};

// --- EN EJECUCIÓN (PRODUCCIÓN) ---
export const sendExecutionNotification = async (
  clientId,
  orderId,
  mockupUrl
) => {
  const clientPhone = await getClientPhone(clientId);
  if (!clientPhone) return;

  const messageData = {
    type: "template",
    template: {
      name: "order_in_production", // Plantilla Meta, DEBES crearla en WhatsApp
      language: { code: "es_MX" },
      components: [
        {
          type: "header",
          parameters: [{ type: "image", image: { link: mockupUrl } }],
        },
        {
          type: "body",
          parameters: [{ type: "text", text: `${orderId}` }],
        },
      ],
    },
  };
  await sendWhatsAppMessage(clientPhone, messageData);
};

// --- COMPLETADO (con o sin PDF) ---
export const sendCompletedNotification = async (clientId, orderId, pdfUrl = null) => {
  const clientPhone = await getClientPhone(clientId);
  if (!clientPhone) return;

  let messageData;
  if (pdfUrl) {
    // Si quieres adjuntar el PDF de factura al mensaje de completado
    messageData = {
      type: "template",
      template: {
        name: "order_completed_with_pdf", // Crea esta plantilla en Meta, con documento
        language: { code: "es_MX" },
        components: [
          {
            type: "header",
            parameters: [
              {
                type: "document",
                document: {
                  link: pdfUrl,
                  filename: `Pedido_${orderId}.pdf`,
                },
              },
            ],
          },
          {
            type: "body",
            parameters: [{ type: "text", text: `${orderId}` }],
          },
        ],
      },
    };
  } else {
    // Notificación simple (solo texto)
    messageData = {
      type: "template",
      template: {
        name: "order_completed", // Plantilla simple en Meta
        language: { code: "es_MX" },
        components: [
          {
            type: "body",
            parameters: [{ type: "text", text: `${orderId}` }],
          },
        ],
      },
    };
  }
  await sendWhatsAppMessage(clientPhone, messageData);
};

// --- PAGO APROBADO (Factura PDF) ---
export const sendInvoiceNotification = async (clientId, orderId, pdfUrl) => {
  const clientPhone = await getClientPhone(clientId);
  if (!clientPhone) return;

  const messageData = {
    type: "template",
    template: {
      name: "order_payment_confirmed", // Plantilla Meta, con documento adjunto
      language: { code: "es_MX" },
      components: [
        {
          type: "header",
          parameters: [
            {
              type: "document",
              document: {
                link: pdfUrl,
                filename: `Pedido_${orderId}.pdf`,
              },
            },
          ],
        },
        {
          type: "body",
          parameters: [{ type: "text", text: `${orderId}` }],
        },
      ],
    },
  };
  await sendWhatsAppMessage(clientPhone, messageData);
};

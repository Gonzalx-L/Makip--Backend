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

/**
 * 💡 (¡MODIFICADO!) Obtiene el número de teléfono real de un cliente desde la BD
 */
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

/**
 * Envía la notificación de "En Ejecución" con el mockup
 */
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
      name: "order_in_production", // Nombre de la plantilla que creaste en Meta
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

/**
 * Envía la notificación de "Pedido Terminado"
 */
export const sendCompletedNotification = async (clientId, orderId) => {
  const clientPhone = await getClientPhone(clientId);
  if (!clientPhone) return;

  const messageData = {
    type: "template",
    template: {
      name: "order_completed", // Nombre de la plantilla que creaste en Meta
      language: { code: "es_MX" },
      components: [
        {
          type: "body",
          parameters: [{ type: "text", text: `${orderId}` }],
        },
      ],
    },
  };
  await sendWhatsAppMessage(clientPhone, messageData);
};

// 💡 --- ¡NUEVA FUNCIÓN! ---
/**
 * Envía la Factura/PDF del pedido cuando el pago es aprobado
 */
export const sendInvoiceNotification = async (clientId, orderId, pdfUrl) => {
  const clientPhone = await getClientPhone(clientId);
  if (!clientPhone) return;

  const messageData = {
    type: "template",
    template: {
      // 💡 (Debes crear esta plantilla en Meta)
      name: "order_payment_confirmed",
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

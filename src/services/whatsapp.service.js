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
 * Obtiene el número de teléfono de un cliente desde la BD
 * (¡IMPORTANTE! Tu tabla 'clients' necesita una columna 'phone')
 */
const getClientPhone = async (clientId) => {
  // === ¡ACCION REQUERIDA! ===
  // Esto asume que tienes una columna 'phone' en tu tabla 'clients'.
  // Si no la tienes, debes añadirla:
  // ALTER TABLE clients ADD COLUMN phone VARCHAR(20);
  // Y asegurarte de que el cliente la ingrese al registrarse.

  // Por ahora, vamos a simularlo:
  // const result = await query('SELECT phone FROM clients WHERE client_id = $1', [clientId]);
  // if (result.rows.length > 0 && result.rows[0].phone) {
  //   return result.rows[0].phone;
  // }

  // *** SIMULACIÓN TEMPORAL ***
  // Reemplaza esto con la consulta real cuando tengas el campo 'phone'
  console.warn("Simulando número de teléfono. Implementar consulta a BD.");
  return "51999888777"; // <-- REEMPLAZAR CON TU NÚMERO DE PRUEBA
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

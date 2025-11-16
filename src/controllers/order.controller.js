// src/controllers/admin.order.controller.js
import { query } from "../config/db.js";
import { generateMockup } from "../services/mockup.service.js";
import {
  sendExecutionNotification,
  sendCompletedNotification,
} from "../services/whatsapp.service.js";
// 💡 1. Importa la función renombrada
import { pipePDFToResponse } from "../services/pdf.service.js";

// --- (ADMIN) OBTENER TODOS LOS PEDIDOS ---
export const getAllOrders = async (req, res) => {
  try {
    const result = await query(`
      SELECT o.*, c.name as client_name, c.email as client_email
      FROM orders o
      JOIN clients c ON o.client_id = c.client_id
      ORDER BY o.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener todos los pedidos:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// --- (ADMIN) OBTENER UN PEDIDO ESPECÍFICO (CON SUS ARTÍCULOS) ---
export const getOrderById = async (req, res) => {
  const { id } = req.params;
  try {
    const orderResult = await query(
      `
      SELECT o.*, c.name as client_name, c.email as client_email
      FROM orders o
      JOIN clients c ON o.client_id = c.client_id
      WHERE o.order_id = $1
    `,
      [id]
    );
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ message: "Pedido no encontrado" });
    }
    const itemsResult = await query(
      `
      SELECT oi.*, p.name as product_name
      FROM order_items oi
      JOIN products p ON oi.product_id = p.product_id
      WHERE oi.order_id = $1
    `,
      [id]
    );
    const orderDetails = orderResult.rows[0];
    orderDetails.items = itemsResult.rows;
    res.json(orderDetails);
  } catch (error) {
    console.error("Error al obtener el detalle del pedido:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// --- (ADMIN) CAMBIAR EL ESTADO DE UN PEDIDO ---
export const updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const validStatus = [
    "PAGO_EN_VERIFICACION",
    "PENDIENTE",
    "EN_EJECUCION",
    "TERMINADO",
    "CANCELADO",
  ];
  if (!status || !validStatus.includes(status)) {
    return res.status(400).json({ message: "Estado no válido" });
  }
  try {
    const result = await query(
      "UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE order_id = $2 RETURNING *",
      [status, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Pedido no encontrado" });
    }
    const updatedOrder = result.rows[0];

    // --- ¡AQUÍ DISPARAMOS LA MAGIA! ---
    if (updatedOrder.status === "EN_EJECUCION") {
      console.log(
        `PEDIDO #${updatedOrder.order_id} EN EJECUCIÓN. Iniciando generación de mockups...`
      );
      const itemsResult = await query(
        "SELECT * FROM order_items WHERE order_id = $1",
        [updatedOrder.order_id]
      );
      for (const item of itemsResult.rows) {
        if (item.personalization_data && item.personalization_data.image_url) {
          generateMockup(item)
            .then((mockupUrl) => {
              if (mockupUrl) {
                console.log(
                  `Mockup para item ${item.order_item_id} listo. Enviando por WhatsApp...`
                );
                sendExecutionNotification(
                  updatedOrder.client_id,
                  updatedOrder.order_id,
                  mockupUrl
                );
                return;
              }
            })
            .catch((err) => {
              console.error(
                `Fallo en el proceso de mockup para item ${item.order_item_id}:`,
                err
              );
            });
          break;
        }
      }
    } else if (updatedOrder.status === "TERMINADO") {
      console.log(
        `PEDIDO #${updatedOrder.order_id} TERMINADO. Enviando notificación...`
      );
      sendCompletedNotification(updatedOrder.client_id, updatedOrder.order_id);

      // 💡 (AQUÍ PODRÍAMOS ENVIAR EL PDF FINAL, pero lo haremos al validar el pago)
    }
    res.json(updatedOrder);
  } catch (error) {
    console.error("Error al actualizar estado del pedido:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// 💡 --- (MODIFICADA) DESCARGAR ORDEN EN PDF ---
export const downloadOrderPDF = async (req, res) => {
  const { id } = req.params;
  try {
    // 1. Obtener los detalles del pedido
    const orderResult = await query(
      `
      SELECT o.*, c.name as client_name, c.email as client_email
      FROM orders o
      JOIN clients c ON o.client_id = c.client_id
      WHERE o.order_id = $1
    `,
      [id]
    );
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ message: "Pedido no encontrado" });
    }
    // 2. Obtener los artículos (items) de ese pedido
    const itemsResult = await query(
      `
      SELECT oi.*, p.name as product_name
      FROM order_items oi
      JOIN products p ON oi.product_id = p.product_id
      WHERE oi.order_id = $1
    `,
      [id]
    );
    const orderDetails = orderResult.rows[0];
    orderDetails.items = itemsResult.rows;

    // 3. Configurar la respuesta para que sea un PDF
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=orden_makip_${id}.pdf`
    );

    // 4. Llamar al servicio de PDF (la función que hace res.pipe)
    pipePDFToResponse(orderDetails, res); // 💡 Usa la función renombrada
  } catch (error) {
    console.error("Error al generar PDF del pedido:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

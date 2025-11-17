// src/controllers/admin.order.controller.js
import { query } from "../config/db.js";
import { generateMockup } from "../services/mockup.service.js";
import {
  sendExecutionNotification,
  sendCompletedNotification,
} from "../services/whatsapp.service.js";
// 💡 1. IMPORTA EL NUEVO SERVICIO PDF
import { generateOrderPDFBuffer } from "../services/pdf.service.js";

// --- (ADMIN) OBTENER TODOS LOS PEDIDOS ---
export const getAllOrders = async (req, res) => {
  // ... (código existente sin cambios) ...
};

// --- (ADMIN) OBTENER UN PEDIDO ESPECÍFICO (CON SUS ARTÍCULOS) ---
export const getOrderById = async (req, res) => {
  // ... (código existente sin cambios) ...
};

// --- (ADMIN) CAMBIAR EL ESTADO DE UN PEDIDO ---
export const updateOrderStatus = async (req, res) => {
  // ... (código existente sin cambios) ...
};

// 💡 --- (NUEVA) DESCARGAR ORDEN EN PDF ---
export const downloadOrderPDF = async (req, res) => {
  const { id } = req.params;
  try {
    // 1. Obtener los detalles del pedido (Usamos la misma lógica que getOrderById)
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

    // 4. Llamar al servicio de PDF
    generateOrderPDF(orderDetails, res);
  } catch (error) {
    console.error("Error al generar PDF del pedido:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

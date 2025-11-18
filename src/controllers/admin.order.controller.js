// src/controllers/admin.order.controller.js
import { query } from "../config/db.js";
import { generateMockup } from "../services/mockup.service.js";
import {
  sendExecutionNotification,
  sendCompletedNotification,
} from "../services/whatsapp.service.js";
import { pipePDFToResponse } from "../services/pdf.service.js";

// --- (ADMIN) OBTENER TODOS LOS PEDIDOS ---
export const getAllOrders = async (req, res) => {
  try {
    const result = await query(
      `SELECT 
         o.order_id,
         o.client_id,
         c.name  as client_name,
         c.email as client_email,
         o.status,
         o.total_price,
         o.created_at,
         o.updated_at
       FROM orders o
       JOIN clients c ON o.client_id = c.client_id
       ORDER BY o.created_at DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener todos los pedidos:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// --- (ADMIN) OBTENER UN PEDIDO ESPECÍFICO (CON ITEMS) ---
export const getOrderById = async (req, res) => {
  const { id } = req.params;

  try {
    const orderResult = await query(
      `SELECT 
         o.*,
         c.name  as client_name,
         c.email as client_email,
         c.phone as client_phone
       FROM orders o
       JOIN clients c ON o.client_id = c.client_id
       WHERE o.order_id = $1`,
      [id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ message: "Pedido no encontrado" });
    }

    const itemsResult = await query(
      `SELECT 
         oi.*,
         p.name as product_name
       FROM order_items oi
       JOIN products p ON oi.product_id = p.product_id
       WHERE oi.order_id = $1`,
      [id]
    );

    const order = orderResult.rows[0];
    order.items = itemsResult.rows;

    res.json(order);
  } catch (error) {
    console.error("Error al obtener pedido:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// --- (ADMIN) CAMBIAR EL ESTADO DE UN PEDIDO ---
export const updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = [
    "NO_PAGADO",
    "PAGO_EN_VERIFICACION",
    "PENDIENTE",
    "EN_EJECUCION",
    "COMPLETADO",
    "CANCELADO",
  ];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: "Estado inválido" });
  }

  try {
    // 1. Obtener la orden actual
    const orderResult = await query(
      `SELECT 
         o.order_id,
         o.client_id,
         o.status,
         c.phone,
         c.name as client_name
       FROM orders o
       JOIN clients c ON o.client_id = c.client_id
       WHERE o.order_id = $1`,
      [id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ message: "Orden no encontrada" });
    }

    const order = orderResult.rows[0];

    // 2. Actualizar estado
    const updatedResult = await query(
      `UPDATE orders 
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE order_id = $2
       RETURNING *`,
      [status, id]
    );

    const updatedOrder = updatedResult.rows[0];

    // 3. Orquestación según nuevo estado
    if (status === "EN_EJECUCION") {
      // Generar mockup y enviar WhatsApp con imagen
      const itemsResult = await query(
        `SELECT 
           oi.*,
           p.name as product_name
         FROM order_items oi
         JOIN products p ON oi.product_id = p.product_id
         WHERE oi.order_id = $1`,
        [id]
      );

      const items = itemsResult.rows;

      if (items.length > 0) {
        const mockupUrl = await generateMockup(items[0]);

        if (mockupUrl) {
          await sendExecutionNotification(
            order.client_id,
            order.order_id,
            mockupUrl
          );
        }
      }
    }

    if (status === "COMPLETADO") {
      // Notificación de pedido completado
      await sendCompletedNotification(order.client_id, order.order_id);
    }

    res.json({
      message: "Estado actualizado correctamente",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Error al actualizar estado de orden:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// --- (ADMIN) DESCARGAR ORDEN EN PDF ---
export const downloadOrderPDF = async (req, res) => {
  const { id } = req.params;

  try {
    // Obtener orden + cliente
    const orderResult = await query(
      `SELECT 
         o.*,
         c.name  as client_name,
         c.email as client_email
       FROM orders o
       JOIN clients c ON o.client_id = c.client_id
       WHERE o.order_id = $1`,
      [id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ message: "Pedido no encontrado" });
    }

    // Obtener items
    const itemsResult = await query(
      `SELECT 
         oi.*,
         p.name as product_name
       FROM order_items oi
       JOIN products p ON oi.product_id = p.product_id
       WHERE oi.order_id = $1`,
      [id]
    );

    const orderDetails = orderResult.rows[0];
    orderDetails.items = itemsResult.rows;

    // Headers para PDF
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=orden_makip_${id}.pdf`
    );

    // Generar y enviar PDF al response
    await pipePDFToResponse(orderDetails, res);
  } catch (error) {
    console.error("Error al generar PDF del pedido:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

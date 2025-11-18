// src/controllers/admin.order.controller.js
import { query } from "../config/db.js";
import { generateMockup } from "../services/mockup.service.js";
import {
  sendExecutionNotification,
  sendCompletedNotification,
} from "../services/whatsapp.service.js";

// 💡 1. IMPORTA LA FUNCIÓN CORRECTA (YA NO generateOrderPDFBuffer)
import { pipePDFToResponse } from "../services/pdf.service.js";

// --- (ADMIN) OBTENER TODOS LOS PEDIDOS ---
export const getAllOrders = async (req, res) => {
  try {
    const result = await query(
      `SELECT o.order_id, o.status, o.total_price, o.created_at, o.updated_at,
              c.name as client_name, c.email as client_email
       FROM orders o
       JOIN clients c ON o.client_id = c.client_id
       ORDER BY o.created_at DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener las órdenes:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// --- (ADMIN) OBTENER UN PEDIDO ESPECÍFICO (CON SUS ARTÍCULOS) ---
export const getOrderById = async (req, res) => {
  const { id } = req.params;

  try {
    const orderResult = await query(
      `SELECT o.*, c.name as client_name, c.email as client_email
       FROM orders o
       JOIN clients c ON o.client_id = c.client_id
       WHERE o.order_id = $1`,
      [id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ message: "Pedido no encontrado" });
    }

    const itemsResult = await query(
      `SELECT oi.*, p.name as product_name
       FROM order_items oi
       JOIN products p ON oi.product_id = p.product_id
       WHERE oi.order_id = $1`,
      [id]
    );

    const order = orderResult.rows[0];
    order.items = itemsResult.rows;

    res.json(order);
  } catch (error) {
    console.error("Error al obtener la orden:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// --- (ADMIN) CAMBIAR EL ESTADO DE UN PEDIDO ---
export const updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const allowedStatuses = [
    "NO_PAGADO",
    "PAGO_EN_VERIFICACION",
    "PENDIENTE",
    "EN_EJECUCION",
    "COMPLETADO",
    "CANCELADO",
  ];

  if (!allowedStatuses.includes(status)) {
    return res
      .status(400)
      .json({ message: "Estado no válido para la orden" });
  }

  try {
    const orderResult = await query(
      `SELECT order_id, client_id, status
       FROM orders
       WHERE order_id = $1`,
      [id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ message: "Pedido no encontrado" });
    }

    const order = orderResult.rows[0];

    const updatedResult = await query(
      `UPDATE orders
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE order_id = $2
       RETURNING order_id, client_id, status, updated_at`,
      [status, id]
    );

    // Notificaciones y mockups según el nuevo estado
    if (status === "EN_EJECUCION") {
      const itemsResult = await query(
        `SELECT * FROM order_items WHERE order_id = $1`,
        [id]
      );

      for (const item of itemsResult.rows) {
        const mockupUrl = await generateMockup(item);
        if (mockupUrl) {
          sendExecutionNotification(order.client_id, order.order_id, mockupUrl);
        }
      }
    }

    if (status === "COMPLETADO") {
      sendCompletedNotification(order.client_id, order.order_id);
    }

    res.json({
      message: "Estado actualizado correctamente",
      order: updatedResult.rows[0],
    });
  } catch (error) {
    console.error("Error al actualizar estado del pedido:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// 💡 --- (CORREGIDA) DESCARGAR ORDEN EN PDF ---
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

    // 4. Llamar al servicio de PDF (¡CORREGIDO!)
    //    En lugar de "generateOrderPDF(...)"
    pipePDFToResponse(orderDetails, res);
  } catch (error) {
    console.error("Error al generar PDF del pedido:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

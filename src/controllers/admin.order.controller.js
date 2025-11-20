// src/controllers/admin.order.controller.js
import { query } from "../config/db.js";
import { generateMockup } from "../services/mockup.service.js";
import {
  sendExecutionNotification,
  sendCompletedNotification,
} from "../services/whatsapp.service.js";
import { pipePDFToResponse } from "../services/pdf.service.js";

// --- (ADMIN) OBTENER PEDIDOS POR TIPO DE ENTREGA ---
export const getOrdersByDeliveryType = async (req, res) => {
  const { type } = req.params; // 'DELIVERY' o 'PICKUP'
  
  const validTypes = ['DELIVERY', 'PICKUP'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ message: "Tipo de entrega inválido" });
  }

  try {
    const result = await query(
      `SELECT 
         o.order_id,
         o.client_id,
         c.name  as client_name,
         c.email as client_email,
         o.status,
         o.total_price,
         o.delivery_type,
         o.pickup_code,
         o.payment_proof_url,
         o.created_at,
         o.updated_at
       FROM orders o
       JOIN clients c ON o.client_id = c.client_id
       WHERE o.delivery_type = $1
       ORDER BY o.created_at DESC`,
      [type]
    );

    res.json({
      message: `Pedidos con entrega ${type}`,
      deliveryType: type,
      orders: result.rows
    });
  } catch (error) {
    console.error(`Error al obtener pedidos ${type}:`, error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// --- (ADMIN) BUSCAR PEDIDO POR CÓDIGO DE RECOJO ---
export const getOrderByPickupCode = async (req, res) => {
  const { code } = req.params;

  try {
    const orderResult = await query(
      `SELECT 
         o.*,
         c.name  as client_name,
         c.email as client_email,
         c.phone as client_phone
       FROM orders o
       JOIN clients c ON o.client_id = c.client_id
       WHERE o.pickup_code = $1 AND o.delivery_type = 'PICKUP'`,
      [code]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ 
        message: "No se encontró pedido con ese código de recojo" 
      });
    }

    const itemsResult = await query(
      `SELECT 
         oi.*,
         p.name as product_name
       FROM order_items oi
       JOIN products p ON oi.product_id = p.product_id
       WHERE oi.order_id = $1`,
      [orderResult.rows[0].order_id]
    );

    const order = orderResult.rows[0];
    order.items = itemsResult.rows;

    res.json({
      message: "Pedido encontrado por código de recojo",
      order: order
    });
  } catch (error) {
    console.error("Error al buscar pedido por código:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// --- (ADMIN) OBTENER ESTADÍSTICAS DE PEDIDOS ---
export const getOrderStats = async (req, res) => {
  try {
    // Conteo por tipo de entrega
    const deliveryStats = await query(
      `SELECT 
         delivery_type,
         COUNT(*) as count,
         SUM(total_price) as total_revenue
       FROM orders
       GROUP BY delivery_type`
    );

    // Conteo por estado
    const statusStats = await query(
      `SELECT 
         status,
         delivery_type,
         COUNT(*) as count
       FROM orders
       GROUP BY status, delivery_type
       ORDER BY delivery_type, status`
    );

    // Pedidos pendientes de recojo
    const pendingPickup = await query(
      `SELECT COUNT(*) as count
       FROM orders
       WHERE delivery_type = 'PICKUP' 
       AND status IN ('PENDIENTE', 'EN_EJECUCION', 'TERMINADO')`
    );

    res.json({
      message: "Estadísticas de pedidos",
      deliveryTypeStats: deliveryStats.rows,
      statusStats: statusStats.rows,
      pendingPickupOrders: parseInt(pendingPickup.rows[0].count)
    });
  } catch (error) {
    console.error("Error al obtener estadísticas:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

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
         o.delivery_type,
         o.pickup_code,
         o.payment_proof_url,
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
    "TERMINADO",
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

    if (status === "TERMINADO" || status === "COMPLETADO") {
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

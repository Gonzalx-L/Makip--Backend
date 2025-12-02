// src/controllers/admin.order.controller.js
import { query } from "../config/db.js";
import { generateMockup } from "../services/mockup.service.js";
import {
  sendExecutionNotification,
  sendCompletedNotification,
} from "../services/whatsapp.service.js";
import {
  sendOrderInProductionEmail,
  sendOrderCompletedEmail,
} from "../services/email.service.js";
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
  // Aceptar AMBOS parámetros: "status" o "newStatus" para compatibilidad
  const newStatus = req.body.newStatus || req.body.status;

  // 🔥 LOG COMPLETO DE LO QUE RECIBE EL BACKEND
  console.log(`\n========================================`);
  console.log(`[DEBUG ADMIN] 📥 PETICIÓN RECIBIDA:`);
  console.log(`[DEBUG ADMIN] Order ID: ${id}`);
  console.log(`[DEBUG ADMIN] req.body completo:`, JSON.stringify(req.body, null, 2));
  console.log(`[DEBUG ADMIN] newStatus recibido: "${newStatus}"`);
  console.log(`[DEBUG ADMIN] Tipo de newStatus: ${typeof newStatus}`);
  console.log(`========================================\n`);

  const validStatuses = [
    "NO_PAGADO",
    "PAGO_EN_VERIFICACION",
    "PENDIENTE",
    "EN_EJECUCION",
    "TERMINADO",
    "COMPLETADO",
    "CANCELADO",
  ];

  if (!validStatuses.includes(newStatus)) {
    console.log(`[DEBUG ADMIN] ❌ Estado rechazado: "${newStatus}" no está en la lista`);
    return res.status(400).json({ 
      message: "Estado inválido",
      receivedStatus: newStatus,
      receivedType: typeof newStatus,
      validStatuses: validStatuses
    });
  }

  try {
    // 1. Obtener la orden actual CON DATOS DE EMAIL
    const orderResult = await query(
      `SELECT 
         o.*,
         c.phone,
         c.name as client_name,
         c.email as client_email
       FROM orders o
       JOIN clients c ON o.client_id = c.client_id
       WHERE o.order_id = $1`,
      [id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ message: "Orden no encontrada" });
    }

    const order = orderResult.rows[0];
    const currentStatus = order.status;

    // 2. Actualizar estado
    const updatedResult = await query(
      `UPDATE orders 
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE order_id = $2
       RETURNING *`,
      [newStatus, id]
    );

    const updatedOrder = updatedResult.rows[0];

    console.log(`[NOTIFICACIONES ADMIN] ✅ Orden #${id} actualizada de ${currentStatus} a: ${newStatus}`);
    console.log(`[NOTIFICACIONES ADMIN] 📧 Datos del cliente: ${order.client_name} (${order.client_email})`);

    // 3. 🔥 ENVÍO DE CORREOS SEGÚN EL NUEVO ESTADO
    let notificationsSent = false;
    
    try {
      // PENDIENTE: Si se aprueba manualmente un pago, generar PDF y enviar correo de confirmación
      if (newStatus === "PENDIENTE" && currentStatus === "PAGO_EN_VERIFICACION") {
        console.log(`[EMAIL] 💳 Pago aprobado manualmente por admin para orden #${id}`);
        console.log(`[EMAIL] 📤 Generando PDF y enviando correo de confirmación...`);
        
        // Importar la función generateAndSendInvoice (necesitamos acceso)
        const { generateOrderPDFBuffer } = await import("../services/pdf.service.js");
        const { uploadToGCS } = await import("../services/gcs.service.js");
        const { sendOrderConfirmationEmail } = await import("../services/email.service.js");
        
        // Obtener items de la orden
        const itemsResult = await query(
          `SELECT oi.*, p.name as product_name
           FROM order_items oi
           JOIN products p ON oi.product_id = p.product_id
           WHERE oi.order_id = $1`,
          [id]
        );
        
        const orderData = {
          ...order,
          items: itemsResult.rows
        };
        
        // Generar PDF
        console.log(`[PDF] Generando PDF para orden #${id}...`);
        const pdfBuffer = await generateOrderPDFBuffer(orderData);
        console.log(`[PDF] PDF generado exitosamente, tamaño: ${pdfBuffer.length} bytes`);
        
        // Subir a GCS
        const pdfFile = {
          buffer: pdfBuffer,
          mimetype: "application/pdf",
          originalname: `factura_orden_${id}.pdf`,
        };
        
        console.log(`[PDF] Subiendo PDF a Google Cloud Storage...`);
        const pdfUrl = await uploadToGCS(pdfFile, "invoices");
        console.log(`[PDF] PDF subido exitosamente: ${pdfUrl}`);
        
        // Guardar URL del PDF en la orden
        await query("UPDATE orders SET invoice_pdf_url = $1 WHERE order_id = $2", [pdfUrl, id]);
        console.log(`[PDF] URL del PDF guardada en la base de datos`);
        
        // Enviar correo de confirmación
        console.log(`[EMAIL] 📤 Enviando correo de confirmación a ${order.client_email}...`);
        await sendOrderConfirmationEmail(
          order.client_email,
          order.client_name,
          id,
          pdfUrl
        );
        console.log(`[EMAIL] ✅ Correo de confirmación enviado exitosamente`);
        notificationsSent = true;
      }
      
      // EN_EJECUCION: Enviar correo de producción
      if (newStatus === "EN_EJECUCION") {
        console.log(`[EMAIL] 📤 Intentando enviar correo de producción a ${order.client_email}...`);
        await sendOrderInProductionEmail(order.client_email, order.client_name, id);
        console.log(`[EMAIL] ✅ Correo de producción enviado exitosamente`);
        notificationsSent = true;
      }

      // TERMINADO: Enviar correo de pedido terminado
      if (newStatus === "TERMINADO") {
        console.log(`[EMAIL] 📤 Intentando enviar correo de pedido terminado a ${order.client_email}...`);
        console.log(`[EMAIL] 📎 PDF adjunto: ${order.invoice_pdf_url || 'No disponible'}`);
        await sendOrderCompletedEmail(
          order.client_email,
          order.client_name,
          id,
          order.invoice_pdf_url
        );
        console.log(`[EMAIL] ✅ Correo de terminado enviado exitosamente`);
        notificationsSent = true;
      }

      // COMPLETADO: Enviar correo de pedido completado
      if (newStatus === "COMPLETADO") {
        console.log(`[EMAIL] 📤 Intentando enviar correo de pedido completado a ${order.client_email}...`);
        console.log(`[EMAIL] 📎 PDF adjunto: ${order.invoice_pdf_url || 'No disponible'}`);
        await sendOrderCompletedEmail(
          order.client_email,
          order.client_name,
          id,
          order.invoice_pdf_url
        );
        console.log(`[EMAIL] ✅ Correo de completado enviado exitosamente`);
        notificationsSent = true;
      }

      if (!notificationsSent) {
        console.log(`[EMAIL] ℹ️ No se envían correos para el estado: ${newStatus}`);
      }

    } catch (emailError) {
      console.error(`[EMAIL] ❌ ERROR al enviar correo:`, emailError);
      console.error(`[EMAIL] ❌ Detalles del error:`, emailError.message);
      if (emailError.response) {
        console.error(`[EMAIL] ❌ Respuesta del servicio:`, emailError.response.body);
      }
      // No fallar la actualización de estado si falla el correo
    }

    res.json({
      message: "Estado actualizado y notificación enviada",
      order_id: parseInt(id),
      previous_status: currentStatus,
      new_status: newStatus,
      notifications_sent: notificationsSent,
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
    // Obtener orden + cliente (con phone y address si existen)
    const orderResult = await query(
      `SELECT 
         o.*,
         c.name  as client_name,
         c.email as client_email,
         c.phone as client_phone,
         c.address as client_address
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

// --- (ADMIN) SUBIR BOLETA DE ENVÍO Y ENVIAR EMAIL FINAL ---
export const uploadShippingReceipt = async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Verificar que la orden existe y está en COMPLETADO
    const orderResult = await query(
      `SELECT o.*, c.name as client_name, c.email as client_email, c.phone as client_phone
       FROM orders o
       JOIN clients c ON o.client_id = c.client_id
       WHERE o.order_id = $1`,
      [id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ message: "Orden no encontrada" });
    }

    const order = orderResult.rows[0];

    if (order.status !== "COMPLETADO") {
      return res.status(400).json({ 
        message: "Solo se puede subir boleta de envío para órdenes COMPLETADAS" 
      });
    }

    // 2. Verificar que se subió una imagen
    if (!req.file) {
      return res.status(400).json({ message: "No se subió ninguna imagen" });
    }

    console.log(`[SHIPPING] Procesando boleta de envío para orden #${id}...`);

    // 3. Subir imagen a Google Cloud Storage
    const { uploadToGCS } = await import("../services/gcs.service.js");
    const shippingReceiptUrl = await uploadToGCS(req.file, "shipping-receipts");
    
    console.log(`[SHIPPING] Imagen subida: ${shippingReceiptUrl}`);

    // 4. Extraer datos con OCR
    const { extractShippingReceiptData } = await import("../services/ocr.service.js");
    const shippingData = await extractShippingReceiptData(req.file.buffer);
    
    console.log(`[SHIPPING] Datos extraídos:`, shippingData);

    // 5. Guardar en base de datos
    await query(
      `UPDATE orders 
       SET shipping_receipt_url = $1,
           shipping_tracking_number = $2,
           shipping_company = $3,
           shipping_date = $4,
           shipping_sender_name = $5,
           shipping_sender_dni = $6,
           shipping_sender_phone = $7,
           shipping_recipient_name = $8,
           shipping_recipient_dni = $9,
           shipping_recipient_phone = $10
       WHERE order_id = $11`,
      [
        shippingReceiptUrl,
        shippingData.trackingNumber,
        shippingData.company,
        shippingData.shippingDate,
        shippingData.senderName,
        shippingData.senderDni,
        shippingData.senderPhone,
        shippingData.recipientName,
        shippingData.recipientDni,
        shippingData.recipientPhone,
        id
      ]
    );

    console.log(`[SHIPPING] Datos guardados en BD`);

    // 6. Enviar correo final con la boleta
    const { sendShippingConfirmationEmail } = await import("../services/email.service.js");
    await sendShippingConfirmationEmail(order, shippingData, shippingReceiptUrl);

    console.log(`[SHIPPING] ✅ Correo enviado exitosamente`);

    res.json({
      message: "Boleta de envío procesada y correo enviado",
      shippingData,
      shippingReceiptUrl
    });

  } catch (error) {
    console.error("[SHIPPING] ❌ Error:", error);
    res.status(500).json({ 
      message: "Error al procesar boleta de envío",
      error: error.message 
    });
  }
};

// --- (ADMIN) REENVIAR EMAIL DE ENVÍO CON BOLETA ---
export const resendShippingEmail = async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Verificar que la orden existe y tiene boleta
    const orderResult = await query(
      `SELECT 
         o.*,
         c.name as client_name, 
         c.email as client_email, 
         c.phone as client_phone
       FROM orders o
       JOIN clients c ON o.client_id = c.client_id
       WHERE o.order_id = $1`,
      [id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ message: "Orden no encontrada" });
    }

    const order = orderResult.rows[0];
    
    console.log(`[SHIPPING RESEND] Datos de la orden:`, {
      tracking: order.shipping_tracking_number,
      company: order.shipping_company,
      senderName: order.shipping_sender_name,
      recipientName: order.shipping_recipient_name
    });

    // 2. Verificar que tiene boleta de envío
    if (!order.shipping_receipt_url) {
      return res.status(400).json({ 
        message: "Esta orden no tiene boleta de envío registrada" 
      });
    }

    console.log(`[SHIPPING RESEND] Reenviando email para orden #${id}...`);

    // 3. Preparar datos de envío
    const shippingData = {
      trackingNumber: order.shipping_tracking_number,
      company: order.shipping_company,
      destination: order.shipping_destination || "N/A",
      shippingDate: order.shipping_date,
      senderName: order.shipping_sender_name,
      senderDni: order.shipping_sender_dni,
      senderPhone: order.shipping_sender_phone,
      recipientName: order.shipping_recipient_name,
      recipientDni: order.shipping_recipient_dni,
      recipientPhone: order.shipping_recipient_phone
    };

    // 4. Reenviar correo con la boleta
    const { sendShippingConfirmationEmail } = await import("../services/email.service.js");
    await sendShippingConfirmationEmail(order, shippingData, order.shipping_receipt_url);

    console.log(`[SHIPPING RESEND] ✅ Email reenviado exitosamente`);

    res.json({
      message: "Email de envío reenviado exitosamente",
      sentTo: order.client_email
    });

  } catch (error) {
    console.error("[SHIPPING RESEND] ❌ Error:", error);
    res.status(500).json({ 
      message: "Error al reenviar email de envío",
      error: error.message 
    });
  }
};

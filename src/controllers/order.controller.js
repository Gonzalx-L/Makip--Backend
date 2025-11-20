// src/controllers/order.controller.js
import { query } from "../config/db.js";
import { uploadToGCS } from "../services/gcs.service.js";
import { detectText } from "../services/ocr.service.js";
import { generateOrderPDFBuffer } from "../services/pdf.service.js";
import {
  sendOrderConfirmationEmail,
  sendOrderInProductionEmail,
  sendOrderCompletedEmail,
} from "../services/email.service.js";
import { sendInvoiceNotification } from "../services/whatsapp.service.js";
import { validateYapeReceipt } from "../utils/yape-ocr-validate.js";

// --- FUNCIÓN AUXILIAR: Generar código de recojo ---
const generatePickupCode = () => {
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `REC-${randomStr}`;
};

/* ============================================================
   (CLIENTE) CREAR PEDIDO
============================================================ */
export const createOrder = async (req, res) => {
  const clientId = req.client.client_id;
  const { items, delivery_type } = req.body;
  if (!items || items.length === 0) {
    return res.status(400).json({ message: "El pedido debe tener al menos un artículo" });
  }
  const validTypes = ['DELIVERY', 'PICKUP'];
  const finalDeliveryType = validTypes.includes(delivery_type) ? delivery_type : 'DELIVERY';

  await query("BEGIN");
  try {
    let totalPrice = items.reduce((sum, item) => sum + item.item_price * item.quantity, 0);
    let initialStatus = 'NO_PAGADO';
    let pickupCode = null;

    if (finalDeliveryType === 'PICKUP') {
      initialStatus = 'PENDIENTE';
      pickupCode = generatePickupCode();
    }

    let orderResult;
    try {
      orderResult = await query(
        `INSERT INTO orders (client_id, status, total_price, delivery_type, pickup_code) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING order_id, created_at, status, total_price, delivery_type, pickup_code`,
        [clientId, initialStatus, totalPrice, finalDeliveryType, pickupCode]
      );
    } catch (columnError) {
      orderResult = await query(
        `INSERT INTO orders (client_id, status, total_price) 
         VALUES ($1, $2, $3) 
         RETURNING order_id, created_at, status, total_price`,
        [clientId, initialStatus, totalPrice]
      );
      orderResult.rows[0].delivery_type = finalDeliveryType;
      orderResult.rows[0].pickup_code = pickupCode;
    }
    const newOrder = orderResult.rows[0];

    for (const item of items) {
      const { product_id, quantity, item_price, personalization_data } = item;
      await query(
        `INSERT INTO order_items (order_id, product_id, quantity, item_price, personalization_data)
         VALUES ($1, $2, $3, $4, $5)`,
        [newOrder.order_id, product_id, quantity, item_price, personalization_data]
      );
    }
    await query("COMMIT");
    res.status(201).json(newOrder);
  } catch (error) {
    await query("ROLLBACK");
    console.error("Error al crear pedido:", error);
    res.status(500).json({ message: "Error en el servidor al crear el pedido" });
  }
};

/* ============================================================
   (CLIENTE) MIS PEDIDOS
============================================================ */
export const getMyOrders = async (req, res) => {
  const clientId = req.client.client_id;
  try {
    const result = await query(
      `SELECT order_id, status, total_price, due_date, created_at, delivery_type, pickup_code 
       FROM orders 
       WHERE client_id = $1 
       ORDER BY created_at DESC`,
      [clientId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener mis pedidos:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

/* ============================================================
   (CLIENTE) SUBIR COMPROBANTE DE PAGO (OCR + VALIDACIÓN YAPE)
============================================================ */
export const uploadPaymentProof = async (req, res) => {
  const { id } = req.params;
  const clientId = req.client.client_id;

  try {
    if (!req.file) {
      return res.status(400).json({ message: "No se subió ningún archivo." });
    }

    const orderResult = await query(
      `SELECT o.order_id, o.status, o.total_price, c.name as client_name, c.email as client_email
       FROM orders o
       JOIN clients c ON o.client_id = c.client_id
       WHERE o.order_id = $1 AND o.client_id = $2`,
      [id, clientId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ message: "Pedido no encontrado o no te pertenece" });
    }

    const order = orderResult.rows[0];
    const monto = parseFloat(order.total_price);

    const publicUrl = await uploadToGCS(req.file, "payment-proofs");

    console.log(`[OCR]: Leyendo texto del comprobante de pago...`);
    const ocrText = await detectText(req.file.buffer);

    // 🔥 Validación Yape oficial:
    const ocrResult = validateYapeReceipt(ocrText, monto);

    let isPaymentValid = false;
    let newStatus = "PAGO_EN_VERIFICACION";
    let validationMessage = "Comprobante recibido. En verificación.";

    if (ocrResult.valid) {
      isPaymentValid = true;
      newStatus = "PENDIENTE";
      validationMessage = "¡Pago verificado y aprobado automáticamente!";
      console.log(`[OCR]: ¡Éxito! Orden #${id} aprobada.`);
    } else {
      validationMessage += " Errores: " + (Array.isArray(ocrResult.errors) ? ocrResult.errors.join(" | ") : "Ninguno");
      console.warn(`[OCR]: Falló validación Yape:`, ocrResult.errors);
    }

    const updatedOrder = await query(
      `UPDATE orders 
       SET payment_proof_url = $1, status = $2, updated_at = CURRENT_TIMESTAMP
       WHERE order_id = $3
       RETURNING order_id, status, payment_proof_url`,
      [publicUrl, newStatus, id]
    );

    if (isPaymentValid) {
      generateAndSendInvoice(order.order_id, clientId);
    }

    res.json({
      message: validationMessage,
      order: updatedOrder.rows[0],
      isApproved: isPaymentValid,
      info: ocrResult.info,
      errors: ocrResult.errors,
    });

  } catch (error) {
    console.error("Error al subir comprobante:", error);
    res.status(500).json({ message: "Error en el servidor", error: error.message });
  }
};

/* ============================================================
   ACTUALIZAR ESTADO DE LA ORDEN Y ENVIAR CORREOS/WHATSAPP
============================================================ */
export const updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { newStatus } = req.body;

  // 🔥 LOG COMPLETO DE LO QUE RECIBE EL BACKEND
  console.log(`\n========================================`);
  console.log(`[DEBUG] 📥 PETICIÓN RECIBIDA:`);
  console.log(`[DEBUG] Order ID: ${id}`);
  console.log(`[DEBUG] req.body completo:`, JSON.stringify(req.body, null, 2));
  console.log(`[DEBUG] newStatus recibido: "${newStatus}"`);
  console.log(`[DEBUG] Tipo de newStatus: ${typeof newStatus}`);
  console.log(`[DEBUG] newStatus es undefined?: ${newStatus === undefined}`);
  console.log(`[DEBUG] newStatus es null?: ${newStatus === null}`);
  console.log(`========================================\n`);

  // 🔥 VALIDACIÓN: Estados permitidos
  const validStatuses = [
    "NO_PAGADO",
    "PAGO_EN_VERIFICACION", 
    "PENDIENTE",
    "EN_EJECUCION",
    "TERMINADO",
    "COMPLETADO",
    "CANCELADO"
  ];

  if (!validStatuses.includes(newStatus)) {
    console.log(`[DEBUG] ❌ Estado rechazado: "${newStatus}" no está en la lista de válidos`);
    console.log(`[DEBUG] Estados válidos:`, validStatuses);
    return res.status(400).json({ 
      message: "Estado inválido",
      receivedStatus: newStatus,
      receivedType: typeof newStatus,
      validStatuses: validStatuses
    });
  }

  // 🔥 VALIDACIÓN: Transiciones válidas de estado
  const validTransitions = {
    'NO_PAGADO': ['PAGO_EN_VERIFICACION', 'CANCELADO'],
    'PAGO_EN_VERIFICACION': ['PENDIENTE', 'NO_PAGADO', 'CANCELADO'],
    'PENDIENTE': ['EN_EJECUCION', 'CANCELADO'],
    'EN_EJECUCION': ['TERMINADO', 'CANCELADO'],
    'TERMINADO': ['COMPLETADO'],
    'COMPLETADO': [],
    'CANCELADO': []
  };

  try {
    const orderResult = await query(
      `SELECT o.*, c.email as client_email, c.name as client_name, o.invoice_pdf_url
       FROM orders o JOIN clients c ON o.client_id = c.client_id
       WHERE o.order_id = $1`,
      [id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ message: "Orden no encontrada" });
    }

    const order = orderResult.rows[0];
    const currentStatus = order.status;

    // 🔥 VERIFICAR SI LA TRANSICIÓN ES VÁLIDA
    const allowedTransitions = validTransitions[currentStatus] || [];
    if (!allowedTransitions.includes(newStatus)) {
      return res.status(400).json({ 
        message: `Transición inválida: No se puede cambiar de "${currentStatus}" a "${newStatus}"`,
        currentStatus: currentStatus,
        allowedTransitions: allowedTransitions
      });
    }

    // Actualizar estado en la base de datos
    await query(
      "UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE order_id = $2",
      [newStatus, id]
    );

    console.log(`[NOTIFICACIONES] ✅ Orden #${id} actualizada de ${currentStatus} a: ${newStatus}`);
    console.log(`[NOTIFICACIONES] 📧 Datos del cliente: ${order.client_name} (${order.client_email})`);

    // 🔥 NOTIFICACIONES SEGÚN EL NUEVO ESTADO
    let notificationsSent = false;
    
    try {
      // 1. EN_EJECUCION (Producción iniciada)
      if (newStatus === "EN_EJECUCION") {
        console.log(`[EMAIL] 📤 Intentando enviar correo de producción a ${order.client_email}...`);
        await sendOrderInProductionEmail(order.client_email, order.client_name, id);
        console.log(`[EMAIL] ✅ Correo de producción enviado exitosamente`);
        notificationsSent = true;
      }

      // 2. TERMINADO (Producción completada)
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

      // 3. COMPLETADO (Entregado/Listo para recojo)
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
      notifications_sent: notificationsSent
    });

  } catch (error) {
    console.error("Error al actualizar estado de orden:", error);
    res.status(500).json({ 
      message: "Error al actualizar estado de orden",
      error: error.message 
    });
  }
};

/* ============================================================
   GENERAR FACTURA + ENVIAR EMAIL + WHATSAPP
============================================================ */
const generateAndSendInvoice = async (orderId, clientId) => {
  try {
    const orderResult = await query(
      `SELECT o.*, c.name as client_name, c.email as client_email, c.phone as client_phone
       FROM orders o
       JOIN clients c ON o.client_id = c.client_id
       WHERE o.order_id = $1 AND o.client_id = $2`,
      [orderId, clientId]
    );

    const itemsResult = await query(
      `SELECT oi.*, p.name as product_name
       FROM order_items oi
       JOIN products p ON oi.product_id = p.product_id
       WHERE oi.order_id = $1`,
      [orderId]
    );

    const orderData = orderResult.rows[0];
    orderData.items = itemsResult.rows;

    const pdfBuffer = await generateOrderPDFBuffer(orderData);

    const pdfFile = {
      buffer: pdfBuffer,
      mimetype: "application/pdf",
      originalname: `factura_orden_${orderId}.pdf`,
    };

    const pdfUrl = await uploadToGCS(pdfFile, "invoices");

    await query("UPDATE orders SET invoice_pdf_url = $1 WHERE order_id = $2", [
      pdfUrl,
      orderId,
    ]);

    sendOrderConfirmationEmail(
      orderData.client_email,
      orderData.client_name,
      orderId,
      pdfUrl
    );

    sendInvoiceNotification(clientId, orderId, pdfUrl);

  } catch (error) {
    console.error(`[PDF]: Error en flujo de factura:`, error);
  }
};
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

// 💡 --- FUNCIÓN AUXILIAR: Generar código de recojo ---
// Genera un código corto y fácil de leer (ej: "REC-A1B2")
const generatePickupCode = () => {
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `REC-${randomStr}`;
};
/* ============================================================
/* ============================================================
   🔎 UTILIDADES OCR (MEJORADAS)
============================================================ */

function montoPresenteEnOCR(monto, ocrText) {
  if (!ocrText) return false;

  const text = ocrText.replace(/\s+/g, '').replace(/[,]/g, '').replace(/[.]/g, '');

  const variantes = [
    monto.toFixed(2),         // 35.00
    monto.toFixed(1),         // 35.0
    String(parseInt(monto)),  // 35
  ];

  return variantes.some(v => text.includes(v.replace(/[,\.]/g, "")));
}

function extraerCodigoOperacion(ocrText) {
  if (!ocrText) return null;
  const match = ocrText.match(/\b\d{8,12}\b/);
  return match ? match[0] : null;
}

/* ============================================================
   (CLIENTE) CREAR PEDIDO
============================================================ */
export const createOrder = async (req, res) => {
  const clientId = req.client.client_id;
  const { items, delivery_type } = req.body; // 🔧 FUSIÓN: Agregar delivery_type del frontend

  if (!items || items.length === 0) {
    return res.status(400).json({ message: "El pedido debe tener al menos un artículo" });
  }

  // 🔧 FUSIÓN: Validamos el tipo de entrega (por seguridad, default es DELIVERY)
  const validTypes = ['DELIVERY', 'PICKUP'];
  const finalDeliveryType = validTypes.includes(delivery_type) ? delivery_type : 'DELIVERY';

  await query("BEGIN");
  try {
    let totalPrice = items.reduce((sum, item) => sum + item.item_price * item.quantity, 0);

    // 🔧 FUSIÓN: Lógica de Estado y Código según el método
    let initialStatus = 'NO_PAGADO'; // Default para envío
    let pickupCode = null;

    if (finalDeliveryType === 'PICKUP') {
      // Si es recojo en tienda:
      initialStatus = 'PENDIENTE'; // ¡Pasa directo a pendiente!
      pickupCode = generatePickupCode(); // Generamos el código único
    }

    // 🔧 FUSIÓN: Insertamos en la BD - compatible con v1.5 (delivery_type, pickup_code)
    let orderResult;
    try {
      // Intentamos primero con el esquema v1.5 (con las nuevas columnas)
      orderResult = await query(
        `INSERT INTO orders (client_id, status, total_price, delivery_type, pickup_code) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING order_id, created_at, status, total_price, delivery_type, pickup_code`,
        [clientId, initialStatus, totalPrice, finalDeliveryType, pickupCode]
      );
    } catch (columnError) {
      // Si falla, usamos el esquema anterior (sin las nuevas columnas)
      console.warn("⚠️  BD no tiene columnas v1.5, usando esquema anterior:", columnError.message);
      orderResult = await query(
        `INSERT INTO orders (client_id, status, total_price) 
         VALUES ($1, $2, $3) 
         RETURNING order_id, created_at, status, total_price`,
        [clientId, initialStatus, totalPrice]
      );
      // Agregamos manualmente los campos faltantes para compatibilidad
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

    // 🔧 FUSIÓN: Devolvemos el pedido creado (incluyendo el pickup_code si existe)
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
    // 💡 Actualizamos la consulta para que el cliente vea el código y el tipo
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

// --- (CLIENTE) SUBIR COMPROBANTE DE PAGO (VERSIÓN CON OCR) ---
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
    const clientName = order.client_name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .split(" ")[0];

    const publicUrl = await uploadToGCS(req.file, "payment-proofs");

    console.log(`[OCR]: Leyendo texto del comprobante de pago...`);
    const ocrText = await detectText(req.file.buffer);

    let isPaymentValid = false;
    let newStatus = "PAGO_EN_VERIFICACION";
    let validationMessage = "Comprobante recibido. En verificación.";
    
    const montoOK = montoPresenteEnOCR(monto, ocrText);
    const nombreOK = ocrText?.toLowerCase().includes(clientName);
    const codigoOperacion = extraerCodigoOperacion(ocrText);

    if (montoOK && nombreOK) {
      isPaymentValid = true;
      newStatus = "PENDIENTE";
      validationMessage = "¡Pago verificado y aprobado automáticamente!";
    } else {
      console.warn(`[OCR]: Falló validación (Monto:${montoOK}, Nombre:${nombreOK})`);
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
      codigoOperacion,
    });

  } catch (error) {
    console.error("Error al subir comprobante:", error);
    res.status(500).json({ message: "Error en el servidor", error: error.message });
  }
};

/* ============================================================
   UPDATE ORDER STATUS (CORREO Y WHATSAPP)
============================================================ */
export const updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { newStatus } = req.body;

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

    await query(
      "UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE order_id = $2",
      [newStatus, id]
    );

    if (newStatus === "EN_EJECUCION") {
      await sendOrderInProductionEmail(order.client_email, order.client_name, id);
    }

    if (newStatus === "COMPLETADO") {
      await sendOrderCompletedEmail(
        order.client_email,
        order.client_name,
        id,
        order.invoice_pdf_url
      );
    }

    res.json({ message: "Estado actualizado y notificación enviada" });

  } catch (error) {
    console.error("Error al actualizar estado de orden:", error);
    res.status(500).json({ message: "Error al actualizar estado de orden" });
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
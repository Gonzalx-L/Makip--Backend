// src/controllers/order.controller.js
import { query } from "../config/db.js";
import { uploadToGCS } from "../services/gcs.service.js";
import { detectText } from "../services/ocr.service.js";
import { generateOrderPDFBuffer } from "../services/pdf.service.js";
import { sendOrderConfirmationEmail } from "../services/email.service.js";
import { sendInvoiceNotification } from "../services/whatsapp.service.js";

// 💡 --- FUNCIÓN AUXILIAR: Generar código de recojo ---
// Genera un código corto y fácil de leer (ej: "REC-A1B2")
const generatePickupCode = () => {
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `REC-${randomStr}`;
};

// --- (CLIENTE) CREAR UN NUEVO PEDIDO/COTIZACIÓN ---
export const createOrder = async (req, res) => {
  const clientId = req.client.client_id;
  // 1. Ahora esperamos 'delivery_type' del frontend
  const { items, delivery_type } = req.body;

  if (!items || items.length === 0) {
    return res
      .status(400)
      .json({ message: "El pedido debe tener al menos un artículo" });
  }

  // 2. Validamos el tipo de entrega (por seguridad, default es DELIVERY)
  const validTypes = ['DELIVERY', 'PICKUP'];
  const finalDeliveryType = validTypes.includes(delivery_type) ? delivery_type : 'DELIVERY';

  const clientDB = await query("BEGIN");
  try {
    let totalPrice = 0;
    for (const item of items) {
      totalPrice += item.item_price * item.quantity;
    }

    // 3. Lógica de Estado y Código según el método
    let initialStatus = 'NO_PAGADO'; // Default para envío
    let pickupCode = null;

    if (finalDeliveryType === 'PICKUP') {
      // Si es recojo en tienda:
      initialStatus = 'PENDIENTE'; // ¡Pasa directo a pendiente!
      pickupCode = generatePickupCode(); // Generamos el código único
    }

    // 4. Insertamos en la BD con las nuevas columnas
    const orderResult = await query(
      `INSERT INTO orders (client_id, status, total_price, delivery_type, pickup_code) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING order_id, created_at, status, total_price, delivery_type, pickup_code`,
      [clientId, initialStatus, totalPrice, finalDeliveryType, pickupCode]
    );
    const newOrder = orderResult.rows[0];

    for (const item of items) {
      const { product_id, quantity, item_price, personalization_data } = item;
      await query(
        `INSERT INTO order_items (order_id, product_id, quantity, item_price, personalization_data)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          newOrder.order_id,
          product_id,
          quantity,
          item_price,
          personalization_data,
        ]
      );
    }

    await query("COMMIT");

    // 5. Devolvemos el pedido creado (incluyendo el pickup_code si existe)
    res.status(201).json(newOrder);
    
  } catch (error) {
    await query("ROLLBACK");
    console.error("Error al crear pedido:", error);
    res
      .status(500)
      .json({ message: "Error en el servidor al crear el pedido" });
  }
};

// --- (CLIENTE) OBTENER "MIS PEDIDOS" ---
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

// ... (Mantén el resto de funciones: uploadPaymentProof, generateAndSendInvoice tal como estaban) ...
// --- (CLIENTE) SUBIR COMPROBANTE DE PAGO (VERSIÓN CON OCR) ---
export const uploadPaymentProof = async (req, res) => {
  const { id } = req.params;
  const clientId = req.client.client_id;

  try {
    if (!req.file) {
      return res.status(400).json({ message: "No se subió ningún archivo." });
    }

    const orderResult = await query(
      `SELECT o.order_id, o.status, o.total_price, c.name as client_name 
       FROM orders o
       JOIN clients c ON o.client_id = c.client_id
       WHERE o.order_id = $1 AND o.client_id = $2`,
      [id, clientId]
    );

    if (orderResult.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Pedido no encontrado o no te pertenece" });
    }

    const order = orderResult.rows[0];
    const orderPrice = parseFloat(order.total_price).toFixed(2);
    const clientName = order.client_name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .split(" ")[0];

    const publicUrl = await uploadToGCS(req.file, "payment-proofs");

    console.log(`[OCR]: Leyendo texto del comprobante para Orden #${id}...`);
    const ocrText = await detectText(req.file.buffer);

    let isPaymentValid = false;
    let newStatus = "PAGO_EN_VERIFICACION";
    let validationMessage = "Comprobante recibido. En verificación.";

    if (ocrText) {
      const priceFound = ocrText.includes(orderPrice.split(".")[0]);
      const nameFound = ocrText.includes(clientName);

      if (priceFound && nameFound) {
        isPaymentValid = true;
        newStatus = "PENDIENTE"; // ¡Aprobado!
        validationMessage = "¡Pago verificado y aprobado automáticamente!";
        console.log(`[OCR]: ¡Éxito! Orden #${id} aprobada.`);
      } else {
        console.warn(
          `[OCR]: Falló la validación para Orden #${id}. (Monto: ${priceFound}, Nombre: ${nameFound})`
        );
      }
    } else {
      console.warn(
        `[OCR]: No se detectó texto en el comprobante para Orden #${id}.`
      );
    }

    const updatedOrder = await query(
      `UPDATE orders 
       SET payment_proof_url = $1, status = $2, updated_at = CURRENT_TIMESTAMP
       WHERE order_id = $3
       RETURNING order_id, status, payment_proof_url`,
      [publicUrl, newStatus, id]
    );

    if (isPaymentValid) {
      // (No hacemos 'await' para no hacer esperar al cliente)
      generateAndSendInvoice(order.order_id, order.client_id);
    }

    res.json({
      message: validationMessage,
      order: updatedOrder.rows[0],
      isApproved: isPaymentValid,
    });
  } catch (error) {
    console.error("Error al subir el comprobante:", error);
    res
      .status(500)
      .json({ message: "Error en el servidor", error: error.message });
  }
};

// --- ¡NUEVA FUNCIÓN DE AYUDA! ---
/**
 * Genera, sube y envía la factura en PDF por Email y WhatsApp.
 */
const generateAndSendInvoice = async (orderId, clientId) => {
  try {
    console.log(
      `[PDF]: Iniciando generación de factura para Orden #${orderId}...`
    );

    // 1. Obtener TODOS los datos para el PDF
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

    if (orderResult.rows.length === 0) throw new Error("Orden no encontrada");

    const orderData = orderResult.rows[0];
    orderData.items = itemsResult.rows;

    // 2. Generar el PDF en memoria
    const pdfBuffer = await generateOrderPDFBuffer(orderData);

    // 3. Subir el PDF a GCS
    const pdfFile = {
      buffer: pdfBuffer,
      mimetype: "application/pdf",
      originalname: `factura_orden_${orderId}.pdf`,
    };
    const pdfUrl = await uploadToGCS(pdfFile, "invoices"); // Carpeta 'invoices'

    // 4. Guardar la URL del PDF en la tabla 'orders'
    await query("UPDATE orders SET invoice_pdf_url = $1 WHERE order_id = $2", [
      pdfUrl,
      orderId,
    ]);

    console.log(`[PDF]: Factura para Orden #${orderId} subida a: ${pdfUrl}`);

    // 5. Enviar por Email y WhatsApp (sin await)
    sendOrderConfirmationEmail(
      orderData.client_email,
      orderData.client_name,
      orderId,
      pdfUrl
    );

    sendInvoiceNotification(clientId, orderId, pdfUrl);
  } catch (error) {
    console.error(
      `[PDF]: Error en el flujo de generación/envío de factura para Orden #${orderId}:`,
      error
    );
  }
};
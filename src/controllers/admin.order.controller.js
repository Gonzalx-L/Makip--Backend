// src/controllers/order.controller.js
import { query } from "../config/db.js";
import { uploadToGCS } from "../services/gcs.service.js";
import { detectText } from "../services/ocr.service.js"; // 💡 1. Importamos el OCR

// --- (CLIENTE) CREAR UN NUEVO PEDIDO/COTIZACIÓN ---
// (Esta función se queda igual que la tuya)
export const createOrder = async (req, res) => {
  const clientId = req.client.client_id;
  const { items } = req.body;
  if (!items || items.length === 0) {
    /* ... */
  }
  const client = await query("BEGIN");
  try {
    let totalPrice = 0;
    for (const item of items) {
      totalPrice += item.item_price * item.quantity;
    }
    const orderResult = await query(
      `INSERT INTO orders (client_id, status, total_price) 
       VALUES ($1, 'NO_PAGADO', $2) RETURNING order_id, created_at, status, total_price`,
      [clientId, totalPrice]
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
// (Esta función se queda igual)
export const getMyOrders = async (req, res) => {
  /* ... */
};

// 💡 --- (CLIENTE) SUBIR COMPROBANTE DE PAGO (VERSIÓN CON OCR) ---
export const uploadPaymentProof = async (req, res) => {
  const { id } = req.params;
  const clientId = req.client.client_id;

  try {
    // 1. Verificar que el archivo exista
    if (!req.file) {
      return res.status(400).json({ message: "No se subió ningún archivo." });
    }

    // 2. Verificar que el pedido exista y obtener los datos para validar
    // 💡 (MODIFICADO: Hacemos JOIN con 'clients' para obtener el nombre)
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
    const orderPrice = parseFloat(order.total_price).toFixed(2); // Ej: "25.00"

    // Normalizamos el nombre del cliente (quitamos tildes, tomamos solo el primero)
    const clientName = order.client_name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .split(" ")[0]; // Ej: "gonzalo"

    // 3. Subir el archivo a Google Cloud Storage
    const publicUrl = await uploadToGCS(req.file, "payment-proofs");

    // 4. ¡LA MAGIA! Enviar el buffer de la imagen al servicio OCR
    console.log(`[OCR]: Leyendo texto del comprobante para Orden #${id}...`);
    const ocrText = await detectText(req.file.buffer);

    // 5. Validar el texto
    let isPaymentValid = false;
    let newStatus = "PAGO_EN_VERIFICACION"; // Estado por defecto si falla
    let validationMessage = "Comprobante recibido. En verificación.";

    if (ocrText) {
      // DEBUG: Muestra el texto leído
      // console.log("[OCR] Texto detectado:", ocrText);

      // Validación simple: ¿El texto incluye el precio Y el nombre?
      const priceFound = ocrText.includes(orderPrice);
      const nameFound = ocrText.includes(clientName);

      if (priceFound && nameFound) {
        isPaymentValid = true;
        newStatus = "PENDIENTE"; // ¡Aprobado!
        validationMessage = "¡Pago verificado y aprobado automáticamente!";
        console.log(
          `[OCR]: ¡Éxito! Orden #${id} aprobada (Monto: ${orderPrice}, Nombre: ${clientName})`
        );
      } else {
        console.warn(
          `[OCR]: Falló la validación para Orden #${id}. (Monto encontrado: ${priceFound}, Nombre encontrado: ${nameFound})`
        );
      }
    } else {
      console.warn(
        `[OCR]: No se detectó texto en el comprobante para Orden #${id}. Pasa a verificación manual.`
      );
    }

    // 6. Actualizar la base de datos con la URL y el nuevo estado
    const updatedOrder = await query(
      `UPDATE orders 
       SET payment_proof_url = $1, status = $2 
       WHERE order_id = $3
       RETURNING order_id, status, payment_proof_url`,
      [publicUrl, newStatus, id]
    );

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

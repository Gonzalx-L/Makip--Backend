// src/services/pdf.service.js
import PDFDocument from "pdfkit";

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatCurrency(amount) {
  return `S/ ${parseFloat(amount).toFixed(2)}`;
}

/**
 * Genera el PDF de una orden y devuelve un Buffer en memoria.
 * @param {object} order - Los detalles completos de la orden (con items y cliente)
 * @returns {Promise<Buffer>} - El PDF como un Buffer.
 */
export const generateOrderPDFBuffer = (order) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const buffers = [];

    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => {
      const pdfBuffer = Buffer.concat(buffers);
      resolve(pdfBuffer);
    });
    doc.on("error", (err) => {
      reject(err);
    });

    // --- Header ---
    doc
      .fillColor("#1E63FF") // Azul Makip
      .fontSize(28)
      .font("Helvetica-Bold")
      .text("MAKIP", 50, 50, { align: "left" });

    doc
      .fillColor("#333")
      .fontSize(10)
      .font("Helvetica")
      .text("Av. Tu Dirección 123", 50, 82, { align: "left" })
      .text("Lima, Perú", 50, 96, { align: "left" });

    // --- Bloque Derecho (Info Orden + 💡 CÓDIGO DE RECOJO) ---
    doc
      .fillColor("#111")
      .fontSize(18)
      .font("Helvetica-Bold")
      .text("Orden de Pedido", 200, 50, { align: "right" });

    doc
      .fontSize(10)
      .font("Helvetica")
      .text(`N°: ${String(order.order_id).padStart(6, "0")}`, 200, 72, {
        align: "right",
      })
      .text(`Fecha: ${formatDate(order.created_at)}`, 200, 86, {
        align: "right",
      });

    // 💡 LÓGICA NUEVA: Mostrar Código de Recojo o Tipo de Envío
    if (order.delivery_type === 'PICKUP' && order.pickup_code) {
      // Si es recojo, lo destacamos en ROJO
      doc
        .moveDown(0.5)
        .fillColor("#E11D48") // Rojo llamativo
        .fontSize(12)
        .font("Helvetica-Bold")
        .text(`RECOJO EN TIENDA`, 200, doc.y, { align: "right" })
        .fontSize(14)
        .text(`CÓDIGO: ${order.pickup_code}`, 200, doc.y, { align: "right" });
    } else {
      // Si es envío normal
      doc
        .moveDown(0.5)
        .fillColor("#333")
        .fontSize(10)
        .text(`Método: Envío a Domicilio`, 200, doc.y, { align: "right" });
    }

    doc.moveDown(4);

    // --- Información del Cliente ---
    // (Ajustamos un poco la posición Y para que no choque con lo de arriba)
    const customerInfoTop = 160; 
    doc
      .fillColor("#333")
      .fontSize(12)
      .font("Helvetica-Bold")
      .text("Cliente:", 50, customerInfoTop)
      .font("Helvetica")
      .text(order.client_name, 110, customerInfoTop)
      .text(order.client_email, 110, customerInfoTop + 15);

    doc.moveDown(4);

    // --- Tabla de Items ---
    const tableTop = 240;
    const itemCol = 50;
    const qtyCol = 350;
    const priceCol = 400;
    const totalCol = 480;

    // Encabezados
    doc.fontSize(10).font("Helvetica-Bold");
    doc.text("Producto / Descripción", itemCol, tableTop);
    doc.text("Cant.", qtyCol, tableTop, { width: 40, align: "right" });
    doc.text("P. Unit.", priceCol, tableTop, { width: 60, align: "right" });
    doc.text("Total", totalCol, tableTop, { width: 70, align: "right" });

    doc
      .rect(50, tableTop + 15, 510, 2)
      .fill("#1E63FF")
      .stroke();

    let y = tableTop + 25;
    doc.fontSize(10).font("Helvetica");

    // Filas
    for (const item of order.items || []) {
      doc.fillColor("#333");
      doc.text(item.product_name, itemCol, y, { width: 280 });

      // 💡 MEJORA: Mostrar variantes (Talla, Color) si existen
      let details = "";
      
      // 1. Personalización
      if (item.personalization_data?.image_url) {
        details += "(Con Logo Personalizado) ";
      }
      
      // 2. Variantes (Esto faltaba en tu versión anterior)
      if (item.selected_variant) {
        // Convierte {"talla": "M", "color": "Rojo"} a "talla: M, color: Rojo"
        const variantText = Object.entries(item.selected_variant)
          .map(([key, val]) => `${key}: ${val}`)
          .join(", ");
        details += `| ${variantText}`;
      }

      // Si hay detalles extra, los pintamos en gris debajo del nombre
      if (details) {
        doc
          .fillColor("#666")
          .fontSize(8)
          .text(details, itemCol, y + 12, { width: 280 });
        y += 12; // Bajamos un poco más el cursor
      }

      // Volvemos al color normal para los números
      doc.fillColor("#333").fontSize(10);

      doc.text(String(item.quantity), qtyCol, y, {
        width: 40,
        align: "right",
      });

      doc.text(formatCurrency(item.item_price), priceCol, y, {
        width: 60,
        align: "right",
      });

      doc.text(formatCurrency(item.item_price * item.quantity), totalCol, y, {
        width: 70,
        align: "right",
      });

      y += 30; // Espacio entre filas
    }

    // --- Total General ---
    const totalTop = y + 20;
    doc.rect(380, totalTop, 180, 30).fill("#f0f0f0").stroke();

    doc.fillColor("#1E63FF").font("Helvetica-Bold").fontSize(12);
    doc.text("TOTAL A PAGAR:", 390, totalTop + 8, {
      width: 80,
      align: "left",
    });
    doc.text(formatCurrency(order.total_price), 480, totalTop + 8, {
      width: 70,
      align: "right",
    });

    // Mensaje final (Dinamico según tipo de entrega)
    doc.fillColor("#888").fontSize(9).font("Helvetica");
    
    const footerText = order.delivery_type === 'PICKUP'
      ? "Por favor presenta tu código de recojo en tienda para retirar tu pedido."
      : "¡Gracias por tu compra! Tu pedido llegará pronto.";

    doc.text(footerText, 50, 750, {
      align: "center",
      width: 510,
    });

    doc.end();
  });
};

/**
 * Envía el PDF directamente al response (usado para descargar en Admin)
 */
export const pipePDFToResponse = (order, res) => {
  // Reutilizamos la lógica interna llamando a la función buffer y enviándola
  // Esto evita duplicar código de diseño.
  generateOrderPDFBuffer(order)
    .then((pdfBuffer) => {
      res.setHeader("Content-Type", "application/pdf");
      res.end(pdfBuffer);
    })
    .catch((error) => {
      console.error("Error al pipePDFToResponse:", error);
      res.status(500).end("Error generando PDF");
    });
};
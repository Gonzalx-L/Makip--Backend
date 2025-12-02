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
    console.log(`[PDF DEBUG] delivery_method: ${order.delivery_method}`);
    console.log(`[PDF DEBUG] client_address: ${order.client_address}`);
    
    const doc = new PDFDocument({ size: "A4", margin: 0 });
    const buffers = [];

    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => {
      const pdfBuffer = Buffer.concat(buffers);
      resolve(pdfBuffer);
    });
    doc.on("error", (err) => {
      reject(err);
    });

    // === HEADER CON GRADIENTE AZUL ===
    // Fondo azul para el header
    doc.rect(0, 0, 612, 140).fill("#1E63FF");
    
    // Logo/Nombre MAKIP
    doc
      .fillColor("#FFFFFF")
      .fontSize(36)
      .font("Helvetica-Bold")
      .text("MAKIP", 50, 40, { align: "left" });
    
    doc
      .fillColor("#E0EEFF")
      .fontSize(11)
      .font("Helvetica")
      .text("Pedidos Personalizados", 50, 82)
      .text("Lima, Perú | contacto@makip.pe", 50, 98);

    // === INFO DE LA ORDEN (Derecha del header) ===
    doc
      .fillColor("#FFFFFF")
      .fontSize(20)
      .font("Helvetica-Bold")
      .text("ORDEN DE PEDIDO", 320, 45, { align: "right" });

    // Número de orden en un recuadro blanco
    doc
      .rect(420, 75, 140, 50)
      .fillAndStroke("#FFFFFF", "#1E63FF");
    
    doc
      .fillColor("#1E63FF")
      .fontSize(10)
      .font("Helvetica")
      .text("N° ORDEN", 430, 82, { width: 120, align: "center" });
    
    doc
      .fontSize(18)
      .font("Helvetica-Bold")
      .text(String(order.order_id).padStart(6, "0"), 430, 98, { width: 120, align: "center" });

    // === INFORMACIÓN DEL CLIENTE (Sección con borde) ===
    const clientTop = 165;
    
    // Determinar altura de la caja según si hay dirección
    const boxHeight = (order.delivery_method === 'DELIVERY' && order.client_address) ? 120 : 95;
    
    // Caja con borde para info del cliente
    doc
      .rect(50, clientTop, 510, boxHeight)
      .lineWidth(1)
      .stroke("#CCCCCC");
    
    // Título
    doc
      .fillColor("#1E63FF")
      .fontSize(12)
      .font("Helvetica-Bold")
      .text("INFORMACIÓN DEL CLIENTE", 60, clientTop + 12);
    
    // Datos del cliente en dos columnas
    doc
      .fillColor("#333333")
      .fontSize(10)
      .font("Helvetica-Bold")
      .text("Nombre:", 60, clientTop + 35)
      .font("Helvetica")
      .text(order.client_name, 120, clientTop + 35);
    
    doc
      .font("Helvetica-Bold")
      .text("Correo:", 60, clientTop + 52)
      .font("Helvetica")
      .text(order.client_email, 120, clientTop + 52);
    
    // Teléfono si existe
    if (order.client_phone) {
      doc
        .font("Helvetica-Bold")
        .text("Teléfono:", 60, clientTop + 69)
        .font("Helvetica")
        .text(order.client_phone, 120, clientTop + 69);
    }
    
    // Fecha
    doc
      .font("Helvetica-Bold")
      .text("Fecha:", 320, clientTop + 35)
      .font("Helvetica")
      .text(formatDate(order.created_at), 400, clientTop + 35);
    
    // Código de recojo o dirección de entrega
    if (order.delivery_method === 'PICKUP' && order.pickup_code) {
      doc
        .rect(320, clientTop + 68, 230, 25)
        .fill("#FEF3C7");
      
      doc
        .fillColor("#92400E")
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("🏪 RECOJO EN TIENDA", 328, clientTop + 74)
        .fontSize(11)
        .text(`Código: ${order.pickup_code}`, 455, clientTop + 73);
    } else if (order.delivery_method === 'DELIVERY') {
      doc
        .fillColor("#333333")
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("🚚 ENVÍO A DOMICILIO", 320, clientTop + 69);
      
      // Dirección si existe
      if (order.client_address) {
        doc
          .font("Helvetica-Bold")
          .text("Dirección:", 60, clientTop + 86)
          .font("Helvetica")
          .fontSize(9)
          .text(order.client_address, 120, clientTop + 86, { width: 430 });
      }
    }

    // === TABLA DE PRODUCTOS ===
    // Ajustar posición según altura de la caja de cliente
    const tableTop = clientTop + boxHeight + 20;
    const itemCol = 50;
    const qtyCol = 360;
    const priceCol = 420;
    const totalCol = 490;

    // Header de la tabla con fondo azul
    doc
      .rect(50, tableTop, 510, 28)
      .fill("#F0F9FF");
    
    doc
      .fillColor("#1E63FF")
      .fontSize(11)
      .font("Helvetica-Bold")
      .text("PRODUCTO", itemCol + 5, tableTop + 9)
      .text("CANT.", qtyCol, tableTop + 9, { width: 50, align: "center" })
      .text("P. UNIT.", priceCol, tableTop + 9, { width: 60, align: "right" })
      .text("TOTAL", totalCol, tableTop + 9, { width: 60, align: "right" });

    // Línea debajo del header
    doc
      .moveTo(50, tableTop + 28)
      .lineTo(560, tableTop + 28)
      .lineWidth(2)
      .stroke("#1E63FF");

    let y = tableTop + 40;
    doc.fontSize(10).font("Helvetica");

    // Filas de productos con fondo alternado
    let rowIndex = 0;
    for (const item of order.items || []) {
      const rowHeight = 50;
      
      // Fondo alternado (zebra striping)
      if (rowIndex % 2 === 0) {
        doc.rect(50, y - 5, 510, rowHeight).fill("#FAFAFA");
      }
      
      // Nombre del producto
      doc
        .fillColor("#1A1A1A")
        .fontSize(11)
        .font("Helvetica-Bold")
        .text(item.product_name, itemCol + 5, y, { width: 290 });

      // Detalles del producto (variantes, personalización)
      let details = [];
      
      if (item.personalization_data?.image_url) {
        details.push("✨ Con Logo Personalizado");
      }
      
      if (item.selected_variant) {
        const variantText = Object.entries(item.selected_variant)
          .map(([key, val]) => `${key}: ${val}`)
          .join(" • ");
        details.push(variantText);
      }

      if (details.length > 0) {
        doc
          .fillColor("#666666")
          .fontSize(9)
          .font("Helvetica")
          .text(details.join(" | "), itemCol + 5, y + 14, { width: 290 });
      }

      // Cantidad
      doc
        .fillColor("#333333")
        .fontSize(11)
        .font("Helvetica")
        .text(String(item.quantity), qtyCol, y + 5, {
          width: 50,
          align: "center",
        });

      // Precio unitario
      doc.text(formatCurrency(item.item_price), priceCol, y + 5, {
        width: 60,
        align: "right",
      });

      // Total del item
      doc
        .font("Helvetica-Bold")
        .text(formatCurrency(item.item_price * item.quantity), totalCol, y + 5, {
          width: 60,
          align: "right",
        });

      y += rowHeight;
      rowIndex++;
    }

    // === RESUMEN DE TOTALES ===
    const summaryTop = y + 20;
    
    // Caja para el total con gradiente
    doc
      .rect(350, summaryTop, 210, 65)
      .lineWidth(2)
      .fillAndStroke("#F0F9FF", "#1E63FF");

    // Subtotal
    const subtotal = order.total_price;
    doc
      .fillColor("#555555")
      .fontSize(10)
      .font("Helvetica")
      .text("Subtotal:", 365, summaryTop + 12, { width: 100 })
      .text(formatCurrency(subtotal), 465, summaryTop + 12, { width: 80, align: "right" });

    // IGV (18%)
    const igv = subtotal * 0.18;
    doc
      .text("IGV (18%) Incluido:", 365, summaryTop + 28, { width: 100 })
      .text(formatCurrency(igv), 465, summaryTop + 28, { width: 80, align: "right" });

    // Línea divisoria
    doc
      .moveTo(365, summaryTop + 43)
      .lineTo(545, summaryTop + 43)
      .lineWidth(1)
      .stroke("#CCCCCC");

    // TOTAL FINAL
    doc
      .fillColor("#1E63FF")
      .fontSize(14)
      .font("Helvetica-Bold")
      .text("TOTAL:", 365, summaryTop + 48, { width: 100 })
      .text(formatCurrency(order.total_price), 465, summaryTop + 48, { width: 80, align: "right" });

    // === FOOTER CON INFORMACIÓN ADICIONAL ===
    const footerTop = summaryTop + 95;
    
    // Caja con mensaje de entrega
    const deliveryBoxTop = footerTop;
    doc
      .rect(50, deliveryBoxTop, 510, 60)
      .lineWidth(1)
      .fillAndStroke("#FFFBEB", "#F59E0B");
    
    const footerText = order.delivery_type === 'PICKUP'
      ? "📍 IMPORTANTE: Por favor presenta tu CÓDIGO DE RECOJO en nuestra tienda física para retirar tu pedido.\n   Horario de atención: Lunes a Sábado de 9:00 AM a 7:00 PM"
      : `🚚 ENVÍO A DOMICILIO: Te contactaremos pronto para coordinar la entrega de tu pedido.${order.client_address ? '\n   Dirección registrada: ' + order.client_address : '\n   Tiempo estimado: 2-5 días hábiles según tu ubicación.'}`;
    
    doc
      .fillColor("#92400E")
      .fontSize(9)
      .font("Helvetica")
      .text(footerText, 60, deliveryBoxTop + 15, {
        width: 490,
        align: "left",
        lineGap: 2
      });

    // Footer final
    doc
      .fillColor("#999999")
      .fontSize(8)
      .font("Helvetica")
      .text("MAKIP - Pedidos Personalizados | www.makip.pe | contacto@makip.pe", 50, 770, {
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
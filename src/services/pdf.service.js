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

export const generateOrderPDF = (order, res) => {
  const doc = new PDFDocument({ size: "A4", margin: 50 });

  // Pipe el PDF directamente a la respuesta (res)
  // Esto envía el PDF al navegador para descarga
  doc.pipe(res);

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

  doc.moveDown(4);

  // --- Información del Cliente ---
  const customerInfoTop = 150;
  doc
    .fontSize(12)
    .font("Helvetica-Bold")
    .text("Cliente:", 50, customerInfoTop)
    .font("Helvetica")
    .text(order.client_name, 110, customerInfoTop)
    .text(order.client_email, 110, customerInfoTop + 15);

  doc.moveDown(4);

  // --- Tabla de Items ---
  const tableTop = 230;
  const itemCol = 50;
  const qtyCol = 350;
  const priceCol = 400;
  const totalCol = 480;

  // Encabezados de tabla
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

  // Filas de la tabla
  for (const item of order.items) {
    doc.text(item.product_name, itemCol, y, { width: 280 });
    // Muestra si tiene personalización
    if (item.personalization_data?.image_url) {
      doc
        .fillColor("#555")
        .fontSize(8)
        .text("(Personalizado con logo)", itemCol, y + 12, { width: 280 });
      y += 12;
    }

    doc.fillColor("#333").fontSize(10); // Resetea el color
    doc.text(item.quantity.toString(), qtyCol, y, {
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

    y += 30; // Siguiente fila
  }

  // --- Total General ---
  const totalTop = y + 20;
  doc.rect(380, totalTop, 180, 30).fill("#f0f0f0").stroke();
  doc.fillColor("#1E63FF").font("Helvetica-Bold").fontSize(12);
  doc.text("TOTAL A PAGAR:", 390, totalTop + 8, { width: 80, align: "left" });
  doc.text(formatCurrency(order.total_price), 480, totalTop + 8, {
    width: 70,
    align: "right",
  });

  // --- Footer ---
  doc.fillColor("#888").fontSize(9).font("Helvetica");
  doc.text("¡Gracias por tu compra!", 50, 750, { align: "center", width: 510 });

  // Finalizar el PDF
  doc.end();
};

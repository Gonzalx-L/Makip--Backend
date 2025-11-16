// src/controllers/admin.report.controller.js
import { query } from "../config/db.js";

// --- (ADMIN) OBTENER REPORTE DE VENTAS FILTRADO ---
export const getSalesReport = async (req, res) => {
  // Obtenemos los filtros desde la URL (query params)
  const { startDate, endDate, clientName } = req.query;

  try {
    let sqlQuery = `
      SELECT 
        o.order_id, 
        o.created_at, 
        c.name as client_name, 
        c.email as client_email,
        o.status, 
        o.total_price
      FROM orders o
      JOIN clients c ON o.client_id = c.client_id
      WHERE 1=1 
    `;

    const params = [];

    // 1. Añadir filtro de clientName (búsqueda parcial)
    if (clientName) {
      params.push(`%${clientName}%`);
      sqlQuery += ` AND c.name ILIKE $${params.length}`; // ILIKE es case-insensitive
    }

    // 2. Añadir filtro de startDate
    if (startDate) {
      params.push(startDate);
      sqlQuery += ` AND o.created_at::date >= $${params.length}::date`;
    }

    // 3. Añadir filtro de endDate
    if (endDate) {
      params.push(endDate);
      sqlQuery += ` AND o.created_at::date <= $${params.length}::date`;
    }

    sqlQuery += ` ORDER BY o.created_at DESC`;

    const result = await query(sqlQuery, params);

    res.json(result.rows);
  } catch (error) {
    console.error("Error al generar el reporte de ventas:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

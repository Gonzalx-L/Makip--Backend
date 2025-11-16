import { query } from "../config/db.js";

// --- (ADMIN) OBTENER REPORTE DE VENTAS FILTRADO ---
export const getSalesReport = async (req, res) => {
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
    if (clientName) {
      params.push(`%${clientName}%`);
      // 💡 MODIFICADO:
      // Ahora busca por nombre del cliente O por el ID de la orden (convertido a texto)
      sqlQuery += ` AND (
        c.name ILIKE $${params.length} 
        OR o.order_id::text ILIKE $${params.length}
      )`;
    }
    if (startDate) {
      params.push(startDate);
      sqlQuery += ` AND o.created_at::date >= $${params.length}::date`;
    }
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

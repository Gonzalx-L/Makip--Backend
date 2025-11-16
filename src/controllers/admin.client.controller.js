import { query } from "../config/db.js";

// --- (ADMIN) OBTENER TODOS LOS CLIENTES (CON FILTROS) ---
export const getAllClients = async (req, res) => {
  // 💡 1. Obtenemos los filtros del query string
  const { search, startDate, endDate } = req.query;

  try {
    // 💡 2. Construimos la consulta SQL dinámicamente
    let sqlQuery = `
      SELECT client_id, name, email, google_uid, created_at 
      FROM clients 
      WHERE 1=1
    `;
    const params = [];

    // Añadir filtro de búsqueda (nombre O email)
    if (search) {
      params.push(`%${search}%`);
      sqlQuery += ` AND (name ILIKE $${params.length} OR email ILIKE $${params.length})`;
    }

    // Añadir filtro de fecha de inicio
    if (startDate) {
      params.push(startDate);
      sqlQuery += ` AND created_at::date >= $${params.length}::date`;
    }

    // Añadir filtro de fecha de fin
    if (endDate) {
      params.push(endDate);
      sqlQuery += ` AND created_at::date <= $${params.length}::date`;
    }

    sqlQuery += ` ORDER BY created_at DESC`;

    // 💡 3. Ejecutamos la consulta con los parámetros
    const result = await query(sqlQuery, params);
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener todos los clientes:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

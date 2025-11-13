// src/controllers/admin.client.controller.js
import { query } from "../config/db.js";

// --- (ADMIN) OBTENER TODOS LOS CLIENTES ---
export const getAllClients = async (req, res) => {
  try {
    // Obtenemos todos los clientes, ordenados por fecha de registro
    const result = await query(
      `SELECT client_id, name, email, google_uid, created_at 
       FROM clients 
       ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener todos los clientes:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

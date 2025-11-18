// src/middleware/client.auth.middleware.js
import jwt from "jsonwebtoken";
import "dotenv/config";
import { query } from "../config/db.js";

const JWT_SECRET = process.env.JWT_SECRET;

export const protectClientRoute = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Validar header Authorization
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ message: "Acceso no autorizado, no hay token" });
  }

  const token = authHeader.split(" ")[1];

  try {
    // Verificar token
    const decoded = jwt.verify(token, JWT_SECRET);
    const clientId = decoded.client_id;

    if (!clientId) {
      return res
        .status(401)
        .json({ message: "Token inválido (payload incorrecto)" });
    }

    // Validar que el cliente aún exista
    const result = await query("SELECT * FROM clients WHERE client_id = $1", [
      clientId,
    ]);

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Cliente no encontrado" });
    }

    // Inyectar cliente en req
    req.client = result.rows[0];

    return next();
  } catch (error) {
    console.error("Error de token de cliente:", error);
    return res.status(401).json({ message: "Token no válido o expirado" });
  }
};

// src/middleware/client.auth.middleware.js
// 💡 ¡VERSIÓN CORREGIDA!

import jwt from "jsonwebtoken";
import "dotenv/config";
import { query } from "../config/db.js";

const JWT_SECRET = process.env.JWT_SECRET;

export const protectClientRoute = async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      // 1. Obtener el token LOCAL
      token = authHeader.split(" ")[1];

      // 2. Verificar el token LOCAL (rápido y sin red)
      // @ts-ignore
      const decoded = jwt.verify(token, JWT_SECRET);

      // 3. Obtener el ID del cliente desde el payload del token
      // @ts-ignore
      const clientId = decoded.client_id;

      if (!clientId) {
        return res
          .status(401)
          .json({ message: "Token inválido (payload incorrecto)" });
      }

      // 4. (Opcional pero recomendado) Verificar que el cliente aún exista
      const result = await query("SELECT * FROM clients WHERE client_id = $1", [
        clientId,
      ]);

      if (result.rows.length === 0) {
        return res.status(401).json({ message: "Cliente no encontrado" });
      }

      // 5. Adjuntar el cliente al request
      req.client = result.rows[0];
      next();
    } catch (error) {
      console.error("Error de token de cliente:", error);
      res.status(401).json({ message: "Token no válido o expirado" });
    }
  }

  if (!token) {
    res.status(401).json({ message: "Acceso no autorizado, no hay token" });
  }
};

import { OAuth2Client } from "google-auth-library";
import { query } from "../config/db.js";
import "dotenv/config";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const protectClientRoute = async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      token = authHeader.split(" ")[1]; // Sacamos el token de Google

      // 1. Verificar el token con Google
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      const google_uid = payload.sub;

      // 2. Buscar al cliente en NUESTRA base de datos
      const result = await query(
        "SELECT * FROM clients WHERE google_uid = $1",
        [google_uid]
      );
      if (result.rows.length === 0) {
        return res.status(401).json({ message: "Cliente no registrado" });
      }

      // 3. ¡Todo bien! Adjuntamos el cliente al request
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

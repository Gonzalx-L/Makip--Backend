// src/middleware/auth.middleware.js
import jwt from "jsonwebtoken";
import "dotenv/config";

export const protectAdminRoute = (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization; // 1. Revisar que el token exista y tenga el formato "Bearer <token>"

  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      // 2. Sacar el token
      token = authHeader.split(" ")[1]; // 3. Verificar el token

      const decoded = jwt.verify(token, process.env.JWT_SECRET); // 4. Añadir los datos del admin al objeto 'req'

      req.admin = decoded; // 5. ¡Dejarlo pasar!

      next();
      return; // 💡 ¡CORRECCIÓN! Añadido return
    } catch (error) {
      console.error("Error de token:", error);
      res.status(401).json({ message: "Token no válido o expirado" });
      return; // 💡 ¡CORRECCIÓN! Añadido return
    }
  }

  if (!token) {
    res.status(401).json({ message: "Acceso no autorizado, no hay token" });
    return; // 💡 ¡CORRECCIÓN! Añadido return
  }
};

// src/middleware/auth.middleware.js
import jwt from "jsonwebtoken";
import "dotenv/config";

export const protectAdminRoute = (req, res, next) => {
  console.log(`[AUTH MIDDLEWARE] 🔐 Petición ${req.method} a: ${req.originalUrl}`);
  console.log(`[AUTH MIDDLEWARE] 📋 Headers:`, req.headers.authorization ? 'Token presente' : 'Sin token');
  
  // Permitir solicitudes OPTIONS para CORS
  if (req.method === 'OPTIONS') {
    console.log(`[AUTH MIDDLEWARE] ✅ OPTIONS request - permitiendo`);
    return next();
  }

  let token;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.admin = decoded;
      console.log(`[AUTH MIDDLEWARE] ✅ Token válido - admin: ${decoded.email || decoded.admin_id}`);
      next();
      return;
    } catch (error) {
      console.error(`[AUTH MIDDLEWARE] ❌ Error de token:`, error.message);
      res.status(401).json({ message: "Token no válido o expirado" });
      return;
    }
  }

  if (!token) {
    console.error(`[AUTH MIDDLEWARE] ❌ Sin token - rechazando petición`);
    res.status(401).json({ message: "Acceso no autorizado, no hay token" });
    return;
  }
};

import express from "express";
import cors from "cors";
import "dotenv/config";

// --- Importamos nuestras rutas ---
import adminRoutes from "./routes/admin.routes.js";
import clientAuthRoutes from "./routes/client.auth.routes.js";
import publicRoutes from "./routes/public.routes.js";
import orderRoutes from "./routes/order.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import productRoutes from "./routes/product.routes.js";
import adminOrderRoutes from "./routes/admin.order.routes.js";

// --- Importamos nuestro guardián ---
import { protectAdminRoute } from "./middleware/auth.middleware.js";

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// --- Rutas Públicas ---
app.use("/api/v1/admin", adminRoutes); // Login/Registro de Admin
app.use("/api/v1/auth", clientAuthRoutes); // Login/Registro de Clientes
app.use("/api/v1/public", publicRoutes); // Rutas Públicas (categorías y productos)
app.get("/api/v1", (req, res) => res.send("¡API de Makip v1 está viva!"));

// --- Rutas Protegidas para CLIENTES ---
// (Estas rutas usan su propio guardián interno)
app.use("/api/v1/orders", orderRoutes);

// --- Rutas Protegidas (SOLO ADMINS) ---
app.use(protectAdminRoute); // ¡El guardián! Todo lo de abajo requiere token.

app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/admin/orders", adminOrderRoutes);

app.get("/api/v1/test-protegido", (req, res) => {
  res.json({
    message: "¡Acceso concedido! Eres un admin.",
    adminInfo: req.admin,
  });
});

export default app;

//aun falta desplegar en cloud

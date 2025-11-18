// src/app.js
import express from "express";
import cors from "cors";
import "dotenv/config";


// 💡 1. IMPORTA LA RUTA QUE FALTABA
import adminClientRoutes from "./routes/admin.client.routes.js";
import adminReportRoutes from "./routes/admin.report.routes.js"; // 💡 (Ahora existe)

// --- Importamos nuestro guardián ---
import { protectAdminRoute } from "./middleware/auth.middleware.js";

const app = express();

// Configuración de CORS
const corsOptions = {
  origin: process.env.CORS_ORIGIN || "*",
  credentials: true,
};

// Middlewares
app.use(cors(corsOptions));
app.use(express.json());


// --- Importamos nuestras rutas ---
import adminRoutes from "./routes/admin.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import adminOrderRoutes from "./routes/admin.order.routes.js";
import clientAuthRoutes from "./routes/client.auth.routes.js";
import publicRoutes from "./routes/public.routes.js";
import orderRoutes from "./routes/order.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import productRoutes from "./routes/product.routes.js";
import adminDashboardRoutes from "./routes/admin.dashboard.routes.js";
import uploadRoutes from "./routes/upload.routes.js";

// --- Rutas Públicas ---
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/auth", clientAuthRoutes);
app.use("/api/v1/public", publicRoutes);
app.get("/api/v1", (req, res) => res.send("¡API de Makip v1 está viva!"));

// --- Rutas Protegidas para CLIENTES ---
app.use("/api/v1/orders", orderRoutes);

// --- Rutas Protegidas (SOLO ADMINS) ---
app.use(protectAdminRoute);

app.use("/api/v1/admin/clients", adminClientRoutes);
app.use("/api/v1/admin/dashboard-summary", adminDashboardRoutes);
app.use("/api/v1/upload", uploadRoutes);
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

// src/app.js
import express from "express";
import cors from "cors";
import "dotenv/config";

// Middlewares
import { protectAdminRoute } from "./middleware/auth.middleware.js";
import { protectClientRoute } from "./middleware/client.auth.middleware.js";

// Rutas Admin
import adminRoutes from "./routes/admin.routes.js";
import adminClientRoutes from "./routes/admin.client.routes.js";
import adminDashboardRoutes from "./routes/admin.dashboard.routes.js";
import adminOrderRoutes from "./routes/admin.order.routes.js";
import adminReportRoutes from "./routes/admin.report.routes.js";

// Rutas Cliente / Públicas
import clientAuthRoutes from "./routes/client.auth.routes.js";
import publicRoutes from "./routes/public.routes.js";
import orderRoutes from "./routes/order.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import productRoutes from "./routes/product.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";

const app = express();

// Configuración de CORS
const corsOptions = {
  origin: process.env.CORS_ORIGIN || "*",
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// ----------------------
// RUTAS PÚBLICAS
// ----------------------

// Admin: login / registro (no protegido)
app.use("/api/v1/admin", adminRoutes);

// Autenticación de clientes (clásico + Google)
app.use("/api/v1/auth", clientAuthRoutes);

// Catálogo público
app.use("/api/v1/public", publicRoutes);

// Power BI (token embebido)
app.use("/api/v1/dashboard", dashboardRoutes);

// Health check público
app.get("/api/v1", (req, res) => {
  res.send("¡API de Makip v1 está viva!");
});

// ----------------------
// RUTAS PROTEGIDAS CLIENTE
// ----------------------

// Todas las rutas de /orders requieren JWT de cliente
app.use("/api/v1/orders", protectClientRoute, orderRoutes);

// ----------------------
// RUTAS PROTEGIDAS ADMIN
// ----------------------

// Todo lo que viene después requiere JWT de admin
app.use(protectAdminRoute);

// Clientes (admin)
app.use("/api/v1/admin/clients", adminClientRoutes);

// Dashboard resumen (admin)
app.use("/api/v1/admin/dashboard-summary", adminDashboardRoutes);

// Subida de archivos (productos, etc.)
app.use("/api/v1/upload", uploadRoutes);

// Categorías y productos (admin)
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/products", productRoutes);

// Órdenes (admin)
app.use("/api/v1/admin/orders", adminOrderRoutes);

// Reportes (admin)
app.use("/api/v1/admin/reports", adminReportRoutes);

// Ruta de test para admins
app.get("/api/v1/test-protegido", (req, res) => {
  res.json({
    message: "¡Acceso concedido! Eres un admin.",
    adminInfo: req.admin,
  });
});

export default app;

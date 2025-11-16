// src/app.js
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
import uploadRoutes from "./routes/upload.routes.js";
import adminDashboardRoutes from "./routes/admin.dashboard.routes.js";
// import dashboardRoutes from "./routes/dashboard.routes.js"; // 💡 COMENTADO (para evitar crash por Power BI)
import adminClientRoutes from "./routes/admin.client.routes.js";
import adminReportRoutes from "./routes/admin.report.routes.js"; // 💡 (Ahora existe)

// --- Importamos nuestro guardián ---
import { protectAdminRoute } from "./middleware/auth.middleware.js";

const app = express();

const corsOptions = {
  origin: "http://localhost:5173",
  methods: "GET,POST,PUT,DELETE,PATCH,HEAD",
  allowedHeaders: ["Content-Type", "Authorization"],
};

// Middlewares
app.use(cors(corsOptions));
app.use(express.json());

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
// app.use("/api/v1/dashboard", dashboardRoutes); // 💡 COMENTADO

app.use("/api/v1/admin/reports", adminReportRoutes); // 💡 (Ahora existe)

app.get("/api/v1/test-protegido", (req, res) => {
  res.json({
    message: "¡Acceso concedido! Eres un admin.",
    adminInfo: req.admin,
  });
});

export default app;

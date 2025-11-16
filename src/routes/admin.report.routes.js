// src/routes/admin.report.routes.js
import { Router } from "express";
import { getSalesReport } from "../controllers/admin.report.controller.js";

const router = Router();

// Esta ruta estará protegida por 'protectAdminRoute' en app.js
// GET /api/v1/admin/reports
router.get("/", getSalesReport);

export default router;

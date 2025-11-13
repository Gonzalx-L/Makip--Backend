// src/routes/admin.dashboard.routes.js
import { Router } from "express";
import { getDashboardSummary } from "../controllers/admin.dashboard.controller.js";

const router = Router();

// Esta ruta estará protegida por el guardián en app.js
// GET /api/v1/admin/dashboard-summary
router.get("/", getDashboardSummary);

export default router;

// src/routes/admin.client.routes.js
import { Router } from "express";
import { getAllClients } from "../controllers/admin.client.controller.js";

const router = Router();

// Esta ruta estará protegida por 'protectAdminRoute' en app.js
// GET /api/v1/admin/clients
router.get("/", getAllClients);

export default router;

import { Router } from "express";
import {
  getAllOrders,
  getOrderById,
  updateOrderStatus,
} from "../controllers/admin.order.controller.js";

const router = Router();

// NOTA: No necesitamos 'protectAdminRoute' aquí
// porque este archivo se cargará DESPUÉS del guardián en app.js

// GET /api/v1/admin/orders
// (Obtener todos los pedidos)
router.get("/", getAllOrders);

// GET /api/v1/admin/orders/:id
// (Ver un pedido específico)
router.get("/:id", getOrderById);

// PATCH /api/v1/admin/orders/:id/status
// (Actualizar el estado de un pedido)
router.patch("/:id/status", updateOrderStatus);

export default router;

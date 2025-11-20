// src/routes/admin.order.routes.js
import { Router } from "express";
import {
  getAllOrders,
  getOrderById,
  getOrdersByDeliveryType,
  getOrderByPickupCode,
  getOrderStats,
  updateOrderStatus,
  downloadOrderPDF, // 💡 1. Importa la nueva función
} from "../controllers/admin.order.controller.js";

const router = Router();

// GET /api/v1/admin/orders
router.get("/", getAllOrders);

// GET /api/v1/admin/orders/stats
// Obtener estadísticas de pedidos
router.get("/stats", getOrderStats);

// GET /api/v1/admin/orders/delivery/:type
// Filtrar pedidos por tipo (DELIVERY o PICKUP)
router.get("/delivery/:type", getOrdersByDeliveryType);

// GET /api/v1/admin/orders/pickup-code/:code
// Buscar pedido por código de recojo
router.get("/pickup-code/:code", getOrderByPickupCode);

// GET /api/v1/admin/orders/:id
router.get("/:id", getOrderById);

// PATCH /api/v1/admin/orders/:id/status
router.patch("/:id/status", updateOrderStatus);

// 💡 2. AÑADE LA NUEVA RUTA
// GET /api/v1/admin/orders/:id/pdf
router.get("/:id/pdf", downloadOrderPDF);

export default router;

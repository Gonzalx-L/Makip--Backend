// src/routes/admin.order.routes.js
import { Router } from "express";
import {
  getAllOrders,
  getOrderById,
  getOrdersByDeliveryType,
  getOrderByPickupCode,
  getOrderStats,
  updateOrderStatus,
  downloadOrderPDF,
  uploadShippingReceipt,
  resendShippingEmail, // Nueva función para reenviar
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

// GET /api/v1/admin/orders/:id/pdf
router.get("/:id/pdf", downloadOrderPDF);

// POST /api/v1/admin/orders/:id/shipping-receipt
// Subir boleta de envío (requiere multer middleware)
import { upload } from "../middleware/multer.middleware.js";
router.post("/:id/shipping-receipt", upload.single("receipt"), uploadShippingReceipt);

// POST /api/v1/admin/orders/:id/resend-shipping-email
// Reenviar email de envío con boleta adjunta
router.post("/:id/resend-shipping-email", resendShippingEmail);

export default router;

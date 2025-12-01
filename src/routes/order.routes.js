import { Router } from "express";
import {
  createOrder,
  getMyOrders,
  uploadPaymentProof, // <-- ¡NUEVA!
  getOrderTracking, // <-- ¡NUEVA para tracking!
} from "../controllers/order.controller.js";
import { protectClientRoute } from "../middleware/client.auth.middleware.js";
import { upload } from "../middleware/multer.middleware.js"; // <-- ¡IMPORTAMOS MULTER!

const router = Router();

// --- Rutas Protegidas para Clientes ---
// (Todas las rutas aquí requieren un token de Google válido)
router.use(protectClientRoute);

// POST /api/v1/orders
// Crear un nuevo pedido
router.post("/", createOrder);

// GET /api/v1/orders/my-orders
// Ver mi historial de pedidos
router.get("/my-orders", getMyOrders);

// POST /api/v1/orders/:id/upload-proof
// Subir el comprobante de pago (espera un archivo llamado 'file')
router.post(
  "/:id/upload-proof",
  upload.single("file"), // <-- MULTER ACTÚA AQUÍ
  uploadPaymentProof // <-- NUEVO CONTROLADOR
);

// GET /api/v1/orders/:orderId/tracking
// Obtener información de tracking del pedido
router.get("/:orderId/tracking", getOrderTracking);

export default router;

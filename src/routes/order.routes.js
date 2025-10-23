import { Router } from "express";
import { createOrder, getMyOrders } from "../controllers/order.controller.js";
import { protectClientRoute } from "../middleware/client.auth.middleware.js";

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

export default router;

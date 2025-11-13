// src/routes/product.routes.js
import { Router } from "express";
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductById, // 💡 1. Importa la nueva función
} from "../controllers/product.controller.js";

const router = Router();

// Todas estas están protegidas por el guardián en app.js

// GET /api/v1/products
router.get("/", getProducts);

// POST /api/v1/products
router.post("/", createProduct);

// 💡 2. AÑADE LA NUEVA RUTA
// GET /api/v1/products/:id
router.get("/:id", getProductById);

// PUT /api/v1/products/:id
router.put("/:id", updateProduct);

// DELETE /api/v1/products/:id
router.delete("/:id", deleteProduct);

export default router;

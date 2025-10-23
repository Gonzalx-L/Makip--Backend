import { Router } from "express";
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/product.controller.js";

const router = Router();

// Todas estas están protegidas por el guardián en app.js

// GET /api/v1/products
router.get("/", getProducts);

// POST /api/v1/products
router.post("/", createProduct);

// PUT /api/v1/products/:id
router.put("/:id", updateProduct);

// DELETE /api/v1/products/:id
router.delete("/:id", deleteProduct);

export default router;

import { Router } from "express";
import {
  getPublicCategories,
  getPublicProducts,
  getPublicProductById,
} from "../controllers/public.controller.js";

const router = Router();

// URL: GET /api/v1/public/categories
router.get("/categories", getPublicCategories);

// URL: GET /api/v1/public/products
router.get("/products", getPublicProducts);

// URL: GET /api/v1/public/products/:id
router.get("/products/:id", getPublicProductById);

export default router;

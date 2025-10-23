import { Router } from "express";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/category.controller.js";

const router = Router();

// Estas rutas ya estarán protegidas por el guardián en app.js

// GET /api/v1/categories
router.get("/", getCategories);

// POST /api/v1/categories
router.post("/", createCategory);

// PUT /api/v1/categories/:id
router.put("/:id", updateCategory);

// DELETE /api/v1/categories/:id
router.delete("/:id", deleteCategory);

export default router;

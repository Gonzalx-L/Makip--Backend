// src/routes/upload.routes.js
import { Router } from "express";
import { uploadProductImage } from "../controllers/upload.controller.js";
import { upload } from "../middleware/multer.middleware.js"; // Importamos tu middleware de Multer

const router = Router();

// POST /api/v1/upload/product-image
// 1. 'upload.single("file")' (Multer) procesa el archivo
// 2. 'uploadProductImage' (Controlador) lo sube a GCS
router.post(
  "/product-image",
  upload.single("file"), // Espera un campo 'file'
  uploadProductImage
);

export default router;

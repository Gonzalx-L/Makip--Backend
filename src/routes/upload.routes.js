// src/routes/upload.routes.js
import { Router } from "express";
import { uploadProductImage, uploadPersonalizationImage, uploadLogo } from "../controllers/upload.controller.js";
import { upload } from "../middleware/multer.middleware.js";

const router = Router();

// POST /api/v1/upload/product-image
router.post(
  "/product-image",
  upload.single("file"),
  uploadProductImage
);

// POST /api/v1/upload/personalization-image
router.post(
  "/personalization-image",
  upload.single("file"),
  uploadPersonalizationImage
);

// POST /api/upload/logos (para logos de clientes)
router.post(
  "/logos",
  upload.single("file"),
  uploadLogo
);

export default router;
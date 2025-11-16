// src/routes/client.auth.routes.js
import { Router } from "express";
import {
  authWithGoogle,
  registerClient, // 💡 NUEVO
  loginClient, // 💡 NUEVO
  forgotPassword, // 💡 NUEVO
  resetPassword, // 💡 NUEVO
} from "../controllers/client.auth.controller.js";

const router = Router();

// URL: POST /api/v1/auth/google
router.post("/google", authWithGoogle);

// 💡 --- NUEVAS RUTAS PARA LOGIN CLÁSICO ---

// URL: POST /api/v1/auth/register
router.post("/register", registerClient);

// URL: POST /api/v1/auth/login
router.post("/login", loginClient);

// URL: POST /api/v1/auth/forgot-password
router.post("/forgot-password", forgotPassword);

// URL: POST /api/v1/auth/reset-password
router.post("/reset-password", resetPassword);

export default router;

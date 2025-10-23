import { Router } from "express";
import { authWithGoogle } from "../controllers/client.auth.controller.js";

const router = Router();

// URL: POST /api/v1/auth/google
// Esta ruta recibe el token de Google y gestiona el login/registro
router.post("/google", authWithGoogle);

export default router;

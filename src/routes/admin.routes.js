import { Router } from "express";
import { registerAdmin, loginAdmin } from "../controllers/admin.controller.js";

const router = Router();

// URL: POST /api/v1/admin/register
router.post("/register", registerAdmin);

// URL: POST /api/v1/admin/login
router.post("/login", loginAdmin);

export default router;

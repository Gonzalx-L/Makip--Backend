import { query } from "../config/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import "dotenv/config";

// --- REGISTRAR UN NUEVO ADMIN ---
// (Esto solo lo correrás una vez para crear tu propio usuario)
export const registerAdmin = async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Encriptar la contraseña
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 2. Guardar en la BD
    const result = await query(
      "INSERT INTO admins (email, password_hash) VALUES ($1, $2) RETURNING admin_id, email",
      [email, passwordHash]
    );

    res.status(201).json({
      message: "Administrador registrado con éxito",
      admin: result.rows[0],
    });
  } catch (error) {
    console.error("Error al registrar admin:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// --- LOGIN DE ADMIN ---
export const loginAdmin = async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Buscar al admin por email
    const result = await query("SELECT * FROM admins WHERE email = $1", [
      email,
    ]);
    if (result.rows.length === 0) {
      return res
        .status(401)
        .json({ message: "Email o contraseña incorrectos" });
    }

    const admin = result.rows[0];

    // 2. Comparar la contraseña
    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      return res
        .status(401)
        .json({ message: "Email o contraseña incorrectos" });
    }

    // 3. Crear el Token de Seguridad (JWT)
    const payload = {
      adminId: admin.admin_id,
      email: admin.email,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1d", // El token expira en 1 día
    });

    // 4. Enviar el token al cliente
    res.json({
      message: "Login exitoso",
      token: token,
    });
  } catch (error) {
    console.error("Error en login de admin:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

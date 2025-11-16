// src/controllers/client.auth.controller.js
import { OAuth2Client } from "google-auth-library";
import { query } from "../config/db.js";
import {
  sendWelcomeEmail,
  sendPasswordResetEmail,
} from "../services/email.service.js";
import "dotenv/config";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const JWT_SECRET = process.env.JWT_SECRET;

// --- FUNCIÓN DE AYUDA: Generar un Token JWT para el Cliente ---
const generateClientToken = (client) => {
  const payload = {
    client_id: client.client_id,
    email: client.email,
    name: client.name,
  };
  // 💡 Hacemos que el token del cliente dure 7 días
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
};

// 💡 --- (MODIFICADA) LOGIN/REGISTRO CON GOOGLE (Flujo Híbrido) ---
export const authWithGoogle = async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ message: "No se proveyó un token" });
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: google_uid, email, name } = payload;

    // 💡 1. Buscamos por EMAIL, no por google_uid
    let result = await query("SELECT * FROM clients WHERE email = $1", [email]);

    if (result.rows.length > 0) {
      // --- El Email YA EXISTE ---
      const client = result.rows[0];

      if (!client.google_uid) {
        // 💡 2. Es un usuario clásico. "Linkeamos" su cuenta a Google.
        await query("UPDATE clients SET google_uid = $1 WHERE client_id = $2", [
          google_uid,
          client.client_id,
        ]);
        console.log(`Cuenta clásica de ${email} linkeada a Google.`);
      }

      const jwtToken = generateClientToken(client);
      res.json({
        message: "Login exitoso",
        token: jwtToken,
        client: client,
        isNewUser: false,
      });
    } else {
      // --- Es un cliente 100% nuevo ---
      console.log(`Registrando nuevo cliente (vía Google): ${email}`);
      const newClientResult = await query(
        "INSERT INTO clients (google_uid, email, name) VALUES ($1, $2, $3) RETURNING *",
        [google_uid, email, name]
      );
      const newClient = newClientResult.rows[0];

      sendWelcomeEmail(email, name); // Enviar bienvenida

      const jwtToken = generateClientToken(newClient);
      res.status(201).json({
        message: "Registro exitoso",
        token: jwtToken,
        client: newClient,
        isNewUser: true,
      });
    }
  } catch (error) {
    console.error("Error en la autenticación con Google:", error);
    res.status(401).json({ message: "Token de Google inválido" });
  }
};

// 💡 --- (NUEVA) REGISTRO CLÁSICO ---
export const registerClient = async (req, res) => {
  const { name, email, password, phone, dni } = req.body;

  if (!name || !email || !password || !phone) {
    return res
      .status(400)
      .json({
        message: "Nombre, email, contraseña y teléfono son requeridos.",
      });
  }

  try {
    // 1. Revisar si el email ya existe
    const userCheck = await query("SELECT * FROM clients WHERE email = $1", [
      email,
    ]);
    if (userCheck.rows.length > 0) {
      return res.status(409).json({ message: "El email ya está registrado." });
    }

    // 2. Encriptar contraseña
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 3. Guardar en BD (sin google_uid)
    const newClientResult = await query(
      `INSERT INTO clients (name, email, password_hash, phone, dni) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, email, passwordHash, phone, dni]
    );
    const newClient = newClientResult.rows[0];

    // 4. Enviar email de bienvenida
    sendWelcomeEmail(email, name);

    // 5. Generar y enviar token
    const jwtToken = generateClientToken(newClient);
    res.status(201).json({
      message: "Registro exitoso",
      token: jwtToken,
      client: newClient,
      isNewUser: true,
    });
  } catch (error) {
    console.error("Error en registro clásico:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// 💡 --- (NUEVA) LOGIN CLÁSICO ---
export const loginClient = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Email y contraseña son requeridos." });
  }

  try {
    // 1. Buscar al cliente por email
    const result = await query("SELECT * FROM clients WHERE email = $1", [
      email,
    ]);
    if (result.rows.length === 0) {
      return res
        .status(401)
        .json({ message: "Email o contraseña incorrectos" });
    }

    const client = result.rows[0];

    // 2. Si no tiene password_hash (es solo de Google), rechazar
    if (!client.password_hash) {
      return res
        .status(401)
        .json({ message: "Esta cuenta solo puede iniciar sesión con Google." });
    }

    // 3. Comparar la contraseña
    const isMatch = await bcrypt.compare(password, client.password_hash);
    if (!isMatch) {
      return res
        .status(401)
        .json({ message: "Email o contraseña incorrectos" });
    }

    // 4. Generar y enviar token
    const jwtToken = generateClientToken(client);
    res.json({
      message: "Login exitoso",
      token: jwtToken,
      client: client,
      isNewUser: false,
    });
  } catch (error) {
    console.error("Error en login clásico:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// 💡 --- (NUEVA) OLVIDÓ CONTRASEÑA ---
export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: "Email es requerido." });
  }

  try {
    const result = await query(
      "SELECT * FROM clients WHERE email = $1 AND password_hash IS NOT NULL",
      [email]
    );
    if (result.rows.length === 0) {
      // No revelamos si el usuario existe o no por seguridad
      return res.json({
        message:
          "Si existe una cuenta con ese email, se ha enviado un enlace de recuperación.",
      });
    }

    const client = result.rows[0];

    // 1. Generar un token de reseteo (JWT de corta duración)
    const resetToken = jwt.sign(
      { client_id: client.client_id },
      JWT_SECRET,
      { expiresIn: "1h" } // Válido por 1 hora
    );

    // 2. Enviar el email con el token
    await sendPasswordResetEmail(client.email, resetToken);

    res.json({
      message:
        "Si existe una cuenta con ese email, se ha enviado un enlace de recuperación.",
    });
  } catch (error) {
    console.error("Error en forgotPassword:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// 💡 --- (NUEVA) RESETEAR CONTRASEÑA ---
export const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res
      .status(400)
      .json({ message: "Token y nueva contraseña son requeridos." });
  }

  try {
    // 1. Verificar el token de reseteo
    const payload = jwt.verify(token, JWT_SECRET);
    // @ts-ignore
    const clientId = payload.client_id;

    if (!clientId) {
      return res.status(400).json({ message: "Token inválido." });
    }

    // 2. Encriptar la nueva contraseña
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    // 3. Actualizar la contraseña en la BD
    await query("UPDATE clients SET password_hash = $1 WHERE client_id = $2", [
      passwordHash,
      clientId,
    ]);

    res.json({ message: "Contraseña actualizada con éxito." });
  } catch (error) {
    console.error("Error en resetPassword:", error);
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res.status(401).json({ message: "Token inválido o expirado." });
    }
    res.status(500).json({ message: "Error en el servidor" });
  }
};

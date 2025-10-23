import { OAuth2Client } from "google-auth-library";
import { query } from "../config/db.js";
import { sendWelcomeEmail } from "../services/email.service.js";
import "dotenv/config";

// 1. Inicializamos el cliente de Google
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// --- VERIFICAR TOKEN DE GOOGLE Y GESTIONAR LOGIN/REGISTRO ---
export const authWithGoogle = async (req, res) => {
  const { token } = req.body; // El token que nos envía el frontend (React)

  if (!token) {
    return res.status(400).json({ message: "No se proveyó un token" });
  }

  try {
    // 2. Verificar el token con Google
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: google_uid, email, name } = payload;

    // 3. Revisar si el cliente ya existe en nuestra BD
    let result = await query("SELECT * FROM clients WHERE google_uid = $1", [
      google_uid,
    ]);
    let clientExists = result.rows.length > 0;

    if (clientExists) {
      // --- El cliente ya existe: solo lo logueamos ---
      console.log(`Cliente existente logueado: ${email}`);
      res.json({
        message: "Login exitoso",
        client: result.rows[0],
        isNewUser: false,
      });
    } else {
      // --- Es un cliente nuevo: lo registramos ---
      console.log(`Registrando nuevo cliente: ${email}`);

      const newClientResult = await query(
        "INSERT INTO clients (google_uid, email, name) VALUES ($1, $2, $3) RETURNING *",
        [google_uid, email, name]
      );
      const newClient = newClientResult.rows[0];

      // 4. Enviar el correo de bienvenida (sin esperar a que termine)
      sendWelcomeEmail(email, name);

      res.status(201).json({
        message: "Registro exitoso",
        client: newClient,
        isNewUser: true,
      });
    }
  } catch (error) {
    console.error("Error en la autenticación con Google:", error);
    res.status(401).json({ message: "Token de Google inválido" });
  }
};

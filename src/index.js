import app from "./app.js";
import "dotenv/config";
import pool from "./config/db.js";

const PORT = process.env.PORT || 4000;

const testDbConnection = async () => {
  try {
    const result = await pool.query("SELECT NOW()");
    console.log(
      "✅ Base de Datos Conectada Exitosamente a las:",
      result.rows[0].now
    );
  } catch (error) {
    console.error(" Error al conectar a la Base de Datos:", error.message);
  }
};

const startServer = () => {
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);

    testDbConnection();
  });
};

startServer();

import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

// Validación de variables críticas
const requiredEnv = ["DB_USER", "DB_PASSWORD", "DB_HOST", "DB_PORT", "DB_NAME"];

requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    console.error(`❌ Missing environment variable: ${key}`);
    process.exit(1); // Frenamos el backend antes de que explote después
  }
});

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT), // convertimos a número
  database: process.env.DB_NAME,
  max: 10, // límite de conexiones concurrentes
  idleTimeoutMillis: 30000, // matar conexiones inactivas
});

// Logs de conexión y errores
pool.on("connect", () => {
  console.log("📡 Connected to PostgreSQL successfully");
});

pool.on("error", (err) => {
  console.error("🔥 Unexpected PG error", err);
  process.exit(-1);
});
//test
//test2
// Función global para ejecutar queries
//
//
///
export const query = (text, params) => pool.query(text, params);

export default pool;

import "dotenv/config"; // Carga las variables .env
import pg from "pg";

const { Pool } = pg;

// Configura el pool de conexiones usando las variables del .env
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
});

// Exportamos una función 'query' para usar en toda la app
// Esto nos permite usar "await query(...)" en lugar de "await pool.query(...)"
export const query = (text, params) => pool.query(text, params);

// También exportamos el pool por si lo necesitamos
export default pool;

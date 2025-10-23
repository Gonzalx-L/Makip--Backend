import { query } from "../config/db.js";

// --- OBTENER TODAS LAS CATEGORÍAS ACTIVAS ---
export const getPublicCategories = async (req, res) => {
  try {
    const result = await query(
      "SELECT category_id, name FROM categories WHERE is_active = true ORDER BY name"
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener categorías públicas:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// --- OBTENER TODOS LOS PRODUCTOS ACTIVOS ---
export const getPublicProducts = async (req, res) => {
  try {
    // Hacemos un JOIN para incluir el nombre de la categoría
    const result = await query(`
      SELECT p.product_id, p.name, p.description, p.base_price, p.min_order_quantity, p.base_image_url, p.variants, p.personalization_metadata, c.name as category_name 
      FROM products p
      JOIN categories c ON p.category_id = c.category_id
      WHERE p.is_active = true AND c.is_active = true
      ORDER BY p.name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener productos públicos:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// --- OBTENER UN SOLO PRODUCTO PÚBLICO POR ID ---
export const getPublicProductById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query(
      `
      SELECT p.product_id, p.name, p.description, p.base_price, p.min_order_quantity, p.base_image_url, p.variants, p.personalization_metadata, c.name as category_name 
      FROM products p
      JOIN categories c ON p.category_id = c.category_id
      WHERE p.is_active = true AND c.is_active = true AND p.product_id = $1
    `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error al obtener producto:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

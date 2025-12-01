// src/controllers/product.controller.js
import { query } from "../config/db.js";

// --- OBTENER TODOS LOS PRODUCTOS ---
export const getProducts = async (req, res) => {
  try {
    // Consulta 100% limpia sin caracteres inválidos
    const result = await query(`
      SELECT p.*, c.name as category_name 
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.category_id
      ORDER BY p.name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener productos:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// --- CREAR UN PRODUCTO ---
export const createProduct = async (req, res) => {
  const {
    category_id,
    name,
    description,
    base_price,
    min_order_quantity,
    variants,
    personalization_metadata,
    base_image_url,
    is_personalizable,
  } = req.body;

  try {
    const result = await query(
      `INSERT INTO products (category_id, name, description, base_price, min_order_quantity, base_image_url, variants, personalization_metadata, is_personalizable, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true) RETURNING *`,
      [
        category_id,
        name,
        description,
        base_price,
        min_order_quantity,
        base_image_url,
        variants,
        personalization_metadata,
        is_personalizable || false,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error al crear producto:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// --- ACTUALIZAR UN PRODUCTO ---
export const updateProduct = async (req, res) => {
  const { id } = req.params;
  const {
    category_id,
    name,
    description,
    base_price,
    min_order_quantity,
    variants,
    personalization_metadata,
    is_active,
    base_image_url,
    is_personalizable,
  } = req.body;

  try {
    const result = await query(
      `UPDATE products SET 
         category_id = $1, name = $2, description = $3, base_price = $4, 
         min_order_quantity = $5, variants = $6, personalization_metadata = $7, is_active = $8,
         base_image_url = $9, is_personalizable = COALESCE($10, is_personalizable)
       WHERE product_id = $11 RETURNING *`,
      [
        category_id,
        name,
        description,
        base_price,
        min_order_quantity,
        variants,
        personalization_metadata,
        is_active,
        base_image_url,
        is_personalizable,
        id,
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error al actualizar producto:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// --- "ELIMINAR" UN PRODUCTO (Borrado Lógico) ---
export const deleteProduct = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query(
      "UPDATE products SET is_active = false WHERE product_id = $1 RETURNING *",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }
    res.json({ message: "Producto desactivado exitosamente" });
  } catch (error) {
    console.error("Error al desactivar producto:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// --- OBTENER UN PRODUCTO POR ID ---
export const getProductById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query(
      `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.category_id
      WHERE p.product_id = $1
    `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error al obtener producto por ID:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

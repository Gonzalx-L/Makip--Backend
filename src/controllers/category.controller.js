import { query } from "../config/db.js";

// --- OBTENER TODAS LAS CATEGORÍAS ---
export const getCategories = async (req, res) => {
  try {
    const result = await query(
      "SELECT * FROM categories WHERE is_active = true ORDER BY name"
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener categorías:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// --- CREAR UNA NUEVA CATEGORÍA ---
export const createCategory = async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ message: "El nombre es requerido" });
  }

  try {
    const result = await query(
      "INSERT INTO categories (name) VALUES ($1) RETURNING *",
      [name]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error al crear categoría:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// --- ACTUALIZAR UNA CATEGORÍA ---
export const updateCategory = async (req, res) => {
  const { id } = req.params;
  const { name, is_active } = req.body;

  try {
    const result = await query(
      "UPDATE categories SET name = $1, is_active = $2 WHERE category_id = $3 RETURNING *",
      [name, is_active, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Categoría no encontrada" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error al actualizar categoría:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// --- "ELIMINAR" UNA CATEGORÍA (Borrado Lógico) ---
export const deleteCategory = async (req, res) => {
  const { id } = req.params;

  try {
    // No borramos, solo desactivamos
    const result = await query(
      "UPDATE categories SET is_active = false WHERE category_id = $1 RETURNING *",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Categoría no encontrada" });
    }
    res.json({ message: "Categoría desactivada exitosamente" });
  } catch (error) {
    console.error("Error al desactivar categoría:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

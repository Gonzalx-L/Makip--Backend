// src/controllers/upload.controller.js
import { uploadToGCS } from "../services/gcs.service.js";

export const uploadProductImage = async (req, res) => {
  try {
    // 1. Verificar que el archivo exista (Multer lo pone en 'req.file')
    if (!req.file) {
      return res.status(400).json({ message: "No se subió ningún archivo." });
    }

    // 2. Subir a GCS en la carpeta 'product-images'
    const publicUrl = await uploadToGCS(req.file, "product-images");

    // 3. Devolver la URL pública al frontend
    res.json({
      message: "Imagen subida con éxito",
      imageUrl: publicUrl,
    });
  } catch (error) {
    console.error("Error al subir imagen de producto:", error);
    res
      .status(500)
      .json({ message: "Error en el servidor", error: error.message });
  }
};

export const uploadPersonalizationImage = async (req, res) => {
  try {
    // 1. Verificar que el archivo exista
    if (!req.file) {
      return res.status(400).json({ message: "No se subió ningún archivo." });
    }

    // 2. Obtener la carpeta desde el body (opcional, default: 'personalization')
    const folder = req.body.folder || 'personalization';

    // 3. Subir a GCS en la carpeta especificada
    const publicUrl = await uploadToGCS(req.file, folder);

    // 4. Devolver la URL pública al frontend
    res.json({
      message: "Imagen de personalización subida con éxito",
      imageUrl: publicUrl,
    });
  } catch (error) {
    console.error("Error al subir imagen de personalización:", error);
    res
      .status(500)
      .json({ message: "Error en el servidor", error: error.message });
  }
};

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

// Endpoint específico para logos de clientes
export const uploadLogo = async (req, res) => {
  try {
    console.log('[UPLOAD] 📤 Recibiendo logo del cliente...');
    
    // 1. Verificar que el archivo exista
    if (!req.file) {
      console.log('[UPLOAD] ❌ No se recibió archivo');
      return res.status(400).json({ message: "No se subió ningún archivo." });
    }

    // 2. Validar que sea PNG
    if (!req.file.mimetype.includes('png')) {
      console.log('[UPLOAD] ❌ Formato inválido:', req.file.mimetype);
      return res.status(400).json({ 
        message: "Solo se permiten archivos PNG",
        receivedType: req.file.mimetype 
      });
    }

    console.log('[UPLOAD] ✅ Archivo válido:', req.file.originalname);
    console.log('[UPLOAD] 📏 Tamaño:', (req.file.size / 1024).toFixed(2), 'KB');

    // 3. Subir a GCS en la carpeta 'logos'
    const publicUrl = await uploadToGCS(req.file, "logos");

    console.log('[UPLOAD] ✅ Logo subido exitosamente');
    console.log('[UPLOAD] 🔗 URL pública:', publicUrl);

    // 4. Devolver la URL pública (mismo formato que espera el frontend)
    res.json({
      message: "Logo subido con éxito",
      publicUrl: publicUrl  // ⭐ Frontend espera "publicUrl"
    });
  } catch (error) {
    console.error('[UPLOAD] ❌ Error al subir logo:', error);
    res.status(500).json({ 
      message: "Error al subir el logo", 
      error: error.message 
    });
  }
};

// src/services/ocr.service.js
import { ImageAnnotatorClient } from "@google-cloud/vision";
import "dotenv/config";

// 1. Inicializa el cliente de Vision AI
// (Usa automáticamente tu 'service-account.json' gracias a la variable de entorno)
const client = new ImageAnnotatorClient();

/**
 * Lee todo el texto de una imagen usando Google Cloud Vision AI.
 * @param {Buffer} imageBuffer El buffer de la imagen (ej: req.file.buffer)
 * @returns {Promise<string>} El texto completo detectado en la imagen.
 */
export const detectText = async (imageBuffer) => {
  try {
    // 2. Llama a la API de Google
    const [result] = await client.textDetection(imageBuffer);
    const detections = result.textAnnotations;

    if (detections && detections.length > 0) {
      // 3. Devuelve el texto completo (el primer elemento siempre es el texto completo)
      // Lo convertimos a minúsculas y quitamos tildes para facilitar la búsqueda
      const fullText = detections[0].description
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, ""); // Quita tildes

      return fullText;
    }

    return ""; // No se detectó texto
  } catch (error) {
    console.error("Error en Google Cloud Vision API:", error);
    throw new Error("No se pudo leer el texto de la imagen.");
  }
};

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

/**
 * Extrae datos de una boleta de envío (Shalom, InstaCargo, etc.)
 * @param {Buffer} imageBuffer - Buffer de la imagen de la boleta
 * @returns {Promise<Object>} Datos extraídos: { trackingNumber, company, destination, shippingDate }
 */
export const extractShippingReceiptData = async (imageBuffer) => {
  try {
    console.log("[OCR SHIPPING] Leyendo texto de la boleta de envío...");
    
    // Detectar texto completo (SIN normalizar para preservar números)
    const [result] = await client.textDetection(imageBuffer);
    const detections = result.textAnnotations;

    if (!detections || detections.length === 0) {
      throw new Error("No se detectó texto en la boleta");
    }

    const fullText = detections[0].description;
    console.log("[OCR SHIPPING] Texto detectado:");
    console.log(fullText);

    // Extraer datos en español
    const shippingData = {
      trackingNumber: null,
      company: null,
      destination: null,
      shippingDate: null,
      // Datos del remitente
      senderName: null,
      senderDni: null,
      senderPhone: null,
      // Datos del destinatario
      recipientName: null,
      recipientDni: null,
      recipientPhone: null
    };

    // 1. Detectar empresa de envío
    const textLower = fullText.toLowerCase();
    if (textLower.includes("shalom")) {
      shippingData.company = "Shalom";
    } else if (textLower.includes("instacargo") || textLower.includes("insta cargo")) {
      shippingData.company = "InstaCargo";
    } else if (textLower.includes("olva")) {
      shippingData.company = "Olva Courier";
    } else if (textLower.includes("serpost")) {
      shippingData.company = "Serpost";
    } else {
      shippingData.company = "Courier";
    }

    // 2. Extraer número de orden/tracking
    const trackingPatterns = [
      /nro\.?\s*orden[:\s]*([a-z0-9\-]+)/i,
      /orden\s+de\s+envio[:\s]*([a-z0-9\-]+)/i,
      /tracking[:\s]*([a-z0-9\-]+)/i,
      /guia[:\s]*([a-z0-9\-]+)/i,
      /codigo[:\s]*([a-z0-9\-]+)/i
    ];

    for (const pattern of trackingPatterns) {
      const match = fullText.match(pattern);
      if (match && match[1]) {
        shippingData.trackingNumber = match[1].trim();
        break;
      }
    }

    // 3. Extraer datos del REMITENTE
    const senderSection = fullText.match(/(?:remitente|datos\s+del\s+remitente)([\s\S]*?)(?=destinatario|datos\s+del\s+destinatario|entrega|$)/i);
    if (senderSection) {
      const senderText = senderSection[1];
      
      // Nombre del remitente
      const senderNameMatch = senderText.match(/nombre[\/\s]*raz[.\s]*social[:\s]*([^\n]+)/i);
      if (senderNameMatch) {
        shippingData.senderName = senderNameMatch[1].trim();
      }
      
      // DNI/RUC del remitente
      const senderDniMatch = senderText.match(/dni[\/\s]*ruc[:\s]*(\d+)/i);
      if (senderDniMatch) {
        shippingData.senderDni = senderDniMatch[1].trim();
      }
      
      // Teléfono del remitente
      const senderPhoneMatch = senderText.match(/telefono[:\s]*(\d+)/i);
      if (senderPhoneMatch) {
        shippingData.senderPhone = senderPhoneMatch[1].trim();
      }
    }

    // 4. Extraer datos del DESTINATARIO
    const recipientSection = fullText.match(/(?:destinatario|datos\s+del\s+destinatario)([\s\S]*?)(?=entrega|direccion|forma\s+de\s+pago|$)/i);
    if (recipientSection) {
      const recipientText = recipientSection[1];
      
      // Nombre del destinatario
      const recipientNameMatch = recipientText.match(/nombre[\/\s]*raz[.\s]*social[:\s]*([^\n]+)/i);
      if (recipientNameMatch) {
        shippingData.recipientName = recipientNameMatch[1].trim();
      }
      
      // DNI/RUC del destinatario
      const recipientDniMatch = recipientText.match(/dni[\/\s]*ruc[:\s]*(\d+)/i);
      if (recipientDniMatch) {
        shippingData.recipientDni = recipientDniMatch[1].trim();
      }
      
      // Teléfono del destinatario
      const recipientPhoneMatch = recipientText.match(/telefono[:\s]*(\d+)/i);
      if (recipientPhoneMatch) {
        shippingData.recipientPhone = recipientPhoneMatch[1].trim();
      }
    }

    // 5. Extraer destino (agencia/ciudad)
    const destinationPatterns = [
      /agencia\s+destino[:\s]*([^\n]+)/i,
      /destino[:\s]*([a-z\s]+?)(?=\n|direccion|calle|dni)/i,
      /(?:jr\.|calle|av\.)\s+([^\n]+)/i
    ];

    for (const pattern of destinationPatterns) {
      const match = fullText.match(pattern);
      if (match && match[1]) {
        shippingData.destination = match[1].trim();
        break;
      }
    }

    // 6. Extraer fecha de envío
    const datePatterns = [
      /fecha\s+emision[:\s]*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i,
      /fecha\s+traslado[:\s]*(\d{4}-\d{2}-\d{2})/i,
      /fecha[:\s]*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i
    ];

    for (const pattern of datePatterns) {
      const match = fullText.match(pattern);
      if (match && match[1]) {
        shippingData.shippingDate = match[1].trim();
        break;
      }
    }

    // Si no se encontró fecha, usar fecha actual
    if (!shippingData.shippingDate) {
      const now = new Date();
      shippingData.shippingDate = now.toLocaleDateString('es-PE');
    }

    console.log("[OCR SHIPPING] Datos extraídos:", shippingData);
    return shippingData;

  } catch (error) {
    console.error("[OCR SHIPPING] Error:", error);
    // Retornar datos por defecto en caso de error
    return {
      trackingNumber: "N/A",
      company: "Courier",
      destination: "N/A",
      shippingDate: new Date().toLocaleDateString('es-PE'),
      senderName: "N/A",
      senderDni: "N/A",
      senderPhone: "N/A",
      recipientName: "N/A",
      recipientDni: "N/A",
      recipientPhone: "N/A"
    };
  }
};

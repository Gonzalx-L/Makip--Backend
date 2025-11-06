import axios from "axios"; // Para descargar las imágenes
import sharp from "sharp";
import { query } from "../config/db.js";
import { uploadToGCS } from "./gcs.service.js";
import { v4 as uuidv4 } from "uuid";

/**
 * Descarga una imagen desde una URL a un Buffer
 */
const downloadImage = async (url) => {
  try {
    const response = await axios.get(url, { responseType: "arraybuffer" });
    return Buffer.from(response.data, "binary");
  } catch (error) {
    console.error(`Error al descargar imagen ${url}:`, error.message);
    throw new Error("No se pudo descargar la imagen base o el logo.");
  }
};

/**
 * Genera un mockup para un item de pedido específico
 * @param {object} orderItem - El objeto del item (fila de la tabla order_items)
 * @returns {Promise<string>} - La URL pública del mockup generado
 */
export const generateMockup = async (orderItem) => {
  try {
    // 1. Obtener los datos necesarios del producto
    const productResult = await query(
      "SELECT base_image_url, personalization_metadata FROM products WHERE product_id = $1",
      [orderItem.product_id]
    );

    if (productResult.rows.length === 0)
      throw new Error("Producto no encontrado");

    const product = productResult.rows[0];
    const { base_image_url, personalization_metadata } = product;

    // Validar si personalization_data y image_url existen
    if (
      !orderItem.personalization_data ||
      !orderItem.personalization_data.image_url
    ) {
      throw new Error("El pedido no tiene un logo para personalizar");
    }
    const { image_url: logo_url } = orderItem.personalization_data; // Logo del cliente

    // 2. Validar que tengamos todo
    if (!base_image_url) throw new Error("El producto no tiene imagen base");
    if (!logo_url)
      throw new Error("El pedido no tiene un logo para personalizar");
    if (!personalization_metadata)
      throw new Error("El producto no tiene metadatos de personalización");

    const { coords_x, coords_y, max_width } = personalization_metadata;
    if (coords_x == null || coords_y == null || max_width == null) {
      throw new Error(
        "Metadatos incompletos (falta coords_x, coords_y o max_width)"
      );
    }

    // 3. Descargar ambas imágenes
    const baseImageBuffer = await downloadImage(base_image_url);
    const logoBuffer = await downloadImage(logo_url);

    // 4. Procesar con Sharp
    // Redimensionar el logo para que quepa
    const resizedLogoBuffer = await sharp(logoBuffer)
      .resize({
        width: max_width,
        fit: "contain", // Mantiene la proporción
        background: { r: 0, g: 0, b: 0, alpha: 0 }, // Fondo transparente
      })
      .toBuffer();

    // Componer la imagen (poner logo sobre la imagen base)
    const mockupBuffer = await sharp(baseImageBuffer)
      .composite([
        {
          input: resizedLogoBuffer,
          top: coords_y,
          left: coords_x,
        },
      ])
      .toBuffer();

    // 5. Subir el mockup final a GCS
    // Creamos un "file object" falso para que nuestro servicio GCS lo acepte
    const mockupFile = {
      buffer: mockupBuffer,
      mimetype: "image/png", // Asumimos PNG
      originalname: `mockup-order-${orderItem.order_id}-${uuidv4()}.png`,
    };

    const publicUrl = await uploadToGCS(mockupFile, "mockups");

    console.log(`Mockup generado y subido: ${publicUrl}`);
    return publicUrl;
  } catch (error) {
    console.error(
      `Error al generar mockup para order_item ${orderItem.order_item_id}:`,
      error.message
    );
    // No detenemos el flujo si falla el mockup, solo lo registramos
    return null;
  }
};

import { Storage } from "@google-cloud/storage";
import "dotenv/config";
import { v4 as uuidv4 } from "uuid"; // Para nombres únicos
import path from "path"; // Para manejar nombres de archivos

// 1. Configurar Storage
// Esto usa automáticamente tu archivo 'service-account.json'
// gracias a la variable de entorno GOOGLE_APPLICATION_CREDENTIALS
const storage = new Storage();
const bucketName = process.env.GCS_BUCKET_NAME;

/**
 * Sube un archivo a Google Cloud Storage.
 * @param {object} file - El objeto de archivo de multer (en req.file).
 * @param {string} destinationFolder - La carpeta en GCS (ej: 'proofs', 'logos').
 * @returns {Promise<string>} - La URL pública del archivo.
 */
export const uploadToGCS = (file, destinationFolder) => {
  return new Promise((resolve, reject) => {
    // 2. Validaciones
    if (!file) {
      return reject("No se proporcionó ningún archivo.");
    }
    if (!bucketName) {
      return reject("El nombre del bucket de GCS no está configurado en .env");
    }

    const bucket = storage.bucket(bucketName);

    // 3. Crear un nombre de archivo único para evitar colisiones
    const uniqueId = uuidv4();
    const extension = path.extname(file.originalname); // Obtener la extensión (ej: .png)
    const fileName = `${destinationFolder}/${uniqueId}${extension}`;
    const blob = bucket.file(fileName);

    // 4. Crear un stream para subir el archivo
    const blobStream = blob.createWriteStream({
      resumable: false,
      gzip: true,
      metadata: {
        contentType: file.mimetype,
      },
    });

    // 5. Manejar errores y éxito
    blobStream.on("error", (err) => {
      reject(`Error al subir a GCS: ${err.message}`);
    });

    blobStream.on("finish", () => {
      // 6. Hacer el archivo público para poder verlo
      blob
        .makePublic()
        .then(() => {
          const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;
          console.log(`Archivo subido exitosamente: ${publicUrl}`);
          resolve(publicUrl);
        })
        .catch((err) => {
          reject(`Error al hacer público el archivo: ${err.message}`);
        });
    });

    // 7. Enviar el buffer del archivo (que está en memoria) al stream
    blobStream.end(file.buffer);
  });
};

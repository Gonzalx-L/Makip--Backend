import multer from "multer";

// Configura multer para guardar el archivo en la memoria
const storage = multer.memoryStorage();

// Filtra para aceptar solo imágenes
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    // Si no es imagen (ej. un PDF), también lo dejamos pasar por ahora
    // Luego podemos hacerlo más estricto
    cb(null, true);
    // O si quieres ser estricto solo con imágenes:
    // cb(new Error('Tipo de archivo no permitido. Solo se aceptan imágenes.'), false);
  }
};

export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // Límite de 10 MB
  },
});

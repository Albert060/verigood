// T12 · Validación de uploads por magic bytes (no por mimetype declarado).
// El fileFilter de multer solo mira `file.mimetype`, que es lo que declara el
// cliente y se puede falsificar. Aquí comprobamos los primeros bytes del
// buffer contra las firmas reales para asegurarnos de que es un formato
// aceptado por el pipeline OCR / IA.
//
// Sin dependencia externa — sólo cubrimos los 4 formatos aceptados:
// PNG, JPEG, WebP y PDF.

const isPng = (b) =>
  b.length >= 8 &&
  b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47 &&
  b[4] === 0x0D && b[5] === 0x0A && b[6] === 0x1A && b[7] === 0x0A;

const isJpeg = (b) =>
  b.length >= 3 && b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF;

// WebP: cabecera RIFF (bytes 0..3) + "WEBP" en bytes 8..11.
const isWebp = (b) =>
  b.length >= 12 &&
  b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
  b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50;

// PDF: "%PDF-" (los 5 primeros bytes).
const isPdf = (b) =>
  b.length >= 5 &&
  b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 && b[4] === 0x2D;

// Devuelve el tipo detectado ('png' | 'jpeg' | 'webp' | 'pdf' | null).
const detectFileKind = (buffer) => {
  if (!buffer || !Buffer.isBuffer(buffer)) return null;
  if (isPng(buffer))  return 'png';
  if (isJpeg(buffer)) return 'jpeg';
  if (isWebp(buffer)) return 'webp';
  if (isPdf(buffer))  return 'pdf';
  return null;
};

// Middleware de Express que valida req.file.buffer tras multer. Rechaza con
// 400 si el archivo no coincide con ninguna firma esperada.
const validateUploadMagicBytes = (req, res, next) => {
  if (!req.file || !req.file.buffer) return next(); // deja que el handler decida
  const kind = detectFileKind(req.file.buffer);
  if (!kind) {
    return res.status(400).json({
      error: 'El archivo no es una imagen o PDF válido',
      code: 'INVALID_FILE_SIGNATURE',
    });
  }
  req.file.detectedKind = kind;
  next();
};

module.exports = { detectFileKind, validateUploadMagicBytes };

// Cifrado simétrico AES-256-GCM para secretos por organización.
// Diseñado para claves de API (Anthropic) — pequeñas, frecuentes.
//
// Formato del ciphertext almacenado en BD: "<iv_hex>:<auth_tag_hex>:<ciphertext_hex>"
// (los 3 componentes separados por ':' para poder rehidratarlos en decrypt).
//
// La master key sale de ENCRYPTION_KEY del .env (32 bytes en hex o base64).
// Si no está configurada, el módulo intenta generar una y avisa en logs —
// pero las llamadas a encrypt/decrypt FALLAN, para que el operador la fije.

const crypto = require('crypto');

const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12;   // recomendado para GCM
const KEY_LENGTH = 32;  // 256 bits

let cachedKey = null;

const loadKey = () => {
  if (cachedKey) return cachedKey;
  const raw = (process.env.ENCRYPTION_KEY || '').trim();
  if (!raw) {
    throw new Error(
      'ENCRYPTION_KEY no está configurada. Genera una con `openssl rand -hex 32` ' +
      'y añádela al .env del backend.'
    );
  }
  // Aceptamos hex (64 chars) o base64 (~44 chars).
  let buf;
  if (/^[0-9a-f]{64}$/i.test(raw)) {
    buf = Buffer.from(raw, 'hex');
  } else {
    try { buf = Buffer.from(raw, 'base64'); } catch { buf = null; }
  }
  if (!buf || buf.length !== KEY_LENGTH) {
    throw new Error('ENCRYPTION_KEY inválida: debe ser 32 bytes (hex 64 chars o base64).');
  }
  cachedKey = buf;
  return cachedKey;
};

const encrypt = (plaintext) => {
  if (typeof plaintext !== 'string' || !plaintext) {
    throw new Error('encrypt: se requiere string no vacío.');
  }
  const key = loadKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
};

const decrypt = (payload) => {
  if (typeof payload !== 'string' || !payload.includes(':')) {
    throw new Error('decrypt: payload con formato inválido.');
  }
  const key = loadKey();
  const [ivHex, tagHex, dataHex] = payload.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const data = Buffer.from(dataHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return dec.toString('utf8');
};

// Sondeo barato para saber si el cifrado está operativo (la app puede degradar
// el endpoint con un error claro al admin en vez de romper en runtime).
const encryptionAvailable = () => {
  try { loadKey(); return true; } catch { return false; }
};

module.exports = { encrypt, decrypt, encryptionAvailable };

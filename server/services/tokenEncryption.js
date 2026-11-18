const crypto = require('crypto');

// 32-byte encryption key for AES-256-GCM.
// Defaults to a derived hash from JWT_SECRET if GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY is unset.
const ENCRYPTION_KEY = process.env.GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY
  ? Buffer.from(process.env.GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY, 'hex')
  : crypto.createHash('sha256').update(process.env.JWT_SECRET || 'campus_mate_default_oauth_token_key_2026').digest();

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

/**
 * Encrypts an arbitrary text payload (such as an OAuth refresh or access token) with AES-256-GCM.
 * Returns a hex-encoded string containing IV, AuthTag, and Ciphertext.
 */
function encryptToken(plaintext) {
  if (!plaintext) return '';
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts a hex-encoded string formatted as IV:AuthTag:Ciphertext with AES-256-GCM.
 */
function decryptToken(encryptedString) {
  if (!encryptedString || typeof encryptedString !== 'string') return '';
  const parts = encryptedString.split(':');
  if (parts.length !== 3) {
    throw new Error('Malformed encrypted token format.');
  }

  const [ivHex, tagHex, cipherHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(cipherHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

module.exports = {
  encryptToken,
  decryptToken
};

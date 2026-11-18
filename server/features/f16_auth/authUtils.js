const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const commonPasswords = require('./commonPasswords');

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'campusmate_access_secret_default_key_2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'campusmate_refresh_secret_default_key_2026';
const IP_HASH_SALT = process.env.IP_HASH_SALT || 'campusmate_salt_ip_2026';

function hashIp(ip) {
  if (!ip) return 'unknown';
  return crypto.createHmac('sha256', IP_HASH_SALT).update(String(ip)).digest('hex').slice(0, 32);
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function generateAccessToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name
    },
    JWT_ACCESS_SECRET,
    { expiresIn: '15m' }
  );
}

function generateRefreshToken() {
  return crypto.randomBytes(40).toString('hex');
}

function verifyAccessToken(token) {
  return jwt.verify(token, JWT_ACCESS_SECRET);
}

function validatePasswordPolicy(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required.' };
  }
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long.' };
  }
  if (commonPasswords.has(password.toLowerCase())) {
    return { valid: false, error: 'Password is too common or easily guessable.' };
  }
  return { valid: true };
}

function isEmailDomainAllowed(email, allowedDomainsStr) {
  if (!allowedDomainsStr || allowedDomainsStr.trim() === '' || allowedDomainsStr.trim() === '*') {
    return true;
  }
  const domains = allowedDomainsStr.split(',').map(d => d.trim().toLowerCase()).filter(Boolean);
  if (domains.length === 0) return true;
  const parts = email.toLowerCase().split('@');
  if (parts.length !== 2) return false;
  const domain = parts[1];
  return domains.some(allowed => domain === allowed || domain.endsWith('.' + allowed));
}

module.exports = {
  JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET,
  hashIp,
  hashToken,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  validatePasswordPolicy,
  isEmailDomainAllowed
};

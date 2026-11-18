const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'campus_mate_admin_super_secret_jwt_key_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

function generateToken(user) {
  return jwt.sign(
    {
      sub: user._id ? user._id.toString() : user.id,
      id: user._id ? user._id.toString() : user.id,
      username: user.email || user.username,
      email: user.email,
      role: user.role || 'admin',
      name: user.name
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function requireAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header missing or malformed.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyToken(token);
    // Disallow students from accessing any admin routes
    if (decoded.role !== 'admin' && decoded.role !== 'superadmin') {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges.' });
    }
    req.admin = decoded;
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired administrative token.' });
  }
}

function requireRole(allowedRoles = ['admin', 'superadmin']) {
  return (req, res, next) => {
    const role = (req.admin && req.admin.role) || (req.user && req.user.role);
    if (!role || !allowedRoles.includes(role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges.' });
    }
    next();
  };
}

module.exports = {
  JWT_SECRET,
  generateToken,
  verifyToken,
  requireAdminAuth,
  requireRole
};


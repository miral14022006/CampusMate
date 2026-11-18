const { verifyAccessToken } = require('./authUtils');
const User = require('./models/User');

/**
 * requireAuth middleware
 * Verifies short-lived access JWT in Authorization: Bearer <token>
 */
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyAccessToken(token);
    
    // Check if user still exists and is active if DB is connected
    let user = null;
    if (User.db && User.db.readyState === 1) {
      user = await User.findById(decoded.sub);
      if (!user) {
        return res.status(401).json({ error: 'User account no longer exists.' });
      }
      if (user.status !== 'active') {
        return res.status(403).json({ error: 'User account is disabled or inactive.' });
      }
      req.user = user;
    } else {
      req.user = {
        _id: decoded.sub,
        id: decoded.sub,
        email: decoded.email,
        role: decoded.role,
        name: decoded.name
      };
    }
    
    // Legacy compatibility for req.admin
    if (req.user.role === 'admin' || req.user.role === 'superadmin') {
      req.admin = {
        id: req.user._id ? req.user._id.toString() : req.user.id,
        username: req.user.email,
        role: req.user.role,
        name: req.user.name
      };
    }

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

/**
 * requireRole middleware
 * Requires user to have one of the permitted roles
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges.' });
    }
    next();
  };
}

/**
 * optionalAuth middleware
 * If a valid access token is presented, attaches req.user. Otherwise sets req.user = null and proceeds.
 */
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyAccessToken(token);
    if (User.db && User.db.readyState === 1) {
      const user = await User.findById(decoded.sub);
      if (user && user.status === 'active') {
        req.user = user;
        if (user.role === 'admin' || user.role === 'superadmin') {
          req.admin = {
            id: user._id.toString(),
            username: user.email,
            role: user.role,
            name: user.name
          };
        }
      } else {
        req.user = null;
      }
    } else {
      req.user = {
        _id: decoded.sub,
        id: decoded.sub,
        email: decoded.email,
        role: decoded.role,
        name: decoded.name
      };
    }
  } catch (err) {
    req.user = null;
  }
  next();
}

module.exports = {
  requireAuth,
  requireRole,
  optionalAuth
};

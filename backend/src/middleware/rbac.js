/**
 * Role-Based Access Control (RBAC) Middleware
 * Single-Role Platform Model: Administrator
 */
const rolesHierarchy = {
  admin: ['admin']
};

const authorize = (allowedRoles = ['admin']) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthenticated.' });
    }

    const userRole = req.user.role || 'admin';
    const userPermissions = rolesHierarchy[userRole] || ['admin'];

    const hasPermission = allowedRoles.some(role => userPermissions.includes(role));

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Administrator role required.`
      });
    }

    next();
  };
};

module.exports = authorize;

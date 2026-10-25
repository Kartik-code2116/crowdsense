/**
 * Role-Based Access Control (RBAC) Middleware
 * Hierarchy: admin > operator > analyst > viewer
 */
const rolesHierarchy = {
  admin: ['admin', 'operator', 'analyst', 'viewer'],
  operator: ['operator', 'analyst', 'viewer'],
  analyst: ['analyst', 'viewer'],
  viewer: ['viewer']
};

const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthenticated.' });
    }

    const userRole = req.user.role || 'viewer';
    const userPermissions = rolesHierarchy[userRole] || ['viewer'];

    const hasPermission = allowedRoles.some(role => userPermissions.includes(role));

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Requires one of [${allowedRoles.join(', ')}] permissions.`
      });
    }

    next();
  };
};

module.exports = authorize;

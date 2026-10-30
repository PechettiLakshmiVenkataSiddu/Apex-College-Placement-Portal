/**
 * middleware/authMiddleware.js
 * ----------------------------
 * Contains authentication and role authorization middlewares.
 * 
 * Viva explanation:
 * - JWT (JSON Web Token) is a stateless authentication mechanism.
 * - The token consists of three parts separated by dots: Header, Payload, and Signature.
 * - verifyToken extracts the token from the "Authorization: Bearer <token>" header,
 *   verifies its signature using JWT_SECRET, and attaches the decoded user data to req.user.
 * - allowRoles implements Role-Based Access Control (RBAC), verifying that the authenticated
 *   user has one of the allowed roles ('student', 'recruiter', 'admin') before proceeding.
 */

const jwt = require('jsonwebtoken');

/**
 * Middleware to verify JWT token from Authorization header.
 * Attaches user payload { id, email, role, name } to req.user.
 */
const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No authentication token provided.',
        data: null
      });
    }

    // Extract the token after 'Bearer '
    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Malformed authorization token.',
        data: null
      });
    }

    const secret = process.env.JWT_SECRET || 'fallback_secret_for_development';
    const decoded = jwt.verify(token, secret);

    // Attach decoded token payload to the request object
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Authentication failed. Token has expired. Please login again.',
        data: null
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Authentication failed. Invalid token.',
      data: null
    });
  }
};

/**
 * Middleware factory for Role-Based Access Control (RBAC).
 * Example: allowRoles('recruiter', 'admin')
 * 
 * @param  {...string} roles - List of roles permitted to access the route
 */
const allowRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. User identity is not verified.',
        data: null
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Only users with [${roles.join(', ')}] role(s) can perform this action.`,
        data: null
      });
    }

    next();
  };
};

module.exports = {
  verifyToken,
  allowRoles
};

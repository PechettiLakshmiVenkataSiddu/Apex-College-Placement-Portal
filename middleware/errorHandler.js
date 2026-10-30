/**
 * middleware/errorHandler.js
 * ---------------------------
 * Centralized error handling and route not found (404) middlewares.
 * 
 * Viva explanation:
 * - Express error-handling middleware is defined with 4 arguments: (err, req, res, next).
 * - Having a centralized error handler prevents unexpected crashes, catches unhandled
 *   exceptions from async controllers, and formats uniform JSON responses for clients.
 * - 404 handler intercepts any request that did not match an existing endpoint route.
 */

const { validationResult } = require('express-validator');

/**
 * Intercepts express-validator validation results.
 * If validation fails, returns HTTP 400 with descriptive error message.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const firstError = errors.array()[0];
    return res.status(400).json({
      success: false,
      message: firstError.msg || 'Validation failed',
      data: errors.array()
    });
  }
  next();
};

/**
 * 404 Route Not Found Handler.
 * Triggered when a requested URL does not match any registered route.
 */
const notFoundHandler = (req, res, next) => {
  return res.status(404).json({
    success: false,
    message: `Resource not found: ${req.method} ${req.originalUrl}`,
    data: null
  });
};

/**
 * Global Error Handling Middleware.
 * Catches any synchronous or asynchronous errors forwarded via next(err).
 */
const errorHandler = (err, req, res, next) => {
  console.error('Unhandled Application Error:', err.stack || err);

  const statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);

  return res.status(statusCode).json({
    success: false,
    message: err.message || 'An unexpected server error occurred.',
    data: process.env.NODE_ENV === 'development' ? err.stack : null
  });
};

module.exports = {
  validate,
  notFoundHandler,
  errorHandler
};

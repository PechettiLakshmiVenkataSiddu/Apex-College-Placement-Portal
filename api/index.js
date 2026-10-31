/**
 * api/index.js
 * ------------
 * Vercel Serverless Function entry point.
 * Forwards all incoming API requests to the Express application.
 */

const app = require('../server');

module.exports = app;


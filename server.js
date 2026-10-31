/**
 * server.js
 * ---------
 * Main application entry point for the Student Recruitment Portal Backend.
 * 
 * Viva explanation:
 * - Express initializes HTTP server, registers middleware, and defines routing pipelines.
 * - Middleware execution order matters:
 *   1. CORS & JSON parsing
 *   2. Route handlers (/api/auth, /api/students, /api/jobs, etc.)
 *   3. 404 Not Found handler (catches unmatched requests)
 *   4. Global error handler (catches any exceptions thrown in routes/controllers)
 * - On startup, the server verifies connection to the Supabase PostgreSQL database.
 */

const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables before importing configuration
dotenv.config();

const { testSupabaseConnection, isSupabaseConfigured } = require('./config/supabase');

// Import route modules
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const jobRoutes = require('./routes/jobRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Import custom error handlers
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================================================
// 1. CORE MIDDLEWARE
// ============================================================================

// Enable Cross-Origin Resource Sharing (CORS) for all frontend clients
app.use(cors());

// Parse incoming JSON request bodies
app.use(express.json());

// Parse URL-encoded bodies (form data)
app.use(express.urlencoded({ extended: true }));

// Normalize request URL for Vercel serverless rewrites and edge proxies
app.use((req, res, next) => {
  // If Vercel edge rewrite prepended '/public', strip it
  if (req.url.startsWith('/public')) {
    req.url = req.url.replace(/^\/public/, '') || '/';
  }
  // If Vercel passed the matched route in proxy headers, restore original route
  const matchedPath = req.headers['x-matched-path'] || req.headers['x-vercel-matched-path'];
  if (matchedPath && (req.url === '/' || req.url === '/api' || req.url.includes('index.js'))) {
    req.url = matchedPath;
  }
  // If req.url is an internal Vercel script path like /api/index.js, map to base
  if (req.url.startsWith('/api/index.js')) {
    req.url = req.url.replace(/^\/api\/index\.js/, '') || '/';
  }
  next();
});

// Serve static frontend files from 'public' directory (opens at http://localhost:5000)
app.use(express.static(path.join(__dirname, 'public')));

// ============================================================================
// 2. HEALTH CHECK ROUTE
// ============================================================================

const healthHandler = (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Server is running smoothly',
    data: {
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    }
  });
};

app.get('/api/health', healthHandler);
app.get('/health', healthHandler);

// ============================================================================
// 3. API ROUTE MOUNTING
// ============================================================================

// Mount routes with /api prefix (standard) and without (for Vercel serverless rewrite flexibility)
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);

app.use('/api/students', studentRoutes);
app.use('/students', studentRoutes);

app.use('/api/jobs', jobRoutes);
app.use('/jobs', jobRoutes);

app.use('/api/applications', applicationRoutes);
app.use('/applications', applicationRoutes);

app.use('/api/admin', adminRoutes);
app.use('/admin', adminRoutes);

// ============================================================================
// 4. ERROR HANDLING MIDDLEWARE
// ============================================================================

// Catch all unmatched routes and return 404
app.use(notFoundHandler);

// Central error handler for internal errors
app.use(errorHandler);

// ============================================================================
// 5. SERVER INITIALIZATION
// ============================================================================

// Only bind TCP port when server.js is run directly (not when imported by Vercel serverless functions)
if (require.main === module) {
  app.listen(PORT, async () => {
    console.log('====================================================');
    console.log(`🚀 Student Recruitment Portal Backend running on port ${PORT}`);
    console.log(`📍 Local URL: http://localhost:${PORT}`);
    console.log('====================================================');

    // Verify connection to Supabase database
    await testSupabaseConnection();
  });
}

module.exports = app;

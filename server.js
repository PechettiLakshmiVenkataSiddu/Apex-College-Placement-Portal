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

const { testSupabaseConnection } = require('./config/supabase');

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

// Serve static frontend files from 'public' directory (opens at http://localhost:5000)
app.use(express.static(path.join(__dirname, 'public')));

// ============================================================================
// 2. HEALTH CHECK ROUTE
// ============================================================================

app.get('/api/health', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Server is running smoothly',
    data: {
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    }
  });
});

// ============================================================================
// 3. API ROUTE MOUNTING
// ============================================================================

app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/admin', adminRoutes);

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

const server = app.listen(PORT, async () => {
  console.log('====================================================');
  console.log(`🚀 Student Recruitment Portal Backend running on port ${PORT}`);
  console.log(`📍 Local URL: http://localhost:${PORT}`);
  console.log('====================================================');

  // Verify connection to Supabase database
  await testSupabaseConnection();
});

module.exports = app;

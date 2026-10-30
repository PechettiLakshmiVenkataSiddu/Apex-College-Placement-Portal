/**
 * controllers/authController.js
 * -----------------------------
 * Handles user authentication for Students, Companies (Recruiters), and the
 * Placement Officer (Admin).
 * 
 * Viva explanation:
 * - Companies (recruiters) self-register with is_approved = false.
 * - When a recruiter attempts to log in, the system checks their is_approved status.
 *   If not yet approved by the Placement Officer, login is blocked with HTTP 403 Forbidden.
 * - Students and Admin accounts are approved by default (is_approved = true).
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabase } = require('../config/supabase');

/**
 * Register a new user (Student or Company Recruiter).
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    const normalizedEmail = email.toLowerCase().trim();
    const userRole = role.toLowerCase().trim();

    // 1. Check if an account with this email already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (checkError) {
      return next(checkError);
    }

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.',
        data: null
      });
    }

    // 2. Hash password with bcrypt (cost factor 10)
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 3. Set approval status:
    // Students and Admin are auto-approved. Company recruiters require Placement Officer approval.
    const isApproved = userRole === 'student';

    // 4. Insert new user into database
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: userRole,
        is_approved: isApproved
      })
      .select('id, name, email, role, is_approved, created_at')
      .single();

    if (insertError) {
      return next(insertError);
    }

    // 5. Initialize an empty student_profile record for students
    if (newUser.role === 'student') {
      await supabase
        .from('student_profiles')
        .insert({ user_id: newUser.id });
    }

    const message = userRole === 'recruiter'
      ? 'Company registration submitted successfully. Your account is pending approval by the Placement Officer.'
      : 'Student account registered successfully.';

    return res.status(201).json({
      success: true,
      message,
      data: {
        user: newUser
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login user and issue a JSON Web Token (JWT).
 * Blocks unapproved company recruiters with HTTP 403 Forbidden.
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Find user by email
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (fetchError) {
      return next(fetchError);
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
        data: null
      });
    }

    // 2. Verify password match
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
        data: null
      });
    }

    // 3. College Placement Rule: Recruiters cannot log in until approved by Placement Officer
    if (user.role === 'recruiter' && !user.is_approved) {
      return res.status(403).json({
        success: false,
        message: 'Your company recruiter account is pending approval by the Placement Officer. Please contact the college placement cell.',
        data: null
      });
    }

    // 4. Issue JWT
    const secret = process.env.JWT_SECRET || 'fallback_secret_for_development';
    const expiresIn = process.env.JWT_EXPIRES_IN || '1d';

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        is_approved: user.is_approved
      },
      secret,
      { expiresIn }
    );

    // 5. Omit password from response
    const { password: _, ...userData } = user;

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        token,
        user: userData
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current authenticated user profile.
 */
const getMe = async (req, res, next) => {
  try {
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('id, name, email, role, is_approved, created_at')
      .eq('id', req.user.id)
      .maybeSingle();

    if (fetchError) {
      return next(fetchError);
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found.',
        data: null
      });
    }

    let studentProfile = null;
    if (user.role === 'student') {
      const { data: profile } = await supabase
        .from('student_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      studentProfile = profile;
    }

    return res.status(200).json({
      success: true,
      message: 'Current user profile fetched successfully.',
      data: {
        user,
        student_profile: studentProfile
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe
};

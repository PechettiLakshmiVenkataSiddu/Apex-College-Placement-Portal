/**
 * controllers/studentController.js
 * --------------------------------
 * Manages student academic and placement profile information.
 * 
 * Viva explanation:
 * - Stores college-specific details: roll number, course, current year, department, CGPA, and backlogs.
 * - Profile verification (is_verified) can ONLY be toggled by the Placement Officer (admin),
 *   preventing students from self-verifying their academic standing.
 */

const { supabase } = require('../config/supabase');

/**
 * Get current student's full academic and placement profile.
 */
const getProfile = async (req, res, next) => {
  try {
    const studentId = req.user.id;

    const { data: profile, error } = await supabase
      .from('student_profiles')
      .select('*, users(id, name, email, role, is_approved)')
      .eq('user_id', studentId)
      .maybeSingle();

    if (error) {
      return next(error);
    }

    if (!profile) {
      return res.status(200).json({
        success: true,
        message: 'Profile has not been filled out yet.',
        data: {
          user_id: studentId,
          name: req.user.name,
          email: req.user.email,
          roll_number: null,
          course: null,
          department: null,
          current_year: null,
          graduation_year: null,
          cgpa: null,
          backlogs: 0,
          is_verified: false,
          phone: null,
          skills: null,
          resume_url: null
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Student profile fetched successfully.',
      data: profile
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create or update current student's academic profile.
 * Students cannot alter their own is_verified status.
 */
const updateProfile = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const {
      roll_number,
      course,
      department,
      current_year,
      graduation_year,
      cgpa,
      backlogs,
      phone,
      skills,
      resume_url
    } = req.body;

    // Check if roll_number is already used by another student
    if (roll_number && roll_number.trim()) {
      const cleanRollNumber = roll_number.trim();
      const { data: existingRoll, error: rollError } = await supabase
        .from('student_profiles')
        .select('id, user_id')
        .eq('roll_number', cleanRollNumber)
        .neq('user_id', studentId)
        .maybeSingle();

      if (rollError) {
        return next(rollError);
      }

      if (existingRoll) {
        return res.status(409).json({
          success: false,
          message: `Roll number '${cleanRollNumber}' is already registered to another student.`,
          data: null
        });
      }
    }

    const profileData = {
      user_id: studentId,
      roll_number: roll_number !== undefined ? (roll_number ? roll_number.trim() : null) : undefined,
      course: course !== undefined ? (course ? course.trim() : null) : undefined,
      department: department !== undefined ? (department ? department.trim() : null) : undefined,
      current_year: current_year !== undefined ? (current_year !== null && current_year !== '' ? parseInt(current_year, 10) : null) : undefined,
      graduation_year: graduation_year !== undefined ? (graduation_year !== null && graduation_year !== '' ? parseInt(graduation_year, 10) : null) : undefined,
      cgpa: cgpa !== undefined ? (cgpa !== null && cgpa !== '' ? parseFloat(cgpa) : null) : undefined,
      backlogs: backlogs !== undefined ? (backlogs !== null && backlogs !== '' ? parseInt(backlogs, 10) : 0) : undefined,
      phone: phone !== undefined ? (phone ? phone.trim() : null) : undefined,
      skills: skills !== undefined ? (skills ? skills.trim() : null) : undefined,
      resume_url: resume_url !== undefined ? (resume_url ? resume_url.trim() : null) : undefined,
      updated_at: new Date().toISOString()
    };

    // Remove undefined properties
    Object.keys(profileData).forEach(key => profileData[key] === undefined && delete profileData[key]);

    const { data: updatedProfile, error } = await supabase
      .from('student_profiles')
      .upsert(profileData, { onConflict: 'user_id' })
      .select('*, users(id, name, email)')
      .single();

    if (error) {
      return next(error);
    }

    return res.status(200).json({
      success: true,
      message: 'Student profile updated successfully.',
      data: updatedProfile
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile
};

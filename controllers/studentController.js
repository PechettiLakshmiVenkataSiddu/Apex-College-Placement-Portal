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

/**
 * Upload student resume (PDF only, max 2 MB).
 * Saves to Supabase Storage bucket 'resumes' and updates student_profiles.resume_url.
 * Access: Protected (student only).
 */
const uploadResume = async (req, res, next) => {
  try {
    const studentId = req.user.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please choose a PDF resume file.',
        data: null
      });
    }

    // Verify MIME type explicitly as a double check
    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({
        success: false,
        message: 'Invalid file format. Only PDF files are accepted for resumes.',
        data: null
      });
    }

    // Generate file name: userId-timestamp.pdf
    const fileName = `${studentId}-${Date.now()}.pdf`;

    // Upload to Supabase Storage bucket "resumes"
    const { data: uploadResult, error: uploadError } = await supabase.storage
      .from('resumes')
      .upload(fileName, req.file.buffer, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      return res.status(500).json({
        success: false,
        message: `Failed to upload resume to storage: ${uploadError.message}`,
        data: null
      });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('resumes')
      .getPublicUrl(fileName);

    const publicUrl = urlData ? urlData.publicUrl : null;

    if (!publicUrl) {
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve public URL for uploaded resume.',
        data: null
      });
    }

    // Save public URL in student_profiles.resume_url
    const { data: updatedProfile, error: dbError } = await supabase
      .from('student_profiles')
      .upsert(
        {
          user_id: studentId,
          resume_url: publicUrl,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'user_id' }
      )
      .select('*, users(id, name, email)')
      .single();

    if (dbError) {
      return next(dbError);
    }

    return res.status(200).json({
      success: true,
      message: 'Resume uploaded and saved successfully.',
      data: {
        resume_url: publicUrl,
        profile: updatedProfile
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get student placement dashboard metrics:
 * - profile completion percentage
 * - counts of applications by status (applied, shortlisted, selected, rejected)
 * - number of eligible open drives
 * Access: Protected (student only).
 */
const getDashboard = async (req, res, next) => {
  try {
    const studentId = req.user.id;

    // 1. Fetch student profile
    const { data: profile, error: profileError } = await supabase
      .from('student_profiles')
      .select('*')
      .eq('user_id', studentId)
      .maybeSingle();

    if (profileError) return next(profileError);

    // 2. Compute profile completion percentage
    // Based on key fields: roll_number, course, department, current_year, graduation_year, cgpa, phone, skills, resume_url
    const trackedFields = [
      'roll_number',
      'course',
      'department',
      'current_year',
      'graduation_year',
      'cgpa',
      'phone',
      'skills',
      'resume_url'
    ];

    let filledCount = 0;
    if (profile) {
      trackedFields.forEach((field) => {
        const val = profile[field];
        if (val !== null && val !== undefined && String(val).trim() !== '') {
          filledCount++;
        }
      });
    }

    const profileCompletion = Math.round((filledCount / trackedFields.length) * 100);

    // 3. Counts of applications by status
    const { data: applications, error: appsError } = await supabase
      .from('applications')
      .select('id, status, applied_at, job:job_id(id, title, company)')
      .eq('student_id', studentId);

    if (appsError) return next(appsError);

    const apps = applications || [];
    const applicationCounts = {
      total: apps.length,
      applied: apps.filter((a) => a.status === 'applied').length,
      shortlisted: apps.filter((a) => a.status === 'shortlisted').length,
      selected: apps.filter((a) => a.status === 'selected').length,
      rejected: apps.filter((a) => a.status === 'rejected').length
    };

    const selectedApp = apps.find((a) => a.status === 'selected');
    const selectedCompany = selectedApp && selectedApp.job ? selectedApp.job.company : null;
    const selectedRole = selectedApp && selectedApp.job ? selectedApp.job.title : null;

    // 4. Number of eligible open drives
    const { data: openJobs, error: jobsError } = await supabase
      .from('jobs')
      .select('*')
      .eq('is_active', true);

    if (jobsError) return next(jobsError);

    let eligibleDrivesCount = 0;
    const now = new Date();

    const isStudentPlaced = Boolean(selectedApp);
    const hasMinAcademicProfile = Boolean(
      profile && profile.roll_number && profile.department && profile.cgpa !== null && profile.cgpa !== undefined
    );

    // If already placed, under One-Student-One-Offer student cannot apply to any more open drives
    if (!isStudentPlaced && hasMinAcademicProfile) {
      const studentCgpa = parseFloat(profile.cgpa);
      const studentBacklogs = profile.backlogs !== null && profile.backlogs !== undefined ? parseInt(profile.backlogs, 10) : 0;
      const studentDept = (profile.department || '').trim().toLowerCase();

      (openJobs || []).forEach((job) => {
        // Deadline check
        const deadline = new Date(job.deadline);
        deadline.setHours(23, 59, 59, 999);
        if (now > deadline) return;

        // CGPA check
        const minCgpa = job.min_cgpa !== null && job.min_cgpa !== undefined ? parseFloat(job.min_cgpa) : 0.0;
        if (studentCgpa < minCgpa) return;

        // Backlogs check
        const maxBacklogs = job.max_backlogs !== null && job.max_backlogs !== undefined ? parseInt(job.max_backlogs, 10) : 0;
        if (studentBacklogs > maxBacklogs) return;

        // Allowed departments check
        if (job.allowed_departments && job.allowed_departments.trim() !== '') {
          const allowedList = job.allowed_departments
            .split(',')
            .map((d) => d.trim().toLowerCase())
            .filter(Boolean);
          const isDeptMatch = allowedList.some(
            (dept) => studentDept === dept || studentDept.includes(dept) || dept.includes(studentDept)
          );
          if (!isDeptMatch) return;
        }

        eligibleDrivesCount++;
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Student dashboard statistics retrieved successfully.',
      data: {
        profileCompletion,
        applicationCounts,
        eligibleDrivesCount,
        is_selected: isStudentPlaced,
        selected_company: selectedCompany,
        selected_role: selectedRole,
        is_verified: Boolean(profile && profile.is_verified),
        resume_url: profile ? profile.resume_url : null
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  uploadResume,
  getDashboard
};

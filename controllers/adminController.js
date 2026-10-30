/**
 * controllers/adminController.js
 * ------------------------------
 * Manages Placement Cell administration:
 * - Company recruiter approvals
 * - Student academic profile verification
 * - Campus placement tracking and placement analytics
 * 
 * Viva explanation:
 * - Placement Officer acts as the central authority.
 * - Companies must be vetted and approved before they can post campus drives.
 * - Placement percentage is computed as (placedStudents / totalStudents) * 100.
 */

const { supabase } = require('../config/supabase');

/**
 * Get all registered users (Students, Recruiters, Admin).
 * Query parameter: ?role=student|recruiter|admin
 */
const getAllUsers = async (req, res, next) => {
  try {
    const { role } = req.query;

    let query = supabase
      .from('users')
      .select('id, name, email, role, is_approved, created_at')
      .order('created_at', { ascending: false });

    if (role && ['student', 'recruiter', 'admin'].includes(role.toLowerCase())) {
      query = query.eq('role', role.toLowerCase());
    }

    const { data: users, error } = await query;

    if (error) {
      return next(error);
    }

    // Attach student profile information when viewing students
    if (role && role.toLowerCase() === 'student' && users && users.length > 0) {
      const studentIds = users.map((u) => u.id);
      const { data: profiles } = await supabase
        .from('student_profiles')
        .select('*')
        .in('user_id', studentIds);

      const profileMap = {};
      if (profiles) {
        profiles.forEach((p) => {
          profileMap[p.user_id] = p;
        });
      }

      const enrichedUsers = users.map((u) => ({
        ...u,
        student_profile: profileMap[u.id] || null
      }));

      return res.status(200).json({
        success: true,
        message: 'Users retrieved successfully.',
        data: enrichedUsers
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Users retrieved successfully.',
      data: users || []
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a user account (Student or Recruiter).
 */
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    if (id === adminId) {
      return res.status(400).json({
        success: false,
        message: 'Action denied: Placement Officer cannot delete their own account.',
        data: null
      });
    }

    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('id, email, name, role')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) {
      return next(fetchError);
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
        data: null
      });
    }

    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return next(deleteError);
    }

    return res.status(200).json({
      success: true,
      message: `User '${user.name}' (${user.email}) deleted successfully.`,
      data: null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all company recruiters waiting for placement cell approval.
 * Access: Placement Officer (Admin).
 */
const getPendingRecruiters = async (req, res, next) => {
  try {
    const { data: recruiters, error } = await supabase
      .from('users')
      .select('id, name, email, role, is_approved, created_at')
      .eq('role', 'recruiter')
      .eq('is_approved', false)
      .order('created_at', { ascending: false });

    if (error) {
      return next(error);
    }

    return res.status(200).json({
      success: true,
      message: 'Pending company recruiters fetched successfully.',
      data: recruiters || []
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Approve a company recruiter so they can log in and post campus jobs.
 * Access: Placement Officer (Admin).
 */
const approveRecruiter = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1. Verify recruiter exists
    const { data: recruiter, error: fetchError } = await supabase
      .from('users')
      .select('id, name, email, role, is_approved')
      .eq('id', id)
      .eq('role', 'recruiter')
      .maybeSingle();

    if (fetchError) {
      return next(fetchError);
    }

    if (!recruiter) {
      return res.status(404).json({
        success: false,
        message: 'Company recruiter account not found.',
        data: null
      });
    }

    if (recruiter.is_approved) {
      return res.status(200).json({
        success: true,
        message: `Company recruiter '${recruiter.name}' is already approved.`,
        data: recruiter
      });
    }

    // 2. Set is_approved = true
    const { data: updatedRecruiter, error: updateError } = await supabase
      .from('users')
      .update({ is_approved: true })
      .eq('id', id)
      .select('id, name, email, role, is_approved')
      .single();

    if (updateError) {
      return next(updateError);
    }

    return res.status(200).json({
      success: true,
      message: `Company recruiter '${recruiter.name}' approved successfully. They can now log in and post campus jobs.`,
      data: updatedRecruiter
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify a student's academic credentials (CGPA, marks, certificates).
 * Access: Placement Officer (Admin).
 */
const verifyStudent = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if matching user_id in student_profiles
    const { data: existingProfile, error: fetchError } = await supabase
      .from('student_profiles')
      .select('*, users(id, name, email)')
      .eq('user_id', id)
      .maybeSingle();

    if (fetchError) {
      return next(fetchError);
    }

    let targetUserId = id;

    if (!existingProfile) {
      // Also try matching by profile id
      const { data: profileById } = await supabase
        .from('student_profiles')
        .select('*, users(id, name, email)')
        .eq('id', id)
        .maybeSingle();

      if (!profileById) {
        return res.status(404).json({
          success: false,
          message: 'Student profile not found.',
          data: null
        });
      }
      targetUserId = profileById.user_id;
    }

    // Mark as verified
    const { data: updatedProfile, error: updateError } = await supabase
      .from('student_profiles')
      .update({
        is_verified: true,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', targetUserId)
      .select('*, users(id, name, email)')
      .single();

    if (updateError) {
      return next(updateError);
    }

    return res.status(200).json({
      success: true,
      message: 'Student academic profile verified successfully by Placement Officer.',
      data: updatedProfile
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get list of all selected/placed students with company and job details.
 * Access: Placement Officer (Admin).
 */
const getPlacements = async (req, res, next) => {
  try {
    const { data: placements, error } = await supabase
      .from('applications')
      .select(`
        id,
        status,
        applied_at,
        student:student_id (
          id,
          name,
          email
        ),
        job:job_id (
          id,
          title,
          company,
          location,
          salary,
          job_type
        )
      `)
      .eq('status', 'selected')
      .order('applied_at', { ascending: false });

    if (error) {
      return next(error);
    }

    // Attach student profile details (roll number, department, course)
    const studentIds = (placements || []).map((p) => p.student ? p.student.id : null).filter(Boolean);
    const profilesMap = {};

    if (studentIds.length > 0) {
      const { data: profiles, error: profileError } = await supabase
        .from('student_profiles')
        .select('*')
        .in('user_id', studentIds);

      if (!profileError && profiles) {
        profiles.forEach((pr) => {
          profilesMap[pr.user_id] = pr;
        });
      }
    }

    const formattedPlacements = (placements || []).map((p) => ({
      id: p.id,
      status: p.status,
      applied_at: p.applied_at,
      student: p.student,
      profile: p.student ? profilesMap[p.student.id] || null : null,
      job: p.job
    }));

    return res.status(200).json({
      success: true,
      message: 'Campus placements list retrieved successfully.',
      data: formattedPlacements
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get comprehensive Placement Cell statistics:
 * - total students
 * - verified students
 * - total companies
 * - approved companies
 * - total jobs
 * - total applications
 * - placed students
 * - placement percentage
 */
const getStats = async (req, res, next) => {
  try {
    const [
      studentsResult,
      verifiedStudentsResult,
      companiesResult,
      approvedCompaniesResult,
      jobsResult,
      appsResult,
      placedResult
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'student'),
      supabase.from('student_profiles').select('*', { count: 'exact', head: true }).eq('is_verified', true),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'recruiter'),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'recruiter').eq('is_approved', true),
      supabase.from('jobs').select('*', { count: 'exact', head: true }),
      supabase.from('applications').select('*', { count: 'exact', head: true }),
      supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'selected')
    ]);

    if (studentsResult.error) return next(studentsResult.error);
    if (verifiedStudentsResult.error) return next(verifiedStudentsResult.error);
    if (companiesResult.error) return next(companiesResult.error);
    if (approvedCompaniesResult.error) return next(approvedCompaniesResult.error);
    if (jobsResult.error) return next(jobsResult.error);
    if (appsResult.error) return next(appsResult.error);
    if (placedResult.error) return next(placedResult.error);

    const totalStudents = studentsResult.count || 0;
    const verifiedStudents = verifiedStudentsResult.count || 0;
    const totalCompanies = companiesResult.count || 0;
    const approvedCompanies = approvedCompaniesResult.count || 0;
    const totalJobs = jobsResult.count || 0;
    const totalApplications = appsResult.count || 0;
    const placedStudents = placedResult.count || 0;

    const placementPercentage = totalStudents > 0
      ? `${((placedStudents / totalStudents) * 100).toFixed(2)}%`
      : '0.00%';

    return res.status(200).json({
      success: true,
      message: 'Placement cell statistics retrieved successfully.',
      data: {
        totalStudents,
        verifiedStudents,
        totalCompanies,
        approvedCompanies,
        totalJobs,
        totalApplications,
        placedStudents,
        placementPercentage
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  deleteUser,
  getPendingRecruiters,
  approveRecruiter,
  verifyStudent,
  getPlacements,
  getStats
};

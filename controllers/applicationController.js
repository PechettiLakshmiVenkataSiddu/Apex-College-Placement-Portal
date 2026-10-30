/**
 * controllers/applicationController.js
 * -----------------------------------
 * Manages campus drive applications, eligibility verification, and selection tracking.
 * 
 * Viva explanation:
 * - Implements placement cell policies:
 *   1. One-Student-One-Offer rule: Once a student is marked as 'selected', they cannot apply further.
 *   2. Complete profile mandatory: Students must have roll number, department, and CGPA filled.
 *   3. Strict eligibility enforcement: Checks CGPA >= min_cgpa, backlogs <= max_backlogs,
 *      and matches student department against allowed_departments.
 *   4. Unique application constraint: Prevents duplicate applications for the same job.
 */

const { supabase } = require('../config/supabase');

/**
 * Apply to a campus job posting with comprehensive eligibility validation.
 * Access: Student only.
 */
const applyForJob = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const { jobId } = req.params;

    // 1. Fetch job posting details including placement criteria
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, title, company, is_active, deadline, min_cgpa, max_backlogs, allowed_departments')
      .eq('id', jobId)
      .maybeSingle();

    if (jobError) {
      return next(jobError);
    }

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job posting not found.',
        data: null
      });
    }

    // 2. Validate that the drive is currently active
    if (!job.is_active) {
      return res.status(400).json({
        success: false,
        message: 'This campus drive is currently closed or inactive.',
        data: null
      });
    }

    // 3. Validate application deadline
    const now = new Date();
    const deadline = new Date(job.deadline);
    deadline.setHours(23, 59, 59, 999);

    if (now > deadline) {
      return res.status(400).json({
        success: false,
        message: `The application deadline (${job.deadline}) for this drive has passed.`,
        data: null
      });
    }

    // 4. One-Student-One-Offer Rule:
    // If a student is already 'selected' by any company, block further applications
    const { data: placedApp, error: placedCheckError } = await supabase
      .from('applications')
      .select('id, job:job_id(title, company)')
      .eq('student_id', studentId)
      .eq('status', 'selected')
      .maybeSingle();

    if (placedCheckError) {
      return next(placedCheckError);
    }

    if (placedApp) {
      const placedCompany = placedApp.job ? placedApp.job.company : 'another company';
      return res.status(400).json({
        success: false,
        message: `Policy Restriction: You have already been selected by ${placedCompany} (One-Student-One-Offer policy). You cannot apply to more companies.`,
        data: null
      });
    }

    // 5. Complete Profile Check:
    // Student must have an updated profile with roll number, department, and CGPA
    const { data: profile, error: profileError } = await supabase
      .from('student_profiles')
      .select('*')
      .eq('user_id', studentId)
      .maybeSingle();

    if (profileError) {
      return next(profileError);
    }

    if (
      !profile ||
      !profile.roll_number ||
      !profile.department ||
      profile.cgpa === null ||
      profile.cgpa === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: 'Profile Incomplete: Please complete your academic profile (roll number, department, and CGPA) before applying for campus drives.',
        data: null
      });
    }

    // 6. Eligibility Check: Minimum CGPA
    const minCgpa = job.min_cgpa !== null && job.min_cgpa !== undefined ? parseFloat(job.min_cgpa) : 0.0;
    const studentCgpa = parseFloat(profile.cgpa);

    if (studentCgpa < minCgpa) {
      return res.status(400).json({
        success: false,
        message: `Ineligible: Minimum CGPA required is ${minCgpa.toFixed(2)}, but your CGPA is ${studentCgpa.toFixed(2)}.`,
        data: null
      });
    }

    // 7. Eligibility Check: Maximum Active Backlogs
    const maxBacklogs = job.max_backlogs !== null && job.max_backlogs !== undefined ? parseInt(job.max_backlogs, 10) : 0;
    const studentBacklogs = profile.backlogs !== null && profile.backlogs !== undefined ? parseInt(profile.backlogs, 10) : 0;

    if (studentBacklogs > maxBacklogs) {
      return res.status(400).json({
        success: false,
        message: `Ineligible: Maximum active backlogs permitted is ${maxBacklogs}, but you have ${studentBacklogs} active backlog(s).`,
        data: null
      });
    }

    // 8. Eligibility Check: Allowed Departments
    if (job.allowed_departments && job.allowed_departments.trim() !== '') {
      const allowedList = job.allowed_departments
        .split(',')
        .map((d) => d.trim().toLowerCase())
        .filter(Boolean);

      const studentDept = (profile.department || '').trim().toLowerCase();

      // Check if student's department matches or contains any allowed keyword
      const isEligibleDept = allowedList.some(
        (dept) => studentDept === dept || studentDept.includes(dept) || dept.includes(studentDept)
      );

      if (!isEligibleDept) {
        return res.status(400).json({
          success: false,
          message: `Ineligible: This drive is open only to [${job.allowed_departments}]. Your registered department is '${profile.department}'.`,
          data: null
        });
      }
    }

    // 9. Prevent Duplicate Application
    const { data: existingApp, error: appCheckError } = await supabase
      .from('applications')
      .select('id')
      .eq('job_id', jobId)
      .eq('student_id', studentId)
      .maybeSingle();

    if (appCheckError) {
      return next(appCheckError);
    }

    if (existingApp) {
      return res.status(409).json({
        success: false,
        message: 'You have already submitted an application for this campus drive.',
        data: null
      });
    }

    // 10. Record new application
    const { data: newApplication, error: insertError } = await supabase
      .from('applications')
      .insert({
        job_id: jobId,
        student_id: studentId,
        status: 'applied'
      })
      .select()
      .single();

    if (insertError) {
      return next(insertError);
    }

    return res.status(201).json({
      success: true,
      message: 'Campus drive application submitted successfully.',
      data: newApplication
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all applications submitted by the logged-in student.
 */
const getMyApplications = async (req, res, next) => {
  try {
    const studentId = req.user.id;

    const { data: applications, error } = await supabase
      .from('applications')
      .select(`
        id,
        status,
        applied_at,
        job:job_id (
          id,
          title,
          company,
          location,
          salary,
          job_type,
          min_cgpa,
          max_backlogs,
          allowed_departments,
          deadline,
          is_active
        )
      `)
      .eq('student_id', studentId)
      .order('applied_at', { ascending: false });

    if (error) {
      return next(error);
    }

    return res.status(200).json({
      success: true,
      message: 'Your applications fetched successfully.',
      data: applications || []
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all applicants for a company's job posting with student academic profiles.
 */
const getJobApplicants = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const recruiterId = req.user.id;

    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, recruiter_id, title, company')
      .eq('id', jobId)
      .maybeSingle();

    if (jobError) {
      return next(jobError);
    }

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job posting not found.',
        data: null
      });
    }

    if (job.recruiter_id !== recruiterId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only view applicants for your own company jobs.',
        data: null
      });
    }

    const { data: applications, error: appError } = await supabase
      .from('applications')
      .select(`
        id,
        job_id,
        student_id,
        status,
        applied_at,
        student:student_id (
          id,
          name,
          email
        )
      `)
      .eq('job_id', jobId)
      .order('applied_at', { ascending: false });

    if (appError) {
      return next(appError);
    }

    // Attach student profile details (roll number, department, CGPA, backlogs, is_verified)
    const studentIds = (applications || []).map((app) => app.student_id);
    const profilesMap = {};

    if (studentIds.length > 0) {
      const { data: profiles, error: profileError } = await supabase
        .from('student_profiles')
        .select('*')
        .in('user_id', studentIds);

      if (!profileError && profiles) {
        profiles.forEach((p) => {
          profilesMap[p.user_id] = p;
        });
      }
    }

    const applicants = (applications || []).map((app) => ({
      id: app.id,
      job_id: app.job_id,
      student_id: app.student_id,
      status: app.status,
      applied_at: app.applied_at,
      student: app.student,
      profile: profilesMap[app.student_id] || null
    }));

    return res.status(200).json({
      success: true,
      message: 'Applicants fetched successfully.',
      data: {
        job: {
          id: job.id,
          title: job.title,
          company: job.company
        },
        applicants
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update candidate application status (shortlisted, rejected, selected).
 */
const updateApplicationStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const recruiterId = req.user.id;

    const { data: application, error: fetchError } = await supabase
      .from('applications')
      .select('id, job_id, status, job:job_id(recruiter_id)')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) {
      return next(fetchError);
    }

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found.',
        data: null
      });
    }

    if (!application.job || application.job.recruiter_id !== recruiterId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only update applications for your own company jobs.',
        data: null
      });
    }

    const { data: updatedApp, error: updateError } = await supabase
      .from('applications')
      .update({ status: status.toLowerCase() })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return next(updateError);
    }

    return res.status(200).json({
      success: true,
      message: `Application status updated to '${status.toLowerCase()}'.`,
      data: updatedApp
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  applyForJob,
  getMyApplications,
  getJobApplicants,
  updateApplicationStatus
};

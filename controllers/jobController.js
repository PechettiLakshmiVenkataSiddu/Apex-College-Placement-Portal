/**
 * controllers/jobController.js
 * ----------------------------
 * Handles campus placement drives and job postings.
 * 
 * Viva explanation:
 * - Approved company recruiters post campus drives specifying placement eligibility criteria:
 *   min_cgpa, max_backlogs, and allowed_departments.
 * - Public/Student users can view and filter jobs.
 * - Recruiters can only modify or delete postings they own.
 * - The Placement Officer (admin) can delete any job posting.
 */

const { supabase } = require('../config/supabase');

/**
 * Get all active campus jobs with optional filtering.
 */
const getAllJobs = async (req, res, next) => {
  try {
    const { search, location, job_type, is_active } = req.query;

    let query = supabase
      .from('jobs')
      .select('*, recruiter:recruiter_id(id, name, email, is_approved)')
      .order('created_at', { ascending: false });

    if (is_active !== undefined) {
      query = query.eq('is_active', is_active === 'true');
    } else {
      query = query.eq('is_active', true);
    }

    if (search && search.trim()) {
      const term = search.trim();
      query = query.or(`title.ilike.%${term}%,company.ilike.%${term}%,description.ilike.%${term}%`);
    }

    if (location && location.trim()) {
      query = query.ilike('location', `%${location.trim()}%`);
    }

    if (job_type && job_type.trim()) {
      query = query.ilike('job_type', `%${job_type.trim()}%`);
    }

    const { data: jobs, error } = await query;

    if (error) {
      return next(error);
    }

    return res.status(200).json({
      success: true,
      message: 'Campus jobs fetched successfully.',
      data: jobs || []
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Public summary statistics for homepage banner (companies visiting, drives open, students placed).
 * Access: Public.
 */
const getPublicStats = async (req, res, next) => {
  try {
    const [jobsRes, companiesRes, placedRes] = await Promise.all([
      supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'recruiter').eq('is_approved', true),
      supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'selected')
    ]);

    return res.status(200).json({
      success: true,
      data: {
        drivesOpen: jobsRes.count || 0,
        companiesVisiting: companiesRes.count || 0,
        studentsPlaced: placedRes.count || 0
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single job posting by ID.
 */
const getJobById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: job, error } = await supabase
      .from('jobs')
      .select('*, recruiter:recruiter_id(id, name, email, is_approved)')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      return next(error);
    }

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job posting not found.',
        data: null
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Job details fetched successfully.',
      data: job
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all jobs posted by the currently logged-in company recruiter.
 */
const getMyJobs = async (req, res, next) => {
  try {
    const recruiterId = req.user.id;

    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('recruiter_id', recruiterId)
      .order('created_at', { ascending: false });

    if (error) {
      return next(error);
    }

    return res.status(200).json({
      success: true,
      message: "Company's jobs fetched successfully.",
      data: jobs || []
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Post a new job with eligibility criteria.
 * Access: Approved Recruiter only.
 */
const createJob = async (req, res, next) => {
  try {
    const recruiterId = req.user.id;

    // Safety check: ensure recruiter is approved
    if (req.user.role === 'recruiter' && req.user.is_approved === false) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Your company account must be approved by the Placement Officer before posting jobs.',
        data: null
      });
    }

    const {
      title,
      company,
      description,
      location,
      salary,
      job_type,
      package_lpa,
      positions,
      selection_process,
      deadline,
      last_date_to_apply,
      is_active,
      min_cgpa,
      max_backlogs,
      allowed_departments
    } = req.body;

    const finalDeadline = deadline || last_date_to_apply;

    const parsedPackage = package_lpa !== undefined && package_lpa !== ''
      ? parseFloat(package_lpa)
      : (salary && !isNaN(parseFloat(salary)) ? parseFloat(salary) : null);

    const { data: newJob, error } = await supabase
      .from('jobs')
      .insert({
        recruiter_id: recruiterId,
        title: title.trim(),
        company: company.trim(),
        description: description.trim(),
        location: location.trim(),
        salary: salary ? salary.trim() : (parsedPackage ? `${parsedPackage} LPA` : null),
        job_type: job_type.trim(),
        package_lpa: parsedPackage,
        positions: positions !== undefined && positions !== '' ? parseInt(positions, 10) : 1,
        selection_process: selection_process ? selection_process.trim() : null,
        deadline: finalDeadline,
        is_active: is_active !== undefined ? Boolean(is_active) : true,
        min_cgpa: min_cgpa !== undefined && min_cgpa !== '' ? parseFloat(min_cgpa) : 0.0,
        max_backlogs: max_backlogs !== undefined && max_backlogs !== '' ? parseInt(max_backlogs, 10) : 0,
        allowed_departments: allowed_departments !== undefined ? (allowed_departments ? allowed_departments.trim() : null) : null
      })
      .select()
      .single();

    if (error) {
      return next(error);
    }

    return res.status(201).json({
      success: true,
      message: 'Campus job posted successfully.',
      data: newJob
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing job posting.
 * Access: Recruiter (own jobs only).
 */
const updateJob = async (req, res, next) => {
  try {
    const { id } = req.params;
    const recruiterId = req.user.id;

    const { data: existingJob, error: fetchError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) {
      return next(fetchError);
    }

    if (!existingJob) {
      return res.status(404).json({
        success: false,
        message: 'Job posting not found.',
        data: null
      });
    }

    if (existingJob.recruiter_id !== recruiterId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only edit jobs that your company created.',
        data: null
      });
    }

    const {
      title,
      company,
      description,
      location,
      salary,
      job_type,
      package_lpa,
      positions,
      selection_process,
      deadline,
      last_date_to_apply,
      is_active,
      min_cgpa,
      max_backlogs,
      allowed_departments
    } = req.body;

    const updates = {};
    if (title !== undefined) updates.title = title.trim();
    if (company !== undefined) updates.company = company.trim();
    if (description !== undefined) updates.description = description.trim();
    if (location !== undefined) updates.location = location.trim();
    if (salary !== undefined) updates.salary = salary ? salary.trim() : null;
    if (job_type !== undefined) updates.job_type = job_type.trim();
    if (package_lpa !== undefined) updates.package_lpa = package_lpa !== '' ? parseFloat(package_lpa) : null;
    if (positions !== undefined) updates.positions = positions !== '' ? parseInt(positions, 10) : 1;
    if (selection_process !== undefined) updates.selection_process = selection_process ? selection_process.trim() : null;
    const finalDeadline = deadline || last_date_to_apply;
    if (finalDeadline !== undefined) updates.deadline = finalDeadline;
    if (is_active !== undefined) updates.is_active = Boolean(is_active);
    if (min_cgpa !== undefined) updates.min_cgpa = min_cgpa !== '' ? parseFloat(min_cgpa) : 0.0;
    if (max_backlogs !== undefined) updates.max_backlogs = max_backlogs !== '' ? parseInt(max_backlogs, 10) : 0;
    if (allowed_departments !== undefined) updates.allowed_departments = allowed_departments ? allowed_departments.trim() : null;

    const { data: updatedJob, error: updateError } = await supabase
      .from('jobs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return next(updateError);
    }

    return res.status(200).json({
      success: true,
      message: 'Job posting updated successfully.',
      data: updatedJob
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a job posting.
 * Access: Recruiter (own jobs) OR Admin (Placement Officer - any job).
 */
const deleteJob = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const { data: existingJob, error: fetchError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) {
      return next(fetchError);
    }

    if (!existingJob) {
      return res.status(404).json({
        success: false,
        message: 'Job posting not found.',
        data: null
      });
    }

    if (userRole === 'recruiter' && existingJob.recruiter_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only delete jobs that your company created.',
        data: null
      });
    }

    const { error: deleteError } = await supabase
      .from('jobs')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return next(deleteError);
    }

    return res.status(200).json({
      success: true,
      message: 'Job posting deleted successfully.',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Check if the logged-in student is eligible for a specific campus drive.
 * Access: Protected (student only).
 * Returns { eligible: true/false, reasons: [...] }
 */
const checkJobEligibility = async (req, res, next) => {
  try {
    const { id } = req.params;
    const studentId = req.user.id;

    // 1. Fetch job
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (jobError) return next(jobError);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job posting not found.',
        data: null
      });
    }

    const reasons = [];

    // 2. Drive active check
    if (!job.is_active) {
      reasons.push('Campus drive is currently closed or inactive.');
    }

    // 3. Deadline check
    const now = new Date();
    const deadline = new Date(job.deadline);
    deadline.setHours(23, 59, 59, 999);
    const isExpired = now > deadline;
    if (isExpired) {
      reasons.push(`Application deadline (${job.deadline}) has passed.`);
    }

    // 4. One-Student-One-Offer check
    const { data: placedApp, error: placedError } = await supabase
      .from('applications')
      .select('id, job:job_id(company, title)')
      .eq('student_id', studentId)
      .eq('status', 'selected')
      .maybeSingle();

    if (placedError) return next(placedError);

    if (placedApp) {
      const placedCompany = placedApp.job ? placedApp.job.company : 'another company';
      reasons.push(`You have already been selected by ${placedCompany} (One-Student-One-Offer policy).`);
    }

    // 5. Check student profile completeness
    const { data: profile, error: profileError } = await supabase
      .from('student_profiles')
      .select('*')
      .eq('user_id', studentId)
      .maybeSingle();

    if (profileError) return next(profileError);

    const isProfileMissing = !profile || !profile.roll_number || !profile.department || profile.cgpa === null || profile.cgpa === undefined;
    const isResumeMissing = !profile || !profile.resume_url;

    if (isProfileMissing) {
      reasons.push('Academic profile is incomplete. Please complete your roll number, department, and CGPA in My Profile.');
    }

    if (isResumeMissing) {
      reasons.push('Resume is missing. Please upload your resume PDF in My Profile.');
    }

    // 6. Eligibility criteria: CGPA, backlogs, allowed departments
    if (profile) {
      if (profile.cgpa !== null && profile.cgpa !== undefined) {
        const minCgpa = job.min_cgpa !== null && job.min_cgpa !== undefined ? parseFloat(job.min_cgpa) : 0.0;
        const studentCgpa = parseFloat(profile.cgpa);
        if (studentCgpa < minCgpa) {
          reasons.push(`Minimum CGPA required is ${minCgpa.toFixed(2)}, but your CGPA is ${studentCgpa.toFixed(2)}.`);
        }
      }

      if (profile.backlogs !== null && profile.backlogs !== undefined) {
        const maxBacklogs = job.max_backlogs !== null && job.max_backlogs !== undefined ? parseInt(job.max_backlogs, 10) : 0;
        const studentBacklogs = parseInt(profile.backlogs, 10);
        if (studentBacklogs > maxBacklogs) {
          reasons.push(`Maximum active backlogs allowed is ${maxBacklogs}, but you have ${studentBacklogs} active backlog(s).`);
        }
      }

      if (job.allowed_departments && job.allowed_departments.trim() !== '') {
        const allowedList = job.allowed_departments
          .split(',')
          .map((d) => d.trim().toLowerCase())
          .filter(Boolean);
        const studentDept = (profile.department || '').trim().toLowerCase();
        const isEligibleDept = allowedList.some(
          (dept) => studentDept === dept || studentDept.includes(dept) || dept.includes(studentDept)
        );
        if (!isEligibleDept) {
          reasons.push(`This drive is open only to [${job.allowed_departments}], but your department is '${profile.department || 'N/A'}'.`);
        }
      }
    }

    // 7. Check if already applied
    const { data: existingApp, error: appCheckError } = await supabase
      .from('applications')
      .select('id, status')
      .eq('job_id', id)
      .eq('student_id', studentId)
      .maybeSingle();

    if (appCheckError) return next(appCheckError);

    if (existingApp) {
      reasons.push('You have already applied for this campus drive.');
    }

    const eligible = reasons.length === 0;

    return res.status(200).json({
      success: true,
      data: {
        eligible,
        reasons,
        alreadyApplied: Boolean(existingApp),
        isExpired,
        isSelectedElsewhere: Boolean(placedApp),
        isProfileMissing,
        isResumeMissing
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllJobs,
  getPublicStats,
  getMyJobs,
  getJobById,
  createJob,
  updateJob,
  deleteJob,
  checkJobEligibility
};

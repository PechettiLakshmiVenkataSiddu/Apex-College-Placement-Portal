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
      deadline,
      is_active,
      min_cgpa,
      max_backlogs,
      allowed_departments
    } = req.body;

    const { data: newJob, error } = await supabase
      .from('jobs')
      .insert({
        recruiter_id: recruiterId,
        title: title.trim(),
        company: company.trim(),
        description: description.trim(),
        location: location.trim(),
        salary: salary ? salary.trim() : null,
        job_type: job_type.trim(),
        deadline,
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
      deadline,
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
    if (deadline !== undefined) updates.deadline = deadline;
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

module.exports = {
  getAllJobs,
  getMyJobs,
  getJobById,
  createJob,
  updateJob,
  deleteJob
};

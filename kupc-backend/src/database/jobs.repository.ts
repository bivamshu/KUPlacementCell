import { supabaseAdmin } from '../config/supabase';

export type JobType = 'internship' | 'full_time' | 'part_time';
export type JobStatus = 'open' | 'closed' | 'draft';

export type JobRecord = {
  id: string;
  company_id: string;
  title: string;
  description: string;
  location: string | null;
  job_type: JobType | null;
  min_cgpa: number | null;
  status: JobStatus;
  created_at: string;
  updated_at: string;
};

export type CreateJobInput = {
  companyId: string;
  title: string;
  description: string;
  location?: string | null;
  jobType?: JobType | null;
  minCgpa?: number | null;
  status?: JobStatus;
};

export type UpdateJobInput = {
  title?: string;
  description?: string;
  location?: string | null;
  jobType?: JobType | null;
  minCgpa?: number | null;
  status?: JobStatus;
};

export const jobsRepository = {
  async create(input: CreateJobInput): Promise<JobRecord> {
    const { data, error } = await supabaseAdmin
      .from('jobs')
      .insert({
        company_id: input.companyId,
        title: input.title,
        description: input.description,
        location: input.location ?? null,
        job_type: input.jobType ?? null,
        min_cgpa: input.minCgpa ?? null,
        status: input.status ?? 'open'
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  },

  async findById(id: string): Promise<JobRecord | null> {
    const { data, error } = await supabaseAdmin.from('jobs').select('*').eq('id', id).maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  },

  async listByCompany(companyId: string): Promise<JobRecord[]> {
    const { data, error } = await supabaseAdmin
      .from('jobs')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data ?? [];
  },

  async listOpenForFeed(excludeJobIds: string[] = []): Promise<JobRecord[]> {
    let query = supabaseAdmin.from('jobs').select('*').eq('status', 'open').order('created_at', {
      ascending: false
    });

    if (excludeJobIds.length > 0) {
      query = query.not('id', 'in', `(${excludeJobIds.join(',')})`);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data ?? [];
  },

  async update(id: string, input: UpdateJobInput): Promise<JobRecord> {
    const patch: Record<string, unknown> = {};

    if (input.title !== undefined) patch.title = input.title;
    if (input.description !== undefined) patch.description = input.description;
    if (input.location !== undefined) patch.location = input.location;
    if (input.jobType !== undefined) patch.job_type = input.jobType;
    if (input.minCgpa !== undefined) patch.min_cgpa = input.minCgpa;
    if (input.status !== undefined) patch.status = input.status;

    const { data, error } = await supabaseAdmin.from('jobs').update(patch).eq('id', id).select().single();

    if (error) {
      throw error;
    }

    return data;
  },

  async deleteById(id: string): Promise<void> {
    const { error } = await supabaseAdmin.from('jobs').delete().eq('id', id);

    if (error) {
      throw error;
    }
  }
};

import { supabaseAdmin } from '../config/supabase';

export type MatchRecord = {
  id: string;
  student_id: string;
  company_id: string;
  job_id: string;
  matched_at: string;
};

export const matchesRepository = {
  async create(input: { studentId: string; companyId: string; jobId: string }): Promise<MatchRecord> {
    const { data, error } = await supabaseAdmin
      .from('matches')
      .insert({
        student_id: input.studentId,
        company_id: input.companyId,
        job_id: input.jobId
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  },

  async findById(id: string): Promise<MatchRecord | null> {
    const { data, error } = await supabaseAdmin.from('matches').select('*').eq('id', id).maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  },

  async findByTriple(
    studentId: string,
    companyId: string,
    jobId: string
  ): Promise<MatchRecord | null> {
    const { data, error } = await supabaseAdmin
      .from('matches')
      .select('*')
      .eq('student_id', studentId)
      .eq('company_id', companyId)
      .eq('job_id', jobId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  },

  async listByStudent(studentId: string): Promise<MatchRecord[]> {
    const { data, error } = await supabaseAdmin
      .from('matches')
      .select('*')
      .eq('student_id', studentId)
      .order('matched_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data ?? [];
  },

  async listByCompany(companyId: string): Promise<MatchRecord[]> {
    const { data, error } = await supabaseAdmin
      .from('matches')
      .select('*')
      .eq('company_id', companyId)
      .order('matched_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data ?? [];
  }
};

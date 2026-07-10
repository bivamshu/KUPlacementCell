import { supabaseAdmin } from '../config/supabase';

export type SavedJobRecord = {
  student_id: string;
  job_id: string;
  saved_at: string;
};

export const savedJobsRepository = {
  async save(studentId: string, jobId: string): Promise<SavedJobRecord> {
    const { data, error } = await supabaseAdmin
      .from('saved_jobs')
      .upsert({ student_id: studentId, job_id: jobId }, { onConflict: 'student_id,job_id' })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  },

  async unsave(studentId: string, jobId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('saved_jobs')
      .delete()
      .eq('student_id', studentId)
      .eq('job_id', jobId);

    if (error) {
      throw error;
    }
  },

  async listByStudent(studentId: string): Promise<SavedJobRecord[]> {
    const { data, error } = await supabaseAdmin
      .from('saved_jobs')
      .select('*')
      .eq('student_id', studentId)
      .order('saved_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data ?? [];
  },

  async exists(studentId: string, jobId: string): Promise<boolean> {
    const { data, error } = await supabaseAdmin
      .from('saved_jobs')
      .select('student_id')
      .eq('student_id', studentId)
      .eq('job_id', jobId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data !== null;
  }
};

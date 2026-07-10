import { supabaseAdmin } from '../config/supabase';

export type SwipeDirection = 'left' | 'right';

export type SwipeRecord = {
  id: string;
  student_id: string;
  company_id: string;
  job_id: string;
  direction: SwipeDirection;
  swiped_at: string;
};

export const swipesRepository = {
  async create(input: {
    studentId: string;
    companyId: string;
    jobId: string;
    direction: SwipeDirection;
  }): Promise<SwipeRecord> {
    const { data, error } = await supabaseAdmin
      .from('swipes')
      .insert({
        student_id: input.studentId,
        company_id: input.companyId,
        job_id: input.jobId,
        direction: input.direction
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  },

  async findByStudentAndJob(studentId: string, jobId: string): Promise<SwipeRecord | null> {
    const { data, error } = await supabaseAdmin
      .from('swipes')
      .select('*')
      .eq('student_id', studentId)
      .eq('job_id', jobId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  },

  async listJobIdsByStudent(studentId: string): Promise<string[]> {
    const { data, error } = await supabaseAdmin.from('swipes').select('job_id').eq('student_id', studentId);

    if (error) {
      throw error;
    }

    return (data ?? []).map((row) => row.job_id as string);
  },

  async listByStudent(studentId: string): Promise<SwipeRecord[]> {
    const { data, error } = await supabaseAdmin
      .from('swipes')
      .select('*')
      .eq('student_id', studentId)
      .order('swiped_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data ?? [];
  },

  async listByCompany(companyId: string): Promise<SwipeRecord[]> {
    const { data, error } = await supabaseAdmin
      .from('swipes')
      .select('*')
      .eq('company_id', companyId)
      .order('swiped_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data ?? [];
  },

  /**
   * Returns the student's right-swipe for this job if it exists.
   * Used by match orchestration after a company reciprocates (or vice versa).
   */
  async findStudentRightSwipe(
    studentId: string,
    companyId: string,
    jobId: string
  ): Promise<SwipeRecord | null> {
    const { data, error } = await supabaseAdmin
      .from('swipes')
      .select('*')
      .eq('student_id', studentId)
      .eq('company_id', companyId)
      .eq('job_id', jobId)
      .eq('direction', 'right')
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }
};

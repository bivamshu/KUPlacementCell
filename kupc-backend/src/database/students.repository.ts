import { supabaseAdmin } from '../config/supabase';

export type StudentRecord = {
  id: string;
  ku_id: string;
  full_name: string;
  graduation_year: number | null;
  department: string | null;
};

export const studentsRepository = {
  async create(input: { id: string; kuId: string; fullName: string }): Promise<StudentRecord> {
    const { data, error } = await supabaseAdmin
      .from('students')
      .insert({
        id: input.id,
        ku_id: input.kuId,
        full_name: input.fullName,
        graduation_year: null,
        department: null
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }
};

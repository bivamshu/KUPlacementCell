import { supabaseAdmin } from '../config/supabase';

export type SkillRecord = {
  id: string;
  name: string;
};

export type Proficiency = 'beginner' | 'intermediate' | 'advanced';

export type StudentSkillRecord = {
  student_id: string;
  skill_id: string;
  proficiency: Proficiency | null;
};

export const skillsRepository = {
  async listAll(): Promise<SkillRecord[]> {
    const { data, error } = await supabaseAdmin.from('skills').select('*').order('name', { ascending: true });

    if (error) {
      throw error;
    }

    return data ?? [];
  },

  async findByName(name: string): Promise<SkillRecord | null> {
    const { data, error } = await supabaseAdmin.from('skills').select('*').eq('name', name).maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  },

  async upsertByName(name: string): Promise<SkillRecord> {
    const { data, error } = await supabaseAdmin
      .from('skills')
      .upsert({ name }, { onConflict: 'name' })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  },

  async listForStudent(studentId: string): Promise<StudentSkillRecord[]> {
    const { data, error } = await supabaseAdmin
      .from('student_skills')
      .select('student_id, skill_id, proficiency')
      .eq('student_id', studentId);

    if (error) {
      throw error;
    }

    return data ?? [];
  },

  async listForStudentWithNames(
    studentId: string
  ): Promise<Array<StudentSkillRecord & { skill_name: string | null }>> {
    const { data, error } = await supabaseAdmin
      .from('student_skills')
      .select('student_id, skill_id, proficiency, skills(name)')
      .eq('student_id', studentId);

    if (error) {
      throw error;
    }

    return (data ?? []).map((row) => {
      const linked = row.skills as { name?: string } | { name?: string }[] | null;
      const skill = Array.isArray(linked) ? linked[0] : linked;
      return {
        student_id: row.student_id as string,
        skill_id: row.skill_id as string,
        proficiency: row.proficiency as Proficiency | null,
        skill_name: skill?.name ?? null
      };
    });
  },

  async linkStudentSkill(input: {
    studentId: string;
    skillId: string;
    proficiency?: Proficiency | null;
  }): Promise<StudentSkillRecord> {
    const { data, error } = await supabaseAdmin
      .from('student_skills')
      .upsert(
        {
          student_id: input.studentId,
          skill_id: input.skillId,
          proficiency: input.proficiency ?? null
        },
        { onConflict: 'student_id,skill_id' }
      )
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  },

  async unlinkStudentSkill(studentId: string, skillId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('student_skills')
      .delete()
      .eq('student_id', studentId)
      .eq('skill_id', skillId);

    if (error) {
      throw error;
    }
  }
};

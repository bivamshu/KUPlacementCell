import { supabaseAdmin } from '../config/supabase';

export type ResumeRecord = {
  id: string;
  student_id: string;
  file_url: string;
  file_name: string;
  uploaded_at: string;
};

export type ResumeAnalysisRecord = {
  id: string;
  resume_id: string;
  extracted_skills: unknown;
  ats_score: number | null;
  summary: string | null;
  analyzed_at: string;
};

export const resumesRepository = {
  async create(input: { studentId: string; fileUrl: string; fileName: string }): Promise<ResumeRecord> {
    const { data, error } = await supabaseAdmin
      .from('resumes')
      .insert({
        student_id: input.studentId,
        file_url: input.fileUrl,
        file_name: input.fileName
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  },

  async findById(id: string): Promise<ResumeRecord | null> {
    const { data, error } = await supabaseAdmin.from('resumes').select('*').eq('id', id).maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  },

  async listByStudent(studentId: string): Promise<ResumeRecord[]> {
    const { data, error } = await supabaseAdmin
      .from('resumes')
      .select('*')
      .eq('student_id', studentId)
      .order('uploaded_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data ?? [];
  },

  async deleteById(id: string): Promise<void> {
    const { error } = await supabaseAdmin.from('resumes').delete().eq('id', id);

    if (error) {
      throw error;
    }
  },

  async createAnalysis(input: {
    resumeId: string;
    extractedSkills?: unknown;
    atsScore?: number | null;
    summary?: string | null;
  }): Promise<ResumeAnalysisRecord> {
    const { data, error } = await supabaseAdmin
      .from('resume_analysis')
      .insert({
        resume_id: input.resumeId,
        extracted_skills: input.extractedSkills ?? null,
        ats_score: input.atsScore ?? null,
        summary: input.summary ?? null
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  },

  async findAnalysisByResumeId(resumeId: string): Promise<ResumeAnalysisRecord | null> {
    const { data, error } = await supabaseAdmin
      .from('resume_analysis')
      .select('*')
      .eq('resume_id', resumeId)
      .order('analyzed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }
};

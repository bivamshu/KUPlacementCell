import { supabaseAdmin } from '../config/supabase';
import type { AnalysisStatus } from '../modules/resumes/resumes.constants';

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
  status: AnalysisStatus;
  error_message: string | null;
  extracted_skills: unknown;
  ats_score: number | null;
  grade: string | null;
  score_breakdown: unknown;
  strengths: unknown;
  suggestions: unknown;
  issues_identified: unknown;
  summary: string | null;
  raw_response: unknown;
  model: string | null;
  analyzed_at: string;
  started_at: string | null;
  completed_at: string | null;
};

export const resumesRepository = {
  async create(input: {
    studentId: string;
    fileUrl: string;
    fileName: string;
    id?: string;
  }): Promise<ResumeRecord> {
    const row: Record<string, unknown> = {
      student_id: input.studentId,
      file_url: input.fileUrl,
      file_name: input.fileName
    };
    if (input.id) {
      row.id = input.id;
    }

    const { data, error } = await supabaseAdmin.from('resumes').insert(row).select().single();

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

  /** Creates a pending analysis row (upload pipeline). */
  async createAnalysis(input: {
    resumeId: string;
    status?: AnalysisStatus;
  }): Promise<ResumeAnalysisRecord> {
    const { data, error } = await supabaseAdmin
      .from('resume_analysis')
      .insert({
        resume_id: input.resumeId,
        status: input.status ?? 'pending'
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  },

  async findAnalysisById(id: string): Promise<ResumeAnalysisRecord | null> {
    const { data, error } = await supabaseAdmin
      .from('resume_analysis')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  },

  /** Latest analysis for a resume (by analyzed_at). */
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
  },

  /** pending → processing (worker claim). */
  async updateAnalysisStatus(
    id: string,
    status: Extract<AnalysisStatus, 'pending' | 'processing'>
  ): Promise<ResumeAnalysisRecord> {
    const patch: Record<string, unknown> = { status };

    if (status === 'processing') {
      patch.started_at = new Date().toISOString();
      patch.error_message = null;
    }

    const { data, error } = await supabaseAdmin
      .from('resume_analysis')
      .update(patch)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  },

  /** Write OpenAI result and mark completed. */
  async completeAnalysis(
    id: string,
    input: {
      atsScore: number;
      grade: string;
      scoreBreakdown: unknown;
      extractedSkills: unknown;
      summary: string;
      strengths: unknown;
      suggestions: unknown;
      issuesIdentified: unknown;
      rawResponse?: unknown;
      model?: string;
    }
  ): Promise<ResumeAnalysisRecord> {
    const now = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('resume_analysis')
      .update({
        status: 'completed',
        error_message: null,
        ats_score: input.atsScore,
        grade: input.grade,
        score_breakdown: input.scoreBreakdown,
        extracted_skills: input.extractedSkills,
        summary: input.summary,
        strengths: input.strengths,
        suggestions: input.suggestions,
        issues_identified: input.issuesIdentified,
        raw_response: input.rawResponse ?? null,
        model: input.model ?? null,
        completed_at: now,
        analyzed_at: now
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  },

  /** Mark failed with message. */
  async failAnalysis(id: string, errorMessage: string): Promise<ResumeAnalysisRecord> {
    const now = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('resume_analysis')
      .update({
        status: 'failed',
        error_message: errorMessage,
        completed_at: now
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }
};

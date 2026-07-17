import type { ResumeAnalysisRecord, ResumeRecord } from '../../database/resumes.repository';
import type {
  AnalysisResponse,
  AnalysisResultDto,
  AnalysisSuggestion,
  ExtractedSkills,
  ResumeListItem,
  ScoreBreakdownItem
} from './resumes.types';

const emptySkills = (): ExtractedSkills => ({
  languages: [],
  frameworks: [],
  databases: [],
  cloud: [],
  data_ml: [],
  other: []
});

export function toResumeListItem(resume: ResumeRecord, activeResumeId: string | null): ResumeListItem {
  return {
    id: resume.id,
    file_name: resume.file_name,
    file_url: resume.file_url,
    uploaded_at: resume.uploaded_at,
    is_active: activeResumeId === resume.id
  };
}

export function toAnalysisResultDto(analysis: ResumeAnalysisRecord): AnalysisResultDto {
  return {
    ats_score: {
      total_score: Number(analysis.ats_score ?? 0),
      grade: analysis.grade ?? 'D',
      breakdown: (analysis.score_breakdown as ScoreBreakdownItem[] | null) ?? []
    },
    extracted_skills: (analysis.extracted_skills as ExtractedSkills | null) ?? emptySkills(),
    summary: analysis.summary ?? '',
    strengths: (analysis.strengths as string[] | null) ?? [],
    suggestions: (analysis.suggestions as AnalysisSuggestion[] | null) ?? [],
    issues_identified: (analysis.issues_identified as string[] | null) ?? []
  };
}

export function toAnalysisResponse(analysis: ResumeAnalysisRecord): AnalysisResponse {
  return {
    analysisId: analysis.id,
    resumeId: analysis.resume_id,
    status: analysis.status,
    error_message: analysis.error_message,
    result: analysis.status === 'completed' ? toAnalysisResultDto(analysis) : null
  };
}

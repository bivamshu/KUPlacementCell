import { AnalysisStatus } from '../modules/resumes/resumes.constants';
import { toAnalysisResponse, toResumeListItem } from '../modules/resumes/resumes.mapper';
import type { ResumeAnalysisRecord, ResumeRecord } from '../database/resumes.repository';

const resume: ResumeRecord = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  student_id: 'student-1',
  file_url: 'student-1/resume/resume.pdf',
  file_name: 'resume.pdf',
  uploaded_at: '2026-07-11T10:00:00.000Z'
};

describe('Phase 4 - resume mappers', () => {
  it('maps resume list item with is_active flag', () => {
    expect(toResumeListItem(resume, resume.id)).toMatchObject({
      id: resume.id,
      is_active: true
    });
    expect(toResumeListItem(resume, null).is_active).toBe(false);
  });

  it('maps pending analysis without result payload', () => {
    const analysis = {
      id: 'analysis-1',
      resume_id: resume.id,
      status: AnalysisStatus.PENDING,
      error_message: null
    } as ResumeAnalysisRecord;

    expect(toAnalysisResponse(analysis)).toEqual({
      analysisId: 'analysis-1',
      resumeId: resume.id,
      status: AnalysisStatus.PENDING,
      error_message: null,
      result: null
    });
  });

  it('maps completed analysis with ATS result', () => {
    const analysis = {
      id: 'analysis-1',
      resume_id: resume.id,
      status: AnalysisStatus.COMPLETED,
      error_message: null,
      ats_score: 80,
      grade: 'B',
      score_breakdown: [{ category: 'skills', label: 'Skills', score: 20, max_score: 25 }],
      extracted_skills: {
        languages: ['TypeScript'],
        frameworks: [],
        databases: [],
        cloud: [],
        data_ml: [],
        other: []
      },
      summary: 'Good',
      strengths: ['Skills'],
      suggestions: [],
      issues_identified: []
    } as ResumeAnalysisRecord;

    const mapped = toAnalysisResponse(analysis);
    expect(mapped.result?.ats_score.total_score).toBe(80);
    expect(mapped.result?.extracted_skills.languages).toContain('TypeScript');
  });
});

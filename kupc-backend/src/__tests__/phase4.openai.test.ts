jest.mock('../config/env', () => ({
  env: {
    OPENAI_API_KEY: 'test-key',
    OPENAI_MODEL: 'gpt-4o-mini',
    OPENAI_TIMEOUT_MS: 60_000
  }
}));

import OpenAI from 'openai';
import { OpenAiAnalysisError } from '../modules/resumes/resumes.errors';
import { analyzeResumeText } from '../modules/resumes/resumes.openai';

const validPayload = {
  ats_score: {
    total_score: 72,
    grade: 'B',
    breakdown: [
      { category: 'contact_info', label: 'Contact Info', score: 15, max_score: 20 },
      { category: 'skills', label: 'Skills', score: 18, max_score: 25 },
      { category: 'experience', label: 'Experience', score: 17, max_score: 25 },
      { category: 'education', label: 'Education', score: 12, max_score: 15 },
      { category: 'formatting', label: 'Formatting', score: 10, max_score: 15 }
    ]
  },
  extracted_skills: {
    languages: ['Python'],
    frameworks: ['React'],
    databases: ['PostgreSQL'],
    cloud: [],
    data_ml: [],
    other: ['Git']
  },
  summary: 'Solid technical resume.',
  strengths: ['Clear skills section'],
  suggestions: [
    { suggestion: 'Add metrics to recent role.', category: 'experience', priority: 'high' as const }
  ],
  issues_identified: ['Missing LinkedIn URL']
};

describe('Phase 4 Milestone 6 - OpenAI resume scoring', () => {
  it('parses and validates structured OpenAI JSON', async () => {
    const client = {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{ message: { content: JSON.stringify(validPayload) } }]
          })
        }
      }
    };

    const result = await analyzeResumeText('resume text', { client: client as never });

    expect(result.ats_score.total_score).toBe(72);
    expect(result.ats_score.grade).toBe('B');
    expect(result.model).toBe('gpt-4o-mini');
    expect(result.extracted_skills.languages).toContain('Python');
  });

  it('computes grade server-side when model omits it', async () => {
    const { grade: _grade, ...withoutGrade } = validPayload.ats_score;
    const payload = {
      ...validPayload,
      ats_score: { ...withoutGrade, total_score: 88 }
    };

    const client = {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{ message: { content: JSON.stringify(payload) } }]
          })
        }
      }
    };

    const result = await analyzeResumeText('resume text', { client: client as never });
    expect(result.ats_score.grade).toBe('A');
  });

  it('marks auth failures as non-retryable', async () => {
    const client = {
      chat: {
        completions: {
          create: jest.fn().mockRejectedValue(
            new OpenAI.AuthenticationError(401, {}, 'Invalid API key', new Headers())
          )
        }
      }
    };

    await expect(analyzeResumeText('resume text', { client: client as never })).rejects.toMatchObject({
      retryable: false
    });
  });

  it('marks schema mismatch as retryable', async () => {
    const client = {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{ message: { content: JSON.stringify({ invalid: true }) } }]
          })
        }
      }
    };

    await expect(analyzeResumeText('resume text', { client: client as never })).rejects.toBeInstanceOf(
      OpenAiAnalysisError
    );

    try {
      await analyzeResumeText('resume text', { client: client as never });
    } catch (error) {
      expect((error as OpenAiAnalysisError).retryable).toBe(true);
    }
  });
});

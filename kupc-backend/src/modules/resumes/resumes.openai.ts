import OpenAI from 'openai';
import { z } from 'zod';
import { env } from '../../config/env';
import type { AnalysisResultDto } from './resumes.types';
import { OpenAiAnalysisError } from './resumes.errors';
import { analysisResultSchema } from './resumes.openai.schema';

export type ResumeAnalysisAiResult = AnalysisResultDto & {
  model: string;
  rawResponse: unknown;
};

const SYSTEM_PROMPT = `You are an ATS resume analyzer for university placement candidates.
Score resume readiness from 0-100 with category breakdowns for:
- contact_info (max 20)
- skills (max 25)
- experience (max 25)
- education (max 15)
- formatting (max 15)

Return ONLY valid JSON matching this shape:
{
  "ats_score": {
    "total_score": number,
    "grade": "A"|"B"|"C"|"D",
    "breakdown": [{ "category": string, "label": string, "score": number, "max_score": number }]
  },
  "extracted_skills": {
    "languages": string[],
    "frameworks": string[],
    "databases": string[],
    "cloud": string[],
    "data_ml": string[],
    "other": string[]
  },
  "summary": string,
  "strengths": string[],
  "suggestions": [{ "suggestion": string, "category": string, "priority": "high"|"medium"|"low" }],
  "issues_identified": string[]
}

Be specific, actionable, and base scores only on the provided resume text.`;

function computeGrade(totalScore: number): string {
  if (totalScore >= 85) {
    return 'A';
  }
  if (totalScore >= 70) {
    return 'B';
  }
  if (totalScore >= 55) {
    return 'C';
  }
  return 'D';
}

function classifyOpenAiError(error: unknown): OpenAiAnalysisError {
  if (error instanceof OpenAI.APIError) {
    if (error.status === 401 || error.status === 403) {
      return new OpenAiAnalysisError('OpenAI authentication failed', false);
    }

    if (error.status === 429 || (error.status ?? 0) >= 500) {
      return new OpenAiAnalysisError(error.message, true);
    }

    return new OpenAiAnalysisError(error.message, false);
  }

  if (error instanceof OpenAI.AuthenticationError) {
    return new OpenAiAnalysisError('OpenAI authentication failed', false);
  }

  if (error instanceof OpenAiAnalysisError) {
    return error;
  }

  if (error instanceof SyntaxError) {
    return new OpenAiAnalysisError('OpenAI returned invalid JSON', true);
  }

  return new OpenAiAnalysisError(
    error instanceof Error ? error.message : 'OpenAI analysis failed',
    true
  );
}

function createOpenAiClient(): OpenAI {
  if (!env.OPENAI_API_KEY) {
    throw new OpenAiAnalysisError('OPENAI_API_KEY is not configured', false);
  }

  return new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    timeout: env.OPENAI_TIMEOUT_MS
  });
}

export async function analyzeResumeText(
  text: string,
  options?: { client?: OpenAI }
): Promise<ResumeAnalysisAiResult> {
  const client = options?.client ?? createOpenAiClient();
  const model = env.OPENAI_MODEL;

  try {
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Analyze this resume text:\n\n${text}` }
      ]
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      throw new OpenAiAnalysisError('OpenAI returned an empty response', true);
    }

    const parsedJson = JSON.parse(content) as unknown;
    const parsed = analysisResultSchema.parse(parsedJson);
    const grade = parsed.ats_score.grade ?? computeGrade(parsed.ats_score.total_score);

    const result: AnalysisResultDto = {
      ...parsed,
      ats_score: {
        ...parsed.ats_score,
        grade
      }
    };

    return {
      ...result,
      model,
      rawResponse: parsedJson
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new OpenAiAnalysisError('OpenAI response did not match expected schema', true);
    }

    throw classifyOpenAiError(error);
  }
}

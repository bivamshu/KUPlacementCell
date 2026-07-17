import { z } from 'zod';

const scoreBreakdownItemSchema = z.object({
  category: z.string(),
  label: z.string(),
  score: z.number(),
  max_score: z.number()
});

export const analysisResultSchema = z.object({
  ats_score: z.object({
    total_score: z.number().min(0).max(100),
    grade: z.string().optional(),
    breakdown: z.array(scoreBreakdownItemSchema).min(1)
  }),
  extracted_skills: z.object({
    languages: z.array(z.string()),
    frameworks: z.array(z.string()),
    databases: z.array(z.string()),
    cloud: z.array(z.string()),
    data_ml: z.array(z.string()),
    other: z.array(z.string())
  }),
  summary: z.string().min(1),
  strengths: z.array(z.string()),
  suggestions: z.array(
    z.object({
      suggestion: z.string(),
      category: z.string(),
      priority: z.enum(['high', 'medium', 'low'])
    })
  ),
  issues_identified: z.array(z.string())
});

export type ParsedAnalysisResult = z.infer<typeof analysisResultSchema>;

import { z } from 'zod';

export const CATEGORIES = [
  'pothole_damaged_road',
  'water_leak',
  'sewage_overflow',
  'open_manhole_drain',
  'garbage_dumping',
  'air_pollution',
  'water_pollution',
  'noise_pollution',
  'streetlight_electrical',
  'other',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const categoryEnum = z.enum(CATEGORIES);

export const CATEGORY_LABELS: Record<Category, string> = {
  pothole_damaged_road: 'Pothole / Damaged Road',
  water_leak: 'Water Supply Leak / Pipe Burst',
  sewage_overflow: 'Sewage Overflow / Contamination',
  open_manhole_drain: 'Open Manhole / Uncovered Drain',
  garbage_dumping: 'Garbage Dumping / Solid Waste',
  air_pollution: 'Air Pollution / Open Burning',
  water_pollution: 'Water Body Pollution',
  noise_pollution: 'Noise Pollution',
  streetlight_electrical: 'Streetlight / Live Wire Hazard',
  other: 'Other Civic Grievance',
};

export const FactorScoresSchema = z.object({
  safety_risk: z.number().int().min(0).max(10),
  population_impact: z.number().int().min(0).max(10),
  urgency_spread: z.number().int().min(0).max(10),
  sensitive_location: z.number().int().min(0).max(10),
  reasons: z
    .object({
      safety_risk: z.string().max(100).optional(),
      population_impact: z.string().max(100).optional(),
      urgency_spread: z.string().max(100).optional(),
      sensitive_location: z.string().max(100).optional(),
    })
    .optional(),
});

export type FactorScores = z.infer<typeof FactorScoresSchema>;

export const AiAnalysisOutputSchema = z.object({
  is_civic_issue: z.boolean(),
  rejection_reason: z.string().optional(),
  category: categoryEnum.default('other'),
  sub_type: z.string().max(100).optional(),
  title: z.string().max(80),
  summary: z.string().max(300),
  detected_language: z.enum(['en', 'ta', 'other', 'none']).default('none'),
  transcript: z.string().max(500).optional(),
  factors: FactorScoresSchema,
  confidence: z.number().min(0).max(1),
});

export type AiAnalysisOutput = z.infer<typeof AiAnalysisOutputSchema>;

export const FixVerificationOutputSchema = z.object({
  same_location: z.boolean(),
  issue_resolved: z.boolean(),
  confidence: z.number().min(0).max(1),
  reason: z.string().max(300),
  ai_verdict: z.enum(['resolved', 'needs_review']),
});

export type FixVerificationOutput = z.infer<typeof FixVerificationOutputSchema>;

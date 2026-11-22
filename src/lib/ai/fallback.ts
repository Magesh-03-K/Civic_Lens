import { Category, FactorScores, CATEGORY_LABELS } from './schemas';

export interface FallbackParams {
  categoryHint?: string;
  userText?: string;
  rejectionReason?: string;
}

export interface FallbackAnalysisResult {
  is_civic_issue: boolean;
  rejection_reason?: string;
  category: Category;
  sub_type: string;
  title: string;
  summary: string;
  detected_language: 'en' | 'ta' | 'other' | 'none';
  transcript?: string;
  factors: FactorScores;
  confidence: number;
  ai_used: boolean;
  needs_human_review: boolean;
}

/**
 * Default AI factor scores (safety, population, urgency, location)
 * used as rule-based fallback when the AI pipeline fails or rate-limits.
 */
export const DEFAULT_FACTORS_BY_CATEGORY: Record<
  Category,
  [number, number, number, number]
> = {
  pothole_damaged_road: [6, 6, 4, 3],
  water_leak: [3, 6, 6, 3],
  sewage_overflow: [6, 6, 7, 3],
  open_manhole_drain: [9, 6, 4, 3],
  garbage_dumping: [3, 5, 5, 3],
  air_pollution: [4, 6, 5, 3],
  water_pollution: [4, 5, 5, 3],
  noise_pollution: [2, 4, 2, 3],
  streetlight_electrical: [8, 5, 5, 3],
  other: [3, 3, 3, 3],
};

/**
 * Returns a rule-based fallback report. Ensures that the citizen submission
 * demo never breaks even if Gemini is down or throttled.
 */
export function getRuleBasedFallback(params: FallbackParams = {}): FallbackAnalysisResult {
  const { categoryHint, userText, rejectionReason } = params;

  const validCategory =
    categoryHint && categoryHint in DEFAULT_FACTORS_BY_CATEGORY
      ? (categoryHint as Category)
      : 'other';

  const [safety, population, urgency, location] = DEFAULT_FACTORS_BY_CATEGORY[validCategory];
  const label = CATEGORY_LABELS[validCategory] || 'Civic Issue';
  const trimmed = userText?.trim();

  return {
    is_civic_issue: true,
    rejection_reason: rejectionReason,
    category: validCategory,
    sub_type: 'Citizen reported issue',
    title: `Reported ${label}`,
    summary: trimmed && trimmed.length > 0
      ? trimmed.slice(0, 300)
      : 'Civic issue reported; awaits manual review.',
    detected_language: 'none',
    factors: {
      safety_risk: safety,
      population_impact: population,
      urgency_spread: urgency,
      sensitive_location: location,
      reasons: {
        safety_risk: 'Rule-based default for category',
        population_impact: 'Rule-based default for category',
        urgency_spread: 'Rule-based default for category',
        sensitive_location: 'Default sensitivity anchor',
      },
    },
    confidence: 0.3,
    ai_used: false,
    needs_human_review: true,
  };
}

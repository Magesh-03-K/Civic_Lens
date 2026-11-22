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
 * Infers civic category from descriptive text when user leaves category unselected.
 */
export function inferCategoryFromText(text?: string): Category {
  if (!text) return 'other';
  const lower = text.toLowerCase();
  if (/wire|electric|spark|current|shock|light|luminaire|pole|lamp|tneb|voltage|high-voltage|transformer/i.test(lower)) {
    return 'streetlight_electrical';
  }
  if (/pothole|crater|asphalt|tar|bitumen|road|pavement|curb|divider|carriageway/i.test(lower)) {
    return 'pothole_damaged_road';
  }
  if (/pipe|water.*leak|burst|drinking|tap|pipeline|water.*main|flooding/i.test(lower)) {
    return 'water_leak';
  }
  if (/manhole|open drain|drain cover|catch basin/i.test(lower)) {
    return 'open_manhole_drain';
  }
  if (/sewage|drain|gutter|sludge|overflow|blackwater|culvert|foul|stench/i.test(lower)) {
    return 'sewage_overflow';
  }
  if (/garbage|waste|trash|dump|dumping|debris|bin|refuse|plastic|litter|rubbish/i.test(lower)) {
    return 'garbage_dumping';
  }
  if (/smoke|burn|burning|fire|air.*pollut|fume|smog/i.test(lower)) {
    return 'air_pollution';
  }
  if (/canal|lake|river|pond|tank|teppakulam|water.*pollut|effluent/i.test(lower)) {
    return 'water_pollution';
  }
  if (/noise|sound|loud|speaker|generator|decibel/i.test(lower)) {
    return 'noise_pollution';
  }
  return 'other';
}

/**
 * Returns a rule-based fallback report. Ensures that the citizen submission
 * demo never breaks even if Gemini is down or throttled.
 */
export function getRuleBasedFallback(params: FallbackParams = {}): FallbackAnalysisResult {
  const { categoryHint, userText, rejectionReason } = params;

  let validCategory: Category;
  if (categoryHint && categoryHint in DEFAULT_FACTORS_BY_CATEGORY) {
    validCategory = categoryHint as Category;
  } else {
    validCategory = inferCategoryFromText(userText);
  }

  const [defaultSafety, defaultPop, defaultUrg, defaultLoc] = DEFAULT_FACTORS_BY_CATEGORY[validCategory];

  let safety = defaultSafety;
  let population = defaultPop;
  let urgency = defaultUrg;
  let location = defaultLoc;

  const trimmed = userText?.trim();

  // If high risk words are in userText, reflect that in factor scores
  if (trimmed) {
    const lower = trimmed.toLowerCase();
    if (/live|spark|high-voltage|shock|lethal|collapse|fatal|danger|emergency|hazard/i.test(lower)) {
      safety = Math.max(safety, 9);
      urgency = Math.max(urgency, 8);
    }
    if (/school|college|hospital|market|temple|bus stand|junction|busy|crowd/i.test(lower)) {
      location = Math.max(location, 8);
      population = Math.max(population, 8);
    }
  }

  const label = CATEGORY_LABELS[validCategory] || 'Civic Issue';
  const title = trimmed && trimmed.length > 5
    ? `${label}: ${trimmed.length > 60 ? `${trimmed.slice(0, 57)}...` : trimmed}`
    : `Reported ${label}`;

  return {
    is_civic_issue: true,
    rejection_reason: rejectionReason,
    category: validCategory,
    sub_type: 'Citizen reported issue',
    title,
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
        safety_risk: safety >= 8 ? 'High hazard indicators identified' : 'Standard category baseline',
        population_impact: population >= 7 ? 'High foot/vehicle traffic zone' : 'Standard category baseline',
        urgency_spread: urgency >= 7 ? 'Rapidly escalating issue' : 'Standard category baseline',
        sensitive_location: location >= 7 ? 'Sensitive public facility proximity' : 'Standard category baseline',
      },
    },
    confidence: 0.35,
    ai_used: false,
    needs_human_review: true,
  };
}

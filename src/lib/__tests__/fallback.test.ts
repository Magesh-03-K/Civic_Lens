import { describe, it, expect } from 'vitest';
import { getRuleBasedFallback, DEFAULT_FACTORS_BY_CATEGORY } from '../ai/fallback';
import { Category } from '../ai/schemas';

describe('AI Rule-Based Fallback Engine (lib/ai/fallback.ts)', () => {
  it('generates a fallback with correct category default factors', () => {
    const categories: Category[] = [
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
    ];

    for (const cat of categories) {
      const fallback = getRuleBasedFallback({ categoryHint: cat });
      const expectedFactors = DEFAULT_FACTORS_BY_CATEGORY[cat];

      expect(fallback.category).toBe(cat);
      expect(fallback.factors.safety_risk).toBe(expectedFactors[0]);
      expect(fallback.factors.population_impact).toBe(expectedFactors[1]);
      expect(fallback.factors.urgency_spread).toBe(expectedFactors[2]);
      expect(fallback.factors.sensitive_location).toBe(expectedFactors[3]);
      expect(fallback.ai_used).toBe(false);
      expect(fallback.needs_human_review).toBe(true);
    }
  });

  it('uses user text if provided, or default summary', () => {
    const withText = getRuleBasedFallback({
      categoryHint: 'pothole_damaged_road',
      userText: 'Deep hole near bus stand',
    });
    expect(withText.summary).toBe('Deep hole near bus stand');
    expect(withText.title).toContain('Pothole');

    const withoutText = getRuleBasedFallback();
    expect(withoutText.summary).toBe('Civic issue reported; awaits manual review.');
    expect(withoutText.category).toBe('other');
  });

  it('safely handles unknown category hints by falling back to other', () => {
    const fallback = getRuleBasedFallback({ categoryHint: 'flying_saucer' });
    expect(fallback.category).toBe('other');
    expect(fallback.factors.safety_risk).toBe(3);
  });
});

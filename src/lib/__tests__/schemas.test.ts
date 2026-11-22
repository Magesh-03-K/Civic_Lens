import { describe, it, expect } from 'vitest';
import {
  AiAnalysisOutputSchema,
  FixVerificationOutputSchema,
  CATEGORIES,
} from '../ai/schemas';

describe('Zod AI Schemas (lib/ai/schemas.ts)', () => {
  it('validates a valid AI analysis output', () => {
    const validData = {
      is_civic_issue: true,
      category: 'pothole_damaged_road',
      sub_type: 'deep asphalt pothole',
      title: 'Deep pothole on West Veli Street',
      summary: 'A deep pothole measuring approximately 2 feet wide on the main carriageway.',
      detected_language: 'ta',
      transcript: 'ரோட்டில் பெரிய குழி உள்ளது',
      factors: {
        safety_risk: 8,
        population_impact: 7,
        urgency_spread: 4,
        sensitive_location: 6,
        reasons: {
          safety_risk: 'High vehicle speed area',
        },
      },
      confidence: 0.92,
    };

    const parsed = AiAnalysisOutputSchema.safeParse(validData);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.category).toBe('pothole_damaged_road');
      expect(parsed.data.confidence).toBe(0.92);
    }
  });

  it('rejects an invalid factor rating out of 0-10 bounds', () => {
    const invalidData = {
      is_civic_issue: true,
      category: 'pothole_damaged_road',
      title: 'Pothole',
      summary: 'Pothole summary',
      factors: {
        safety_risk: 15, // invalid
        population_impact: 5,
        urgency_spread: 5,
        sensitive_location: 5,
      },
      confidence: 0.8,
    };

    const parsed = AiAnalysisOutputSchema.safeParse(invalidData);
    expect(parsed.success).toBe(false);
  });

  it('validates fix verification output', () => {
    const validFix = {
      same_location: true,
      issue_resolved: true,
      confidence: 0.88,
      reason: 'The pothole has been filled and asphalted evenly with the road surface.',
      ai_verdict: 'resolved',
    };

    const parsed = FixVerificationOutputSchema.safeParse(validFix);
    expect(parsed.success).toBe(true);
  });

  it('contains all 10 expected categories in category enum', () => {
    expect(CATEGORIES).toHaveLength(10);
    expect(CATEGORIES).toContain('pothole_damaged_road');
    expect(CATEGORIES).toContain('water_leak');
    expect(CATEGORIES).toContain('sewage_overflow');
    expect(CATEGORIES).toContain('open_manhole_drain');
    expect(CATEGORIES).toContain('garbage_dumping');
    expect(CATEGORIES).toContain('air_pollution');
    expect(CATEGORIES).toContain('water_pollution');
    expect(CATEGORIES).toContain('noise_pollution');
    expect(CATEGORIES).toContain('streetlight_electrical');
    expect(CATEGORIES).toContain('other');
  });
});

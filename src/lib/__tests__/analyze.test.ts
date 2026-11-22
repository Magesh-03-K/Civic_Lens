import { describe, it, expect, vi } from 'vitest';
import { analyzeCivicMedia } from '../ai/analyze';
import { verifyCivicFix } from '../ai/verify';
import * as geminiModule from '../ai/gemini';

describe('AI Analysis Pipeline (lib/ai/analyze.ts)', () => {
  it('returns valid analysis result when Gemini returns compliant JSON', async () => {
    const mockAiResponse = JSON.stringify({
      is_civic_issue: true,
      category: 'water_leak',
      sub_type: 'burst pipeline',
      title: 'Water pipe leak on bypass road',
      summary: 'Water is gushing from an underground pipe onto the pedestrian path.',
      detected_language: 'en',
      factors: {
        safety_risk: 4,
        population_impact: 6,
        urgency_spread: 7,
        sensitive_location: 4,
        reasons: {
          safety_risk: 'Minor slip hazard',
          urgency_spread: 'Water flooding fast',
        },
      },
      confidence: 0.88,
    });

    vi.spyOn(geminiModule, 'callGeminiWithRetry').mockResolvedValue(mockAiResponse);

    const result = await analyzeCivicMedia({
      mediaBuffer: Buffer.from('test-image-data'),
      mimeType: 'image/jpeg',
      mediaType: 'image',
      userText: 'Water pipe leaking near bus stop',
    });

    expect(result.is_civic_issue).toBe(true);
    expect(result.category).toBe('water_leak');
    expect(result.ai_used).toBe(true);
    expect(result.needs_human_review).toBe(false);
    expect(result.factors.urgency_spread).toBe(7);

    vi.restoreAllMocks();
  });

  it('flags needs_human_review when confidence is below 0.5', async () => {
    const lowConfidenceResponse = JSON.stringify({
      is_civic_issue: true,
      category: 'garbage_dumping',
      title: 'Possible waste heap',
      summary: 'Unclear pile visible in background.',
      detected_language: 'none',
      factors: {
        safety_risk: 3,
        population_impact: 4,
        urgency_spread: 3,
        sensitive_location: 3,
      },
      confidence: 0.42, // < 0.5
    });

    vi.spyOn(geminiModule, 'callGeminiWithRetry').mockResolvedValue(lowConfidenceResponse);

    const result = await analyzeCivicMedia({
      mediaBuffer: Buffer.from('blurry-image'),
      mimeType: 'image/jpeg',
      mediaType: 'image',
    });

    expect(result.ai_used).toBe(true);
    expect(result.needs_human_review).toBe(true);

    vi.restoreAllMocks();
  });

  it('delegates to rule-based fallback when Gemini call throws', async () => {
    vi.spyOn(geminiModule, 'callGeminiWithRetry').mockRejectedValue(
      new Error('API quota exceeded')
    );

    const result = await analyzeCivicMedia({
      mediaBuffer: Buffer.from('some-data'),
      mimeType: 'image/jpeg',
      mediaType: 'image',
      userText: 'Big pothole here',
      categoryHint: 'pothole_damaged_road',
    });

    expect(result.ai_used).toBe(false);
    expect(result.needs_human_review).toBe(true);
    expect(result.category).toBe('pothole_damaged_road');
    expect(result.factors.safety_risk).toBe(6);

    vi.restoreAllMocks();
  });
});

describe('Fix Verification Pipeline (lib/ai/verify.ts)', () => {
  it('automatically flags needs_review when original report media is not an image', async () => {
    const result = await verifyCivicFix({
      beforeBuffer: Buffer.from('audio-data'),
      beforeMimeType: 'audio/wav',
      afterBuffer: Buffer.from('after-image'),
      afterMimeType: 'image/jpeg',
      isBeforeImage: false,
    });

    expect(result.ai_verdict).toBe('needs_review');
    expect(result.same_location).toBe(false);
    expect(result.reason).toContain('not an image');
  });

  it('verifies resolution when Gemini confirms same location and resolved state', async () => {
    const mockVerifyResponse = JSON.stringify({
      same_location: true,
      issue_resolved: true,
      confidence: 0.9,
      reason: 'The pothole has been repaved flush with the existing tarmac.',
      ai_verdict: 'resolved',
    });

    vi.spyOn(geminiModule, 'callGeminiWithRetry').mockResolvedValue(mockVerifyResponse);

    const result = await verifyCivicFix({
      beforeBuffer: Buffer.from('before-img'),
      beforeMimeType: 'image/jpeg',
      afterBuffer: Buffer.from('after-img'),
      afterMimeType: 'image/jpeg',
      isBeforeImage: true,
    });

    expect(result.ai_verdict).toBe('resolved');
    expect(result.same_location).toBe(true);
    expect(result.issue_resolved).toBe(true);
    expect(result.confidence).toBe(0.9);

    vi.restoreAllMocks();
  });
});

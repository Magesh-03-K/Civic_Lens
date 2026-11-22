import 'server-only';
import { callGeminiWithRetry } from './gemini';
import {
  FixVerificationOutputSchema,
  FixVerificationOutput,
} from './schemas';

export const VERIFY_FIX_SYSTEM_INSTRUCTION = `You are a municipal verification specialist.
You are given two images:
1. BEFORE image: shows the original civic grievance or damage.
2. AFTER image: shows the claimed fix or work done by authorities.

Carefully inspect both images:
1. Is it the exact same physical location? Look for identical landmarks, building facades, road edges, wall markings, or utility poles.
2. Is the reported civic issue actually fixed and resolved?
3. What is your confidence rating (0.0 to 1.0)?

Output MUST be valid JSON matching this schema:
{
  "same_location": boolean,
  "issue_resolved": boolean,
  "confidence": number,
  "reason": string (one concise sentence explaining your observation),
  "ai_verdict": "resolved" | "needs_review"
}

Rule: "ai_verdict" MUST be "resolved" ONLY if same_location is true, issue_resolved is true, and confidence is at least 0.6. Otherwise, set "ai_verdict" to "needs_review".`;

export interface VerifyFixParams {
  beforeBuffer: Buffer | Uint8Array;
  beforeMimeType: string;
  afterBuffer: Buffer | Uint8Array;
  afterMimeType: string;
  isBeforeImage?: boolean;
}

/**
 * Compares before and after photos using Gemini vision to verify civic resolution.
 */
export async function verifyCivicFix(
  params: VerifyFixParams
): Promise<FixVerificationOutput> {
  const {
    beforeBuffer,
    beforeMimeType,
    afterBuffer,
    afterMimeType,
    isBeforeImage = true,
  } = params;

  // If before media was audio or video, automatic visual comparison is skipped
  if (!isBeforeImage) {
    return {
      same_location: false,
      issue_resolved: false,
      confidence: 0,
      reason: 'Original report media was not an image; visual comparison cannot be automated.',
      ai_verdict: 'needs_review',
    };
  }

  const beforeB64 = Buffer.from(beforeBuffer).toString('base64');
  const afterB64 = Buffer.from(afterBuffer).toString('base64');

  const contents = [
    { text: 'BEFORE photo (original report):' },
    {
      inlineData: {
        mimeType: beforeMimeType,
        data: beforeB64,
      },
    },
    { text: 'AFTER photo (completed work):' },
    {
      inlineData: {
        mimeType: afterMimeType,
        data: afterB64,
      },
    },
    {
      text: 'Compare both photos and return your verification verdict in the required JSON format.',
    },
  ];

  try {
    const rawText = await callGeminiWithRetry({
      contents,
      systemInstruction: VERIFY_FIX_SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      temperature: 0.1,
    });

    const cleaned = rawText.trim().replace(/^```json/i, '').replace(/```$/i, '').trim();
    const parsed = JSON.parse(cleaned);
    const validated = FixVerificationOutputSchema.safeParse(parsed);

    if (validated.success) {
      const data = validated.data;
      // Enforce verdict rule: resolved only if same_location && issue_resolved && confidence >= 0.6
      const isValidVerdict =
        data.same_location && data.issue_resolved && data.confidence >= 0.6;
      return {
        ...data,
        ai_verdict: isValidVerdict ? 'resolved' : 'needs_review',
      };
    }
  } catch (error) {
    console.error('Fix verification call failed:', error);
  }

  return {
    same_location: false,
    issue_resolved: false,
    confidence: 0.2,
    reason: 'Automated verification encountered an error; forwarded for manual review.',
    ai_verdict: 'needs_review',
  };
}

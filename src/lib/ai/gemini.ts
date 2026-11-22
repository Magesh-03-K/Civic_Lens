import 'server-only';
import { GoogleGenAI } from '@google/genai';

let geminiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (geminiClient) {
    return geminiClient;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is missing.');
  }

  geminiClient = new GoogleGenAI({ apiKey });
  return geminiClient;
}

export interface CallGeminiOptions {
  contents: unknown;
  systemInstruction?: string;
  model?: string;
  responseMimeType?: string;
  temperature?: number;
  retryOnJsonError?: boolean;
}

/**
 * Wraps Gemini API calls with a 25-second timeout, 404/429/503 retry after 1.5s,
 * and fallback model support.
 */
export async function callGeminiWithRetry(options: CallGeminiOptions): Promise<string> {
  const primaryModel = options.model || process.env.GEMINI_MODEL || 'gemini-flash-latest';
  const fallbackModel = process.env.GEMINI_FALLBACK_MODEL;

  const attemptCall = async (targetModel: string, contents: unknown): Promise<string> => {
    const ai = getGeminiClient();

    const requestConfig = {
      temperature: options.temperature ?? 0.2,
      responseMimeType: options.responseMimeType || 'application/json',
      ...(options.systemInstruction
        ? { systemInstruction: options.systemInstruction }
        : {}),
    };

    const callPromise = ai.models.generateContent({
      model: targetModel,
      contents: contents as string,
      config: requestConfig,
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Gemini API call timed out after 25s (${targetModel})`)),
        25000
      )
    );

    const response = await Promise.race([callPromise, timeoutPromise]);
    const text = response.text;
    if (!text) {
      throw new Error(`Empty response from Gemini model ${targetModel}`);
    }
    return text;
  };

  const isTransientError = (err: unknown): boolean => {
    if (!err || typeof err !== 'object') return false;
    const msg = String((err as { message?: string }).message || err).toLowerCase();
    const status = (err as { status?: number; code?: number }).status ||
      (err as { status?: number; code?: number }).code;
    return (
      status === 404 ||
      status === 429 ||
      status === 503 ||
      msg.includes('404') ||
      msg.includes('429') ||
      msg.includes('503') ||
      msg.includes('not found') ||
      msg.includes('quota') ||
      msg.includes('rate limit') ||
      msg.includes('overloaded') ||
      msg.includes('resource_exhausted') ||
      msg.includes('unavailable')
    );
  };

  try {
    return await attemptCall(primaryModel, options.contents);
  } catch (err) {
    if (isTransientError(err)) {
      // Retry once after 1.5 seconds
      await new Promise((r) => setTimeout(r, 1500));
      try {
        return await attemptCall(primaryModel, options.contents);
      } catch (retryErr) {
        if (fallbackModel && fallbackModel !== primaryModel) {
          // Attempt fallback model
          return await attemptCall(fallbackModel, options.contents);
        }
        throw retryErr;
      }
    }
    throw err;
  }
}

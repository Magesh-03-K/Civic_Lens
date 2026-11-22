import * as dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

// Load .env.local first, fallback to .env
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

function createTinyWavBase64(): string {
  const sampleRate = 16000;
  const numSamples = 1600; // 0.1s silence
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // Mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28); // ByteRate
  buffer.writeUInt16LE(2, 32); // BlockAlign
  buffer.writeUInt16LE(16, 34); // BitsPerSample
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  return buffer.toString('base64');
}

// 1x1 100% white JPEG base64
const TINY_JPEG_B64 =
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

async function main() {
  console.log('=== CivicLens Gemini Readiness & Model Checker ===\n');

  const apiKey = process.env.GEMINI_API_KEY;
  const configuredModel = process.env.GEMINI_MODEL || 'gemini-flash-latest';

  if (!apiKey) {
    console.error('ERROR: GEMINI_API_KEY is not defined in .env.local or .env');
    process.exit(1);
  }

  console.log(`API Key: Present (starts with: ${apiKey.slice(0, 7)}...)`);
  console.log(`Configured GEMINI_MODEL: ${configuredModel}\n`);

  const ai = new GoogleGenAI({ apiKey });

  // 1. List available models that support generateContent
  console.log('--- Step 1: Listing available Gemini models ---');
  try {
    const modelListResponse = await ai.models.list();
    const supportedModels: string[] = [];

    for await (const m of modelListResponse) {
      const actions = m.supportedActions || [];
      const isGenerateContent =
        actions.includes('generateContent') ||
        actions.length === 0 ||
        (m.name && m.name.includes('gemini'));
      if (isGenerateContent && m.name) {
        supportedModels.push(m.name.replace(/^models\//, ''));
      }
    }

    console.log(`Found ${supportedModels.length} models supporting generateContent:`);
    const flashModels = supportedModels.filter((name) => name.includes('flash'));
    console.log('Flash Models (Recommended for CivicLens):');
    flashModels.slice(0, 10).forEach((name) => console.log(`  - ${name}`));
  } catch (listErr) {
    console.warn('Note: Could not list models (may require different permissions):', listErr);
  }

  // 2. Test configured model with tiny image
  console.log(`\n--- Step 2: Testing image input on "${configuredModel}" ---`);
  try {
    const imageResponse = await ai.models.generateContent({
      model: configuredModel,
      contents: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: TINY_JPEG_B64,
          },
        },
        { text: 'Describe what you see in this image in 5 words or fewer.' },
      ],
    });
    console.log('✓ Image test successful!');
    console.log(`  Response: "${imageResponse.text?.trim()}"`);
  } catch (imgErr) {
    console.error('✗ Image test failed:', imgErr);
  }

  // 3. Test configured model with tiny WAV audio
  console.log(`\n--- Step 3: Testing audio input on "${configuredModel}" ---`);
  try {
    const audioB64 = createTinyWavBase64();
    const audioResponse = await ai.models.generateContent({
      model: configuredModel,
      contents: [
        {
          inlineData: {
            mimeType: 'audio/wav',
            data: audioB64,
          },
        },
        { text: 'Is there any spoken audio in this sound clip? Answer in 5 words or fewer.' },
      ],
    });
    console.log('✓ Audio test successful!');
    console.log(`  Response: "${audioResponse.text?.trim()}"`);
  } catch (audErr) {
    console.error('✗ Audio test failed:', audErr);
  }

  console.log('\n=== Gemini Verification Complete ===');
}

main().catch((err) => {
  console.error('Fatal error during Gemini check:', err);
  process.exit(1);
});

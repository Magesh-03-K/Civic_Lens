import { NextResponse } from 'next/server';
import { validateEnv } from '@/lib/env';

export const dynamic = 'force-dynamic';

export async function GET() {
  const envValidation = validateEnv();

  return NextResponse.json({
    ok: true,
    service: 'CivicLens API',
    milestone: 'M0',
    timestamp: new Date().toISOString(),
    environmentReady: envValidation.success,
    missingEnvKeys: envValidation.success
      ? []
      : envValidation.error.issues.map((i) => i.path.join('.')),
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkPasscode, createAuthorityToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const LoginSchema = z.object({
  passcode: z.string().min(1, 'Passcode is required'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: 'Passcode is required.' }, { status: 400 });
    }

    const { passcode } = parsed.data;

    if (!checkPasscode(passcode)) {
      return NextResponse.json({ ok: false, error: 'Invalid authority passcode.' }, { status: 401 });
    }

    const token = createAuthorityToken();
    const response = NextResponse.json({ ok: true, message: 'Authenticated successfully.' });

    const isProd = process.env.NODE_ENV === 'production';

    // 8-hour session cookie
    response.cookies.set('cl_auth', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      path: '/',
      maxAge: 8 * 60 * 60,
    });

    return response;
  } catch (err) {
    console.error('Error during authority login:', err);
    return NextResponse.json({ ok: false, error: 'Authentication service error.' }, { status: 500 });
  }
}

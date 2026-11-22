import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  const response = NextResponse.json({ ok: true, message: 'Logged out successfully.' });
  response.cookies.delete('cl_auth');
  return response;
}

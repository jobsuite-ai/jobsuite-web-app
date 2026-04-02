import { NextResponse } from 'next/server';

import { verifyRs256Jwt } from '@/lib/jwt-rs256-verify';

export const runtime = 'nodejs';

/**
 * Verifies invite / password-reset RS256 JWTs using the public key (same pair as job-engine).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = body?.token as string | undefined;
    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    const payload = await verifyRs256Jwt(token);
    return NextResponse.json({ payload });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Verification failed';
    return NextResponse.json({ error: `Invalid token: ${message}` }, { status: 401 });
  }
}

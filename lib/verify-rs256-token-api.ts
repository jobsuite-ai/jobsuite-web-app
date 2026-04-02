/**
 * Client-side helper: verify RS256 JWT via server route (supports SPKI and PKCS#1 public PEM).
 */
export async function verifyRs256TokenViaApi(
  token: string
): Promise<Record<string, unknown>> {
  const res = await fetch('/api/auth/verify-rs256-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });

  let data: { error?: string; payload?: Record<string, unknown> };
  try {
    data = await res.json();
  } catch {
    throw new Error('Invalid response from server');
  }

  if (!res.ok) {
    throw new Error(
      typeof data.error === 'string' ? data.error : 'Invalid token'
    );
  }

  if (!data.payload || typeof data.payload !== 'object') {
    throw new Error('Invalid response from server');
  }

  return data.payload;
}

import { Buffer } from 'buffer';
import { jwtVerify, type JWTPayload } from 'jose';
import { createPublicKey, type KeyObject } from 'node:crypto';

function looksLikePem(s: string): boolean {
  return s.includes('-----BEGIN');
}

/** OpenSSL PEM body: only [A-Za-z0-9+/=_-] (plus optional whitespace, stripped before this). */
function looksLikeBarePemBase64Body(s: string): boolean {
  return s.length >= 32 && /^[A-Za-z0-9+/=_-]+$/.test(s);
}

/**
 * Re-wrap what you get if you copied only the middle of `openssl rsa -pubout` output
 * (base64 between the BEGIN/END lines, no headers).
 */
function wrapBareSpkiBase64AsPem(b64NoWhitespace: string): string {
  const lines = b64NoWhitespace.match(/.{1,64}/g) ?? [b64NoWhitespace];
  return `-----BEGIN PUBLIC KEY-----\n${lines.join('\n')}\n-----END PUBLIC KEY-----`;
}

/**
 * Build a Node KeyObject from assorted RSA public key encodings (aligned with job-engine
 * private-key parsing: PEM, JSON-wrapped, base64-of-PEM, or raw DER).
 */
export function createPublicKeyFromMaterial(raw: string): KeyObject {
  raw = raw.trim();
  if (!raw) {
    throw new Error('RSA public key material is empty');
  }

  if (looksLikePem(raw)) {
    return createPublicKey(raw);
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (typeof parsed.public_key === 'string' && parsed.public_key.trim()) {
      return createPublicKeyFromMaterial(parsed.public_key);
    }
  } catch {
    /* not JSON */
  }

  const b64Clean = raw.replace(/\s+/g, '');

  let fromB64: Buffer;
  try {
    fromB64 = Buffer.from(b64Clean.length > 0 ? b64Clean : raw, 'base64');
  } catch {
    fromB64 = Buffer.alloc(0);
  }

  if (fromB64.length > 0) {
    const asUtf8 = fromB64.toString('utf-8');
    if (looksLikePem(asUtf8)) {
      return createPublicKey(asUtf8.trim());
    }

    try {
      return createPublicKey({ key: fromB64, format: 'der', type: 'spki' });
    } catch {
      try {
        return createPublicKey({ key: fromB64, format: 'der', type: 'pkcs1' });
      } catch {
        /* e.g. only the PEM body was pasted — wrap as SPKI PEM (openssl rsa -pubout) */
        if (looksLikeBarePemBase64Body(b64Clean)) {
          try {
            return createPublicKey(wrapBareSpkiBase64AsPem(b64Clean));
          } catch {
            /* fall through */
          }
        }
      }
    }
  } else if (looksLikeBarePemBase64Body(b64Clean)) {
    try {
      return createPublicKey(wrapBareSpkiBase64AsPem(b64Clean));
    } catch {
      /* fall through */
    }
  }

  if (/^[0-9a-fA-F]+$/.test(raw) && raw.length % 2 === 0) {
    const buf = Buffer.from(raw, 'hex');
    try {
      return createPublicKey({ key: buf, format: 'der', type: 'spki' });
    } catch {
      return createPublicKey({ key: buf, format: 'der', type: 'pkcs1' });
    }
  }

  throw new Error(
    'Unrecognized RSA public key format. Use PEM (lines starting with -----BEGIN), ' +
      'base64 of that PEM, JSON with a "public_key" field, or base64/hex DER (SPKI or PKCS#1).'
  );
}

/**
 * Reads JWT_PUBLIC_KEY_BASE64 or NEXT_PUBLIC_JWT_PUBLIC_KEY_BASE64.
 * Values may be: raw PEM, base64-encoded PEM, JSON, or DER (base64/hex) without PEM headers.
 */
export function getJwtPublicKeyFromEnv(): KeyObject {
  const raw =
    process.env.JWT_PUBLIC_KEY_BASE64?.trim() ||
    process.env.NEXT_PUBLIC_JWT_PUBLIC_KEY_BASE64?.trim();
  if (!raw) {
    throw new Error(
      'JWT public key not configured: set JWT_PUBLIC_KEY_BASE64 (or NEXT_PUBLIC_JWT_PUBLIC_KEY_BASE64)'
    );
  }
  return createPublicKeyFromMaterial(raw);
}

export async function verifyRs256Jwt(token: string): Promise<JWTPayload> {
  const publicKey = getJwtPublicKeyFromEnv();
  const { payload } = await jwtVerify(token, publicKey, {
    algorithms: ['RS256'],
  });
  return payload;
}

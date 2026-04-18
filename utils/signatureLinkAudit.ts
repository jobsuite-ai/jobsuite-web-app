/**
 * Pick a signature link hash from audit-trail `signature_links` only (read-only).
 * Mirrors job-engine outreach_message_service: prefer SIGNED, else first active;
 * when recipientEmail is set, prefer links for that client_email first.
 */
export interface SignatureLinkLike {
    signature_hash: string;
    client_email?: string;
    status: string;
}

const INVALID = new Set(['REVOKED', 'EXPIRED']);

function normEmail(e: string | undefined | null): string {
    return (e || '').trim().toLowerCase();
}

export function pickSignatureHashFromAudit(
    links: SignatureLinkLike[] | undefined | null,
    recipientEmail: string | null | undefined
): string | null {
    if (!links?.length) return null;

    const active = links.filter((l) => l?.signature_hash && !INVALID.has(l.status));
    if (active.length === 0) return null;

    const rec = normEmail(recipientEmail || undefined);
    const pool =
        rec.length > 0
            ? active.filter((l) => normEmail(l.client_email) === rec)
            : active;
    const use = pool.length > 0 ? pool : active;

    const signed = use.find((l) => l.status === 'SIGNED');
    if (signed) return signed.signature_hash;

    return use[0].signature_hash;
}

export function signingPageBaseUrl(): string {
    if (typeof window !== 'undefined' && window.location?.origin) {
        return window.location.origin;
    }
    return 'https://jobsuite.app';
}

export function buildSignaturePageUrl(signatureHash: string): string {
    const base = signingPageBaseUrl().replace(/\/$/, '');
    return `${base}/sign/${signatureHash}`;
}

'use client';

import { Suspense, useEffect, useState } from 'react';

import { Alert, Center, Container, Loader, Stack, Text } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useParams, useSearchParams } from 'next/navigation';

import SignaturePageLayout, {
    SignatureLinkInfo,
} from '@/components/EstimateDetails/signature/SignaturePageLayout';
import { logToCloudWatch } from '@/public/logger';

function SignaturePageContent() {
    const params = useParams();
    const searchParams = useSearchParams();
    const signatureHash = params.signature_hash as string;
    const payRaw = searchParams.get('pay');
    const payIntent =
        payRaw === 'balance' || payRaw === 'deposit' ? payRaw : null;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [linkInfo, setLinkInfo] = useState<SignatureLinkInfo | null>(null);
    const [signed, setSigned] = useState(false);
    const [signatureModalOpened, setSignatureModalOpened] = useState(false);

    useEffect(() => {
        if (!signatureHash) return;

        const fetchLinkInfo = async () => {
            try {
                setLoading(true);
                setError(null);
                const accessToken = localStorage.getItem('access_token');
                const headers: Record<string, string> = {
                };
                if (accessToken) {
                    headers.Authorization = `Bearer ${accessToken}`;
                }
                const response = await fetch(`/api/signature/${signatureHash}`, {
                    method: 'GET',
                    headers,
                });

                if (!response.ok) {
                    const errText = await response.text().catch(() => '');
                    const errBody = (() => {
                        try {
                            return errText ? JSON.parse(errText) : {};
                        } catch {
                            return {};
                        }
                    })();
                    const detail = errBody?.detail || errBody?.error || errText;
                    if (response.status === 400 && detail) {
                        setError(detail);
                        await logToCloudWatch(
                            '[SIGNATURE_FLOW_ALERT] Invalid signature link. ' +
                                `hash=${signatureHash}, status=400`
                        );
                    } else if (response.status === 404) {
                        setError('This signature link is invalid or has expired.');
                        await logToCloudWatch(
                            '[SIGNATURE_FLOW_ALERT] Signature link not found. ' +
                                `hash=${signatureHash}, status=404`
                        );
                    } else {
                        setError(
                            detail || 'Failed to load signature page. Please try again later.'
                        );
                        await logToCloudWatch(
                            '[SIGNATURE_FLOW_ALERT] Failed to load. ' +
                                `hash=${signatureHash}, status=${response.status}`
                        );
                    }
                    return;
                }

                const raw = await response.text();
                const data = raw ? JSON.parse(raw) : null;
                setLinkInfo(data);
                await logToCloudWatch(
                    '[SIGNATURE_FLOW_EVENT] Signature page loaded. ' +
                        `hash=${signatureHash}, status=${data.status}`
                );

                const hasValidSignatures =
                    data.signatures && data.signatures.length > 0;
                const isLinkSigned = data.status === 'SIGNED';
                const isLinkRevoked = data.status === 'REVOKED';
                if (!isLinkRevoked && isLinkSigned && hasValidSignatures) {
                    setSigned(true);
                }
            } catch (err: unknown) {
                const errorMessage =
                    err instanceof Error
                        ? err.message
                        : 'An error occurred while loading the signature page.';
                setError(errorMessage);
                await logToCloudWatch(
                    '[SIGNATURE_FLOW_ALERT] Error fetching. ' +
                        `hash=${signatureHash}, error=${String(err)}`
                );
            } finally {
                setLoading(false);
            }
        };

        fetchLinkInfo();
    }, [signatureHash]);

    if (loading) {
        return (
            <Center style={{ minHeight: '100vh' }}>
                <Stack align="center" gap="md">
                    <Loader size="xl" />
                    <Text c="dimmed">Loading signature page...</Text>
                </Stack>
            </Center>
        );
    }

    if (error) {
        return (
            <Container size="md" py="xl">
                <Alert
                  icon={<IconAlertCircle size={16} />}
                  title="Error"
                  color="red"
                  variant="light"
                >
                  {error}
                </Alert>
            </Container>
        );
    }

    if (!linkInfo) {
        return null;
    }

    return (
        <SignaturePageLayout
          linkInfo={linkInfo}
          signatureHash={signatureHash}
          payIntent={payIntent}
          setLinkInfo={setLinkInfo}
          signed={signed}
          setSigned={setSigned}
          signatureModalOpened={signatureModalOpened}
          setSignatureModalOpened={setSignatureModalOpened}
        />
    );
}

export default function SignaturePage() {
    return (
        <Suspense
          fallback={
            <Center style={{ minHeight: '100vh' }}>
                <Stack align="center" gap="md">
                    <Loader size="xl" />
                    <Text c="dimmed">Loading signature page...</Text>
                </Stack>
            </Center>
            }
        >
            <SignaturePageContent />
        </Suspense>
    );
}

'use client';

import { useEffect, useState } from 'react';

import { Alert, Center, Container, Loader, Stack, Text } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';

import SignaturePageLayout, {
    SignatureLinkInfo,
} from '@/components/EstimateDetails/signature/SignaturePageLayout';

const SIGNATURE_PREVIEW_STORAGE_KEY = 'signature-page-preview';

export default function SignaturePreviewPage() {
    const [linkInfo, setLinkInfo] = useState<SignatureLinkInfo | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        try {
            const raw = typeof window !== 'undefined'
                ? window.sessionStorage.getItem(SIGNATURE_PREVIEW_STORAGE_KEY)
                : null;
            if (!raw) {
                setError(
                    'Preview is opened from Settings. Go to Settings → Signature page and click "Preview in new tab".'
                );
                return;
            }
            const data = JSON.parse(raw) as SignatureLinkInfo;
            setLinkInfo(data);
        } catch {
            setError('Invalid preview data. Try opening preview again from Settings.');
        }
    }, []);

    if (error) {
        return (
            <Center style={{ minHeight: '100vh' }}>
                <Container size="sm">
                    <Alert
                      icon={<IconAlertCircle size={16} />}
                      title="Preview unavailable"
                      color="blue"
                      variant="light"
                    >
                        {error}
                    </Alert>
                </Container>
            </Center>
        );
    }

    if (!linkInfo) {
        return (
            <Center style={{ minHeight: '100vh' }}>
                <Stack align="center" gap="md">
                    <Loader size="xl" />
                    <Text c="dimmed">Loading preview...</Text>
                </Stack>
            </Center>
        );
    }

    return (
        <SignaturePageLayout
          linkInfo={linkInfo}
          signatureHash="preview"
          isPreviewMode
        />
    );
}

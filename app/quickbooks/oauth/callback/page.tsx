'use client';

import { useEffect, useState } from 'react';

import {
  Alert,
  Button,
  Center,
  Container,
  Loader,
  Stack,
  Title,
} from '@mantine/core';
import { IconCheck, IconX } from '@tabler/icons-react';
import { useSearchParams, useRouter } from 'next/navigation';

import { getApiBaseUrl } from '@/app/api/utils/serviceAuth';

export default function QuickBooksCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading',
  );
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const realmId = searchParams.get('realmId');
    const error = searchParams.get('error');

    if (error) {
      setStatus('error');
      setMessage(`QuickBooks authorization failed: ${error}`);
      return;
    }

    if (!code || !state) {
      setStatus('error');
      setMessage('Missing required OAuth parameters');
      return;
    }

    // Exchange code for tokens via backend API
    const exchangeCode = async () => {
      try {
        const apiBaseUrl = getApiBaseUrl();
        const response = await fetch(
          `${apiBaseUrl}/api/v1/quickbooks/oauth/callback`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              code,
              state,
              realmId: realmId || null,
            }),
          },
        );

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ detail: 'Unknown error' }));
          throw new Error(errorData.detail || 'Failed to connect QuickBooks');
        }

        await response.json();
        setStatus('success');
        setMessage('Successfully connected to QuickBooks!');
      } catch (err: any) {
        setStatus('error');
        setMessage(err.message || 'Failed to connect QuickBooks');
      }
    };

    exchangeCode();
  }, [searchParams]);

  const handleClose = () => {
    // Redirect to settings page or close the window if opened in popup
    if (window.opener) {
      window.close();
    } else {
      router.push('/settings');
    }
  };

  return (
    <Container
      size="sm"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}
    >
      <Stack gap="xl" style={{ width: '100%', maxWidth: '500px' }}>
        {status === 'loading' && (
          <Center>
            <Stack align="center" gap="lg" style={{ textAlign: 'center' }}>
              <Loader size="xl" />
              <Title order={2} c="dimmed">Connecting to QuickBooks...</Title>
              <p
                style={{
                  color: 'var(--mantine-color-dimmed)',
                  fontSize: '0.95rem',
                  margin: 0,
                }}
              >
                Please wait while we complete the connection.
              </p>
            </Stack>
          </Center>
        )}

        {status === 'success' && (
          <Alert
            color="green"
            variant="light"
            radius="md"
            style={{ padding: '1.5rem' }}
          >
            <Stack gap="lg" align="center">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  justifyContent: 'center',
                }}
              >
                <IconCheck size={24} style={{ color: 'var(--mantine-color-green-6)' }} />
                <p
                  style={{
                    color: 'var(--mantine-color-green-6)',
                    textAlign: 'center',
                    margin: 0,
                    fontSize: '1.25rem',
                    fontWeight: 600,
                  }}
                >
                  Successfully connected to QuickBooks!
                </p>
              </div>
              <Button
                onClick={handleClose}
                fullWidth
                size="md"
                style={{ marginTop: '0.5rem' }}
              >
                Continue to Settings
              </Button>
            </Stack>
          </Alert>
        )}

        {status === 'error' && (
          <Alert
            icon={<IconX size={20} />}
            title="Connection Failed"
            color="red"
            variant="light"
            radius="md"
            style={{ padding: '1.5rem' }}
          >
            <Stack gap="lg" mt="md">
              <p
                style={{
                  color: 'var(--mantine-color-dimmed)',
                  textAlign: 'center',
                  margin: 0,
                  fontSize: '0.95rem',
                }}
              >
                {message}
              </p>
              <Button
                onClick={handleClose}
                fullWidth
                variant="light"
                size="md"
                style={{ marginTop: '0.5rem' }}
              >
                Go Back to Settings
              </Button>
            </Stack>
          </Alert>
        )}
      </Stack>
    </Container>
  );
}

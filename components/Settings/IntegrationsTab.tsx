'use client';

import { useEffect, useState } from 'react';

import {
    Button,
    Card,
    Group,
    Modal,
    Stack,
    Text,
    Title,
    Loader,
    Alert,
    Badge,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconX, IconExternalLink } from '@tabler/icons-react';

import { getApiHeaders } from '@/app/utils/apiClient';

interface QuickBooksStatus {
    connected: boolean;
    realm_id?: string;
    connected_at?: string;
    token_expires_at?: string;
    token_expired?: boolean;
    token_needs_refresh?: boolean;
    company_info?: {
        company_name: string;
        realm_id: string;
    };
    message?: string;
}

export default function IntegrationsTab() {
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState(false);
    const [disconnecting, setDisconnecting] = useState(false);
    const [status, setStatus] = useState<QuickBooksStatus | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showDisconnectModal, setShowDisconnectModal] = useState(false);

    useEffect(() => {
        loadStatus();
    }, []);

    const loadStatus = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch('/api/quickbooks/status', {
                method: 'GET',
                headers: getApiHeaders(),
            });

            if (!response.ok) {
                if (response.status === 404) {
                    // No connection exists yet, that's okay
                    setStatus({ connected: false });
                    return;
                }
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to load QuickBooks status');
            }

            const statusData: QuickBooksStatus = await response.json();
            setStatus(statusData);
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('Error loading QuickBooks status:', err);
            setError(
                err instanceof Error ? err.message : 'Failed to load QuickBooks status'
            );
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = async () => {
        try {
            setConnecting(true);
            setError(null);

            const response = await fetch('/api/quickbooks/connect', {
                method: 'GET',
                headers: getApiHeaders(),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to get authorization URL');
            }

            const data = await response.json();
            const authUrl = data.authorization_url;

            if (authUrl) {
                // Open QuickBooks OAuth page in new window
                const width = 600;
                const height = 700;
                const left = window.screen.width / 2 - width / 2;
                const top = window.screen.height / 2 - height / 2;

                const popup = window.open(
                    authUrl,
                    'QuickBooks OAuth',
                    `width=${width},height=${height},left=${left},top=${top}`
                );

                if (popup) {
                    // Poll for window close or check for success
                    const checkClosed = setInterval(() => {
                        if (popup.closed) {
                            clearInterval(checkClosed);
                            // Reload status after window closes
                            setTimeout(() => {
                                loadStatus();
                            }, 1000);
                        }
                    }, 500);

                    // Also listen for message from popup (if callback page sends it)
                    window.addEventListener('message', (event) => {
                        if (event.data === 'quickbooks-connected') {
                            clearInterval(checkClosed);
                            popup.close();
                            loadStatus();
                            notifications.show({
                                title: 'Success',
                                message: 'QuickBooks connected successfully',
                                color: 'green',
                                icon: <IconCheck size={16} />,
                            });
                        }
                    });
                }
            }
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('Error connecting QuickBooks:', err);
            const errorMessage =
                err instanceof Error ? err.message : 'Failed to connect QuickBooks';
            setError(errorMessage);
            notifications.show({
                title: 'Error',
                message: errorMessage,
                color: 'red',
                icon: <IconX size={16} />,
            });
        } finally {
            setConnecting(false);
        }
    };

    const handleDisconnect = async () => {
        try {
            setDisconnecting(true);
            setError(null);

            const response = await fetch('/api/quickbooks/disconnect', {
                method: 'POST',
                headers: getApiHeaders(),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to disconnect QuickBooks');
            }

            await response.json();

            notifications.show({
                title: 'Success',
                message: 'QuickBooks disconnected successfully',
                color: 'green',
                icon: <IconCheck size={16} />,
            });

            // Reload status
            await loadStatus();
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('Error disconnecting QuickBooks:', err);
            const errorMessage =
                err instanceof Error ? err.message : 'Failed to disconnect QuickBooks';
            setError(errorMessage);
            notifications.show({
                title: 'Error',
                message: errorMessage,
                color: 'red',
                icon: <IconX size={16} />,
            });
        } finally {
            setDisconnecting(false);
        }
    };

    return (
        <Card shadow="sm" padding="lg" withBorder>
            {loading ? (
                <Stack align="center" gap="md">
                    <Loader size="md" />
                    <Text c="dimmed">Loading QuickBooks status...</Text>
                </Stack>
            ) : (
                <Stack gap="md">
                    <Title order={3}>QuickBooks Integration</Title>

                    {error && (
                        <Alert color="red" title="Error">
                            {error}
                        </Alert>
                    )}

                    {status?.connected ? (
                        <Stack gap="md">
                            <Group justify="space-between" align="center">
                                <Badge color="green" size="lg">
                                    Connected
                                </Badge>
                                <Button
                                  color="red"
                                  variant="outline"
                                  onClick={() => setShowDisconnectModal(true)}
                                  loading={disconnecting}
                                >
                                  Disconnect
                                </Button>
                            </Group>

                            {status.company_info && (
                                <div>
                                    <Text size="sm" fw={500} mb="xs">
                                        Company Name:
                                    </Text>
                                    <Text size="sm" c="dimmed">
                                        {status.company_info.company_name}
                                    </Text>
                                </div>
                            )}

                            {status.realm_id && (
                                <div>
                                    <Text size="sm" fw={500} mb="xs">
                                        Realm ID:
                                    </Text>
                                    <Text size="sm" c="dimmed" style={{ fontFamily: 'monospace' }}>
                                        {status.realm_id}
                                    </Text>
                                </div>
                            )}

                            {status.connected_at && (
                                <div>
                                    <Text size="sm" fw={500} mb="xs">
                                        Connected At:
                                    </Text>
                                    <Text size="sm" c="dimmed">
                                        {new Date(status.connected_at).toLocaleString()}
                                    </Text>
                                </div>
                            )}

                            {status.token_expires_at && (
                                <div>
                                    <Text size="sm" fw={500} mb="xs">
                                        Token Expires At:
                                    </Text>
                                    <Text size="sm" c={status.token_expired ? 'red' : 'dimmed'}>
                                        {new Date(status.token_expires_at).toLocaleString()}
                                        {status.token_expired && ' (Expired)'}
                                    </Text>
                                </div>
                            )}

                            {status.token_needs_refresh && !status.token_expired && (
                                <Alert color="yellow" title="Token Refresh Needed">
                                    Your QuickBooks token needs to be refreshed.
                                    The connection will be refreshed automatically when needed.
                                </Alert>
                            )}
                        </Stack>
                    ) : (
                        <Stack gap="md">
                            <Badge color="gray" size="lg">
                                Not Connected
                            </Badge>
                            <Text size="sm" c="dimmed">
                                Connect your QuickBooks account to sync time
                                entries and manage customer data.
                            </Text>
                            <Button
                              onClick={handleConnect}
                              loading={connecting}
                              leftSection={<IconExternalLink size={16} />}
                            >
                                Connect QuickBooks
                            </Button>
                        </Stack>
                    )}
                </Stack>
            )}

      {/* Disconnect Confirmation Modal */}
      <Modal
        opened={showDisconnectModal}
        onClose={() => setShowDisconnectModal(false)}
        title="Disconnect QuickBooks?"
        centered
      >
        <Stack gap="md">
          <Text>
            Are you sure you want to disconnect QuickBooks? This will stop time
            entry syncing.
          </Text>
          <Group justify="flex-end" gap="sm">
            <Button
              variant="outline"
              onClick={() => setShowDisconnectModal(false)}
              disabled={disconnecting}
            >
              Cancel
            </Button>
            <Button
              color="red"
              onClick={async () => {
                setShowDisconnectModal(false);
                await handleDisconnect();
              }}
              loading={disconnecting}
            >
              Disconnect
            </Button>
          </Group>
        </Stack>
      </Modal>
        </Card>
    );
}

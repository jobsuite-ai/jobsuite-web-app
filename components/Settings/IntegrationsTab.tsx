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
    TextInput,
    Switch,
    ScrollArea,
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
    service_item_names?: Record<string, string | null>;
    auto_create_customers_and_estimates?: boolean;
    message?: string;
}

export default function IntegrationsTab() {
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState(false);
    const [disconnecting, setDisconnecting] = useState(false);
    const [status, setStatus] = useState<QuickBooksStatus | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showDisconnectModal, setShowDisconnectModal] = useState(false);
    const [serviceItemNames, setServiceItemNames] = useState<Record<string, string>>({
        INTERIOR: '',
        EXTERIOR: '',
        BOTH: '',
    });
    const [autoCreate, setAutoCreate] = useState<boolean>(false);
    const [savingSettings, setSavingSettings] = useState<boolean>(false);
    const [showBatchSyncModal, setShowBatchSyncModal] = useState(false);
    const [accountingNeededEstimates, setAccountingNeededEstimates] = useState<
        Array<{ id: string; title?: string; client_name?: string }>
    >([]);
    const [syncingEstimates, setSyncingEstimates] = useState<boolean>(false);

    useEffect(() => {
        loadStatus();
    }, []);

    // Check for Accounting Needed estimates when auto-create is enabled on load
    useEffect(() => {
        const checkForPendingEstimates = async () => {
            if (autoCreate && status?.connected) {
                const estimates = await checkAccountingNeededEstimates();
                if (estimates.length > 0) {
                    // Auto-create is enabled but there are still Accounting Needed estimates
                    // This shouldn't happen normally, but show a notification
                    notifications.show({
                        title: 'Pending Estimates',
                        message: `You have ${estimates.length} estimate(s) in Accounting Needed status. Consider syncing them.`,
                        color: 'yellow',
                        autoClose: 10000,
                    });
                }
            }
        };

        if (status && !loading) {
            checkForPendingEstimates();
        }
    }, [autoCreate, status, loading]);

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
            setAutoCreate(statusData.auto_create_customers_and_estimates || false);
            if (statusData.service_item_names) {
                setServiceItemNames({
                    INTERIOR: statusData.service_item_names.INTERIOR || '',
                    EXTERIOR: statusData.service_item_names.EXTERIOR || '',
                    BOTH: statusData.service_item_names.BOTH || '',
                });
            }
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

    const checkAccountingNeededEstimates = async (): Promise<
        Array<{ id: string; title?: string; client_name?: string }>
    > => {
        try {
            const response = await fetch('/api/estimates?status=ACCOUNTING_NEEDED', {
                method: 'GET',
                headers: getApiHeaders(),
            });

            if (!response.ok) {
                // eslint-disable-next-line no-console
                console.error('Failed to fetch estimates:', response.status, response.statusText);
                return [];
            }

            const data = await response.json();
            // API returns estimates wrapped in Items property
            const estimates = data.Items || data || [];
            // eslint-disable-next-line no-console
            console.log('Accounting Needed estimates response:', { data, estimates, count: estimates.length });
            return Array.isArray(estimates) ? estimates : [];
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('Error checking accounting needed estimates:', err);
            return [];
        }
    };

    const handleAutoCreateToggle = async (newValue: boolean) => {
        // If enabling auto-create, check for Accounting Needed estimates
        if (newValue && !autoCreate) {
            try {
                const estimates = await checkAccountingNeededEstimates();
                // eslint-disable-next-line no-console
                console.log('Found Accounting Needed estimates:', estimates.length);
                if (estimates.length > 0) {
                    setAccountingNeededEstimates(estimates);
                    setShowBatchSyncModal(true);
                    // Don't update autoCreate yet - wait for user decision
                    return;
                }
            } catch (err) {
                // eslint-disable-next-line no-console
                console.error('Error checking for Accounting Needed estimates:', err);
                // If check fails, still allow enabling but show warning
                notifications.show({
                    title: 'Warning',
                    message: 'Could not check for existing Accounting Needed estimates. Please verify manually.',
                    color: 'yellow',
                });
            }
        }
        // If disabling or no estimates to sync, update immediately
        setAutoCreate(newValue);
    };

    const handleBatchSync = async () => {
        try {
            setSyncingEstimates(true);
            setError(null);

            const response = await fetch('/api/estimates/batch-sync-accounting-needed', {
                method: 'POST',
                headers: getApiHeaders(),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to sync estimates');
            }

            const result = await response.json();

            // Save auto-create setting to backend
            const autoCreateResponse = await fetch('/api/quickbooks/settings/auto-create', {
                method: 'PUT',
                headers: {
                    ...getApiHeaders(),
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    auto_create_customers_and_estimates: true,
                }),
            });

            if (!autoCreateResponse.ok) {
                const errorData = await autoCreateResponse.json();
                throw new Error(errorData.message || 'Failed to update auto-create setting');
            }

            notifications.show({
                title: 'Success',
                message: `Successfully synced ${result.successful} estimate(s) to QuickBooks ` +
                    'and enabled auto-create',
                color: 'green',
                icon: <IconCheck size={16} />,
            });

            // Close modal and enable auto-create
            setShowBatchSyncModal(false);
            setAutoCreate(true);
            setAccountingNeededEstimates([]);

            // Reload status to refresh data
            await loadStatus();

            // Trigger event to notify other components (like JobsList) that the setting changed
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('quickbooks-auto-create-changed', {
                    detail: { enabled: true },
                }));
            }
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('Error syncing estimates:', err);
            const errorMessage =
                err instanceof Error ? err.message : 'Failed to sync estimates';
            setError(errorMessage);
            notifications.show({
                title: 'Error',
                message: errorMessage,
                color: 'red',
                icon: <IconX size={16} />,
            });
        } finally {
            setSyncingEstimates(false);
        }
    };

    const handleCancelBatchSync = () => {
        setShowBatchSyncModal(false);
        setAccountingNeededEstimates([]);
        // Don't enable auto-create
        setAutoCreate(false);
    };

    const handleSaveAllSettings = async () => {
        try {
            setSavingSettings(true);
            setError(null);

            // Validate: if auto-create is enabled, all service item names must be filled
            if (autoCreate) {
                const missingFields = ['INTERIOR', 'EXTERIOR', 'BOTH'].filter(
                    (type) => !serviceItemNames[type] || serviceItemNames[type].trim() === ''
                );
                if (missingFields.length > 0) {
                    throw new Error(
                        `Please fill in all service item names. Missing: ${missingFields.join(', ')}`
                    );
                }
            }

            // Save auto-create setting
            const autoCreateResponse = await fetch('/api/quickbooks/settings/auto-create', {
                method: 'PUT',
                headers: {
                    ...getApiHeaders(),
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    auto_create_customers_and_estimates: autoCreate,
                }),
            });

            if (!autoCreateResponse.ok) {
                const errorData = await autoCreateResponse.json();
                throw new Error(errorData.message || 'Failed to update auto-create setting');
            }

            // Save all service item names
            const savePromises = ['INTERIOR', 'EXTERIOR', 'BOTH'].map((estimateType) =>
                fetch('/api/quickbooks/settings/service-item-name', {
                    method: 'PUT',
                    headers: {
                        ...getApiHeaders(),
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        estimate_type: estimateType,
                        service_item_name: serviceItemNames[estimateType] || null,
                    }),
                })
            );

            const responses = await Promise.all(savePromises);
            const errors = responses
                .map((response, index) => {
                    if (!response.ok) {
                        return `Failed to save ${['INTERIOR', 'EXTERIOR', 'BOTH'][index]}`;
                    }
                    return null;
                })
                .filter(Boolean);

            if (errors.length > 0) {
                throw new Error(errors.join(', '));
            }

            notifications.show({
                title: 'Success',
                message: 'QuickBooks settings saved successfully',
                color: 'green',
                icon: <IconCheck size={16} />,
            });

            // Reload status
            await loadStatus();

            // Trigger event to notify other components (like JobsList) that the setting changed
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('quickbooks-auto-create-changed', {
                    detail: { enabled: autoCreate },
                }));
            }
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('Error saving settings:', err);
            const errorMessage =
                err instanceof Error ? err.message : 'Failed to save settings';
            setError(errorMessage);
            notifications.show({
                title: 'Error',
                message: errorMessage,
                color: 'red',
                icon: <IconX size={16} />,
            });
        } finally {
            setSavingSettings(false);
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
                        <>
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

                        <Card shadow="sm" padding="lg" withBorder>
                            <Stack gap="md">
                                <Title order={4}>Auto-Create Settings</Title>

                                <Group justify="space-between" align="flex-start">
                                    <div style={{ flex: 1 }}>
                                        <Text size="sm" fw={500} mb="xs">
                                            Auto-Create Customers and Estimates:
                                        </Text>
                                        <Text size="xs" c="dimmed">
                                            When enabled, customers and estimates are automatically
                                            created in QuickBooks when an estimate is accepted. If
                                            disabled, estimates will skip QuickBooks sync and go to
                                            Accounting Needed status.
                                        </Text>
                                    </div>
                                    <Switch
                                      checked={autoCreate}
                                      onChange={(e) => {
                                            handleAutoCreateToggle(e.currentTarget.checked);
                                        }}
                                      disabled={savingSettings}
                                    />
                                </Group>

                                {autoCreate && (
                                    <div>
                                        <Text size="sm" fw={500} mb="xs">
                                            Service Item Names by Estimate Type:
                                        </Text>
                                        <Text size="xs" c="dimmed" mb="md">
                                            Configure QuickBooks service item names for each
                                            estimate type. This should match the exact name of a
                                            Service item in QuickBooks. For nested items
                                            (sub-items), use the format &apos;Category:Item
                                            Name&apos; (e.g., &apos;Interior painting:Interior
                                            painting&apos;). All fields are required when
                                            auto-create is enabled.
                                        </Text>
                                        <Stack gap="md">
                                            {(['INTERIOR', 'EXTERIOR', 'BOTH'] as const).map(
                                                (estimateType) => (
                                                    <Group
                                                      key={estimateType}
                                                      gap="sm"
                                                      align="flex-end"
                                                    >
                                                        <Text size="sm" style={{ minWidth: '100px' }}>
                                                            {estimateType}:
                                                        </Text>
                                                        <TextInput
                                                          placeholder="e.g., Interior painting:Interior painting"
                                                          value={serviceItemNames[estimateType]}
                                                          onChange={(e) =>
                                                                setServiceItemNames((prev) => ({
                                                                    ...prev,
                                                                    [estimateType]: e.target.value,
                                                                }))
                                                            }
                                                          style={{ flex: 1 }}
                                                          required={autoCreate}
                                                        />
                                                    </Group>
                                                )
                                            )}
                                        </Stack>
                                    </div>
                                )}

                                <Group justify="flex-end" mt="md">
                                    <Button
                                      onClick={handleSaveAllSettings}
                                      loading={savingSettings}
                                      disabled={
                                            savingSettings ||
                                            (autoCreate &&
                                                (!serviceItemNames.INTERIOR?.trim() ||
                                                    !serviceItemNames.EXTERIOR?.trim() ||
                                                    !serviceItemNames.BOTH?.trim()))
                                        }
                                    >
                                        Save Settings
                                    </Button>
                                </Group>
                            </Stack>
                        </Card>
                        </>
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

      {/* Batch Sync Modal */}
      <Modal
        opened={showBatchSyncModal}
        onClose={handleCancelBatchSync}
        title="Sync Existing Estimates to QuickBooks?"
        centered
        size="lg"
      >
        <Stack gap="md">
          <Text>
            You have {accountingNeededEstimates.length} estimate(s) in Accounting Needed
            status. Would you like to automatically create customers and estimates in
            QuickBooks for these estimates? After syncing, they will be moved to Project
            Not Scheduled status.
          </Text>
          {accountingNeededEstimates.length > 0 && (
            <div>
              <Text size="sm" fw={500} mb="xs">
                Estimates to sync:
              </Text>
              <ScrollArea h={200} type="scroll">
                <Stack gap="xs">
                  {accountingNeededEstimates.map((estimate) => (
                    <Text key={estimate.id} size="sm" c="dimmed">
                      • {estimate.title || estimate.client_name || estimate.id}
                    </Text>
                  ))}
                </Stack>
              </ScrollArea>
            </div>
          )}
          <Group justify="flex-end" gap="sm">
            <Button
              variant="outline"
              onClick={handleCancelBatchSync}
              disabled={syncingEstimates}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBatchSync}
              loading={syncingEstimates}
            >
              Sync Estimates
            </Button>
          </Group>
        </Stack>
      </Modal>
        </Card>
    );
}

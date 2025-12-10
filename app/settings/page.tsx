'use client';

import { useEffect, useState } from 'react';

import {
    Button,
    Card,
    Group,
    Stack,
    Tabs,
    Text,
    TextInput,
    Title,
    Loader,
    Alert,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconX } from '@tabler/icons-react';

import { getApiHeaders } from '@/app/utils/apiClient';

interface ContractorConfiguration {
    id: string;
    user_id: string;
    contractor_id: string;
    settings: Record<string, any>;
    configuration_type: string;
    configuration: Record<string, any>;
    edited: any[];
    services: string[];
    created_at: string;
    updated_at: string;
}

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<string | null>('contractor-config');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [clientOutreachEmail, setClientOutreachEmail] = useState('');
    const [configId, setConfigId] = useState<string | null>(null);
    const [hasChanges, setHasChanges] = useState(false);

    // Load existing configuration on mount
    useEffect(() => {
        loadConfiguration();
    }, []);

    const loadConfiguration = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch(
                '/api/configurations?config_type=contractor_config',
                {
                    method: 'GET',
                    headers: getApiHeaders(),
                }
            );

            if (!response.ok) {
                if (response.status === 404) {
                    // No configuration exists yet, that's okay
                    setClientOutreachEmail('');
                    setConfigId(null);
                    return;
                }
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to load configuration');
            }

            const configs: ContractorConfiguration[] = await response.json();

            // Find the contractor_config configuration
            const config = configs.find(
                (c) => c.configuration_type === 'contractor_config'
            );

            if (config) {
                setConfigId(config.id);
                setClientOutreachEmail(
                    config.configuration?.client_outreach_email || ''
                );
            } else {
                setConfigId(null);
                setClientOutreachEmail('');
            }
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('Error loading configuration:', err);
            setError(
                err instanceof Error ? err.message : 'Failed to load configuration'
            );
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setError(null);

            const configData = {
                configuration_type: 'contractor_config',
                configuration: {
                    client_outreach_email: clientOutreachEmail,
                },
            };

            let response;
            if (configId) {
                // Update existing configuration
                response = await fetch(`/api/configurations/${configId}`, {
                    method: 'PUT',
                    headers: getApiHeaders(),
                    body: JSON.stringify(configData),
                });
            } else {
                // Create new configuration
                response = await fetch('/api/configurations', {
                    method: 'POST',
                    headers: getApiHeaders(),
                    body: JSON.stringify(configData),
                });
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to save configuration');
            }

            const savedConfig: ContractorConfiguration = await response.json();
            setConfigId(savedConfig.id);
            setHasChanges(false);

            notifications.show({
                title: 'Success',
                message: 'Configuration saved successfully',
                color: 'green',
                icon: <IconCheck size={16} />,
            });

            // Reload to get the latest data
            await loadConfiguration();
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('Error saving configuration:', err);
            const errorMessage =
                err instanceof Error ? err.message : 'Failed to save configuration';
            setError(errorMessage);
            notifications.show({
                title: 'Error',
                message: errorMessage,
                color: 'red',
                icon: <IconX size={16} />,
            });
        } finally {
            setSaving(false);
        }
    };

    const handleEmailChange = (value: string) => {
        setClientOutreachEmail(value);
        setHasChanges(true);
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <Title c="white" order={1} mb="xl">
                Settings
            </Title>
            <Text c="dimmed" mb="xl">
                Manage your contractor configuration and notification preferences.
            </Text>

            <Tabs
              value={activeTab}
              onChange={setActiveTab}
              styles={(theme) => ({
                    tab: {
                        color: theme.colors.gray[0],
                        '&:hover': {
                            color: theme.white,
                            backgroundColor: theme.colors.dark[5],
                        },
                    },
                })}
            >
                <Tabs.List>
                    <Tabs.Tab value="contractor-config">Contractor Configuration</Tabs.Tab>
                    <Tabs.Tab value="notifications">Notifications</Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="contractor-config" pt="md">
                    <Card shadow="sm" padding="lg" withBorder>
                        {loading ? (
                            <Stack align="center" gap="md">
                                <Loader size="md" />
                                <Text c="dimmed">Loading configuration...</Text>
                            </Stack>
                        ) : (
                            <Stack gap="md">
                                {error && (
                                    <Alert color="red" title="Error">
                                        {error}
                                    </Alert>
                                )}

                                <TextInput
                                  label="Client Outreach Email"
                                  placeholder="email@example.com"
                                  description="Email address that client outreach messages should be sent from"
                                  value={clientOutreachEmail}
                                  onChange={(e) => handleEmailChange(e.target.value)}
                                  type="email"
                                />

                                <Group justify="flex-end" mt="md">
                                    <Button
                                      onClick={handleSave}
                                      disabled={!hasChanges || saving}
                                      loading={saving}
                                    >
                                        Save Changes
                                    </Button>
                                </Group>
                            </Stack>
                        )}
                    </Card>
                </Tabs.Panel>

                <Tabs.Panel value="notifications" pt="md">
                    <Card shadow="sm" padding="lg" withBorder>
                        <Stack gap="md">
                            <Text c="dimmed">
                                Notification settings will be available here soon.
                            </Text>
                        </Stack>
                    </Card>
                </Tabs.Panel>
            </Tabs>
        </div>
    );
}

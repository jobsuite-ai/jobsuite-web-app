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
    FileButton,
    Image,
    Box,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconX, IconUpload } from '@tabler/icons-react';

import { getApiHeaders } from '@/app/utils/apiClient';
import IntegrationsTab from '@/components/Settings/IntegrationsTab';
import SignaturePageTab from '@/components/Settings/SignaturePageTab';
import TemplatesTab from '@/components/Settings/TemplatesTab';
import { clearLogoCache } from '@/hooks/useContractorLogo';

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
    const [reviewLink, setReviewLink] = useState('');
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [uploadingLogo, setUploadingLogo] = useState(false);
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
                setReviewLink(
                    config.configuration?.review_link || ''
                );

                // Check if logo fields exist in the configuration
                const hasLogoFields =
                    config.configuration?.logo_s3_key &&
                    config.configuration?.logo_s3_bucket;

                if (hasLogoFields) {
                    // Try to load logo URL separately
                    try {
                        const logoResponse = await fetch('/api/configurations/logo', {
                            method: 'GET',
                            headers: getApiHeaders(),
                        });
                        if (logoResponse.ok) {
                            const logoData = await logoResponse.json();
                            if (logoData.logo_url) {
                                setLogoUrl(logoData.logo_url);
                            } else {
                                // eslint-disable-next-line no-console
                                console.warn('Logo fields exist but logo_url is null. Logo S3 key:', config.configuration.logo_s3_key);
                                setLogoUrl(null);
                            }
                        } else {
                            // eslint-disable-next-line no-console
                            console.error('Failed to fetch logo URL:', logoResponse.status, logoResponse.statusText);
                            setLogoUrl(null);
                        }
                    } catch (err) {
                        // eslint-disable-next-line no-console
                        console.error('Error loading logo URL:', err);
                        setLogoUrl(null);
                    }
                } else {
                    setLogoUrl(null);
                }
            } else {
                setConfigId(null);
                setReviewLink('');
                setLogoUrl(null);
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

            // Get existing config to preserve logo fields
            const existingConfigs: ContractorConfiguration[] = configId ? await (async () => {
                try {
                    const response = await fetch(
                        '/api/configurations?config_type=contractor_config',
                        {
                            method: 'GET',
                            headers: getApiHeaders(),
                        }
                    );
                    if (response.ok) {
                        return await response.json();
                    }
                } catch {
                    // Ignore errors
                }
                return [];
            })() : [];

            const existingConfig = existingConfigs.find(
                (c) => c.configuration_type === 'contractor_config'
            );

            const configData = {
                configuration_type: 'contractor_config',
                configuration: {
                    review_link: reviewLink,
                    // Preserve logo fields if they exist
                    ...(existingConfig?.configuration?.logo_s3_key && {
                        logo_s3_key: existingConfig.configuration.logo_s3_key,
                    }),
                    ...(existingConfig?.configuration?.logo_s3_bucket && {
                        logo_s3_bucket: existingConfig.configuration.logo_s3_bucket,
                    }),
                    // Preserve signature page config if it exists
                    ...(existingConfig?.configuration?.signature_page_config && {
                        signature_page_config: existingConfig.configuration.signature_page_config,
                    }),
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

    const handleReviewLinkChange = (value: string) => {
        setReviewLink(value);
        setHasChanges(true);
    };

    const handleLogoUpload = async (file: File | null) => {
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            notifications.show({
                title: 'Error',
                message: 'Please upload an image file',
                color: 'red',
                icon: <IconX size={16} />,
            });
            return;
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            notifications.show({
                title: 'Error',
                message: 'File size must be less than 5MB',
                color: 'red',
                icon: <IconX size={16} />,
            });
            return;
        }

        try {
            setUploadingLogo(true);

            // Get access token from localStorage (same pattern as ImageUpload)
            const accessToken = localStorage.getItem('access_token');
            if (!accessToken) {
                throw new Error('No access token found');
            }

            const formData = new FormData();
            formData.append('file', file);

            // Don't use getApiHeaders() for FormData - it sets Content-Type: application/json
            // which breaks FormData uploads. Let the browser set Content-Type with boundary.
            const response = await fetch('/api/configurations/logo', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMsg = errorData.message || errorData.detail || 'Failed to upload logo';
                throw new Error(errorMsg);
            }

            const data = await response.json();
            setLogoUrl(data.logo_url);
            setHasChanges(false);

            // Clear the logo cache so the new logo is displayed immediately
            clearLogoCache();

            notifications.show({
                title: 'Success',
                message: 'Logo uploaded successfully',
                color: 'green',
                icon: <IconCheck size={16} />,
            });

            // Reload configuration to get updated logo
            await loadConfiguration();
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : 'Failed to upload logo';
            notifications.show({
                title: 'Error',
                message: errorMessage,
                color: 'red',
                icon: <IconX size={16} />,
            });
        } finally {
            setUploadingLogo(false);
        }
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
                    <Tabs.Tab value="signature-page">Signature Page</Tabs.Tab>
                    <Tabs.Tab value="templates">Templates</Tabs.Tab>
                    <Tabs.Tab value="integrations">Integrations</Tabs.Tab>
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
                                  label="Review Link"
                                  placeholder="https://..."
                                  description="Review link to include in post-completion thank you messages"
                                  value={reviewLink}
                                  onChange={(e) => handleReviewLinkChange(e.target.value)}
                                />

                                {/* Logo Upload */}
                                <Box>
                                    <Text size="sm" fw={500} mb="xs">
                                        Company Logo
                                    </Text>
                                    <Text size="xs" c="dimmed" mb="md">
                                        Upload a logo to be displayed in email templates.
                                        Recommended size: 200x60px. Max file size: 5MB.
                                    </Text>
                                    <Group gap="md" align="flex-start">
                                        {logoUrl && (
                                            <Image
                                              src={logoUrl}
                                              alt="Company Logo"
                                              w={200}
                                              h={60}
                                              fit="contain"
                                              style={{ border: '1px solid #dee2e6', borderRadius: '4px', padding: '8px' }}
                                            />
                                        )}
                                        <FileButton
                                          onChange={handleLogoUpload}
                                          accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                                          disabled={uploadingLogo}
                                        >
                                            {(props) => (
                                                <Button
                                                  {...props}
                                                  leftSection={<IconUpload size={16} />}
                                                  loading={uploadingLogo}
                                                  variant="outline"
                                                >
                                                    {logoUrl ? 'Change Logo' : 'Upload Logo'}
                                                </Button>
                                            )}
                                        </FileButton>
                                    </Group>
                                </Box>

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

                <Tabs.Panel value="signature-page" pt="md">
                    <SignaturePageTab />
                </Tabs.Panel>

                <Tabs.Panel value="templates" pt="md">
                    <TemplatesTab />
                </Tabs.Panel>

                <Tabs.Panel value="integrations" pt="md">
                    <IntegrationsTab />
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

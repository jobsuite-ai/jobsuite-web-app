import { useEffect, useState } from 'react';

import {
    Alert,
    Button,
    Card,
    Checkbox,
    Flex,
    Group,
    Loader,
    Stack,
    Text,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconX } from '@tabler/icons-react';

import { getApiHeaders } from '@/app/utils/apiClient';
import { User } from '@/hooks/useAuth';

export interface NotificationSettingsBucket {
    owner: boolean;
    non_owner: boolean;
}

export interface NotificationSettingsConfig {
    estimate_updates: NotificationSettingsBucket;
    comments: NotificationSettingsBucket;
    job_status: NotificationSettingsBucket;
    general: boolean;
    outreach_messages: boolean;
}

interface ContractorConfiguration {
    id: string;
    configuration_type: string;
    configuration: Record<string, any>;
}

interface NotificationsTabProps {
    user: User | null;
}

export default function NotificationsTab({ user }: NotificationsTabProps) {
    const defaultNotificationSettings: NotificationSettingsConfig = {
        estimate_updates: { owner: true, non_owner: true },
        comments: { owner: true, non_owner: true },
        job_status: { owner: true, non_owner: true },
        general: true,
        outreach_messages: true,
    };
    const [notificationConfigId, setNotificationConfigId] = useState<string | null>(null);
    const [notificationLoading, setNotificationLoading] = useState(false);
    const [notificationSaving, setNotificationSaving] = useState(false);
    const [notificationError, setNotificationError] = useState<string | null>(null);
    const [notificationHasChanges, setNotificationHasChanges] = useState(false);
    const [notificationSettings, setNotificationSettings] = useState<NotificationSettingsConfig>(
        defaultNotificationSettings
    );

    useEffect(() => {
        if (user?.id) {
            loadNotificationSettings(user.id);
        }
    }, [user?.id]);

    const mergeNotificationSettings = (
        overrides?: Partial<NotificationSettingsConfig>
    ): NotificationSettingsConfig => ({
        estimate_updates: {
            owner:
                overrides?.estimate_updates?.owner ??
                defaultNotificationSettings.estimate_updates.owner,
            non_owner:
                overrides?.estimate_updates?.non_owner ??
                defaultNotificationSettings.estimate_updates.non_owner,
        },
        comments: {
            owner:
                overrides?.comments?.owner ?? defaultNotificationSettings.comments.owner,
            non_owner:
                overrides?.comments?.non_owner ?? defaultNotificationSettings.comments.non_owner,
        },
        job_status: {
            owner:
                overrides?.job_status?.owner ??
                defaultNotificationSettings.job_status.owner,
            non_owner:
                overrides?.job_status?.non_owner ??
                defaultNotificationSettings.job_status.non_owner,
        },
        general: overrides?.general ?? defaultNotificationSettings.general,
        outreach_messages:
            overrides?.outreach_messages ??
            defaultNotificationSettings.outreach_messages,
    });

    const loadNotificationSettings = async (userId: string) => {
        try {
            setNotificationLoading(true);
            setNotificationError(null);

            const configType = `notification_settings:${userId}`;
            const response = await fetch(
                `/api/configurations?config_type=${encodeURIComponent(configType)}`,
                {
                    method: 'GET',
                    headers: getApiHeaders(),
                }
            );

            if (!response.ok) {
                if (response.status === 404) {
                    setNotificationConfigId(null);
                    setNotificationSettings(mergeNotificationSettings());
                    setNotificationHasChanges(false);
                    return;
                }
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to load notification settings');
            }

            const configs: ContractorConfiguration[] = await response.json();
            const config = configs.find((c) => c.configuration_type === configType);

            if (config) {
                setNotificationConfigId(config.id);
                setNotificationSettings(
                    mergeNotificationSettings(config.configuration as NotificationSettingsConfig)
                );
                setNotificationHasChanges(false);
            } else {
                setNotificationConfigId(null);
                setNotificationSettings(mergeNotificationSettings());
                setNotificationHasChanges(false);
            }
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('Error loading notification settings:', err);
            setNotificationError(
                err instanceof Error ? err.message : 'Failed to load notification settings'
            );
        } finally {
            setNotificationLoading(false);
        }
    };

    const handleNotificationSettingChange = (
        bucket: keyof NotificationSettingsConfig,
        field: 'owner' | 'non_owner' | 'general' | 'outreach_messages',
        value: boolean
    ) => {
        setNotificationSettings((prev) => {
            if (field === 'general') {
                return { ...prev, general: value };
            }
            if (field === 'outreach_messages') {
                return { ...prev, outreach_messages: value };
            }
            return {
                ...prev,
                [bucket]: {
                    ...(prev[bucket] as NotificationSettingsBucket),
                    [field]: value,
                },
            };
        });
        setNotificationHasChanges(true);
    };

    const handleNotificationSave = async () => {
        if (!user?.id) {
            return;
        }

        try {
            setNotificationSaving(true);
            setNotificationError(null);

            const configType = `notification_settings:${user.id}`;
            const configData = {
                configuration_type: configType,
                configuration: notificationSettings,
            };

            let response;
            if (notificationConfigId) {
                response = await fetch(`/api/configurations/${notificationConfigId}`, {
                    method: 'PUT',
                    headers: getApiHeaders(),
                    body: JSON.stringify(configData),
                });
            } else {
                response = await fetch('/api/configurations', {
                    method: 'POST',
                    headers: getApiHeaders(),
                    body: JSON.stringify(configData),
                });
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(
                    errorData.message || 'Failed to save notification settings'
                );
            }

            const savedConfig: ContractorConfiguration = await response.json();
            setNotificationConfigId(savedConfig.id);
            setNotificationHasChanges(false);

            notifications.show({
                title: 'Success',
                message: 'Notification settings saved successfully',
                color: 'green',
                icon: <IconCheck size={16} />,
            });

            await loadNotificationSettings(user.id);
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('Error saving notification settings:', err);
            const errorMessage =
                err instanceof Error ? err.message : 'Failed to save notification settings';
            setNotificationError(errorMessage);
            notifications.show({
                title: 'Error',
                message: errorMessage,
                color: 'red',
                icon: <IconX size={16} />,
            });
        } finally {
            setNotificationSaving(false);
        }
    };
    return (
        <Card shadow="sm" padding="lg" withBorder>
            {notificationLoading ? (
                <Stack align="center" gap="md">
                    <Loader size="md" />
                    <Text c="dimmed">Loading notification settings...</Text>
                </Stack>
            ) : (
                <Stack gap="md">
                    {notificationError && (
                        <Alert color="red" title="Error">
                            {notificationError}
                        </Alert>
                    )}
                    {!user ? (
                        <Text c="dimmed">
                            Sign in to manage notification preferences.
                        </Text>
                    ) : (
                        <>
                            <Text size="sm" c="dimmed">
                                Choose which notifications you receive. Owner settings
                                apply when you are assigned as the estimate owner.
                            </Text>
                            <Stack gap="lg">
                                <Stack gap="xs">
                                    <Text fw={500}>Estimate updates</Text>
                                    <Text size="sm" c="dimmed">
                                        Status changes, ownership transfers,
                                        and estimate activity.
                                    </Text>
                                    <Flex direction="column" gap="lg">
                                        <Checkbox
                                          label="When you are the owner"
                                          checked={notificationSettings.estimate_updates.owner}
                                          onChange={(event) =>
                                                handleNotificationSettingChange(
                                                    'estimate_updates',
                                                    'owner',
                                                    event.currentTarget.checked
                                                )
                                            }
                                        />
                                        <Checkbox
                                          label="When you are not the owner"
                                          checked={notificationSettings.estimate_updates.non_owner}
                                          onChange={(event) =>
                                                handleNotificationSettingChange(
                                                    'estimate_updates',
                                                    'non_owner',
                                                    event.currentTarget.checked
                                                )
                                            }
                                        />
                                    </Flex>
                                </Stack>

                                <Stack gap="xs">
                                    <Text fw={500}>Comments</Text>
                                    <Text size="sm" c="dimmed">
                                        Mentions and new comments on estimates or jobs.
                                    </Text>
                                    <Flex direction="column" gap="lg">
                                        <Checkbox
                                          label="When you are the owner"
                                          checked={notificationSettings.comments.owner}
                                          onChange={(event) =>
                                                handleNotificationSettingChange(
                                                    'comments',
                                                    'owner',
                                                    event.currentTarget.checked
                                                )
                                            }
                                        />
                                        <Checkbox
                                          label="When you are not the owner"
                                          checked={notificationSettings.comments.non_owner}
                                          onChange={(event) =>
                                                handleNotificationSettingChange(
                                                    'comments',
                                                    'non_owner',
                                                    event.currentTarget.checked
                                                )
                                            }
                                        />
                                    </Flex>
                                </Stack>

                                <Stack gap="xs">
                                    <Text fw={500}>Job status updates</Text>
                                    <Text size="sm" c="dimmed">
                                        Job progress updates and status changes.
                                    </Text>
                                    <Flex direction="column" gap="lg">
                                        <Checkbox
                                          label="When you are the owner"
                                          checked={notificationSettings.job_status.owner}
                                          onChange={(event) =>
                                                handleNotificationSettingChange(
                                                    'job_status',
                                                    'owner',
                                                    event.currentTarget.checked
                                                )
                                            }
                                        />
                                        <Checkbox
                                          label="When you are not the owner"
                                          checked={notificationSettings.job_status.non_owner}
                                          onChange={(event) =>
                                                handleNotificationSettingChange(
                                                    'job_status',
                                                    'non_owner',
                                                    event.currentTarget.checked
                                                )
                                            }
                                        />
                                    </Flex>
                                </Stack>

                                <Stack gap="xs">
                                    <Text fw={500}>General notifications</Text>
                                    <Text size="sm" c="dimmed">
                                        Non-estimate updates such as system
                                        reminders.
                                    </Text>
                                    <Checkbox
                                      label="Receive general notifications"
                                      checked={notificationSettings.general}
                                      onChange={(event) =>
                                            handleNotificationSettingChange(
                                                'general',
                                                'general',
                                                event.currentTarget.checked
                                            )
                                        }
                                    />
                                </Stack>

                                <Stack gap="xs">
                                    <Text fw={500}>Outreach messages</Text>
                                    <Text size="sm" c="dimmed">
                                        Notifications when an outreach message
                                        is assigned to you or due in the
                                        Messaging Center.
                                    </Text>
                                    <Checkbox
                                      label="Receive outreach message notifications"
                                      checked={notificationSettings.outreach_messages}
                                      onChange={(event) =>
                                            handleNotificationSettingChange(
                                                'outreach_messages',
                                                'outreach_messages',
                                                event.currentTarget.checked
                                            )
                                        }
                                    />
                                </Stack>
                            </Stack>

                            <Group justify="flex-end" mt="md">
                                <Button
                                  onClick={handleNotificationSave}
                                  disabled={
                                        !notificationHasChanges ||
                                        notificationSaving ||
                                        !user
                                    }
                                  loading={notificationSaving}
                                >
                                    Save Changes
                                </Button>
                            </Group>
                        </>
                    )}
                </Stack>
            )}
        </Card>
    );
}

'use client';

import { useEffect, useState } from 'react';

import {
    Button,
    Card,
    Group,
    Stack,
    Text,
    Select,
    Loader,
    Alert,
    Badge,
    ActionIcon,
    MultiSelect,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconX, IconPlus, IconTrash } from '@tabler/icons-react';

import { getApiHeaders } from '@/app/utils/apiClient';
import {
    EstimateStatus,
    StatusAction,
    StatusActionsConfig,
    StatusActionsConfiguration,
} from '@/components/Global/model';
import { useUsers } from '@/hooks/useUsers';

// Get all estimate statuses for selection
const ESTIMATE_STATUSES = Object.values(EstimateStatus).map((status) => ({
    value: status,
    label: status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
}));

const ACTION_TYPES = [
    { value: 'SET_OWNER', label: 'Set Owner' },
    { value: 'SEND_NOTIFICATION', label: 'Send Notification' },
];

export default function ActionsTab() {
    const [config, setConfig] = useState<StatusActionsConfig>({ actions: {} });
    const [configId, setConfigId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { users, loading: usersLoading } = useUsers();
    const [newActionStatus, setNewActionStatus] = useState<string>('');
    const [newActionType, setNewActionType] = useState<'SET_OWNER' | 'SEND_NOTIFICATION'>(
        'SET_OWNER'
    );
    const [newActionUserId, setNewActionUserId] = useState<string>('');
    const [newActionUserIds, setNewActionUserIds] = useState<string[]>([]);

    useEffect(() => {
        loadConfiguration();
    }, []);

    const loadConfiguration = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch(
                '/api/configurations?config_type=status_actions',
                {
                    method: 'GET',
                    headers: getApiHeaders(),
                }
            );

            if (!response.ok) {
                if (response.status === 404) {
                    // No configuration exists yet, that's okay
                    setConfigId(null);
                    setConfig({ actions: {} });
                    return;
                }
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to load configuration');
            }

            const configs: StatusActionsConfiguration[] = await response.json();
            const statusActionsConfig = configs.find(
                (c) => c.configuration_type === 'status_actions'
            );

            if (statusActionsConfig) {
                setConfigId(statusActionsConfig.id);
                setConfig(
                    statusActionsConfig.configuration || { actions: {} }
                );
            } else {
                setConfigId(null);
                setConfig({ actions: {} });
            }
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('Error loading configuration:', err);
            setError(
                err instanceof Error
                    ? err.message
                    : 'Failed to load configuration'
            );
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (overrideConfig?: StatusActionsConfig) => {
        try {
            setSaving(true);
            setError(null);

            const configToSave = overrideConfig ?? config;
            const configData = {
                configuration_type: 'status_actions',
                configuration: configToSave,
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

            const savedConfig: StatusActionsConfiguration = await response.json();
            setConfigId(savedConfig.id);

            notifications.show({
                title: 'Success',
                message: 'Actions configuration saved successfully',
                color: 'green',
                icon: <IconCheck size={16} />,
            });

            // Reload to get the latest data
            await loadConfiguration();
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('Error saving configuration:', err);
            const errorMessage =
                err instanceof Error
                    ? err.message
                    : 'Failed to save configuration';
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

    const applyConfigAndSave = (nextConfig: StatusActionsConfig) => {
        setConfig(nextConfig);
        handleSave(nextConfig);
    };

    const buildConfigWithAddedAction = (
        status: string,
        action: StatusAction
    ): StatusActionsConfig => {
        const newActions = { ...config.actions };
        if (!newActions[status]) {
            newActions[status] = [];
        }
        newActions[status] = [...newActions[status], action];
        return { actions: newActions };
    };

    const buildConfigWithRemovedAction = (
        status: string,
        index: number
    ): StatusActionsConfig => {
        const newActions = { ...config.actions };
        if (newActions[status]) {
            newActions[status] = newActions[status].filter((_, i) => i !== index);
            if (newActions[status].length === 0) {
                delete newActions[status];
            }
        }
        return { actions: newActions };
    };

    const userLabelById = (userId: string) => {
        const user = users.find((u) => u.id === userId);
        return user ? user.full_name || user.email : 'Unknown user';
    };

    const statusLabelByValue = (value: string) =>
        ESTIMATE_STATUSES.find((status) => status.value === value)?.label || value;

    const allActions = Object.entries(config.actions).flatMap(
        ([status, actions]) =>
            actions.map((action, index) => ({ status, action, index }))
    );

    if (loading) {
        return (
            <Stack align="center" gap="md">
                <Loader size="md" />
                <Text c="dimmed">Loading actions configuration...</Text>
            </Stack>
        );
    }

    return (
        <Card shadow="sm" padding="lg" withBorder>
            <Stack gap="md">
                <div>
                    <Text fw={600} size="lg" mb="xs">
                        Status Actions
                    </Text>
                    <Text c="dimmed" size="sm">
                        Configure automated actions that execute when an estimate
                        moves into a specific status. Actions will be executed in
                        the order they appear.
                    </Text>
                </div>

                {error && (
                    <Alert color="red" title="Error">
                        {error}
                    </Alert>
                )}

                <Stack gap="sm">
                    {allActions.length === 0 ? (
                        <Text c="dimmed">No actions configured yet.</Text>
                    ) : (
                        allActions.map(({ status, action, index }) => (
                            <Card
                              key={`${status}-${index}`}
                              padding="md"
                              withBorder
                              style={{ backgroundColor: '#2a3a54' }}
                              radius="md"
                            >
                                <Group justify="space-between" align="flex-start">
                                    <Stack gap={4} style={{ flex: 1 }}>
                                        <Group gap="xs">
                                            <Text fw={600} c="gray.0">
                                                {ACTION_TYPES.find(
                                                    (type) => type.value === action.type
                                                )?.label || action.type.replace(/_/g, ' ')}
                                            </Text>
                                            <Badge color="blue" size="sm">
                                                {statusLabelByValue(status)}
                                            </Badge>
                                        </Group>
                                        {action.type === 'SET_OWNER' ? (
                                            <Text c="dimmed" size="sm">
                                                Set owner to {userLabelById(action.user_id)}
                                            </Text>
                                        ) : (
                                            <Text c="dimmed" size="sm">
                                                Notify {action.user_ids.map(userLabelById).join(', ')}
                                            </Text>
                                        )}
                                    </Stack>
                                    <ActionIcon
                                      color="red"
                                      variant="subtle"
                                      onClick={() => {
                                          const nextConfig = buildConfigWithRemovedAction(
                                              status,
                                              index
                                          );
                                          applyConfigAndSave(nextConfig);
                                      }}
                                      mt="xs"
                                    >
                                        <IconTrash size={16} />
                                    </ActionIcon>
                                </Group>
                            </Card>
                        ))
                    )}
                </Stack>

                <Card padding="md" withBorder style={{ backgroundColor: '#2a3a54' }} radius="md">
                    <Stack gap="sm">
                        <Text fw={600} c="gray.0">Create New Action</Text>
                        <Group grow align="flex-start">
                            <Select
                              label="Status"
                              c="gray.0"
                              placeholder="Select status"
                              data={ESTIMATE_STATUSES}
                              value={newActionStatus}
                              onChange={(value) => setNewActionStatus(value || '')}
                            />
                            <Select
                              label="Action Type"
                              c="gray.0"
                              data={ACTION_TYPES}
                              value={newActionType}
                              onChange={(value) => {
                                    if (value === 'SET_OWNER') {
                                        setNewActionType('SET_OWNER');
                                        setNewActionUserIds([]);
                                    } else if (value === 'SEND_NOTIFICATION') {
                                        setNewActionType('SEND_NOTIFICATION');
                                        setNewActionUserId('');
                                    }
                                }}
                            />
                            {newActionType === 'SET_OWNER' ? (
                                <Select
                                  label="User"
                                  c="gray.0"
                                  placeholder="Select user"
                                  data={users.map((u) => ({
                                        value: u.id,
                                        label: u.full_name || u.email,
                                    }))}
                                  value={newActionUserId}
                                  onChange={(value) => setNewActionUserId(value || '')}
                                  disabled={usersLoading}
                                />
                            ) : (
                                <MultiSelect
                                  label="Users"
                                  placeholder="Select users"
                                  data={users.map((u) => ({
                                        value: u.id,
                                        label: u.full_name || u.email,
                                    }))}
                                  value={newActionUserIds}
                                  onChange={setNewActionUserIds}
                                  disabled={usersLoading}
                                />
                            )}
                        </Group>
                        <Group justify="flex-end">
                            <Button
                              leftSection={<IconPlus size={16} />}
                              onClick={() => {
                                    if (!newActionStatus) {
                                        setError('Please select a status.');
                                        return;
                                    }
                                    if (newActionType === 'SET_OWNER') {
                                        if (!newActionUserId) {
                                            setError('Please select a user.');
                                            return;
                                        }
                                        const nextConfig = buildConfigWithAddedAction(
                                            newActionStatus,
                                            {
                                                type: 'SET_OWNER',
                                                user_id: newActionUserId,
                                            }
                                        );
                                        applyConfigAndSave(nextConfig);
                                    } else {
                                        if (newActionUserIds.length === 0) {
                                            setError('Please select at least one user.');
                                            return;
                                        }
                                        const nextConfig = buildConfigWithAddedAction(
                                            newActionStatus,
                                            {
                                                type: 'SEND_NOTIFICATION',
                                                user_ids: newActionUserIds,
                                            }
                                        );
                                        applyConfigAndSave(nextConfig);
                                    }
                                    setError(null);
                                    setNewActionStatus('');
                                    setNewActionType('SET_OWNER');
                                    setNewActionUserId('');
                                    setNewActionUserIds([]);
                                }}
                            >
                                Create Action
                            </Button>
                        </Group>
                    </Stack>
                </Card>

                {saving && (
                    <Group justify="flex-end" mt="md">
                        <Loader size="sm" />
                        <Text size="sm" c="dimmed">
                            Saving changes...
                        </Text>
                    </Group>
                )}
            </Stack>
        </Card>
    );
}

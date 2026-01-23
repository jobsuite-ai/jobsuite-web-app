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
    Accordion,
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
    SetOwnerAction,
    SendNotificationAction,
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
    const [hasChanges, setHasChanges] = useState(false);

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

    const handleSave = async () => {
        try {
            setSaving(true);
            setError(null);

            const configData = {
                configuration_type: 'status_actions',
                configuration: config,
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
            setHasChanges(false);

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

    const addAction = (status: string) => {
        setConfig((prev) => {
            const newActions = { ...prev.actions };
            if (!newActions[status]) {
                newActions[status] = [];
            }
            // Add a default SET_OWNER action
            newActions[status] = [
                ...newActions[status],
                { type: 'SET_OWNER', user_id: '' },
            ];
            setHasChanges(true);
            return { actions: newActions };
        });
    };

    const removeAction = (status: string, index: number) => {
        setConfig((prev) => {
            const newActions = { ...prev.actions };
            if (newActions[status]) {
                newActions[status] = newActions[status].filter(
                    (_, i) => i !== index
                );
                if (newActions[status].length === 0) {
                    delete newActions[status];
                }
            }
            setHasChanges(true);
            return { actions: newActions };
        });
    };

    const updateAction = (
        status: string,
        index: number,
        updates: Partial<StatusAction>
    ) => {
        setConfig((prev) => {
            const newActions = { ...prev.actions };
            if (newActions[status] && newActions[status][index]) {
                newActions[status] = newActions[status].map((action, i) => {
                    if (i !== index) return action;

                    // Reconstruct action based on type to maintain discriminated union
                    if (updates.type === 'SET_OWNER') {
                        const user_id =
                            (updates as SetOwnerAction).user_id ??
                            (action.type === 'SET_OWNER' ? action.user_id : '');
                        return {
                            type: 'SET_OWNER',
                            user_id,
                        } as SetOwnerAction;
                    }
                    if (updates.type === 'SEND_NOTIFICATION') {
                        const user_ids =
                            (updates as SendNotificationAction).user_ids ??
                            (action.type === 'SEND_NOTIFICATION'
                                ? action.user_ids
                                : []);
                        return {
                            type: 'SEND_NOTIFICATION',
                            user_ids,
                        } as SendNotificationAction;
                    }
                    // Update properties without changing type
                    if (action.type === 'SET_OWNER') {
                        return {
                            ...action,
                            user_id:
                                (updates as Partial<SetOwnerAction>).user_id ??
                                action.user_id,
                        };
                    }
                    return {
                        ...action,
                        user_ids:
                            (updates as Partial<SendNotificationAction>)
                                .user_ids ?? action.user_ids,
                    };
                });
            }
            setHasChanges(true);
            return { actions: newActions };
        });
    };

    const getStatusActions = (status: string): StatusAction[] => config.actions[status] || [];

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

                <Accordion>
                    {ESTIMATE_STATUSES.map((statusOption) => {
                        const status = statusOption.value;
                        const actions = getStatusActions(status);

                        return (
                            <Accordion.Item key={status} value={status}>
                                <Accordion.Control>
                                    <Group justify="space-between" style={{ width: '100%' }}>
                                        <Text fw={500}>{statusOption.label}</Text>
                                        {actions.length > 0 && (
                                            <Badge color="blue" size="sm">
                                                {actions.length} action{actions.length !== 1 ? 's' : ''}
                                            </Badge>
                                        )}
                                    </Group>
                                </Accordion.Control>
                                <Accordion.Panel>
                                    <Stack gap="md" mt="md">
                                        {actions.map((action, index) => (
                                            <Card
                                              key={index}
                                              padding="md"
                                              withBorder
                                              style={{ backgroundColor: '#2a3a54' }}
                                            >
                                                <Group justify="space-between" align="flex-start">
                                                    <Stack gap="sm" style={{ flex: 1 }}>
                                                        <Select
                                                          label="Action Type"
                                                          c="gray.0"
                                                          data={ACTION_TYPES}
                                                          value={action.type}
                                                          onChange={(value) => {
                                                                if (value === 'SET_OWNER') {
                                                                    updateAction(status, index, {
                                                                        type: 'SET_OWNER',
                                                                        user_id: '',
                                                                    });
                                                                } else if (value === 'SEND_NOTIFICATION') {
                                                                    updateAction(status, index, {
                                                                        type: 'SEND_NOTIFICATION',
                                                                        user_ids: [],
                                                                    });
                                                                }
                                                            }}
                                                        />

                                                        {action.type === 'SET_OWNER' && (
                                                            <Select
                                                              label="Set Owner To"
                                                              c="gray.0"
                                                              placeholder="Select user"
                                                              data={users.map((u) => ({
                                                                    value: u.id,
                                                                    label: u.full_name || u.email,
                                                                }))}
                                                              value={action.user_id || ''}
                                                              onChange={(value) =>
                                                                    updateAction(status, index, {
                                                                        user_id: value || '',
                                                                    })
                                                                }
                                                              disabled={usersLoading}
                                                            />
                                                        )}

                                                        {action.type === 'SEND_NOTIFICATION' && (
                                                            <MultiSelect
                                                              label="Notify Users"
                                                              placeholder="Select users"
                                                              data={users.map((u) => ({
                                                                    value: u.id,
                                                                    label: u.full_name || u.email,
                                                                }))}
                                                              value={action.user_ids || []}
                                                              onChange={(value) =>
                                                                    updateAction(status, index, {
                                                                        user_ids: value,
                                                                    })
                                                                }
                                                              disabled={usersLoading}
                                                            />
                                                        )}
                                                    </Stack>
                                                    <ActionIcon
                                                      color="red"
                                                      variant="subtle"
                                                      onClick={() => removeAction(status, index)}
                                                      mt="md"
                                                    >
                                                        <IconTrash size={16} />
                                                    </ActionIcon>
                                                </Group>
                                            </Card>
                                        ))}

                                        <Button
                                          leftSection={<IconPlus size={16} />}
                                          variant="light"
                                          onClick={() => addAction(status)}
                                        >
                                            Add Action
                                        </Button>
                                    </Stack>
                                </Accordion.Panel>
                            </Accordion.Item>
                        );
                    })}
                </Accordion>

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
        </Card>
    );
}

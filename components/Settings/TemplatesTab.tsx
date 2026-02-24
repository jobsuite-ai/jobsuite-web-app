'use client';

import { useEffect, useState } from 'react';

import {
    Card,
    Button,
    Group,
    Stack,
    Text,
    TextInput,
    Switch,
    Select,
    Loader,
    Alert,
    Accordion,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import '@mantine/tiptap/styles.css';
import { IconCheck, IconX } from '@tabler/icons-react';

import { getApiHeaders } from '@/app/utils/apiClient';
import RichTextBodyEditor from '@/components/Global/RichTextBodyEditor';
import { useUsers } from '@/hooks/useUsers';

interface ContractorConfig {
    id: string;
    contractor_id: string;
    configuration_type: string;
    configuration: Record<string, unknown>;
}

const MESSAGE_TYPES = [
    { value: 'FOLLOW_UP_CHECK_IN', label: 'Follow-up Check-in' },
    { value: 'LAST_FOLLOW_UP', label: 'Last Follow-up' },
    { value: 'ACCEPTED_MESSAGE', label: 'Accepted Estimate' },
    { value: 'PRE_IN_PROGRESS_FOLLOW_UP', label: 'Pre-in-Progress Follow-up' },
    { value: 'SCHEDULED_MESSAGE', label: 'Scheduled Message' },
    { value: 'COLOR_SELECTION_REMINDER', label: 'Color Selection Reminder' },
    { value: 'IN_PROGRESS_MESSAGE', label: 'In-Progress Message' },
    { value: 'POST_COMPLETION_THANK_YOU', label: 'Post-Completion Thank You' },
];

interface Template {
    subject: string;
    body: string;
    enabled: boolean;
    notification_user_id?: string;
    interval_days?: number;
}

interface TemplatesData {
    [key: string]: Template | {
        email?: string;
        status?: string;
    } | string | undefined;
    _ses_identity?: {
        email?: string;
        status?: string;
        display_name?: string;
    };
    _review_link?: string;
}

// Type guard to check if a value is a Template
function isTemplate(value: unknown): value is Template {
    return (
        typeof value === 'object' &&
        value !== null &&
        'subject' in value &&
        'body' in value &&
        'enabled' in value
    );
}

export default function TemplatesTab() {
    const [templates, setTemplates] = useState<TemplatesData>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [dirtyTemplates, setDirtyTemplates] = useState<Record<string, boolean>>({});
    const [contractorConfig, setContractorConfig] = useState<ContractorConfig | null>(null);
    const [estimateReceivedBody, setEstimateReceivedBody] = useState('');
    const [estimateReceivedDirty, setEstimateReceivedDirty] = useState(false);
    const [savingEstimateReceived, setSavingEstimateReceived] = useState(false);
    const { users, loading: usersLoading } = useUsers();

    useEffect(() => {
        loadTemplates();
        loadContractorConfig();
    }, []);

    const loadContractorConfig = async () => {
        try {
            const response = await fetch('/api/configurations?config_type=contractor_config', {
                method: 'GET',
                headers: getApiHeaders(),
            });
            if (!response.ok) return;
            const configs: ContractorConfig[] = await response.json();
            const config = configs.find((c) => c.configuration_type === 'contractor_config');
            if (config) {
                setContractorConfig(config);
                setEstimateReceivedBody(
                    (config.configuration?.estimate_received_email_body as string) || ''
                );
                setEstimateReceivedDirty(false);
            }
        } catch {
            // Non-blocking
        }
    };

    const saveEstimateReceivedEmail = async () => {
        if (!contractorConfig) return;
        try {
            setSavingEstimateReceived(true);
            setError(null);
            const configuration = {
                ...contractorConfig.configuration,
                estimate_received_email_body: estimateReceivedBody.trim() || null,
            };
            const response = await fetch(`/api/configurations/${contractorConfig.id}`, {
                method: 'PUT',
                headers: getApiHeaders(),
                body: JSON.stringify({
                    configuration_type: 'contractor_config',
                    configuration,
                }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to save');
            }
            const updated: ContractorConfig = await response.json();
            setContractorConfig(updated);
            setEstimateReceivedDirty(false);
            notifications.show({
                title: 'Success',
                message: 'Estimate received email saved',
                color: 'green',
                icon: <IconCheck size={16} />,
            });
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to save';
            setError(msg);
            notifications.show({
                title: 'Error',
                message: msg,
                color: 'red',
                icon: <IconX size={16} />,
            });
        } finally {
            setSavingEstimateReceived(false);
        }
    };

    const loadTemplates = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch('/api/outreach-templates', {
                method: 'GET',
                headers: getApiHeaders(),
            });

            if (!response.ok) {
                throw new Error('Failed to load templates');
            }

            const data: TemplatesData = await response.json();
            setTemplates(data);
            setDirtyTemplates({});
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('Error loading templates:', err);
            setError(err instanceof Error ? err.message : 'Failed to load templates');
        } finally {
            setLoading(false);
        }
    };

    const updateTemplate = async (messageType: string, updates: Partial<Template>) => {
        try {
            setSaving(messageType);
            setError(null);

            const normalizedUpdates = { ...updates };

            const response = await fetch(`/api/outreach-templates/${messageType}`, {
                method: 'PUT',
                headers: getApiHeaders(),
                body: JSON.stringify(normalizedUpdates),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update template');
            }

            const updated = await response.json();
            setTemplates((prev) => {
                const prevTemplate = prev[messageType];
                if (isTemplate(prevTemplate)) {
                    return {
                        ...prev,
                        [messageType]: { ...prevTemplate, ...updated },
                    };
                }
                return {
                    ...prev,
                    [messageType]: updated as Template,
                };
            });
            setDirtyTemplates((prev) => ({ ...prev, [messageType]: false }));

            notifications.show({
                title: 'Success',
                message: 'Template updated successfully',
                color: 'green',
                icon: <IconCheck size={16} />,
            });
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to update template';
            setError(errorMessage);
            notifications.show({
                title: 'Error',
                message: errorMessage,
                color: 'red',
                icon: <IconX size={16} />,
            });
        } finally {
            setSaving(null);
        }
    };

    const markTemplateDirty = (messageType: string) => {
        setDirtyTemplates((prev) => ({ ...prev, [messageType]: true }));
    };

    const toggleMessageType = async (messageType: string, enabled: boolean) => {
        try {
            setSaving(messageType);
            const endpoint = enabled ? 'enable' : 'disable';
            const response = await fetch(`/api/outreach-templates/${messageType}/${endpoint}`, {
                method: 'POST',
                headers: getApiHeaders(),
            });

            if (!response.ok) {
                throw new Error('Failed to update message type');
            }

            setTemplates((prev) => {
                const prevTemplate = prev[messageType];
                if (isTemplate(prevTemplate)) {
                    return {
                        ...prev,
                        [messageType]: { ...prevTemplate, enabled },
                    };
                }
                return prev;
            });

            notifications.show({
                title: 'Success',
                message: `Message type ${enabled ? 'enabled' : 'disabled'}`,
                color: 'green',
                icon: <IconCheck size={16} />,
            });
        } catch (err) {
            notifications.show({
                title: 'Error',
                message: 'Failed to update message type',
                color: 'red',
                icon: <IconX size={16} />,
            });
        } finally {
            setSaving(null);
        }
    };

    if (loading) {
        return (
            <Stack align="center" gap="md">
                <Loader size="md" />
                <Text c="dimmed">Loading templates...</Text>
            </Stack>
        );
    }

    return (
        <Stack gap="md">
            {error && (
                <Alert color="red" title="Error">
                    {error}
                </Alert>
            )}

            {/* Estimate received email (contractor_config) */}
            <Card shadow="sm" padding="lg" withBorder>
                <Stack gap="md">
                    <Text fw={600} size="lg">
                        Estimate received email
                    </Text>
                    <Text c="dimmed" size="sm">
                        Email body when a client submits an estimate. Subject is fixed. Leave empty
                        for the default message.
                    </Text>
                    <Stack gap="xs">
                        <Text fw={500} size="sm">
                            Body — use {'{client_first}'} for the client&apos;s first name
                        </Text>
                        <Text c="dimmed" size="xs">
                            Format with the toolbar or HTML. Use {'{client_first}'} to insert the
                            client&apos;s first name (e.g. &quot;Hi {'{client_first}'},&quot;).
                        </Text>
                        <RichTextBodyEditor
                          value={estimateReceivedBody}
                          disabled={savingEstimateReceived}
                          onChange={(nextValue) => {
                            setEstimateReceivedBody(nextValue);
                            setEstimateReceivedDirty(true);
                          }}
                        />
                    </Stack>
                    {estimateReceivedDirty && (
                        <Group justify="flex-end">
                          <Button
                            onClick={saveEstimateReceivedEmail}
                            loading={savingEstimateReceived}
                          >
                            Save changes
                          </Button>
                        </Group>
                    )}
                </Stack>
            </Card>

            {/* Message Templates */}
            <Card shadow="sm" padding="lg" withBorder>
                <Stack gap="md">
                    <Text fw={600} size="lg">
                        Message Templates
                    </Text>
                    <Text c="dimmed" size="sm">
                        Configure email templates for each message type. You can enable/disable
                        message types and customize the content.
                    </Text>

                    <Accordion>
                        {MESSAGE_TYPES.map((type) => {
                            const template = templates[type.value] as Template | undefined;
                            if (!template) return null;

                            return (
                                <Accordion.Item key={type.value} value={type.value}>
                                    <Accordion.Control>
                                        <Group justify="flex-start" style={{ width: '100%' }}>
                                            <Switch
                                              checked={template.enabled}
                                              onChange={(e) =>
                                                    toggleMessageType(
                                                        type.value,
                                                        e.currentTarget.checked
                                                    )
                                                }
                                              onClick={(e) => e.stopPropagation()}
                                              disabled={saving === type.value}
                                            />
                                            <Text fw={500}>{type.label}</Text>
                                        </Group>
                                    </Accordion.Control>
                                    <Accordion.Panel>
                                        <Stack gap="md" mt="md">
                                            <TextInput
                                              label="Subject"
                                              value={template.subject}
                                              onChange={(e) => {
                                                    setTemplates((prev) => {
                                                        const prevTemplate = prev[type.value];
                                                        if (isTemplate(prevTemplate)) {
                                                            return {
                                                                ...prev,
                                                                [type.value]: {
                                                                    ...prevTemplate,
                                                                    subject: e.target.value,
                                                                },
                                                            };
                                                        }
                                                        return prev;
                                                    });
                                                    markTemplateDirty(type.value);
                                                }}
                                            />
                                            <Stack gap="xs">
                                                <Text fw={500} size="sm">
                                                    Body
                                                </Text>
                                                <Text c="dimmed" size="xs">
                                                    Use the toolbar to format text. Line breaks
                                                    are preserved.
                                                </Text>
                                                <RichTextBodyEditor
                                                  value={template.body}
                                                  disabled={saving === type.value}
                                                  onChange={(nextValue) => {
                                                        setTemplates((prev) => {
                                                            const prevTemplate =
                                                                prev[type.value];
                                                            if (isTemplate(prevTemplate)) {
                                                                return {
                                                                    ...prev,
                                                                    [type.value]: {
                                                                        ...prevTemplate,
                                                                        body: nextValue,
                                                                    },
                                                                };
                                                            }
                                                            return prev;
                                                        });
                                                        markTemplateDirty(type.value);
                                                    }}
                                                />
                                            </Stack>
                                            <Select
                                              label="Notify Employee (Optional)"
                                              description="Send an internal notification to a team member when this message is scheduled to be sent."
                                              placeholder="Select employee"
                                              data={users.map((u) => ({
                                                    value: u.id,
                                                    label: u.full_name || u.email,
                                                }))}
                                              value={template.notification_user_id || null}
                                              onChange={(value) =>
                                                    (() => {
                                                        setTemplates((prev) => {
                                                            const prevTemplate =
                                                                prev[type.value];
                                                            if (isTemplate(prevTemplate)) {
                                                                return {
                                                                    ...prev,
                                                                    [type.value]: {
                                                                        ...prevTemplate,
                                                                        notification_user_id:
                                                                            value || undefined,
                                                                    },
                                                                };
                                                            }
                                                            return prev;
                                                        });
                                                        markTemplateDirty(type.value);
                                                    })()
                                                }
                                              clearable
                                              disabled={usersLoading}
                                            />
                                            {template.interval_days !== undefined && (
                                                <TextInput
                                                  label="Interval (days, Optional)"
                                                  description="How many days to wait before sending the next follow-up for this template."
                                                  type="number"
                                                  value={template.interval_days || ''}
                                                  onChange={(e) => {
                                                        const days =
                                                            parseInt(
                                                                e.target.value,
                                                                10
                                                            ) || undefined;
                                                        setTemplates((prev) => {
                                                            const prevTemplate =
                                                                prev[type.value];
                                                            if (isTemplate(prevTemplate)) {
                                                                return {
                                                                    ...(prev as Record<
                                                                        string,
                                                                        Template
                                                                    >),
                                                                    [type.value]: {
                                                                        ...prevTemplate,
                                                                        interval_days: days,
                                                                    },
                                                                } as TemplatesData;
                                                            }
                                                            return prev;
                                                        });
                                                        markTemplateDirty(type.value);
                                                    }}
                                                />
                                            )}
                                            {dirtyTemplates[type.value] && (
                                                <Group justify="flex-end">
                                                    <Button
                                                      onClick={() =>
                                                            updateTemplate(type.value, {
                                                                subject: template.subject,
                                                                body: template.body,
                                                                notification_user_id:
                                                                    template.notification_user_id,
                                                                interval_days:
                                                                    template.interval_days,
                                                            })
                                                        }
                                                      loading={saving === type.value}
                                                    >
                                                        Save Changes
                                                    </Button>
                                                </Group>
                                            )}
                                        </Stack>
                                    </Accordion.Panel>
                                </Accordion.Item>
                            );
                        })}
                    </Accordion>
                </Stack>
            </Card>
        </Stack>
    );
}

'use client';

import { useEffect, useState } from 'react';

import {
    Card,
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
import { RichTextEditor } from '@mantine/tiptap';
import '@mantine/tiptap/styles.css';
import { IconCheck, IconX } from '@tabler/icons-react';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

import styles from './TemplatesTab.module.css';

import { getApiHeaders } from '@/app/utils/apiClient';
import { useUsers } from '@/hooks/useUsers';

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

interface TemplateBodyEditorProps {
    value: string;
    onChange: (value: string) => void;
    onSave: (value: string) => void;
    disabled: boolean;
}

interface EditorLike {
    getHTML: () => string;
}

function TemplateBodyEditor({
    value,
    onChange,
    onSave,
    disabled,
}: TemplateBodyEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            Link.configure({ openOnClick: false }),
        ],
        content: value,
        onUpdate: ({ editor: editorInstance }: { editor: EditorLike }) => {
            onChange(editorInstance.getHTML());
        },
    });

    useEffect(() => {
        if (!editor) {
            return;
        }
        const current = editor.getHTML();
        if (value !== current) {
            editor.commands.setContent(value || '', false);
        }
    }, [editor, value]);

    useEffect(() => {
        if (!editor) {
            return;
        }
        editor.setEditable(!disabled);
    }, [editor, disabled]);

    useEffect(() => {
        if (!editor) {
            return undefined;
        }
        const handleBlur = () => {
            onSave(editor.getHTML());
        };
        editor.on('blur', handleBlur);
        return () => {
            editor.off('blur', handleBlur);
        };
    }, [editor, onSave]);

    return (
        <RichTextEditor
          editor={editor}
          classNames={{
                root: styles.templateBodyEditor,
                content: styles.templateBodyEditorContent,
                toolbar: styles.templateBodyEditorToolbar,
            }}
          variant="subtle"
        >
            <RichTextEditor.Content />
            <RichTextEditor.Toolbar sticky={false}>
                <RichTextEditor.ControlsGroup>
                    <RichTextEditor.Bold />
                    <RichTextEditor.Italic />
                    <RichTextEditor.Underline />
                    <RichTextEditor.Strikethrough />
                    <RichTextEditor.ClearFormatting />
                </RichTextEditor.ControlsGroup>
                <RichTextEditor.ControlsGroup>
                    <RichTextEditor.BulletList />
                    <RichTextEditor.OrderedList />
                </RichTextEditor.ControlsGroup>
                <RichTextEditor.ControlsGroup>
                    <RichTextEditor.Link />
                    <RichTextEditor.Unlink />
                </RichTextEditor.ControlsGroup>
            </RichTextEditor.Toolbar>
        </RichTextEditor>
    );
}

export default function TemplatesTab() {
    const [templates, setTemplates] = useState<TemplatesData>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const { users, loading: usersLoading } = useUsers();

    useEffect(() => {
        loadTemplates();
    }, []);

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
                                                }}
                                              onBlur={() =>
                                                    updateTemplate(type.value, {
                                                        subject: template.subject,
                                                    })
                                                }
                                            />
                                            <Stack gap="xs">
                                                <Text fw={500} size="sm">
                                                    Body
                                                </Text>
                                                <Text c="dimmed" size="xs">
                                                    Use the toolbar to format text. Line breaks
                                                    are preserved.
                                                </Text>
                                                <TemplateBodyEditor
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
                                                    }}
                                                  onSave={(nextValue) => {
                                                        if (nextValue === template.body) {
                                                            return;
                                                        }
                                                        updateTemplate(type.value, {
                                                            body: nextValue,
                                                        });
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
                                                    updateTemplate(type.value, {
                                                        notification_user_id: value || undefined,
                                                    })
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
                                                    }}
                                                  onBlur={() =>
                                                        updateTemplate(type.value, {
                                                            interval_days: template.interval_days,
                                                        })
                                                    }
                                                />
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

'use client';

import { useEffect, useState } from 'react';

import {
    Badge,
    Button,
    Card,
    Group,
    Stack,
    Text,
    Title,
    Loader,
    Alert,
    Paper,
    Tabs,
    Modal,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
    IconCheck,
    IconX,
    IconEdit,
    IconTrash,
    IconSend,
    IconPlus,
    IconSettings,
} from '@tabler/icons-react';

import MessageCreator from './MessageCreator';
import MessageEditor from './MessageEditor';

import { getApiHeaders } from '@/app/utils/apiClient';
import { useAuth } from '@/hooks/useAuth';

interface OutreachMessage {
    id: string;
    contractor_id: string;
    estimate_id?: string;
    client_id: string;
    message_type: string;
    subject: string;
    body: string;
    to_be_sent_date: string;
    sent_date?: string;
    send_count: number;
    recipient_type: string;
    recipient_sub_client_id?: string;
    status: string;
    created_at: string;
    updated_at: string;
    from_email?: string;
    to_emails?: string[];
    owner_name?: string;
}

const MESSAGE_TYPE_LABELS: Record<string, string> = {
    FOLLOW_UP_CHECK_IN: 'Follow-up Check-in',
    LAST_FOLLOW_UP: 'Last Follow-up',
    ACCEPTED_MESSAGE: 'Accepted Estimate',
    PRE_IN_PROGRESS_FOLLOW_UP: 'Pre-in-Progress Follow-up',
    SCHEDULED_MESSAGE: 'Scheduled Message',
    COLOR_SELECTION_REMINDER: 'Color Selection Reminder',
    IN_PROGRESS_MESSAGE: 'In-Progress Message',
    POST_COMPLETION_THANK_YOU: 'Post-Completion Thank You',
    CLIENT_FOLLOW_UP: 'Client Follow-up',
};

interface Client {
    id: string;
    name?: string;
    email?: string;
    phone_number?: string;
    address_street?: string;
    address_city?: string;
    address_state?: string;
    address_zipcode?: string;
    sub_clients?: Array<{
        id: string;
        name?: string;
        email?: string;
        role?: string;
    }>;
}

interface Estimate {
    id: string;
    title?: string;
    created_at?: string;
}

// Template rendering utility
const renderTemplate = (
    template: string,
    client?: Client,
    estimate?: Estimate
): string => {
    if (!template) return template;

    let result = template;

    // Client variables
    if (client) {
        result = result.replace(/\{\{client_name\}\}/g, client.name || '');
        result = result.replace(/\{\{client_email\}\}/g, client.email || '');
        result = result.replace(/\{\{client_phone\}\}/g, client.phone_number || '');

        // Build full address
        const addressParts = [];
        if (client.address_street) addressParts.push(client.address_street);
        if (client.address_city) addressParts.push(client.address_city);
        if (client.address_state) addressParts.push(client.address_state);
        if (client.address_zipcode) addressParts.push(client.address_zipcode);
        const fullAddress = addressParts.join(', ');
        result = result.replace(/\{\{client_address\}\}/g, fullAddress);

        result = result.replace(/\{\{client_city\}\}/g, client.address_city || '');
        result = result.replace(/\{\{client_state\}\}/g, client.address_state || '');
        result = result.replace(/\{\{client_zip\}\}/g, client.address_zipcode || '');
    }

    // Estimate variables
    if (estimate) {
        result = result.replace(/\{\{estimate_title\}\}/g, estimate.title || '');
        result = result.replace(/\{\{estimate_id\}\}/g, estimate.id || '');

        // Format estimate date
        if (estimate.created_at) {
            try {
                const date = new Date(estimate.created_at);
                const formattedDate = date.toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                });
                result = result.replace(/\{\{estimate_date\}\}/g, formattedDate);
            } catch {
                result = result.replace(/\{\{estimate_date\}\}/g, '');
            }
        } else {
            result = result.replace(/\{\{estimate_date\}\}/g, '');
        }
    }

    // Today's date
    const today = new Date().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });
    result = result.replace(/\{\{today_date\}\}/g, today);

    // Remove any remaining unreplaced variables
    result = result.replace(/\{\{[^}]+\}\}/g, '');

    return result;
};

export default function MessagingCenter() {
    const [messages, setMessages] = useState<OutreachMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [count, setCount] = useState(0);
    const [activeTab, setActiveTab] = useState<string | null>('today');
    const [editingMessage, setEditingMessage] = useState<OutreachMessage | null>(null);
    const [creatingMessage, setCreatingMessage] = useState(false);
    const [sending, setSending] = useState<string | null>(null);
    const [renderedMessages, setRenderedMessages] =
        useState<Record<string, { subject: string; body: string }>>({});
    const [showEmailConfigModal, setShowEmailConfigModal] = useState(false);
    const { isAuthenticated, isLoading } = useAuth();

    useEffect(() => {
        // Wait until authentication check is complete
        if (isLoading) {
            return undefined;
        }

        // Only make requests if authenticated
        if (!isAuthenticated) {
            setLoading(false);
            return undefined;
        }

        loadMessages();
        loadCount();
        // Refresh count every minute
        const interval = setInterval(() => {
            loadCount().catch(() => {
                // Ignore errors
            });
            return undefined;
        }, 60000);
        return function cleanup() {
            clearInterval(interval);
        };
    }, [isAuthenticated, isLoading]);

    const loadMessages = async () => {
        // Don't make request if not authenticated
        if (!isAuthenticated || isLoading) {
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const url = new URL('/api/outreach-messages', window.location.origin);
            if (activeTab === 'today') {
                const today = new Date().toISOString().split('T')[0];
                url.searchParams.append('due_before', `${today}T23:59:59Z`);
            } else if (activeTab === 'past') {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                url.searchParams.append('due_before', today.toISOString());
            } else if (activeTab === 'upcoming') {
                // For upcoming, we'll load all and filter client-side
            }
            url.searchParams.append('status', 'PENDING');

            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: getApiHeaders(),
            });

            if (!response.ok) {
                throw new Error('Failed to load messages');
            }

            let data: OutreachMessage[] = await response.json();

            // Filter by tab
            const now = new Date();
            if (activeTab === 'upcoming') {
                const tomorrow = new Date(now);
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setHours(0, 0, 0, 0);
                data = data.filter((msg) => new Date(msg.to_be_sent_date) >= tomorrow);
            } else if (activeTab === 'past') {
                const today = new Date(now);
                today.setHours(0, 0, 0, 0);
                data = data.filter((msg) => new Date(msg.to_be_sent_date) < today);
            } else if (activeTab === 'today') {
                const today = new Date(now);
                today.setHours(0, 0, 0, 0);
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);
                data = data.filter(
                    (msg) =>
                        new Date(msg.to_be_sent_date) >= today &&
                        new Date(msg.to_be_sent_date) < tomorrow
                );
            }

            // Sort by to_be_sent_date
            data.sort(
                (a, b) =>
                    new Date(a.to_be_sent_date).getTime() -
                    new Date(b.to_be_sent_date).getTime()
            );

            setMessages(data);

            // Check if any messages need client/estimate data for template rendering
            // Only fetch if templates contain variables that need this data
            const needsClientData = data.some(
                (m) =>
                    m.subject.includes('{{client_') ||
                    m.body.includes('{{client_') ||
                    m.subject.includes('{{estimate_') ||
                    m.body.includes('{{estimate_')
            );

            const clientMap = new Map<string, Client>();
            const estimateMap = new Map<string, Estimate>();

            if (needsClientData && data.length > 0) {
                // Fetch client and estimate data for template rendering
                // Fetch all unique client and estimate IDs
                const uniqueClientIds = [...new Set(data.map((m) => m.client_id))];
                const uniqueEstimateIds = [
                    ...new Set(data.map((m) => m.estimate_id).filter((id): id is string => !!id)),
                ];

                // Fetch all clients and estimates in parallel
                const [clientPromises, estimatePromises] = [
                    uniqueClientIds.map(async (clientId) => {
                        try {
                            const clientResponse = await fetch(`/api/clients/${clientId}`, {
                                method: 'GET',
                                headers: getApiHeaders(),
                            });
                            if (clientResponse.ok) {
                                const clientData = await clientResponse.json();
                                return { id: clientId, data: clientData.Item || clientData };
                            }
                            return { id: clientId, data: null };
                        } catch {
                            return { id: clientId, data: null };
                        }
                    }),
                    uniqueEstimateIds.map(async (estimateId) => {
                        try {
                            const estimatesResponse = await fetch(`/api/estimates/${estimateId}`, {
                                method: 'GET',
                                headers: getApiHeaders(),
                            });
                            if (estimatesResponse.ok) {
                                const estimatesData = await estimatesResponse.json();
                                return {
                                    id: estimateId,
                                    data: estimatesData.Item || estimatesData,
                                };
                            }
                            return { id: estimateId, data: null };
                        } catch {
                            return { id: estimateId, data: null };
                        }
                    }),
                ];

                const [clientResults, estimateResults] = await Promise.all([
                    Promise.all(clientPromises),
                    Promise.all(estimatePromises),
                ]);

                // Create lookup maps
                clientResults.forEach(({ id, data: clientData }) => {
                    if (clientData) clientMap.set(id, clientData);
                });

                estimateResults.forEach(({ id, data: estimateData }) => {
                    if (estimateData) estimateMap.set(id, estimateData);
                });
            }

            // Render templates for each message
            const renderedRecord: Record<string, { subject: string; body: string }> = {};

            data.forEach((message) => {
                const client = clientMap.get(message.client_id);
                const estimate = message.estimate_id
                    ? estimateMap.get(message.estimate_id)
                    : undefined;

                const renderedSubject = renderTemplate(message.subject, client, estimate);
                const renderedBody = renderTemplate(message.body, client, estimate);

                renderedRecord[message.id] = {
                    subject: renderedSubject,
                    body: renderedBody,
                };
            });

            setRenderedMessages(renderedRecord);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load messages');
        } finally {
            setLoading(false);
        }
    };

    const loadCount = async () => {
        // Don't make request if not authenticated
        if (!isAuthenticated || isLoading) {
            return;
        }

        try {
            const response = await fetch('/api/outreach-messages/count', {
                method: 'GET',
                headers: getApiHeaders(),
            });

            if (response.ok) {
                const data = await response.json();
                setCount(data.count || 0);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load count');
        }
    };

    useEffect(() => {
        // Only load messages if authenticated
        if (!isAuthenticated || isLoading) {
            return;
        }
        loadMessages();
    }, [activeTab, isAuthenticated, isLoading]);

    const handleSend = async (message: OutreachMessage) => {
        // Check if SES email identity is configured
        if (!message.from_email || message.from_email === 'info@jobsuite.app') {
            setShowEmailConfigModal(true);
            return;
        }

        try {
            setSending(message.id);
            setError(null);

            const response = await fetch(`/api/outreach-messages/${message.id}/send`, {
                method: 'POST',
                headers: getApiHeaders(),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to send message');
            }

            // Message was sent successfully - remove from state since it's no longer PENDING
            // (sent messages have status SENT and won't show in PENDING filter)
            setMessages((prev) => prev.filter((m) => m.id !== message.id));
            // Remove rendered message
            setRenderedMessages((prev) => {
                const updated = { ...prev };
                delete updated[message.id];
                return updated;
            });

            // Update count without reloading all messages
            await loadCount();

            notifications.show({
                title: 'Success',
                message: 'Message sent successfully',
                color: 'green',
                icon: <IconCheck size={16} />,
            });
        } catch (err) {
            notifications.show({
                title: 'Error',
                message: err instanceof Error ? err.message : 'Failed to send message',
                color: 'red',
                icon: <IconX size={16} />,
            });
        } finally {
            setSending(null);
        }
    };

    const handleDismiss = async (message: OutreachMessage) => {
        try {
            const response = await fetch(`/api/outreach-messages/${message.id}/dismiss`, {
                method: 'POST',
                headers: getApiHeaders(),
            });

            if (!response.ok) {
                throw new Error('Failed to dismiss message');
            }

            const dismissedMessage = await response.json();

            // If message was deleted (null response), remove it from state
            // If message was rescheduled (check-in messages), update it in state
            if (!dismissedMessage || dismissedMessage === null) {
                // Message was deleted - remove from state
                setMessages((prev) => prev.filter((m) => m.id !== message.id));
                // Remove rendered message if it exists
                setRenderedMessages((prev) => {
                    const updated = { ...prev };
                    delete updated[message.id];
                    return updated;
                });
            } else {
                // Message was rescheduled - update in state
                setMessages((prev) =>
                    prev.map((m) => (m.id === message.id ? dismissedMessage : m))
                );
                // Re-render the updated message if needed
                // We'll need to fetch client/estimate data for the updated message
                const clientResponse = await fetch(`/api/clients/${dismissedMessage.client_id}`, {
                    method: 'GET',
                    headers: getApiHeaders(),
                });
                const estimateResponse = await fetch(
                    `/api/estimates/${dismissedMessage.estimate_id}`,
                    {
                        method: 'GET',
                        headers: getApiHeaders(),
                    }
                );

                const client = clientResponse.ok
                    ? await clientResponse.json().then((data) => data.Item || data)
                    : undefined;
                const estimate = estimateResponse.ok
                    ? await estimateResponse.json().then((data) => data.Item || data)
                    : undefined;

                const renderedSubject = renderTemplate(dismissedMessage.subject, client, estimate);
                const renderedBody = renderTemplate(dismissedMessage.body, client, estimate);

                setRenderedMessages((prev) => ({
                    ...prev,
                    [dismissedMessage.id]: {
                        subject: renderedSubject,
                        body: renderedBody,
                    },
                }));
            }

            // Update count without reloading all messages
            await loadCount();

            notifications.show({
                title: 'Success',
                message: 'Message dismissed',
                color: 'green',
                icon: <IconCheck size={16} />,
            });
        } catch (err) {
            notifications.show({
                title: 'Error',
                message: 'Failed to dismiss message',
                color: 'red',
                icon: <IconX size={16} />,
            });
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        });
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
            <Group justify="space-between" mb="xl">
                <div>
                    <Title c="white" order={1} mb="xs">
                        Messaging Center
                    </Title>
                    <Text c="dimmed">
                        Manage and send outreach messages to customers
                    </Text>
                </div>
                <Group gap="md">
                    {count > 0 && (
                        <Badge size="lg" color="red" variant="filled">
                            {count} due today
                        </Badge>
                    )}
                    <Button
                      leftSection={<IconPlus size={16} />}
                      onClick={() => setCreatingMessage(true)}
                    >
                        Create Message
                    </Button>
                </Group>
            </Group>

            {error && (
                <Alert color="red" title="Error" mb="md">
                    {error}
                </Alert>
            )}

            <Tabs value={activeTab} onChange={setActiveTab}>
                <Tabs.List>
                    <Tabs.Tab value="today" c="gray.3">
                        Today
                        {activeTab === 'today' && count > 0 && (
                            <Badge size="sm" color="red" ml="xs">
                                {count}
                            </Badge>
                        )}
                    </Tabs.Tab>
                    <Tabs.Tab value="past" c="gray.3">Past Due</Tabs.Tab>
                    <Tabs.Tab value="upcoming" c="gray.3">Upcoming</Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value={activeTab || 'today'} pt="md">
                    {loading ? (
                        <Stack align="center" gap="md">
                            <Loader size="md" />
                            <Text c="dimmed">Loading messages...</Text>
                        </Stack>
                    ) : messages.length === 0 ? (
                        <Paper p="xl" radius="md" withBorder>
                            <Stack align="center" gap="md">
                                <Text size="lg" c="dimmed" ta="center">
                                    No messages to display
                                </Text>
                            </Stack>
                        </Paper>
                    ) : (
                        <Stack gap="md">
                            {messages.map((message) => (
                                <Card
                                  key={message.id}
                                  shadow="sm"
                                  padding="lg"
                                  radius="md"
                                  withBorder
                                >
                                    <Stack gap="md">
                                        {/* Top: Subject/Due left, center, Badge right */}
                                        <Group justify="space-between" align="flex-start">
                                            <div style={{ flex: 1 }}>
                                                <Text fw={600} size="lg">
                                                    {
                                                        renderedMessages[message.id]?.subject ||
                                                        message.subject
                                                    }
                                                </Text>
                                                <Text c="dimmed" size="sm">
                                                    Due: {formatDate(message.to_be_sent_date)}
                                                </Text>
                                                {message.estimate_id && (
                                                    <Text c="dimmed" size="xs" mt="xs">
                                                        Estimate:{' '}
                                                        <Text
                                                          component="a"
                                                          href={`/proposals/${message.estimate_id}`}
                                                          target="_blank"
                                                          rel="noopener noreferrer"
                                                          c="blue"
                                                          fw={500}
                                                          size="xs"
                                                          style={{ textDecoration: 'underline', cursor: 'pointer' }}
                                                        >
                                                            View Estimate
                                                        </Text>
                                                    </Text>
                                                )}
                                            </div>
                                            <Stack gap={4} style={{ flex: 1, alignItems: 'center' }}>
                                                <Text size="xs" fw={700}>
                                                    Owner:{' '}
                                                    <Text
                                                      component="span"
                                                      fw={500}
                                                      size="xs"
                                                      c="dimmed"
                                                    >
                                                        {message.owner_name || 'Unknown'}
                                                    </Text>
                                                </Text>
                                                <Group gap="md">
                                                    <Text fw={700} size="xs">
                                                        From:{' '}
                                                        <Text
                                                          component="span"
                                                          fw={500}
                                                          size="xs"
                                                          c="dimmed"
                                                        >
                                                            {message.from_email || 'info@jobsuite.app'}
                                                        </Text>
                                                    </Text>
                                                    <Text fw={700} size="xs">
                                                        To:{' '}
                                                        <Text
                                                          component="span"
                                                          fw={500}
                                                          size="xs"
                                                          c="dimmed"
                                                        >
                                                            {message.to_emails &&
                                                            message.to_emails.length > 0
                                                                ? message.to_emails.join(', ')
                                                                : 'No recipients'}
                                                        </Text>
                                                    </Text>
                                                </Group>
                                            </Stack>
                                            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start', gap: 'xs' }}>
                                                <Badge variant="light">
                                                    {MESSAGE_TYPE_LABELS[
                                                        message.message_type
                                                    ] || message.message_type}
                                                </Badge>
                                                {message.send_count > 0 && (
                                                    <Badge variant="outline" size="sm">
                                                        Sent {message.send_count}x
                                                    </Badge>
                                                )}
                                            </div>
                                        </Group>

                                        <div
                                          style={{
                                                fontSize: '0.875rem',
                                                lineHeight: 1.5,
                                                color: 'var(--mantine-color-text)',
                                                maxHeight: '7.5em', // ~5 lines at 1.5 line-height
                                                overflow: 'hidden',
                                                wordBreak: 'break-word',
                                            }}
                                          dangerouslySetInnerHTML={{
                                                __html: (
                                                    renderedMessages[message.id]?.body ||
                                                    message.body
                                                )
                                                    .replace(/<br\s*\/?>/gi, '<br />'), // Normalize br tags
                                            }}
                                        />

                                        <Group justify="flex-end">
                                            <Button
                                              variant="subtle"
                                              leftSection={<IconEdit size={16} />}
                                              onClick={() => setEditingMessage(message)}
                                            >
                                                Edit
                                            </Button>
                                            <Button
                                              variant="subtle"
                                              color="red"
                                              leftSection={<IconTrash size={16} />}
                                              onClick={() => handleDismiss(message)}
                                            >
                                                Dismiss
                                            </Button>
                                            <Button
                                              leftSection={<IconSend size={16} />}
                                              onClick={() => handleSend(message)}
                                              loading={sending === message.id}
                                              disabled={message.status !== 'PENDING'}
                                            >
                                                Send
                                            </Button>
                                        </Group>
                                    </Stack>
                                </Card>
                            ))}
                        </Stack>
                    )}
                </Tabs.Panel>
            </Tabs>

            {editingMessage && (
                <MessageEditor
                  message={editingMessage}
                  onClose={() => {
                        setEditingMessage(null);
                        loadMessages();
                    }}
                />
            )}

            <MessageCreator
              opened={creatingMessage}
              onClose={() => setCreatingMessage(false)}
              onSuccess={() => {
                    loadMessages();
                    loadCount();
                }}
            />

            <Modal
              opened={showEmailConfigModal}
              onClose={() => setShowEmailConfigModal(false)}
              title="Email Configuration Required"
              centered
              zIndex={400}
              overlayProps={{
                backgroundOpacity: 0.75,
                blur: 3,
              }}
            >
                <Stack gap="md">
                    <Text>
                        You need to configure a client outreach email address before
                        sending messages. This email will be used as the &quot;From&quot;
                        address for all outreach emails.
                    </Text>
                    <Group justify="flex-end">
                        <Button
                          variant="subtle"
                          onClick={() => setShowEmailConfigModal(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                          leftSection={<IconSettings size={16} />}
                          onClick={() => {
                                setShowEmailConfigModal(false);
                                window.location.href = '/settings';
                            }}
                        >
                            Go to Settings
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </div>
    );
}

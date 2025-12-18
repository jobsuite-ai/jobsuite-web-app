'use client';

import { useState, useEffect } from 'react';

import {
    Modal,
    Stack,
    TextInput,
    Textarea,
    Button,
    Group,
    Select,
    Loader,
    NumberInput,
    Radio,
    Divider,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconX } from '@tabler/icons-react';

import { getApiHeaders } from '@/app/utils/apiClient';

interface Estimate {
    id: string;
    client_id: string;
    client_name?: string;
    title?: string;
}

interface Client {
    id: string;
    name?: string;
    email?: string;
}

interface User {
    id: string;
    full_name?: string;
    email: string;
}

interface Template {
    subject: string;
    body: string;
    enabled?: boolean;
    notification_user_id?: string;
}

interface MessageCreatorProps {
    opened: boolean;
    onClose: () => void;
    onSuccess: () => void;
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

export default function MessageCreator({
    opened,
    onClose,
    onSuccess,
}: MessageCreatorProps) {
    const [loading, setLoading] = useState(false);
    const [estimates, setEstimates] = useState<Estimate[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [templates, setTemplates] = useState<Record<string, Template>>({});
    const [loadingData, setLoadingData] = useState(true);

    // Form state
    const [selectedEstimateId, setSelectedEstimateId] = useState<string | null>(null);
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const [daysOut, setDaysOut] = useState<number>(7);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [messageType, setMessageType] = useState<string>('SCHEDULED_MESSAGE');
    const [useTemplate, setUseTemplate] = useState<'template' | 'custom'>('template');
    const [selectedTemplateType, setSelectedTemplateType] = useState<string | null>(null);
    const [customSubject, setCustomSubject] = useState('');
    const [customBody, setCustomBody] = useState('');
    const [recipientType, setRecipientType] = useState<string>('ALL_SUB_CLIENTS');
    const [selectedSubClientId, setSelectedSubClientId] = useState<string | null>(null);
    const [subClients, setSubClients] = useState<Array<{ value: string; label: string }>>([]);
    const [clientEmail, setClientEmail] = useState<string>('');

    useEffect(() => {
        if (opened) {
            loadData();
        }
    }, [opened]);

    useEffect(() => {
        if (selectedEstimateId) {
            loadSubClients();
            setSelectedClientId(null); // Clear client selection when estimate is selected
        } else if (selectedClientId) {
            loadSubClientsForClient();
        } else {
            setSubClients([]);
            setClientEmail('');
        }
    }, [selectedEstimateId, selectedClientId]);

    useEffect(() => {
        // If recipient type is SINGLE_SUB_CLIENT but there
        // are no sub-clients, reset to ALL_SUB_CLIENTS
        if (recipientType === 'SINGLE_SUB_CLIENT' && subClients.length === 0) {
            setRecipientType('ALL_SUB_CLIENTS');
            setSelectedSubClientId(null);
        }
    }, [subClients, recipientType]);

    useEffect(() => {
        if (useTemplate === 'template' && selectedTemplateType) {
            const template = templates[selectedTemplateType];
            if (template) {
                setCustomSubject(template.subject);
                setCustomBody(template.body);
                if (template.notification_user_id) {
                    setSelectedUserId(template.notification_user_id);
                }
            }
        }
    }, [useTemplate, selectedTemplateType, templates]);

    const loadData = async () => {
        try {
            setLoadingData(true);

            // Load estimates
            const estimatesResponse = await fetch('/api/estimates', {
                method: 'GET',
                headers: getApiHeaders(),
            });
            if (estimatesResponse.ok) {
                const estimatesData = await estimatesResponse.json();
                // Handle both { Items: [...] } and direct array responses
                const estimatesArray = Array.isArray(estimatesData)
                    ? estimatesData
                    : estimatesData.Items || [];
                setEstimates(estimatesArray);
            }

            // Load clients
            const clientsResponse = await fetch('/api/clients', {
                method: 'GET',
                headers: getApiHeaders(),
            });
            if (clientsResponse.ok) {
                const clientsData = await clientsResponse.json();
                const clientsArray = Array.isArray(clientsData)
                    ? clientsData
                    : clientsData.Items || [];
                setClients(clientsArray);
            }

            // Load users
            const usersResponse = await fetch('/api/users', {
                method: 'GET',
                headers: getApiHeaders(),
            });
            if (usersResponse.ok) {
                const usersData = await usersResponse.json();
                setUsers(usersData);
            }

            // Load templates
            const templatesResponse = await fetch('/api/outreach-templates', {
                method: 'GET',
                headers: getApiHeaders(),
            });
            if (templatesResponse.ok) {
                const templatesData = await templatesResponse.json();
                // Remove internal fields
                const { _ses_identity, _review_link, ...templateMap } = templatesData;
                setTemplates(templateMap);
            }
        } catch (err) {
            notifications.show({
                title: 'Error',
                message: 'Failed to load data',
                color: 'red',
                icon: <IconX size={16} />,
            });
        } finally {
            setLoadingData(false);
        }
    };

    const loadSubClients = async () => {
        if (!selectedEstimateId || !Array.isArray(estimates)) return;

        const selectedEstimate = estimates.find((e) => e.id === selectedEstimateId);
        if (!selectedEstimate) return;

        try {
            const response = await fetch(`/api/clients/${selectedEstimate.client_id}`, {
                method: 'GET',
                headers: getApiHeaders(),
            });

            if (response.ok) {
                const data = await response.json();
                const client = data.Item || data;
                setClientEmail(client.email || '');
                if (client.sub_clients && client.sub_clients.length > 0) {
                    // Include main client email as first option, then sub-clients
                    const mainClientOption = {
                        value: 'MAIN_CLIENT',
                        label: `${client.name || 'Main Client'} (${client.email})`,
                    };
                    const subClientOptions = client.sub_clients.map((sc: any) => ({
                        value: sc.id,
                        label: sc.name || sc.email,
                    }));
                    setSubClients([mainClientOption, ...subClientOptions]);
                } else {
                    setSubClients([]);
                }
            }
        } catch (err) {
            notifications.show({
                title: 'Error',
                message: 'Error loading sub-clients',
                color: 'red',
                icon: <IconX size={16} />,
            });
        }
    };

    const loadSubClientsForClient = async () => {
        if (!selectedClientId) return;

        try {
            const response = await fetch(`/api/clients/${selectedClientId}`, {
                method: 'GET',
                headers: getApiHeaders(),
            });

            if (response.ok) {
                const data = await response.json();
                const client = data.Item || data;
                setClientEmail(client.email || '');
                if (client.sub_clients && client.sub_clients.length > 0) {
                    // Include main client email as first option, then sub-clients
                    const mainClientOption = {
                        value: 'MAIN_CLIENT',
                        label: `${client.name || 'Main Client'} (${client.email})`,
                    };
                    const subClientOptions = client.sub_clients.map((sc: any) => ({
                        value: sc.id,
                        label: sc.name || sc.email,
                    }));
                    setSubClients([mainClientOption, ...subClientOptions]);
                } else {
                    setSubClients([]);
                }
            }
        } catch (err) {
            notifications.show({
                title: 'Error',
                message: 'Error loading sub-clients',
                color: 'red',
                icon: <IconX size={16} />,
            });
        }
    };

    const handleCreate = async () => {
        if (!selectedEstimateId && !selectedClientId) {
            notifications.show({
                title: 'Error',
                message: 'Please select an estimate or a client',
                color: 'red',
                icon: <IconX size={16} />,
            });
            return;
        }

        if (useTemplate === 'template' && !selectedTemplateType) {
            notifications.show({
                title: 'Error',
                message: 'Please select a template',
                color: 'red',
                icon: <IconX size={16} />,
            });
            return;
        }

        if (useTemplate === 'custom') {
            if (!customSubject.trim() || !customBody.trim()) {
                notifications.show({
                    title: 'Error',
                    message: 'Please provide both subject and body',
                    color: 'red',
                    icon: <IconX size={16} />,
                });
                return;
            }
        }

        if (subClients.length > 0 && recipientType === 'SINGLE_SUB_CLIENT' && !selectedSubClientId) {
            notifications.show({
                title: 'Error',
                message: 'Please select a sub-client',
                color: 'red',
                icon: <IconX size={16} />,
            });
            return;
        }

        try {
            setLoading(true);

            let clientId: string;
            let estimateId: string | null = null;

            if (selectedEstimateId) {
                if (!Array.isArray(estimates)) {
                    throw new Error('Estimates data is not available');
                }

                const selectedEstimate = estimates.find((e) => e.id === selectedEstimateId);
                if (!selectedEstimate) {
                    throw new Error('Selected estimate not found');
                }

                clientId = selectedEstimate.client_id;
                estimateId = selectedEstimateId;
            } else if (selectedClientId) {
                clientId = selectedClientId;
                estimateId = null; // Client-only message
            } else {
                throw new Error('No estimate or client selected');
            }

            // Calculate to_be_sent_date
            const sendDate = new Date();
            sendDate.setDate(sendDate.getDate() + daysOut);
            sendDate.setHours(9, 0, 0, 0); // Set to 9 AM

            const createData: any = {
                client_id: clientId,
                message_type: messageType,
                subject: useTemplate === 'template' ? customSubject : customSubject,
                body: useTemplate === 'template' ? customBody : customBody,
                to_be_sent_date: sendDate.toISOString(),
            };

            // Only include estimate_id if it's not null
            if (estimateId) {
                createData.estimate_id = estimateId;
            }

            // Only include recipient_type if there are sub-clients
            if (subClients.length > 0) {
                createData.recipient_type = recipientType;
                if (recipientType === 'SINGLE_SUB_CLIENT' && selectedSubClientId) {
                    // Only include recipient_sub_client_id if it's not the main client
                    if (selectedSubClientId !== 'MAIN_CLIENT') {
                        createData.recipient_sub_client_id = selectedSubClientId;
                    }
                }
            }

            const response = await fetch('/api/outreach-messages', {
                method: 'POST',
                headers: getApiHeaders(),
                body: JSON.stringify(createData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to create message');
            }

            notifications.show({
                title: 'Success',
                message: 'Message created successfully',
                color: 'green',
                icon: <IconCheck size={16} />,
            });

            // Reset form
            setSelectedEstimateId(null);
            setDaysOut(7);
            setSelectedUserId(null);
            setMessageType('SCHEDULED_MESSAGE');
            setUseTemplate('template');
            setSelectedTemplateType(null);
            setCustomSubject('');
            setCustomBody('');
            setRecipientType('ALL_SUB_CLIENTS');
            setSelectedSubClientId(null);

            onSuccess();
            onClose();
        } catch (err) {
            notifications.show({
                title: 'Error',
                message: err instanceof Error ? err.message : 'Failed to create message',
                color: 'red',
                icon: <IconX size={16} />,
            });
        } finally {
            setLoading(false);
        }
    };

    const templateOptions = Object.keys(templates)
        .filter((key) => templates[key].enabled !== false)
        .map((key) => ({
            value: key,
            label: MESSAGE_TYPE_LABELS[key] || key,
        }));

    return (
        <Modal
          opened={opened}
          onClose={onClose}
          title="Create New Message"
          size="lg"
          centered
          zIndex={1000}
          overlayProps={{
            backgroundOpacity: 0.75,
            blur: 3,
            zIndex: 1000,
          }}
          styles={{
            inner: { zIndex: 1000 },
          }}
        >
            {loadingData ? (
                <Stack align="center" gap="md" py="xl">
                    <Loader size="md" />
                    <div>Loading data...</div>
                </Stack>
            ) : (
                <Stack gap="md">
                    <Select
                      label="Estimate (Optional)"
                      placeholder="Select an estimate (or select a client below)"
                      data={
                            Array.isArray(estimates)
                                ? estimates.map((e) => ({
                                      value: e.id,
                                      label: `${e.title || e.id}${e.client_name ? ` - ${e.client_name}` : ''}`,
                                  }))
                                : []
                        }
                      value={selectedEstimateId}
                      onChange={(value) => {
                            setSelectedEstimateId(value);
                            if (value) {
                                setSelectedClientId(null); // Clear client when estimate is selected
                            }
                        }}
                      clearable
                      searchable
                      comboboxProps={{ withinPortal: true, zIndex: 1001 }}
                    />

                    <Select
                      label="Client (Optional - for client-only messages)"
                      placeholder="Select a client (if no estimate selected)"
                      data={
                            Array.isArray(clients)
                                ? clients.map((c) => ({
                                      value: c.id,
                                      label: c.name || c.email || c.id,
                                  }))
                                : []
                        }
                      value={selectedClientId}
                      onChange={(value) => {
                            setSelectedClientId(value);
                            if (value) {
                                setSelectedEstimateId(null);
                            }
                        }}
                      clearable
                      searchable
                      disabled={!!selectedEstimateId}
                      comboboxProps={{ withinPortal: true, zIndex: 1001 }}
                    />

                    <NumberInput
                      label="Schedule (days from now)"
                      value={daysOut}
                      onChange={(value) => setDaysOut(typeof value === 'number' ? value : 0)}
                      min={0}
                      required
                    />

                    <Select
                      label="Owning User"
                      placeholder="Select user to assign this message"
                      data={users.map((u) => ({
                            value: u.id,
                            label: u.full_name || u.email,
                        }))}
                      value={selectedUserId}
                      onChange={setSelectedUserId}
                      clearable
                      searchable
                      comboboxProps={{ withinPortal: true, zIndex: 1001 }}
                    />

                    <Select
                      label="Message Type"
                      data={Object.entries(MESSAGE_TYPE_LABELS).map(([value, label]) => ({
                            value,
                            label,
                        }))}
                      value={messageType}
                      onChange={(value) => setMessageType(value || 'SCHEDULED_MESSAGE')}
                      required
                      comboboxProps={{ withinPortal: true, zIndex: 1001 }}
                    />

                    <Divider label="Message Content" labelPosition="center" />

                    <Radio.Group
                      value={useTemplate}
                      onChange={(value) => setUseTemplate(value as 'template' | 'custom')}
                    >
                        <Stack gap="xs">
                            <Radio value="template" label="Use Template" />
                            <Radio value="custom" label="Custom Subject & Body" />
                        </Stack>
                    </Radio.Group>

                    {useTemplate === 'template' && (
                        <Select
                          label="Template"
                          placeholder="Select a template"
                          data={templateOptions}
                          value={selectedTemplateType}
                          onChange={setSelectedTemplateType}
                          required
                          comboboxProps={{ withinPortal: true, zIndex: 1001 }}
                        />
                    )}

                    <TextInput
                      label="Subject"
                      value={customSubject}
                      onChange={(e) => setCustomSubject(e.target.value)}
                      required
                      disabled={useTemplate === 'template' && selectedTemplateType !== null}
                    />

                    <Textarea
                      label="Body (HTML supported)"
                      value={customBody}
                      onChange={(e) => setCustomBody(e.target.value)}
                      minRows={8}
                      required
                      disabled={useTemplate === 'template' && selectedTemplateType !== null}
                    />

                    {subClients.length > 0 ? (
                        <>
                            <Select
                              label="Recipients"
                              data={[
                                    { value: 'ALL_SUB_CLIENTS', label: 'All Sub-clients' },
                                    { value: 'SINGLE_SUB_CLIENT', label: 'Single Person' },
                                ]}
                              value={recipientType}
                              onChange={(value) => setRecipientType(value || 'ALL_SUB_CLIENTS')}
                              comboboxProps={{ withinPortal: true, zIndex: 1001 }}
                            />

                            {recipientType === 'SINGLE_SUB_CLIENT' && (
                                <Select
                                  label="Select Recipient"
                                  data={subClients}
                                  value={selectedSubClientId}
                                  onChange={setSelectedSubClientId}
                                  placeholder="Choose a recipient"
                                  required
                                  comboboxProps={{ withinPortal: true, zIndex: 1001 }}
                                  styles={{
                                    dropdown: { zIndex: 500 },
                                  }}
                                />
                            )}
                        </>
                    ) : (
                        <TextInput
                          label="Recipient Email"
                          value={clientEmail || 'Loading...'}
                          readOnly
                          disabled
                        />
                    )}

                    <Group justify="flex-end" mt="md">
                        <Button variant="subtle" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreate} loading={loading}>
                            Create Message
                        </Button>
                    </Group>
                </Stack>
            )}
        </Modal>
    );
}

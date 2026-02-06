'use client';

import { useState, useEffect } from 'react';

import {
    Modal,
    Stack,
    Text,
    TextInput,
    Button,
    Group,
    Select,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconX } from '@tabler/icons-react';

import { getApiHeaders } from '@/app/utils/apiClient';
import RichTextBodyEditor from '@/components/Global/RichTextBodyEditor';

interface OutreachMessage {
    id: string;
    contractor_id: string;
    estimate_id?: string;
    client_id: string;
    message_type: string;
    subject: string;
    body: string;
    to_be_sent_date: string;
    recipient_type: string;
    recipient_sub_client_id?: string;
    status: string;
}

interface MessageEditorProps {
    message: OutreachMessage;
    onClose: (didUpdate: boolean) => void;
}

export default function MessageEditor({ message, onClose }: MessageEditorProps) {
    const [subject, setSubject] = useState(message.subject);
    const [body, setBody] = useState(message.body);
    const [recipientType, setRecipientType] = useState(message.recipient_type);
    const [saving, setSaving] = useState(false);
    const [subClients, setSubClients] = useState<Array<{ value: string; label: string }>>([]);
    const [selectedSubClient, setSelectedSubClient] = useState<string | null>(
        message.recipient_sub_client_id || null
    );

    useEffect(() => {
        // Load sub-clients for the estimate's client
        loadSubClients();
    }, []);

    const loadSubClients = async () => {
        try {
            const response = await fetch(`/api/clients/${message.client_id}`, {
                method: 'GET',
                headers: getApiHeaders(),
            });

            if (response.ok) {
                const data = await response.json();
                // Handle both wrapped (Item) and unwrapped responses
                const client = data.Item || data;
                if (client.sub_clients && client.sub_clients.length > 0) {
                    setSubClients(
                        client.sub_clients.map((sc: any) => ({
                            value: sc.id,
                            label: sc.name || sc.email,
                        }))
                    );
                }
            }
        } catch (err) {
            // Error loading sub-clients - silently fail as this is not critical
        }
    };

    const hasChanges =
        subject !== message.subject ||
        body !== message.body ||
        recipientType !== message.recipient_type ||
        (recipientType === 'SINGLE_SUB_CLIENT'
            ? selectedSubClient !== (message.recipient_sub_client_id || null)
            : message.recipient_type === 'SINGLE_SUB_CLIENT');

    const handleSave = async () => {
        if (!hasChanges) {
            onClose(false);
            return;
        }

        try {
            setSaving(true);

            const updateData: any = {
                subject,
                body,
                recipient_type: recipientType,
            };

            if (recipientType === 'SINGLE_SUB_CLIENT' && selectedSubClient) {
                updateData.recipient_sub_client_id = selectedSubClient;
            }

            const response = await fetch(`/api/outreach-messages/${message.id}`, {
                method: 'PUT',
                headers: getApiHeaders(),
                body: JSON.stringify(updateData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update message');
            }

            notifications.show({
                title: 'Success',
                message: 'Message updated successfully',
                color: 'green',
                icon: <IconCheck size={16} />,
            });

            onClose(true);
        } catch (err) {
            notifications.show({
                title: 'Error',
                message: err instanceof Error ? err.message : 'Failed to update message',
                color: 'red',
                icon: <IconX size={16} />,
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
          opened
          onClose={() => onClose(false)}
          title="Edit Message"
          size="xl"
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
            <Stack gap="md">
                <TextInput
                  label="Subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
                <Stack gap="xs">
                    <Text size="sm" fw={500}>
                        Body
                    </Text>
                    <Text c="dimmed" size="xs">
                        Use the toolbar to format text. Line breaks are preserved.
                    </Text>
                    <RichTextBodyEditor value={body} onChange={setBody} />
                </Stack>
                <Select
                  label="Recipients"
                  data={[
                        { value: 'ALL_SUB_CLIENTS', label: 'All Sub-clients' },
                        { value: 'SINGLE_SUB_CLIENT', label: 'Single Sub-client' },
                    ]}
                  value={recipientType}
                  onChange={(value) => setRecipientType(value || 'ALL_SUB_CLIENTS')}
                  comboboxProps={{ withinPortal: true, zIndex: 1001 }}
                />
                {recipientType === 'SINGLE_SUB_CLIENT' && subClients.length > 0 && (
                    <Select
                      label="Select Sub-client"
                      data={subClients}
                      value={selectedSubClient}
                      onChange={setSelectedSubClient}
                      placeholder="Choose a sub-client"
                      comboboxProps={{ withinPortal: true, zIndex: 1001 }}
                      styles={{
                        dropdown: { zIndex: 500 },
                      }}
                    />
                )}
                <Group justify="flex-end" mt="md">
                    <Button variant="subtle" onClick={() => onClose(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} loading={saving}>
                        Save
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}

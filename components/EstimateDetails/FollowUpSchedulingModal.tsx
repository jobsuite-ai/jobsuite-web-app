'use client';

import { useState, useEffect } from 'react';

import {
    Modal,
    Stack,
    Text,
    TextInput,
    Textarea,
    Button,
    Group,
    Select,
    Loader,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import '@mantine/dates/styles.css';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconX } from '@tabler/icons-react';

import { Estimate, ContractorClient } from '../Global/model';

import { getApiHeaders } from '@/app/utils/apiClient';

interface FollowUpSchedulingModalProps {
    opened: boolean;
    onClose: () => void;
    onSuccess: () => void;
    estimate: Estimate;
    client: ContractorClient;
}

export default function FollowUpSchedulingModal({
    opened,
    onClose,
    onSuccess,
    estimate,
    client,
}: FollowUpSchedulingModalProps) {
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [toBeSentDate, setToBeSentDate] = useState<Date | null>(null);
    const [recipientType, setRecipientType] = useState<string>('ALL_SUB_CLIENTS');
    const [selectedSubClientId, setSelectedSubClientId] = useState<string | null>(null);
    const [subClients, setSubClients] = useState<Array<{ value: string; label: string }>>([]);
    const [saving, setSaving] = useState(false);
    const [loadingSubClients, setLoadingSubClients] = useState(false);

    useEffect(() => {
        if (opened) {
            // Set default date to 7 days from now
            const defaultDate = new Date();
            defaultDate.setDate(defaultDate.getDate() + 7);
            setToBeSentDate(defaultDate);
            setSubject('');
            setBody('');
            setRecipientType('ALL_SUB_CLIENTS');
            setSelectedSubClientId(null);
            loadSubClients();
        }
    }, [opened, client.id]);

    const loadSubClients = async () => {
        if (!client.id) return;

        try {
            setLoadingSubClients(true);
            const response = await fetch(`/api/clients/${client.id}`, {
                method: 'GET',
                headers: getApiHeaders(),
            });

            if (response.ok) {
                const data = await response.json();
                const clientData = data.Item || data;
                if (clientData.sub_clients && clientData.sub_clients.length > 0) {
                    setSubClients(
                        clientData.sub_clients.map((sc: any) => ({
                            value: sc.id,
                            label: sc.name || sc.email || 'Unknown',
                        }))
                    );
                } else {
                    setSubClients([]);
                }
            }
        } catch (err) {
            // Error loading sub-clients - silently fail
        } finally {
            setLoadingSubClients(false);
        }
    };

    const handleSave = async () => {
        if (!subject.trim()) {
            notifications.show({
                title: 'Error',
                message: 'Subject is required',
                color: 'red',
                icon: <IconX size={16} />,
            });
            return;
        }

        if (!body.trim()) {
            notifications.show({
                title: 'Error',
                message: 'Body is required',
                color: 'red',
                icon: <IconX size={16} />,
            });
            return;
        }

        if (!toBeSentDate) {
            notifications.show({
                title: 'Error',
                message: 'Date is required',
                color: 'red',
                icon: <IconX size={16} />,
            });
            return;
        }

        try {
            setSaving(true);

            const messageData: any = {
                estimate_id: estimate.id,
                client_id: client.id,
                message_type: 'CLIENT_FOLLOW_UP',
                subject: subject.trim(),
                body: body.trim(),
                to_be_sent_date: toBeSentDate.toISOString(),
                recipient_type: recipientType,
            };

            if (recipientType === 'SINGLE_SUB_CLIENT' && selectedSubClientId) {
                messageData.recipient_sub_client_id = selectedSubClientId;
            }

            const response = await fetch('/api/outreach-messages', {
                method: 'POST',
                headers: getApiHeaders(),
                body: JSON.stringify(messageData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to create follow-up message');
            }

            notifications.show({
                title: 'Success',
                message: 'Follow-up message scheduled successfully',
                color: 'green',
                icon: <IconCheck size={16} />,
            });

            onSuccess();
            onClose();
        } catch (err) {
            notifications.show({
                title: 'Error',
                message: err instanceof Error ? err.message : 'Failed to create follow-up message',
                color: 'red',
                icon: <IconX size={16} />,
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
          opened={opened}
          onClose={onClose}
          title="Schedule Follow-up Message"
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
            <Stack gap="md">
                <DatePickerInput
                  label="Follow-up Date"
                  value={toBeSentDate}
                  onChange={setToBeSentDate}
                  required
                  minDate={new Date()}
                  placeholder="Select a date"
                  popoverProps={{ withinPortal: true, zIndex: 1001 }}
                />
                <TextInput
                  label="Subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  placeholder="Enter message subject"
                />
                <Textarea
                  label="Body (HTML supported)"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  required
                  minRows={8}
                  placeholder="Enter message body"
                />
                <Select
                  label="Recipients"
                  data={[
                        { value: 'ALL_SUB_CLIENTS', label: 'All Sub-clients' },
                        { value: 'SINGLE_SUB_CLIENT', label: 'Single Sub-client' },
                    ]}
                  value={recipientType}
                  onChange={(value) => {
                        setRecipientType(value || 'ALL_SUB_CLIENTS');
                        if (value !== 'SINGLE_SUB_CLIENT') {
                            setSelectedSubClientId(null);
                        }
                    }}
                  comboboxProps={{ withinPortal: true, zIndex: 1001 }}
                />
                {loadingSubClients ? (
                    <Loader size="sm" />
                ) : recipientType === 'SINGLE_SUB_CLIENT' && subClients.length > 0 ? (
                    <Select
                      label="Select Sub-client"
                      data={subClients}
                      value={selectedSubClientId}
                      onChange={setSelectedSubClientId}
                      placeholder="Choose a sub-client"
                      required
                      comboboxProps={{ withinPortal: true, zIndex: 1001 }}
                      styles={{
                        dropdown: { zIndex: 500 },
                      }}
                    />
                ) : recipientType === 'SINGLE_SUB_CLIENT' && subClients.length === 0 ? (
                    <Text size="sm" c="dimmed">
                        No sub-clients available for this client
                    </Text>
                ) : null}
                <Group justify="flex-end" mt="md">
                    <Button variant="subtle" onClick={onClose} disabled={saving}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} loading={saving}>
                        Schedule Follow-up
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}

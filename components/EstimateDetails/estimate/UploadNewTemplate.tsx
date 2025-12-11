'use client';

import { useState, useMemo, useEffect } from 'react';

import { Button, Checkbox, Group, Select, Tooltip } from '@mantine/core';
import { notifications } from '@mantine/notifications';

import { EstimateLineItem } from './LineItem';
import { ContractorClient, Estimate, EstimateResource, EstimateStatus } from '../../Global/model';

export function UploadNewTemplate({
    template,
    estimate,
    client,
    setLoading,
    imageResources = [],
    videoResources = [],
    lineItems = [],
}: {
    template: string,
    estimate: Estimate,
    client?: ContractorClient,
    setLoading: Function,
    imageResources?: EstimateResource[],
    videoResources?: EstimateResource[],
    lineItems?: EstimateLineItem[]
}) {
    const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
    const [sendToAll, setSendToAll] = useState(false);

    // Collect all available emails (deduplicated by email value)
    const availableEmails = useMemo(() => {
        const emails: Array<{ value: string; label: string }> = [];
        const seenEmails = new Set<string>();

        if (client?.email && !seenEmails.has(client.email)) {
            emails.push({
                value: client.email,
                label: `${client.name} (${client.email})`,
            });
            seenEmails.add(client.email);
        }

        if (client?.sub_clients) {
            client.sub_clients.forEach((subClient) => {
                if (subClient.email && !seenEmails.has(subClient.email)) {
                    emails.push({
                        value: subClient.email,
                        label: `${subClient.name}${subClient.role ? ` - ${subClient.role}` : ''} (${subClient.email})`,
                    });
                    seenEmails.add(subClient.email);
                }
            });
        }

        return emails;
    }, [client]);

    // Initialize selected emails when component mounts or client changes
    useEffect(() => {
        if (availableEmails.length > 0 && selectedEmails.length === 0) {
            // Default to main client email if available
            const mainEmail = client?.email;
            if (mainEmail && availableEmails.some(e => e.value === mainEmail)) {
                setSelectedEmails([mainEmail]);
            } else if (availableEmails.length > 0) {
                setSelectedEmails([availableEmails[0].value]);
            }
        }
    }, [availableEmails, client]);
    async function createAndSendTemplate() {
        if (!client) {
            notifications.show({
                title: 'Error',
                position: 'top-center',
                color: 'red',
                message: 'Client information is required to send estimate.',
            });
            return;
        }

        // Determine which emails to send to
        let emailsToSend: string[] = [];
        if (sendToAll) {
            emailsToSend = availableEmails.map(e => e.value);
        } else {
            emailsToSend = selectedEmails.length > 0 ? selectedEmails : [client.email];
        }

        if (emailsToSend.length === 0) {
            notifications.show({
                title: 'Error',
                position: 'top-center',
                color: 'red',
                message: 'Please select at least one email address.',
            });
            return;
        }

        setLoading(true);
        try {
            // Step 1: Create template
            const templateResponse = await fetch(
                '/api/estimate_template',
                {
                    method: 'POST',
                    body: JSON.stringify({
                        template,
                        jobID: estimate.id,
                    }),
                }
            );

            if (!templateResponse.ok) {
                const errorData = await templateResponse.json();
                throw new Error(errorData.error || 'Failed to create estimate template');
            }

            const templateData = await templateResponse.json();

            if (!templateData.out?.id) {
                throw new Error('Template created but no template ID returned');
            }

            // Step 2: Send estimate
            const sendResponse = await fetch(
                '/api/send_estimate',
                {
                    method: 'POST',
                    body: JSON.stringify({
                        template_id: templateData.out.id,
                        jobID: estimate.id,
                        client_emails: emailsToSend,
                    }),
                }
            );

            if (!sendResponse.ok) {
                const errorData = await sendResponse.json();
                throw new Error(errorData.error || 'Failed to send estimate');
            }

            // Step 3: Update estimate status
            const accessToken = localStorage.getItem('access_token');
            if (!accessToken) {
                throw new Error('No access token found');
            }

            const statusResponse = await fetch(`/api/estimates/${estimate.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({ status: EstimateStatus.ESTIMATE_SENT }),
            });

            if (!statusResponse.ok) {
                const errorData = await statusResponse.json();
                throw new Error(errorData.message || 'Failed to update estimate status');
            }

            setLoading(false);
            notifications.show({
                title: 'Success!',
                position: 'top-center',
                color: 'green',
                message: 'The estimate was successfully sent!',
            });
        } catch (error: any) {
            setLoading(false);
            notifications.show({
                title: 'Error',
                position: 'top-center',
                color: 'red',
                message: error.message || 'Failed to send estimate. Please try again.',
            });
        }
    }

    const isDisabled = !(
        imageResources.length > 0 &&
        videoResources.length > 0 &&
        !!estimate.transcription_summary &&
        lineItems.length > 0
    );

    if (!client) {
        return null;
    }

    const hasMultipleEmails = availableEmails.length > 1;

    return (
        <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {hasMultipleEmails && (
                <div style={{
                    marginBottom: 16,
                    padding: 16,
                    border: '1px solid var(--mantine-color-gray-3)',
                    borderRadius: 8,
                    width: '100%',
                    maxWidth: '700px',
                    minWidth: '500px',
                }}>
                    <Group mb="sm">
                        <Checkbox
                          label="Send to all emails"
                          checked={sendToAll}
                          onChange={(e) => {
                            setSendToAll(e.currentTarget.checked);
                            if (e.currentTarget.checked) {
                                setSelectedEmails([]);
                            } else {
                                // Reset to main client email when unchecking
                                const mainEmail = client.email;
                                if (mainEmail) {
                                    setSelectedEmails([mainEmail]);
                                }
                            }
                          }}
                        />
                    </Group>
                    {!sendToAll && (
                        <Select
                          label="Select email recipient(s)"
                          placeholder="Choose email address"
                          data={availableEmails}
                          value={selectedEmails.length > 0 ? selectedEmails[0] : null}
                          onChange={(value) => {
                            if (value) {
                                setSelectedEmails([value]);
                            }
                          }}
                          mb="sm"
                        />
                    )}
                    {sendToAll && (
                        <div style={{ fontSize: '14px', color: 'var(--mantine-color-gray-7)' }}>
                            Estimate will be sent to {availableEmails.length} email address{availableEmails.length !== 1 ? 'es' : ''}
                        </div>
                    )}
                </div>
            )}
            <Tooltip
              label={isDisabled ? 'Please finish the todo list above to send the estimate' : ''}
              disabled={!isDisabled}
              position="top"
              withArrow
            >
                <Button onClick={createAndSendTemplate} mt="lg" disabled={isDisabled}>
                    Send Estimate
                </Button>
            </Tooltip>
        </div>
    );
}

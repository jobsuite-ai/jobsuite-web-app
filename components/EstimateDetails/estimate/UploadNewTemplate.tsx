'use client';

import { useState, useMemo, useEffect } from 'react';

import { Button, Checkbox, Group, Select, Tooltip } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconCopy, IconLink } from '@tabler/icons-react';

import { EstimateLineItem } from './LineItem';
import { ResendConfirmModal } from './ResendConfirmModal';
import { ContractorClient, Estimate, EstimateResource, EstimateStatus } from '../../Global/model';

import { getApiHeaders } from '@/app/utils/apiClient';

export function UploadNewTemplate({
    estimate,
    client,
    setLoading,
    imageResources = [],
    videoResources = [],
    lineItems = [],
    signatureUrl,
    loadingSignatureUrl = false,
}: {
    estimate: Estimate,
    client?: ContractorClient,
    setLoading: Function,
    imageResources?: EstimateResource[],
    videoResources?: EstimateResource[],
    lineItems?: EstimateLineItem[],
    signatureUrl?: string | null,
    loadingSignatureUrl?: boolean,
}) {
    const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
    const [sendToAll, setSendToAll] = useState(false);
    const [hasBeenSent, setHasBeenSent] = useState(false);
    const [showResendModal, setShowResendModal] = useState(false);

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

    // Check if estimate has been sent before
    useEffect(() => {
        const checkIfSent = async () => {
            // Check estimate status first
            const statusHasBeenSent = estimate.status === EstimateStatus.ESTIMATE_SENT ||
                estimate.status === EstimateStatus.ESTIMATE_OPENED ||
                estimate.status === EstimateStatus.ESTIMATE_ACCEPTED ||
                estimate.status === EstimateStatus.ACCOUNTING_NEEDED ||
                estimate.status?.toString().startsWith('PROJECT_');

            if (statusHasBeenSent) {
                setHasBeenSent(true);
                return;
            }

            // Also check for existing signature links (non-PENDING status)
            try {
                const response = await fetch(
                    `/api/estimates/${estimate.id}/signatures`,
                    {
                        method: 'GET',
                        headers: getApiHeaders(),
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    const links = data.signature_links || [];
                    // Check if any link has been sent (not PENDING)
                    const hasSentLinks = links.some((link: any) =>
                        link.status && link.status !== 'PENDING'
                    );
                    setHasBeenSent(hasSentLinks);
                }
            } catch (error) {
                // eslint-disable-next-line no-console
                console.error('Error checking if estimate has been sent:', error);
            }
        };

        checkIfSent();
    }, [estimate.id, estimate.status]);
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

        // If estimate has been sent before, show confirmation modal
        if (hasBeenSent) {
            setShowResendModal(true);
            return;
        }

        // Proceed with sending
        await sendEstimate();
    }

    async function sendEstimate() {
        if (!client) {
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
        setShowResendModal(false);
        try {
            // Send estimate with signature links
            // Note: Backend automatically revokes old signature links when generating new ones
            const sendResponse = await fetch(
                '/api/send_estimate',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${localStorage.getItem('access_token')}`,
                    },
                    body: JSON.stringify({
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

    const handleCopySignatureLink = async () => {
        if (!signatureUrl) return;

        try {
            await navigator.clipboard.writeText(signatureUrl);
            notifications.show({
                title: 'Success!',
                message: 'Signature link copied to clipboard',
                color: 'green',
                icon: <IconCheck size={16} />,
            });
        } catch (err) {
            notifications.show({
                title: 'Error',
                message: 'Failed to copy signature link',
                color: 'red',
            });
        }
    };

    return (
        <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <ResendConfirmModal
              opened={showResendModal}
              onClose={() => {
                    if (!loading) {
                        setShowResendModal(false);
                    }
                }}
              onConfirm={sendEstimate}
              loading={loading}
            />
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
            <Group gap="sm" mt="lg">
                <Tooltip
                  label={isDisabled ? 'Please finish the todo list above to send the estimate' : ''}
                  disabled={!isDisabled}
                  position="top"
                  withArrow
                >
                    <Button onClick={createAndSendTemplate} disabled={isDisabled}>
                        {hasBeenSent ? 'Re-send Estimate' : 'Send Estimate'}
                    </Button>
                </Tooltip>
                {signatureUrl && (
                    <>
                        <Tooltip label="Copy signature link">
                            <Button
                              variant="outline"
                              onClick={handleCopySignatureLink}
                              leftSection={<IconCopy size={16} />}
                            >
                                Copy Link
                            </Button>
                        </Tooltip>
                        <Button
                          variant="outline"
                          component="a"
                          href={signatureUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          leftSection={<IconLink size={16} />}
                        >
                            Open Link
                        </Button>
                    </>
                )}
                {loadingSignatureUrl && (
                    <Button variant="outline" disabled>
                        Generating...
                    </Button>
                )}
            </Group>
        </div>
    );
}

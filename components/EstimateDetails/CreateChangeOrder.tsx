'use client';

import { useState } from 'react';

import { Button, Divider, Flex, Modal, Paper, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';

import { Estimate } from '../Global/model';

interface CreateChangeOrderProps {
    opened: boolean;
    onClose: () => void;
    onSuccess: () => void;
    estimate: Estimate;
}

export default function CreateChangeOrder({
    opened,
    onClose,
    onSuccess,
    estimate,
}: CreateChangeOrderProps) {
    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
        setLoading(true);
        try {
            const accessToken = localStorage.getItem('access_token');
            if (!accessToken) {
                throw new Error('No access token found');
            }

            const response = await fetch(`/api/estimates/${estimate.id}/change-orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to create change order');
            }

            notifications.show({
                title: 'Success',
                message: 'Change order created successfully',
                color: 'green',
            });

            onSuccess();
            onClose();
        } catch (error: any) {
            notifications.show({
                title: 'Error',
                message: error.message || 'Failed to create change order',
                color: 'red',
            });
        } finally {
            setLoading(false);
        }
    };

    const changeOrderTitle = estimate.title
        ? `Change Order - ${estimate.title}`
        : 'Change Order';

    return (
        <Modal
          opened={opened}
          onClose={onClose}
          title="Create Change Order"
          size="lg"
          centered
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <Text size="sm" c="dimmed" mb="md">
                    A new estimate will be created with the following information copied from the
                    original estimate. The cover image will be copied, but video, additional images,
                    line items, comments, description, and Spanish transcription will not be copied.
                </Text>

                <Paper p="md" withBorder>
                    <Flex direction="column" gap="sm">
                        <div>
                            <Text size="xs" fw={600} c="dimmed" mb={4}>
                                Title
                            </Text>
                            <Text size="sm">{changeOrderTitle}</Text>
                        </div>

                        <Divider />

                        <div>
                            <Text size="xs" fw={600} c="dimmed" mb={4}>
                                Client
                            </Text>
                            <Text size="sm">{estimate.client_name || '—'}</Text>
                        </div>

                        <Divider />

                        <div>
                            <Text size="xs" fw={600} c="dimmed" mb={4}>
                                Address
                            </Text>
                            <Text size="sm">
                                {[
                                    estimate.address_street || estimate.client_address,
                                    estimate.address_city || estimate.city,
                                    estimate.address_state || estimate.state,
                                    estimate.address_zipcode || estimate.zip_code,
                                ]
                                    .filter(Boolean)
                                    .join(', ') || '—'}
                            </Text>
                        </div>

                        <Divider />

                        <div>
                            <Text size="xs" fw={600} c="dimmed" mb={4}>
                                Estimate Type
                            </Text>
                            <Text size="sm">{estimate.estimate_type || '—'}</Text>
                        </div>

                        {estimate.discount_reason && (
                            <>
                                <Divider />
                                <div>
                                    <Text size="xs" fw={600} c="dimmed" mb={4}>
                                        Discount Reason
                                    </Text>
                                    <Text size="sm">{estimate.discount_reason}</Text>
                                </div>
                            </>
                        )}

                        {estimate.discount_percentage !== 0 && (
                            <>
                                <Divider />
                                <div>
                                    <Text size="xs" fw={600} c="dimmed" mb={4}>
                                        Discount Percentage
                                    </Text>
                                    <Text size="sm">{estimate.discount_percentage}%</Text>
                                </div>
                            </>
                        )}

                        {estimate.tax_rate !== 0 && (
                            <>
                                <Divider />
                                <div>
                                    <Text size="xs" fw={600} c="dimmed" mb={4}>
                                        Tax Rate
                                    </Text>
                                    <Text size="sm">{estimate.tax_rate}%</Text>
                                </div>
                            </>
                        )}

                        <Divider />

                        <div>
                            <Text size="xs" fw={600} c="dimmed" mb={4}>
                                Hourly Rate
                            </Text>
                            <Text size="sm">${estimate.hourly_rate?.toFixed(2) || '0.00'}</Text>
                        </div>

                        <Divider />

                        <div>
                            <Text size="xs" fw={600} c="dimmed" mb={4}>
                                Scheduled Date
                            </Text>
                            <Text size="sm">
                                {estimate.scheduled_date
                                    ? new Date(estimate.scheduled_date).toLocaleDateString()
                                    : '—'}
                            </Text>
                        </div>

                        <Divider />

                        <div>
                            <Text size="xs" fw={600} c="dimmed" mb={4}>
                                What will NOT be copied
                            </Text>
                            <Text size="sm" c="dimmed">
                                • Video
                                <br />
                                • Additional Images (cover image will be copied)
                                <br />
                                • Line Items
                                <br />
                                • Comments
                                <br />
                                • Description
                                <br />
                                • Spanish Transcription
                            </Text>
                        </div>
                    </Flex>
                </Paper>

                <div
                  style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '0.5rem',
                        marginTop: '1rem',
                    }}
                >
                    <Button variant="subtle" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleConfirm} loading={loading}>
                        Create Change Order
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

'use client';

import { useEffect, useState } from 'react';

import { Badge, Button, Card, Flex, Group, Text } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

import CreateChangeOrder from './CreateChangeOrder';
import LoadingState from '../Global/LoadingState';
import { Estimate, EstimateStatus } from '../Global/model';
import { getEstimateBadgeColor, getFormattedEstimateStatus } from '../Global/utils';

interface ChangeOrdersProps {
    estimate: Estimate;
    onUpdate: () => void;
    onLoadingChange?: (loading: boolean) => void;
    initialChangeOrders?: Estimate[];
    skipInitialFetch?: boolean;
}

export default function ChangeOrders({
    estimate,
    onUpdate,
    onLoadingChange,
    initialChangeOrders,
    skipInitialFetch = false,
}: ChangeOrdersProps) {
    const [changeOrders, setChangeOrders] = useState<Estimate[]>(initialChangeOrders || []);
    const [loading, setLoading] = useState(!skipInitialFetch);
    const [createModalOpened, setCreateModalOpened] = useState(false);
    const router = useRouter();

    useEffect(() => {
        // Skip initial fetch if initialChangeOrders are provided
        if (skipInitialFetch && initialChangeOrders) {
            setLoading(false);
            return;
        }

        if (estimate && !estimate.original_estimate_id) {
            // Only fetch change orders if this is not a change order itself
            fetchChangeOrders();
        } else {
            setLoading(false);
            onLoadingChange?.(false);
        }
    }, [estimate]);

    const fetchChangeOrders = async () => {
        if (!estimate?.id) return;

        setLoading(true);
        onLoadingChange?.(true);
        try {
            const accessToken = localStorage.getItem('access_token');
            if (!accessToken) {
                setLoading(false);
                onLoadingChange?.(false);
                return;
            }

            const response = await fetch(`/api/estimates/${estimate.id}/change-orders`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setChangeOrders(data || []);
            }
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error fetching change orders:', error);
        } finally {
            setLoading(false);
            onLoadingChange?.(false);
        }
    };

    const handleCreateSuccess = () => {
        fetchChangeOrders();
        onUpdate();
    };

    if (estimate?.original_estimate_id) {
        // This is a change order, don't show change orders section
        return null;
    }

    if (loading) {
        return <LoadingState />;
    }

    const totalChangeOrderHours = changeOrders
        .filter((co) => co.status === EstimateStatus.CONTRACTOR_SIGNED)
        .reduce((sum, co) => sum + (co.hours_bid || 0), 0);

    return (
        <>
            <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Flex justify="space-between" align="center" mb="md">
                    <div>
                        <Text fw={500} size="lg" mb={4}>
                            Change Orders
                        </Text>
                        {changeOrders.length > 0 && (
                            <Text size="sm" c="dimmed">
                                {changeOrders.length} change order{changeOrders.length !== 1 ? 's' : ''}
                                {totalChangeOrderHours > 0 && (
                                    <> • {totalChangeOrderHours.toFixed(2)} hours signed</>
                                )}
                            </Text>
                        )}
                    </div>
                    <Button
                      leftSection={<IconPlus size={16} />}
                      onClick={() => setCreateModalOpened(true)}
                    >
                        Create Change Order
                    </Button>
                </Flex>

                {changeOrders.length === 0 ? (
                    <Text c="dimmed" size="sm" ta="center" py="md">
                        No change orders yet. Click &quot;Create Change Order&quot; to add one.
                    </Text>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {changeOrders.map((changeOrder) => (
                            <Card
                              key={changeOrder.id}
                              padding="sm"
                              withBorder
                              style={{ cursor: 'pointer' }}
                              onClick={() => router.push(`/proposals/${changeOrder.id}`)}
                            >
                                <Group justify="space-between">
                                    <div style={{ flex: 1 }}>
                                        <Group gap="sm" mb={4}>
                                            <Text fw={500} size="sm">
                                                Change Order #{changeOrder.id.slice(0, 8)}
                                            </Text>
                                            <Badge
                                              color={getEstimateBadgeColor(changeOrder.status)}
                                              size="sm"
                                            >
                                                {getFormattedEstimateStatus(changeOrder.status)}
                                            </Badge>
                                        </Group>
                                        <Group gap="md" mt={4}>
                                            <Text size="xs" c="dimmed">
                                                Hours: {changeOrder.hours_bid?.toFixed(2) || '0.00'}
                                            </Text>
                                            <Text size="xs" c="dimmed">
                                                Rate: ${changeOrder.hourly_rate?.toFixed(2) || '0.00'}
                                            </Text>
                                            {changeOrder.created_at && (
                                                <Text size="xs" c="dimmed">
                                                    Created: {new Date(
                                                        changeOrder.created_at
                                                    ).toLocaleDateString()}
                                                </Text>
                                            )}
                                        </Group>
                                        {changeOrder.notes && (
                                            <Text size="xs" c="dimmed" mt={4} lineClamp={1}>
                                                {changeOrder.notes}
                                            </Text>
                                        )}
                                    </div>
                                </Group>
                            </Card>
                        ))}
                    </div>
                )}
            </Card>

            <CreateChangeOrder
              opened={createModalOpened}
              onClose={() => setCreateModalOpened(false)}
              onSuccess={handleCreateSuccess}
              estimate={estimate}
            />
        </>
    );
}

'use client';

import { useCallback, useEffect, useState } from 'react';

import { Badge, Button, Card, Flex, Group, Modal, Text } from '@mantine/core';
import { IconFileText, IconPlus } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

import CreateChangeOrder from './CreateChangeOrder';
import LoadingState from '../Global/LoadingState';
import { Estimate, EstimateResource, EstimateStatus } from '../Global/model';
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
    const [changeOrderPdfs, setChangeOrderPdfs] = useState<
        Record<string, { url: string | null; loading: boolean }>
    >({});
    const [pdfModalOpen, setPdfModalOpen] = useState<
        { changeOrderId: string; url: string } | null
    >(null);
    const router = useRouter();

    // Sync initialChangeOrders with state when they change
    useEffect(() => {
        if (initialChangeOrders && initialChangeOrders.length > 0) {
            setChangeOrders(initialChangeOrders);
        }
    }, [initialChangeOrders]);

    useEffect(() => {
        // Always fetch change orders if not provided or if array is empty
        // This ensures we have the latest data even if initialChangeOrders was empty
        if (skipInitialFetch && initialChangeOrders && initialChangeOrders.length > 0) {
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
    }, [estimate?.id, skipInitialFetch, initialChangeOrders]);

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

                // Check for PDFs in background for all change orders
                if (Array.isArray(data) && data.length > 0) {
                    data.forEach((co: Estimate) => {
                        fetchChangeOrderPdf(co.id);
                    });
                }
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

    const fetchChangeOrderPdf = useCallback(
        async (changeOrderId: string): Promise<string | null> => {
        const accessToken = localStorage.getItem('access_token');
        if (!accessToken) {
            return null;
        }

        // Set loading state
        setChangeOrderPdfs(prev => ({
            ...prev,
            [changeOrderId]: { url: null, loading: true },
        }));

        try {
            // Fetch resources for the change order
            const resourcesResponse = await fetch(
                `/api/estimates/${changeOrderId}/resources`,
                {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (resourcesResponse.ok) {
                const resources: EstimateResource[] = await resourcesResponse.json();
                const pdfResource = resources.find(
                    (r: EstimateResource) =>
                        r.resource_type === 'DOCUMENT' &&
                        r.upload_status === 'COMPLETED' &&
                        r.resource_location?.toLowerCase().endsWith('.pdf')
                );

                if (pdfResource) {
                    // Get presigned URL for the PDF
                    const pdfUrlResponse = await fetch(
                        `/api/estimates/${changeOrderId}/resources/${pdfResource.id}/presigned-url`,
                        {
                            method: 'GET',
                            headers: {
                                Authorization: `Bearer ${accessToken}`,
                                'Content-Type': 'application/json',
                            },
                        }
                    );

                    if (pdfUrlResponse.ok) {
                        const pdfData = await pdfUrlResponse.json();
                        const presignedUrl = pdfData.presigned_url || pdfData.url;
                        setChangeOrderPdfs(prev => ({
                            ...prev,
                            [changeOrderId]: { url: presignedUrl || null, loading: false },
                        }));
                        return presignedUrl || null;
                    }
                }
            }
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error(`Error fetching PDF for change order ${changeOrderId}:`, error);
        } finally {
            setChangeOrderPdfs(prev => ({
                ...prev,
                [changeOrderId]: { url: prev[changeOrderId]?.url || null, loading: false },
            }));
        }

        return null;
        },
        []
    );

    const handlePdfClick = async (e: React.MouseEvent, changeOrderId: string) => {
        e.stopPropagation(); // Prevent navigation to change order detail page

        const existingPdf = changeOrderPdfs[changeOrderId];
        if (existingPdf?.url) {
            setPdfModalOpen({ changeOrderId, url: existingPdf.url });
        } else {
            const url = await fetchChangeOrderPdf(changeOrderId);
            if (url) {
                setPdfModalOpen({ changeOrderId, url });
            }
        }
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
                                    <div>
                                        {(changeOrderPdfs[changeOrder.id]?.url ||
                                            changeOrderPdfs[changeOrder.id]?.loading) && (
                                            <Button
                                              variant="subtle"
                                              size="xs"
                                              leftSection={<IconFileText size={14} />}
                                              onClick={(e) => handlePdfClick(e, changeOrder.id)}
                                              loading={changeOrderPdfs[changeOrder.id]?.loading}
                                            >
                                                View PDF
                                            </Button>
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

            {/* PDF Preview Modal */}
            <Modal
              opened={!!pdfModalOpen}
              onClose={() => setPdfModalOpen(null)}
              size="xl"
              title="Change Order PDF"
            >
                {pdfModalOpen && (
                    <div
                      style={{
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          minHeight: '500px',
                      }}
                    >
                        <iframe
                          title={`PDF preview for change order ${pdfModalOpen.changeOrderId}`}
                          src={pdfModalOpen.url}
                          style={{
                              width: '100%',
                              height: '800px',
                              border: 'none',
                              borderRadius: '8px',
                              maxHeight: '70vh',
                          }}
                        />
                    </div>
                )}
            </Modal>
        </>
    );
}

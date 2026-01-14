'use client';

import { useEffect, useState } from 'react';

import {
    Alert,
    Badge,
    Box,
    Card,
    Group,
    Loader,
    Stack,
    Table,
    Text,
    Timeline,
    Title,
} from '@mantine/core';
import { IconAlertCircle, IconCheck, IconClock, IconInfoCircle } from '@tabler/icons-react';

import { getApiHeaders } from '@/app/utils/apiClient';

interface SignatureLink {
    id: string;
    signature_hash: string;
    client_email: string;
    status: string;
    created_at: string;
    opened_at: string | null;
    expires_at: string;
}

interface Signature {
    id: string;
    signature_hash: string;
    signature_type: string;
    signer_name?: string;
    signer_email: string;
    signed_at: string;
    is_valid: boolean;
    ip_address?: string;
    user_agent?: string;
}

interface AuditTrail {
    estimate_id: string;
    signature_links: SignatureLink[];
    signatures: Signature[];
}

interface SignatureAuditHistoryProps {
    estimateId: string;
}

export default function SignatureAuditHistory({ estimateId }: SignatureAuditHistoryProps) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [auditTrail, setAuditTrail] = useState<AuditTrail | null>(null);

    useEffect(() => {
        const fetchAuditTrail = async () => {
            try {
                setLoading(true);
                setError(null);

                const response = await fetch(`/api/estimates/${estimateId}/signatures`, {
                    method: 'GET',
                    headers: getApiHeaders(),
                });

                if (!response.ok) {
                    if (response.status === 401) {
                        setError('You must be logged in to view audit history.');
                    } else {
                        setError('Failed to load audit history.');
                    }
                    return;
                }

                const data = await response.json();
                setAuditTrail(data);
            } catch (err: any) {
                // eslint-disable-next-line no-console
                console.error('Error fetching audit trail:', err);
                setError(err.message || 'An error occurred while loading audit history.');
            } finally {
                setLoading(false);
            }
        };

        if (estimateId) {
            fetchAuditTrail();
        }
    }, [estimateId]);

    if (loading) {
        return (
            <Box ta="center" py="xl">
                <Loader size="lg" />
                <Text c="dimmed" mt="md">
                    Loading audit history...
                </Text>
            </Box>
        );
    }

    if (error) {
        return (
            <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red" variant="light">
                {error}
            </Alert>
        );
    }

    if (!auditTrail) {
        return (
            <Alert icon={<IconInfoCircle size={16} />} title="No Data" color="blue" variant="light">
                No audit history available for this estimate.
            </Alert>
        );
    }

    const { signature_links, signatures } = auditTrail;

    // Create a combined timeline of events
    const events: Array<{
        type: 'link_created' | 'link_opened' | 'signature';
        timestamp: string;
        data: any;
    }> = [];

    // Add link events
    signature_links.forEach((link) => {
        events.push({
            type: 'link_created',
            timestamp: link.created_at,
            data: link,
        });

        if (link.opened_at) {
            events.push({
                type: 'link_opened',
                timestamp: link.opened_at,
                data: link,
            });
        }
    });

    // Add signature events
    signatures.forEach((sig) => {
        events.push({
            type: 'signature',
            timestamp: sig.signed_at,
            data: sig,
        });
    });

    // Sort events by timestamp (most recent first)
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getStatusBadge = (status: string) => {
        const statusColors: Record<string, string> = {
            PENDING: 'gray',
            OPENED: 'blue',
            SIGNED: 'green',
            REVOKED: 'red',
            EXPIRED: 'orange',
        };

        return (
            <Badge color={statusColors[status] || 'gray'} variant="light">
                {status}
            </Badge>
        );
    };

    return (
        <Stack gap="xl">
            <Title order={3}>Audit History</Title>

            {/* Summary Cards */}
            <Group gap="md">
                <Card shadow="sm" padding="lg" radius="md" withBorder style={{ flex: 1 }}>
                    <Text size="sm" c="dimmed" mb="xs">
                        Signature Links
                    </Text>
                    <Text size="xl" fw={700}>
                        {signature_links.length}
                    </Text>
                    {signature_links.filter((l) => l.status === 'REVOKED').length > 0 && (
                        <Text size="xs" c="red" mt="xs">
                            {signature_links.filter((l) => l.status === 'REVOKED').length} revoked
                        </Text>
                    )}
                </Card>
                <Card shadow="sm" padding="lg" radius="md" withBorder style={{ flex: 1 }}>
                    <Text size="sm" c="dimmed" mb="xs">
                        Signatures
                    </Text>
                    <Text size="xl" fw={700}>
                        {signatures.length}
                    </Text>
                    {signatures.filter((s) => !s.is_valid).length > 0 && (
                        <Text size="xs" c="red" mt="xs">
                            {signatures.filter((s) => !s.is_valid).length} invalidated
                        </Text>
                    )}
                </Card>
            </Group>

            {/* Timeline of Events */}
            <Box>
                <Title order={4} mb="md">
                    Event Timeline
                </Title>
                <Timeline active={-1} bulletSize={24} lineWidth={2}>
                    {events.map((event, index) => {
                        let icon;
                        let color;
                        let title;
                        let description;

                        switch (event.type) {
                            case 'link_created':
                                icon = <IconClock size={12} />;
                                color = event.data.status === 'REVOKED' ? 'red' : 'blue';
                                title = 'Signature Link Created';
                                description = `Link created for ${event.data.client_email}${
                                    event.data.status === 'REVOKED' ? ' (Revoked)' : ''
                                }`;
                                break;
                            case 'link_opened':
                                icon = <IconCheck size={12} />;
                                color = 'green';
                                title = 'Link Opened';
                                description = 'Client opened the signature page';
                                break;
                            case 'signature':
                                icon = <IconCheck size={12} />;
                                color = event.data.is_valid ? 'green' : 'red';
                                title = `${event.data.signature_type} Signature`;
                                description = `Signed by ${event.data.signer_name || event.data.signer_email}${
                                    !event.data.is_valid ? ' (Invalidated)' : ''
                                }`;
                                break;
                        }

                        return (
                            <Timeline.Item key={`${event.type}-${index}`} bullet={icon} color={color} title={title}>
                                <Text c="dimmed" size="sm">
                                    {description}
                                </Text>
                                <Text c="dimmed" size="xs" mt={4}>
                                    {formatDate(event.timestamp)}
                                </Text>
                            </Timeline.Item>
                        );
                    })}
                </Timeline>
            </Box>

            {/* Signature Links Table */}
            <Box>
                <Title order={4} mb="md">
                    Signature Links
                </Title>
                <Table striped highlightOnHover>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Status</Table.Th>
                            <Table.Th>Client Email</Table.Th>
                            <Table.Th>Created</Table.Th>
                            <Table.Th>Opened</Table.Th>
                            <Table.Th>Expires</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {signature_links.length === 0 ? (
                            <Table.Tr>
                                <Table.Td colSpan={5} ta="center" c="dimmed">
                                    No signature links found
                                </Table.Td>
                            </Table.Tr>
                        ) : (
                            signature_links.map((link) => (
                                <Table.Tr key={link.id}>
                                    <Table.Td>{getStatusBadge(link.status)}</Table.Td>
                                    <Table.Td>{link.client_email}</Table.Td>
                                    <Table.Td>{formatDate(link.created_at)}</Table.Td>
                                    <Table.Td>
                                        {link.opened_at ? formatDate(link.opened_at) : 'Never'}
                                    </Table.Td>
                                    <Table.Td>{formatDate(link.expires_at)}</Table.Td>
                                </Table.Tr>
                            ))
                        )}
                    </Table.Tbody>
                </Table>
            </Box>

            {/* Signatures Table */}
            <Box>
                <Title order={4} mb="md">
                    Signatures
                </Title>
                <Table striped highlightOnHover>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Type</Table.Th>
                            <Table.Th>Signer</Table.Th>
                            <Table.Th>Email</Table.Th>
                            <Table.Th>Signed At</Table.Th>
                            <Table.Th>Status</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {signatures.length === 0 ? (
                            <Table.Tr>
                                <Table.Td colSpan={5} ta="center" c="dimmed">
                                    No signatures found
                                </Table.Td>
                            </Table.Tr>
                        ) : (
                            signatures.map((sig) => (
                                <Table.Tr key={sig.id}>
                                    <Table.Td>
                                        <Badge color={sig.signature_type === 'CLIENT' ? 'blue' : 'green'} variant="light">
                                            {sig.signature_type}
                                        </Badge>
                                    </Table.Td>
                                    <Table.Td>{sig.signer_name || 'N/A'}</Table.Td>
                                    <Table.Td>{sig.signer_email}</Table.Td>
                                    <Table.Td>{formatDate(sig.signed_at)}</Table.Td>
                                    <Table.Td>
                                        {sig.is_valid ? (
                                            <Badge color="green" variant="light">
                                                Valid
                                            </Badge>
                                        ) : (
                                            <Badge color="red" variant="light">
                                                Invalidated
                                            </Badge>
                                        )}
                                    </Table.Td>
                                </Table.Tr>
                            ))
                        )}
                    </Table.Tbody>
                </Table>
            </Box>
        </Stack>
    );
}

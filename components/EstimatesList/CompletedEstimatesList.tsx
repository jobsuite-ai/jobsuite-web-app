'use client';

import { useEffect, useState } from 'react';

import { Badge, Card, Center, Flex, Group, Paper, ScrollArea, Text, Title } from '@mantine/core';
import { useRouter } from 'next/navigation';

import LoadingState from '../Global/LoadingState';
import { Estimate, EstimateStatus } from '../Global/model';
import UniversalError from '../Global/UniversalError';
import { getEstimateBadgeColor, getFormattedEstimateStatus } from '../Global/utils';

// Define completed status groups
const ACCEPTED_STATUSES = [
    EstimateStatus.CONTRACTOR_SIGNED,
];

const NOT_ACCEPTED_STATUSES = [
    EstimateStatus.ESTIMATE_DECLINED,
    EstimateStatus.CONTRACTOR_DECLINED,
];

const FOLLOW_UP_STATUSES = [
    EstimateStatus.NEEDS_FOLLOW_UP,
    EstimateStatus.STALE_ESTIMATE,
];

const ALL_COMPLETED_STATUSES = [
    ...ACCEPTED_STATUSES,
    ...NOT_ACCEPTED_STATUSES,
    ...FOLLOW_UP_STATUSES,
];

export default function CompletedEstimatesList() {
    const [estimates, setEstimates] = useState(new Array<Estimate>());
    const [acceptedEstimates, setAcceptedEstimates] = useState(new Array<Estimate>());
    const [notAcceptedEstimates, setNotAcceptedEstimates] = useState(new Array<Estimate>());
    const [followUpEstimates, setFollowUpEstimates] = useState(new Array<Estimate>());
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        setLoading(true);
        getEstimates().finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        // Filter and sort estimates by status
        const accepted = estimates
            .filter(estimate => ACCEPTED_STATUSES.includes(estimate.status))
            .sort((a, b) =>
                // Sort by updated_at (newest first)
                 new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
            );

        const notAccepted = estimates
            .filter(estimate => NOT_ACCEPTED_STATUSES.includes(estimate.status))
            .sort((a, b) =>
                // Sort by updated_at (newest first)
                 new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
            );

        const followUp = estimates
            .filter(estimate => FOLLOW_UP_STATUSES.includes(estimate.status))
            .sort((a, b) => {
                // First sort by status order
                const statusDiff = FOLLOW_UP_STATUSES.indexOf(a.status) -
                    FOLLOW_UP_STATUSES.indexOf(b.status);
                if (statusDiff !== 0) return statusDiff;
                // Then sort by updated_at (newest first) within each status
                return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
            });

        setAcceptedEstimates(accepted);
        setNotAcceptedEstimates(notAccepted);
        setFollowUpEstimates(followUp);
    }, [estimates]);

    async function getEstimates() {
        // Get access token from localStorage
        const accessToken = localStorage.getItem('access_token');

        if (!accessToken) {
            return;
        }

        try {
            // Fetch all estimates and filter client-side for completed statuses
            const response = await fetch('/api/estimates', {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                // eslint-disable-next-line no-console
                console.error('Error fetching estimates:', errorData);
                return;
            }

            const data = await response.json();
            // Handle both { Items: [...] } and direct array responses
            const estimatesList = data.Items || data || [];
            const allEstimates = Array.isArray(estimatesList) ? estimatesList : [];

            // Filter to only completed statuses
            const completedEstimates = allEstimates.filter((estimate: Estimate) =>
                ALL_COMPLETED_STATUSES.includes(estimate.status)
            );

            setEstimates(completedEstimates);
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error fetching estimates:', error);
            setEstimates([]);
        }
    }

    // Helper function to render an estimate card
    const renderEstimateCard = (estimate: Estimate) => (
        <Card
          key={estimate.id}
          shadow="sm"
          padding="lg"
          radius="md"
          w="100%"
          withBorder
          style={{ cursor: 'pointer' }}
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey) {
              // Open in new tab
              window.open(`/estimates/${estimate.id}`, '_blank');
            } else {
              // Normal navigation
              router.push(`/estimates/${estimate.id}`);
            }
          }}
        >
            <Center>
                {estimate.estimate_type &&
                    <Text size="sm" fw={700}>{estimate.estimate_type}</Text>
                }
            </Center>
            <Group justify="space-between" mt="md" mb="xs">
                <Text fw={500}>{estimate.client_name || 'Unknown Client'}</Text>
                <Badge style={{ color: '#ffffff' }} color={getEstimateBadgeColor(estimate.status)}>
                    {getFormattedEstimateStatus(estimate.status)}
                </Badge>
            </Group>

            <Flex direction="column" align="flex-start">
                <Text size="sm" c="dimmed">{estimate.address_street}</Text>
                <Text size="sm" c="dimmed">{estimate.address_city}, {estimate.address_state}</Text>
                <Text size="sm" c="dimmed">{estimate.address_zipcode}</Text>
            </Flex>
        </Card>
    );

    // Helper function to render a column
    const renderColumn = (columnEstimates: Estimate[], title: string) => (
        <Paper
          bg="gray.0"
          p="md"
          radius="md"
          w="32%"
          h="calc(100vh - 110px)"
          style={{ display: 'flex', flexDirection: 'column' }}
        >
            <Group gap="xs" w="100%" justify="center" mb="md">
                <Title order={5}>{title}</Title>
                <Badge size="lg" variant="light">{columnEstimates.length}</Badge>
            </Group>
            <ScrollArea style={{ flex: 1 }}>
                <Flex
                  direction="column"
                  gap="md"
                  justify="flex-start"
                  align="center"
                >
                    {columnEstimates.length > 0 ? (
                        columnEstimates.map(renderEstimateCard)
                    ) : (
                        <Card
                          shadow="sm"
                          padding="lg"
                          radius="md"
                          w="100%"
                          withBorder
                        >
                            <Text fw={500} ta="center">No estimates in this category</Text>
                        </Card>
                    )}
                </Flex>
            </ScrollArea>
        </Paper>
    );

    return (
        <>
            {loading ? <LoadingState /> :
                <div style={{ overflow: 'hidden', paddingTop: '20px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
                    {estimates ? (
                        <Flex
                          direction="row"
                          justify="center"
                          align="flex-start"
                          w="95%"
                          gap="xl"
                        >
                            {renderColumn(acceptedEstimates, 'Accepted')}
                            {renderColumn(notAcceptedEstimates, 'Not Accepted')}
                            {renderColumn(followUpEstimates, 'Follow Up')}
                        </Flex>
                    ) : (
                        <div style={{ marginTop: '100px' }}>
                            <UniversalError message="Unable to access list of completed estimates" />
                        </div>
                    )}
                </div>}
        </>
    );
}

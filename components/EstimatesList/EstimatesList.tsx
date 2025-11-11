'use client';

import { useEffect, useState } from 'react';

import { Badge, Card, Center, Flex, Group, Paper, ScrollArea, Text, Title } from '@mantine/core';
import { useRouter } from 'next/navigation';

import LoadingState from '../Global/LoadingState';
import { Estimate, EstimateStatus } from '../Global/model';
import UniversalError from '../Global/UniversalError';
import { getEstimateBadgeColor, getFormattedEstimateStatus } from '../Global/utils';

// Define column status groups and their order
const PROPOSAL_PIPELINE_STATUSES = [
    EstimateStatus.NEW_LEAD,
    EstimateStatus.ESTIMATE_NOT_SCHEDULED,
    EstimateStatus.ESTIMATE_SCHEDULED,
    EstimateStatus.ESTIMATE_IN_PROGRESS,
];

const SENT_PROPOSAL_STATUSES = [
    EstimateStatus.ESTIMATE_SENT,
    EstimateStatus.ESTIMATE_OPENED,
];

const ACCEPTED_STATUSES = [
    EstimateStatus.ESTIMATE_ACCEPTED,
    EstimateStatus.CONTRACTOR_OPENED,
];

export default function EstimatesList() {
    const [estimates, setEstimates] = useState(new Array<Estimate>());
    const [columnOneEstimates, setColumnOneEstimates] = useState(new Array<Estimate>());
    const [columnTwoEstimates, setColumnTwoEstimates] = useState(new Array<Estimate>());
    const [columnThreeEstimates, setColumnThreeEstimates] = useState(new Array<Estimate>());
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        setLoading(true);
        getEstimates().finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        // Sort jobs into columns based on status
        const sortedColumnOne = estimates
            .filter(estimate => PROPOSAL_PIPELINE_STATUSES.includes(estimate.status))
            .sort((a, b) => {
                // First sort by status order
                const statusDiff = PROPOSAL_PIPELINE_STATUSES.indexOf(a.status) -
                    PROPOSAL_PIPELINE_STATUSES.indexOf(b.status);
                if (statusDiff !== 0) return statusDiff;
                // Then sort by updated_at (newest first) within each status
                return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
            });

        const sortedColumnTwo = estimates
            .filter(estimate => SENT_PROPOSAL_STATUSES.includes(estimate.status))
            .sort((a, b) => {
                // First sort by status order
                const statusDiff = SENT_PROPOSAL_STATUSES.indexOf(a.status) -
                    SENT_PROPOSAL_STATUSES.indexOf(b.status);
                if (statusDiff !== 0) return statusDiff;
                // Then sort by updated_at (newest first) within each status
                return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
            });

        const sortedColumnThree = estimates
            .filter(estimate => ACCEPTED_STATUSES.includes(estimate.status))
            .sort((a, b) => {
                // First sort by status order
                const statusDiff = ACCEPTED_STATUSES.indexOf(a.status) -
                    ACCEPTED_STATUSES.indexOf(b.status);
                if (statusDiff !== 0) return statusDiff;
                // Then sort by updated_at (newest first) within each status
                return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
            });

        setColumnOneEstimates(sortedColumnOne);
        setColumnTwoEstimates(sortedColumnTwo);
        setColumnThreeEstimates(sortedColumnThree);
    }, [estimates]);

    async function getEstimates() {
        // Get access token from localStorage
        const accessToken = localStorage.getItem('access_token');

        if (!accessToken) {
            return;
        }

        try {
            // Fetch all estimates (backend will filter if needed, but we filter client-side)
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
            setEstimates(Array.isArray(estimatesList) ? estimatesList : []);
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error fetching estimates:', error);
            setEstimates([]);
        }
    }

    // Helper function to render a job card
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
              window.open(`/proposals/${estimate.id}`, '_blank');
            } else {
              // Normal navigation
              router.push(`/proposals/${estimate.id}`);
            }
          }}
        >
            <Center>
                {estimate.estimate_type &&
                    <Text size="sm" fw={700}>{estimate.estimate_type}</Text>
                }
            </Center>
            {estimate.title && (
                <Text fw={600} size="md" mt="xs" mb="xs">{estimate.title}</Text>
            )}
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
                <div style={{ overflow: 'hidden', padding: '20px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
                    {estimates ? (
                        <Flex
                          direction="row"
                          justify="center"
                          align="flex-start"
                          w="95%"
                          gap="xl"
                        >
                            {renderColumn(columnOneEstimates, 'In Progress')}
                            {renderColumn(columnTwoEstimates, 'Sent to Client')}
                            {renderColumn(columnThreeEstimates, 'Client Accepted')}
                        </Flex>
                    ) : (
                        <div style={{ marginTop: '100px' }}>
                            <UniversalError message="Unable to access list of estimates" />
                        </div>
                    )}
                </div>}
        </>
    );
}

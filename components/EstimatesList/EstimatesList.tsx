'use client';

import { useEffect, useState } from 'react';

import { Badge, Card, Center, Flex, Group, Text } from '@mantine/core';
import { useRouter } from 'next/navigation';

import LoadingState from '../Global/LoadingState';
import { Estimate, EstimateStatus } from '../Global/model';
import UniversalError from '../Global/UniversalError';
import { getEstimateBadgeColor, getFormattedEstimateStatus } from '../Global/utils';

// Define column status groups and their order
const COLUMN_ONE_STATUSES = [
    EstimateStatus.NEW_LEAD,
    EstimateStatus.ESTIMATE_NOT_SCHEDULED,
    EstimateStatus.ESTIMATE_SCHEDULED,
    EstimateStatus.ESTIMATE_IN_PROGRESS,
];

const COLUMN_TWO_STATUSES = [
    EstimateStatus.NEEDS_FOLLOW_UP,
    EstimateStatus.CONTRACTOR_OPENED,
    EstimateStatus.ESTIMATE_ACCEPTED,
    EstimateStatus.CONTRACTOR_DECLINED,
    EstimateStatus.ESTIMATE_SENT,
    EstimateStatus.ESTIMATE_OPENED,
];

export default function EstimatesList() {
    const [estimates, setEstimates] = useState(new Array<Estimate>());
    const [columnOneEstimates, setColumnOneEstimates] = useState(new Array<Estimate>());
    const [columnTwoEstimates, setColumnTwoEstimates] = useState(new Array<Estimate>());
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        setLoading(true);
        getEstimates().finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        // Sort jobs into columns based on status
        const sortedColumnOne = estimates
            .filter(estimate => COLUMN_ONE_STATUSES.includes(estimate.status))
            .sort((a, b) => {
                // First sort by status order
                const statusDiff = COLUMN_ONE_STATUSES.indexOf(a.status) -
                    COLUMN_ONE_STATUSES.indexOf(b.status);
                if (statusDiff !== 0) return statusDiff;
                // Then sort by updated_at (newest first) within each status
                return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
            });

        const sortedColumnTwo = estimates
            .filter(estimate => COLUMN_TWO_STATUSES.includes(estimate.status))
            .sort((a, b) => {
                // First sort by status order
                const statusDiff = COLUMN_TWO_STATUSES.indexOf(a.status) -
                    COLUMN_TWO_STATUSES.indexOf(b.status);
                if (statusDiff !== 0) return statusDiff;
                // Then sort by updated_at (newest first) within each status
                return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
            });

        setColumnOneEstimates(sortedColumnOne);
        setColumnTwoEstimates(sortedColumnTwo);
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
                console.error('Error fetching estimates:', errorData);
                return;
            }

            const data = await response.json();
            // Handle both { Items: [...] } and direct array responses
            const estimatesList = data.Items || data || [];
            setEstimates(Array.isArray(estimatesList) ? estimatesList : []);
        } catch (error) {
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
        <Flex
          direction="column"
          mb="lg"
          gap="md"
          justify="flex-start"
          align="center"
          w="48%"
        >
            <Text fw={700} size="lg">{title}</Text>
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
    );

    return (
        <>
            {loading ? <LoadingState /> :
                <div>
                    {estimates ? (
                        <Flex
                          direction="row"
                          justify="space-between"
                          align="flex-start"
                          w="95%"
                          gap="md"
                          mt="lg"
                        >
                            {renderColumn(columnOneEstimates, 'Proposal Pipeline')}
                            {renderColumn(columnTwoEstimates, 'Sent Proposals')}
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

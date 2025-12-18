'use client';

import { useEffect, useState } from 'react';

import { Badge, Button, Card, Center, Flex, Menu, Modal, NumberInput, Text, Textarea, TextInput } from '@mantine/core';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import { useForm } from '@mantine/form';
import { IconChevronDown, IconEdit } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

import FollowUpSchedulingModal from './FollowUpSchedulingModal';
import LoadingState from '../Global/LoadingState';
import { ContractorClient, Estimate, EstimateStatus } from '../Global/model';
import { getEstimateBadgeColor, getFormattedEstimateStatus } from '../Global/utils';

import { UpdateHoursAndRateInput, UpdateJobContent } from '@/app/api/projects/jobTypes';
import { logToCloudWatch } from '@/public/logger';

export default function ClientDetails({ initialEstimate }: { initialEstimate: Estimate }) {
    const [estimate, setEstimate] = useState(initialEstimate);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
    const [showFollowUpModal, setShowFollowUpModal] = useState(false);
    const [client, setClient] = useState<ContractorClient>();
    const [menuOpened, setMenuOpened] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const loadClientDetails = async () => {
            if (!estimate.client_id) {
                return;
            }

            const accessToken = localStorage.getItem('access_token');
            if (!accessToken) {
                return;
            }

            try {
                const response = await fetch(
                    `/api/clients/${estimate.client_id}`,
                    {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${accessToken}`,
                        },
                    }
                );

                if (!response.ok) {
                    // eslint-disable-next-line no-console
                    console.error('Failed to load client details:', response.status);
                    return;
                }

                const data = await response.json();
                const clientData = data.Item || data;
                setClient(clientData as ContractorClient);
            } catch (error) {
                // eslint-disable-next-line no-console
                console.error('Error loading client details:', error);
            }
        };

        if (!client && estimate.client_id) {
            loadClientDetails();
        }
    }, [estimate.client_id]); // Only depend on client_id, not client state

    const form = useForm({
        mode: 'uncontrolled',
        initialValues: {
            client_address: estimate.address_street || estimate.client_address || '',
            city: estimate.address_city || estimate.city || '',
            zip_code: estimate.address_zipcode || estimate.zip_code || '',
        },
        validate: (values) => ({
            client_address: values.client_address === '' ? 'Must enter client address' : null,
            zip_code: values.zip_code === '' ? 'Must enter zip code' : null,
            city: values.city === '' ? 'Must enter city' : null,
        }),
    });

    const completionForm = useForm({
        initialValues: {
            actual_hours: estimate.hours_bid || estimate.estimate_hours || 0,
            additional_hours: 0,
            add_on_description: '',
            job_crew_lead: estimate.project_crew_lead || '',
        },
        validate: {
            actual_hours: (value: string | number) => (value === '' ? 'Must enter actual hours' : null),
            add_on_description: (value: string, values: any) =>
                (values.additional_hours !== 0 && value === '' ? 'Must enter description for additional hours' : null),
            job_crew_lead: (value: string) => (value === '' ? 'Must enter crew lead name' : null),
        },
    });

    const updateJob = async () => {
        const formValues = form.getValues();

        const response = await fetch(
            `/api/estimates/${estimate.id}`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    address_street: formValues.client_address,
                    address_city: formValues.city,
                    address_zipcode: formValues.zip_code,
                }),
            }
        );

        await response.json();

        setEstimate(prevEstimate => ({
            ...prevEstimate,
            address_city: formValues.city,
            address_zipcode: formValues.zip_code,
            address_street: formValues.client_address,
            city: formValues.city,
            zip_code: formValues.zip_code,
            client_address: formValues.client_address,
        }));
        setIsModalOpen(false);
    };

    const handleJobCompletion = async () => {
        const formValues = completionForm.getValues();

        // Update estimate hours
        const totalHours = (estimate.hours_bid || estimate.estimate_hours || 0)
            + formValues.additional_hours;
        const updateHoursAndRateInput: UpdateHoursAndRateInput = {
            hours: totalHours.toString(),
            rate: estimate.hourly_rate?.toString() || '0',
            date: new Date().toISOString(),
            discount_reason: '',
        };

        const content: UpdateJobContent = {
            update_hours_and_rate: updateHoursAndRateInput,
            actual_hours: formValues.actual_hours.toString(),
            project_crew_lead: formValues.job_crew_lead.toUpperCase(),
        };

        try {
            // Update estimate hours
            const response = await fetch(
                `/api/estimates/${estimate.id}`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(content),
                }
            );

            await response.json();

            // Add comment about additional hours only if there are additional hours
            if (formValues.additional_hours !== 0) {
                const commentContent = `Additional hours: ${formValues.additional_hours}. Description: ${formValues.add_on_description}`;

                const commentResponse = await fetch(`/api/estimate-comments/${estimate.id}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        id: crypto.randomUUID(),
                        commenter: 'System',
                        comment_contents: commentContent,
                        timestamp: new Date().toISOString(),
                    }),
                });

                await commentResponse.json();
            }

            // Update local state
            const newHoursBid = (estimate.hours_bid || estimate.estimate_hours || 0)
                + formValues.additional_hours;
            const actualHoursValue = typeof formValues.actual_hours === 'number'
                ? formValues.actual_hours
                : parseFloat(String(formValues.actual_hours));
            setEstimate(prevEstimate => ({
                ...prevEstimate,
                hours_bid: newHoursBid,
                estimate_hours: newHoursBid,
                actual_hours: actualHoursValue,
                project_crew_lead: formValues.job_crew_lead.toUpperCase(),
            }));

            setIsCompletionModalOpen(false);
            setMenuOpened(false);
        } catch (error) {
            logToCloudWatch(`Failed to update job completion details: ${error}`);
        }
    };

    const updateEstimateStatus = async (status: EstimateStatus) => {
        await logToCloudWatch(`Attempting to update estimate: ${estimate.id} to status: ${status}`);

        // If status is NEEDS_FOLLOW_UP, show the follow-up modal instead of updating immediately
        if (status === EstimateStatus.NEEDS_FOLLOW_UP) {
            setMenuOpened(false);
            setShowFollowUpModal(true);
            return;
        }

        try {
            const response = await fetch(
                `/api/estimates/${estimate.id}`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ status }),
                }
            );

            await response.json();

            // Update local state
            setEstimate(prevEstimate => ({
                ...prevEstimate,
                status,
            }));

            if (status === EstimateStatus.CONTRACTOR_SIGNED && client) {
                const jiraResponse = await fetch('/api/jira', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ job: estimate, client }),
                });

                if (!jiraResponse.ok) {
                    throw new Error('Failed to create JIRA ticket');
                }
            }

            // Open completion modal if status indicates completion
            // Note: EstimateStatus doesn't have JOB_COMPLETE, adjust as needed
            if (status === EstimateStatus.ARCHIVED) {
                setIsCompletionModalOpen(true);
            } else {
                setMenuOpened(false);
            }
        } catch (error) {
            logToCloudWatch(`Failed to update estimate status: ${error}`);
        }
    };

    const handleFollowUpModalSuccess = async () => {
        // After scheduling the follow-up, update the estimate status to NEEDS_FOLLOW_UP
        try {
            const response = await fetch(
                `/api/estimates/${estimate.id}`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ status: EstimateStatus.NEEDS_FOLLOW_UP }),
                }
            );

            await response.json();

            // Update local state
            setEstimate(prevEstimate => ({
                ...prevEstimate,
                status: EstimateStatus.NEEDS_FOLLOW_UP,
            }));

            setMenuOpened(false);
        } catch (error) {
            logToCloudWatch(`Failed to update estimate status after follow-up: ${error}`);
        }
    };

    const statusOptions = Object.values(EstimateStatus).filter(
        status => status !== estimate.status
    );

    const statusDropdownOptions = statusOptions.map((status) => (
        <Menu.Item
          key={status}
          onClick={() => updateEstimateStatus(status)}
        >
            {getFormattedEstimateStatus(status)}
        </Menu.Item>
    ));

    return (
        <>
            {client ?
                <Card
                  shadow="sm"
                  padding="lg"
                  radius="md"
                  withBorder
                  flex-grow={1}
                >
                    <div style={{ position: 'relative' }}>
                        <IconEdit
                          onClick={() => setIsModalOpen(true)}
                          style={{ cursor: 'pointer', position: 'absolute', top: '-5px', right: '-5px' }}
                        />
                    </div>
                    <Flex direction="column" gap="lg">
                        <Text
                          fw={500}
                          style={{ cursor: 'pointer' }}
                          onClick={() => router.push(`/clients/${estimate.client_id}`)}
                        >
                            {estimate.client_name || 'Client'}
                        </Text>
                        <Flex direction="row" gap={5}>
                            <Menu
                              opened={menuOpened}
                              onChange={setMenuOpened}
                              width={200}
                              position="bottom-start"
                            >
                                <Menu.Target>
                                    <Badge
                                      style={{
                                            color: '#ffffff',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                        }}
                                      color={getEstimateBadgeColor(estimate.status)}
                                      mr="10px"
                                      rightSection={<IconChevronDown size={12} />}
                                    >
                                        {getFormattedEstimateStatus(estimate.status)}
                                    </Badge>
                                </Menu.Target>
                                <Menu.Dropdown>
                                    <Menu.Label>Change Status</Menu.Label>
                                    {statusDropdownOptions}
                                </Menu.Dropdown>
                            </Menu>
                        </Flex>
                    </Flex>
                    <Flex direction="column" gap="lg" mt="md" mb="xs">
                        <Flex direction="column">
                            <Text size="sm" c="dimmed">{client?.email}</Text>
                            <Text size="sm" c="dimmed">Client Phone: {client?.phone_number}</Text>
                        </Flex>
                        <Flex direction="column">
                            <Text size="sm" c="dimmed">{estimate.address_street || estimate.client_address}</Text>
                            <Text size="sm" c="dimmed">{estimate.address_city || estimate.city}, {estimate.address_state || estimate.state}</Text>
                            <Text size="sm" c="dimmed">{estimate.address_zipcode || estimate.zip_code}</Text>
                        </Flex>
                    </Flex>
                </Card> : <LoadingState />
            }
            {isModalOpen &&
                <Modal
                  opened={isModalOpen}
                  onClose={() => setIsModalOpen(false)}
                  title={<Text fz={24} fw={700}>Update Client Details</Text>}
                  size="lg"
                >
                    <Text fz={12} c="dimmed">
                        To update client contact information, please go to the client tab
                    </Text>
                    <div style={{ marginTop: '10px' }}>
                        <TextInput
                          withAsterisk
                          label="Address"
                          placeholder="Client address"
                          key={form.key('client_address')}
                          {...form.getInputProps('client_address')}
                        />
                        <TextInput
                          withAsterisk
                          label="City"
                          placeholder="City"
                          key={form.key('city')}
                          {...form.getInputProps('city')}
                        />
                        <TextInput
                          withAsterisk
                          label="Zip Code"
                          placeholder="Zip Code"
                          key={form.key('zip_code')}
                          {...form.getInputProps('zip_code')}
                        />

                        <Center mt="md">
                            <Button type="submit" onClick={updateJob}>Update Client Details</Button>
                        </Center>
                    </div>
                </Modal>
            }
            {isCompletionModalOpen &&
                <Modal
                  opened={isCompletionModalOpen}
                  onClose={() => setIsCompletionModalOpen(false)}
                  title={<Text fz={24} fw={700}>Job Completion Details</Text>}
                  size="lg"
                >
                    <Text fz={14} mb="md">
                        Please enter the actual hours spent on the job and any additional
                         hours for work added to the estimate.
                    </Text>
                    <div style={{ marginTop: '10px' }}>
                        <NumberInput
                          withAsterisk
                          label="Actual Hours Spent"
                          placeholder="Enter actual hours"
                          min={0}
                          decimalScale={1}
                          key={completionForm.key('actual_hours')}
                          {...completionForm.getInputProps('actual_hours')}
                        />
                        <NumberInput
                          withAsterisk
                          label="Hours Spent on Add-ons"
                          placeholder="Enter additional hours"
                          min={0}
                          decimalScale={1}
                          key={completionForm.key('additional_hours')}
                          {...completionForm.getInputProps('additional_hours')}
                        />
                        {completionForm.values.additional_hours !== 0 && (
                          <Textarea
                            withAsterisk
                            label="Add-on Description"
                            placeholder="Describe the additional work"
                            minRows={3}
                            key={completionForm.key('add_on_description')}
                            {...completionForm.getInputProps('add_on_description')}
                          />
                        )}
                        <TextInput
                          withAsterisk
                          label="Crew Lead"
                          placeholder="Enter crew lead name"
                          key={completionForm.key('job_crew_lead')}
                          {...completionForm.getInputProps('job_crew_lead')}
                        />
                        <Center mt="md">
                            <Button type="submit" onClick={handleJobCompletion}>Submit</Button>
                        </Center>
                    </div>
                </Modal>
            }
            {client && (
                <FollowUpSchedulingModal
                  opened={showFollowUpModal}
                  onClose={() => setShowFollowUpModal(false)}
                  onSuccess={handleFollowUpModalSuccess}
                  estimate={estimate}
                  client={client}
                />
            )}
        </>
    );
}

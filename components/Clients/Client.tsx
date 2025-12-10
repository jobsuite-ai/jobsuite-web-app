'use client';

import { useEffect, useState } from 'react';

import { Badge, Button, Card, Center, Divider, Flex, Group, Modal, Paper, Text, TextInput, Textarea } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconCheck, IconClock, IconEdit, IconMail, IconMapPin, IconNotes, IconPhone, IconPlus, IconTrash, IconX } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

import classes from './Clients.module.css';
import LoadingState from '../Global/LoadingState';
import { ContractorClient, Job, SubClient } from '../Global/model';

import { getApiHeaders } from '@/app/utils/apiClient';

export default function SingleClient({ initialClient }: { initialClient: ContractorClient }) {
    const [client, setClient] = useState(initialClient);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
    const [jobs, setJobs] = useState(new Array<Job>());
    const [loading, setLoading] = useState(true);
    const [isEditingNotes, setIsEditingNotes] = useState(false);
    const [notesValue, setNotesValue] = useState(client?.notes || '');
    const [isSavingNotes, setIsSavingNotes] = useState(false);
    const [isSubClientModalOpen, setIsSubClientModalOpen] = useState(false);
    const [editingSubClient, setEditingSubClient] = useState<SubClient | null>(null);
    const [isDeletingSubClient, setIsDeletingSubClient] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        setLoading(true);
        getPageData().finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        setNotesValue(client?.notes || '');
    }, [client]);

    async function refreshClient() {
        try {
            const response = await fetch(
                `/api/clients/${client.id}`,
                {
                    method: 'GET',
                    headers: getApiHeaders(),
                }
            );
            const updatedClient = await response.json();
            setClient(updatedClient.Item || updatedClient);
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Failed to refresh client:', error);
        }
    }

    const form = useForm({
        mode: 'uncontrolled',
        initialValues: {
            name: client?.name || '',
            email: client?.email || '',
            phone_number: client?.phone_number || '',
            address_street: client?.address_street || '',
            address_city: client?.address_city || '',
            address_state: client?.address_state || '',
            address_zipcode: client?.address_zipcode || '',
            address_country: client?.address_country || '',
            notes: client?.notes || '',
        },
        validate: (values) => ({
                email: values.email === '' ? 'Must enter client email' : null,
                phone_number: values.phone_number === '' ? 'Must enter client phone number' : null,
                name: values.name === '' ? 'Must enter client name' : null,
            }),
    });

    async function getPageData() {
        await getJobs();
    }

    async function getJobs() {
        if (!client?.id) {
            return;
        }
        const response = await fetch(
            `/api/projects?client_id=${client.id}`,
            {
                method: 'GET',
                headers: getApiHeaders(),
            }
        );

        const { Items }: { Items: Job[] } = await response.json();
        setJobs(Items);
    }

    async function updateNotes() {
        setIsSavingNotes(true);
        try {
            const response = await fetch(
                `/api/clients/${client.id}`,
                {
                    method: 'PUT',
                    headers: getApiHeaders(),
                    body: JSON.stringify({
                        notes: notesValue || null,
                    }),
                }
            );

            const updatedClient = await response.json();
            setClient(updatedClient);
            setIsEditingNotes(false);
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Failed to update notes:', error);
        } finally {
            setIsSavingNotes(false);
        }
    }

    function cancelEditNotes() {
        setNotesValue(client.notes || '');
        setIsEditingNotes(false);
    }

    async function updateClient() {
        const formValues = form.getValues();

        const response = await fetch(
            `/api/clients/${client.id}`,
            {
                method: 'PUT',
                headers: getApiHeaders(),
                body: JSON.stringify({
                    name: formValues.name,
                    email: formValues.email,
                    phone_number: formValues.phone_number,
                    address_street: formValues.address_street || null,
                    address_city: formValues.address_city || null,
                    address_state: formValues.address_state || null,
                    address_zipcode: formValues.address_zipcode || null,
                    address_country: formValues.address_country || null,
                    notes: formValues.notes || null,
                }),
            }
        );

        const updatedClient = await response.json();
        setClient(updatedClient);
        setNotesValue(updatedClient.notes || '');
        closeModals();
    }

    function closeModals() {
        setIsModalOpen(false);
        setIsConfirmationModalOpen(false);
    }

    const getJobsForClient = (clientID: string): Job[] => jobs.filter((job) =>
        job.client_id === clientID);

    const formatAddress = (): string => {
        const parts = [
            client.address_street,
            client.address_city,
            client.address_state,
            client.address_zipcode,
        ].filter(Boolean);
        return parts.length > 0 ? parts.join(', ') : 'No address on file';
    };

    const subClientForm = useForm({
        mode: 'uncontrolled',
        initialValues: {
            name: '',
            email: '',
            phone_number: '',
            role: '',
            notes: '',
        },
        validate: (values) => ({
            email: values.email === '' ? 'Must enter email' : null,
            phone_number: values.phone_number === '' ? 'Must enter phone number' : null,
            name: values.name === '' ? 'Must enter name' : null,
        }),
    });

    function openSubClientModal(subClient?: SubClient) {
        if (subClient) {
            setEditingSubClient(subClient);
            subClientForm.setValues({
                name: subClient.name,
                email: subClient.email,
                phone_number: subClient.phone_number,
                role: subClient.role || '',
                notes: subClient.notes || '',
            });
        } else {
            setEditingSubClient(null);
            subClientForm.reset();
        }
        setIsSubClientModalOpen(true);
    }

    function closeSubClientModal() {
        setIsSubClientModalOpen(false);
        setEditingSubClient(null);
        subClientForm.reset();
    }

    async function saveSubClient() {
        const formValues = subClientForm.getValues();
        const subClientData = {
            name: formValues.name,
            email: formValues.email,
            phone_number: formValues.phone_number,
            role: formValues.role || null,
            notes: formValues.notes || null,
        };

        try {
            if (editingSubClient) {
                // Update existing sub-client
                const response = await fetch(
                    `/api/clients/${client.id}/sub-clients/${editingSubClient.id}`,
                    {
                        method: 'PUT',
                        headers: getApiHeaders(),
                        body: JSON.stringify(subClientData),
                    }
                );
                if (!response.ok) {
                    throw new Error('Failed to update sub-client');
                }
            } else {
                // Create new sub-client
                const response = await fetch(
                    `/api/clients/${client.id}/sub-clients`,
                    {
                        method: 'POST',
                        headers: getApiHeaders(),
                        body: JSON.stringify(subClientData),
                    }
                );
                if (!response.ok) {
                    throw new Error('Failed to create sub-client');
                }
            }
            await refreshClient();
            closeSubClientModal();
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Failed to save sub-client:', error);
        }
    }

    async function deleteSubClient(subClientId: string) {
        setIsDeletingSubClient(subClientId);
        try {
            const response = await fetch(
                `/api/clients/${client.id}/sub-clients/${subClientId}`,
                {
                    method: 'DELETE',
                    headers: getApiHeaders(),
                }
            );
            if (!response.ok) {
                throw new Error('Failed to delete sub-client');
            }
            await refreshClient();
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Failed to delete sub-client:', error);
        } finally {
            setIsDeletingSubClient(null);
        }
    }

    return (
        <>
            {loading ? <LoadingState /> :
                <div className={classes.flexWrapper}>
                    {client &&
                    <>
                        <Card
                          key={client.id}
                          shadow="sm"
                          padding="lg"
                          radius="md"
                          mt="lg"
                          withBorder
                          w="85%"
                        >
                            <Group justify="space-between" mb="md">
                                <Text fz={28} fw={700}>{client.name}</Text>
                                <IconEdit
                                  onClick={() => setIsModalOpen(true)}
                                  style={{ cursor: 'pointer' }}
                                  size={20}
                                />
                            </Group>

                            <Divider mb="md" />

                            <Flex direction="row" justify="space-between" gap="xl" wrap="wrap" mb="md">
                                <Flex direction="column" gap="md" style={{ flex: 1, minWidth: '250px' }}>
                                    <Flex direction="column" gap="xs">
                                        <Text size="sm" fw={600} mb={4}>
                                            <IconMail size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                                            Email
                                        </Text>
                                        <Text size="sm" c="dimmed">
                                            <a href={`mailto:${client.email}`} onClick={(e) => e.stopPropagation()}>
                                                {client.email}
                                            </a>
                                        </Text>
                                    </Flex>

                                    <Flex direction="column" gap="xs">
                                        <Text size="sm" fw={600} mb={4}>
                                            <IconPhone size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                                            Phone
                                        </Text>
                                        <Text size="sm" c="dimmed">
                                            <a href={`tel:+1${client.phone_number}`} onClick={(e) => e.stopPropagation()}>
                                                {client.phone_number}
                                            </a>
                                        </Text>
                                    </Flex>
                                </Flex>

                                <Flex direction="column" gap="md" style={{ flex: 1, minWidth: '250px' }}>
                                    <Flex direction="column" gap="xs">
                                        <Text size="sm" fw={600} mb={4}>
                                            <IconMapPin size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                                            Address
                                        </Text>
                                        <Text size="sm" c="dimmed">
                                            {formatAddress()}
                                        </Text>
                                        {client.address_country && (
                                            <Text size="sm" c="dimmed">
                                                {client.address_country}
                                            </Text>
                                        )}
                                    </Flex>
                                </Flex>
                            </Flex>

                            <Divider my="md" />
                            <Flex direction="column" gap="xs">
                                <Group justify="space-between" mb={4}>
                                    <Text size="sm" fw={600}>
                                        <IconNotes size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                                        Notes
                                    </Text>
                                    {!isEditingNotes && (
                                      <IconEdit
                                        onClick={() => setIsEditingNotes(true)}
                                        style={{ cursor: 'pointer' }}
                                        size={16}
                                      />
                                    )}
                                </Group>
                                {isEditingNotes ? (
                                  <Flex direction="column" gap="xs">
                                    <Textarea
                                      value={notesValue}
                                      onChange={(e) => setNotesValue(e.target.value)}
                                      placeholder="Add any notes about this client..."
                                      minRows={4}
                                      autosize
                                    />
                                    <Group justify="flex-end" gap="xs">
                                      <Button
                                        size="xs"
                                        variant="subtle"
                                        onClick={cancelEditNotes}
                                        leftSection={<IconX size={14} />}
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        size="xs"
                                        onClick={updateNotes}
                                        loading={isSavingNotes}
                                        leftSection={<IconCheck size={14} />}
                                      >
                                        Save
                                      </Button>
                                    </Group>
                                  </Flex>
                                ) : (
                                    <Text size="sm" c="dimmed" style={{ whiteSpace: 'pre-wrap', minHeight: '60px' }}>
                                        {client.notes || 'No notes. Click edit to add notes.'}
                                    </Text>
                                )}
                            </Flex>

                            <Divider my="md" />

                            {/* Sub-Clients Section */}
                            <Flex direction="column" gap="xs">
                                <Group justify="space-between" mb={4}>
                                    <Text size="sm" fw={600}>
                                        Sub-Clients
                                    </Text>
                                    <Button
                                      size="xs"
                                      variant="light"
                                      leftSection={<IconPlus size={14} />}
                                      onClick={() => openSubClientModal()}
                                    >
                                        Add Sub-Client
                                    </Button>
                                </Group>
                                {client.sub_clients && client.sub_clients.length > 0 ? (
                                    <Flex direction="column" gap="sm">
                                        {client.sub_clients.map((subClient) => (
                                            <Paper
                                              key={subClient.id}
                                              shadow="xs"
                                              radius="md"
                                              withBorder
                                              p="md"
                                            >
                                                <Flex direction="row" justify="space-between" align="flex-start">
                                                    <Flex direction="column" gap="xs" style={{ flex: 1 }}>
                                                        <Group gap="xs">
                                                            <Text size="sm" fw={600}>
                                                                {subClient.name}
                                                            </Text>
                                                            {subClient.role && (
                                                                <Badge size="sm" variant="light" color="blue">
                                                                    {subClient.role}
                                                                </Badge>
                                                            )}
                                                        </Group>
                                                        <Flex direction="row" gap="md" wrap="wrap">
                                                            <Text size="xs" c="dimmed">
                                                                <IconMail size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                                                                <a href={`mailto:${subClient.email}`} onClick={(e) => e.stopPropagation()}>
                                                                    {subClient.email}
                                                                </a>
                                                            </Text>
                                                            <Text size="xs" c="dimmed">
                                                                <IconPhone size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                                                                <a href={`tel:+1${subClient.phone_number}`} onClick={(e) => e.stopPropagation()}>
                                                                    {subClient.phone_number}
                                                                </a>
                                                            </Text>
                                                        </Flex>
                                                        {subClient.notes && (
                                                            <Text size="xs" c="dimmed" style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>
                                                                <IconNotes size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                                                                {subClient.notes}
                                                            </Text>
                                                        )}
                                                    </Flex>
                                                    <Group gap="xs">
                                                        <IconEdit
                                                          size={16}
                                                          style={{ cursor: 'pointer' }}
                                                          onClick={() =>
                                                            openSubClientModal(subClient)
                                                          }
                                                        />
                                                        <IconTrash
                                                          size={16}
                                                          style={{
                                                            cursor:
                                                              isDeletingSubClient === subClient.id
                                                                ? 'wait'
                                                                : 'pointer',
                                                            color: 'var(--mantine-color-red-6)',
                                                            opacity:
                                                              isDeletingSubClient === subClient.id
                                                                ? 0.5
                                                                : 1,
                                                          }}
                                                          onClick={() =>
                                                            deleteSubClient(subClient.id)
                                                          }
                                                        />
                                                    </Group>
                                                </Flex>
                                            </Paper>
                                        ))}
                                    </Flex>
                                ) : (
                                    <Text size="sm" c="dimmed" style={{ fontStyle: 'italic' }}>
                                        No sub-clients. Click &quot;Add Sub-Client&quot; to add
                                        contacts associated with this client.
                                    </Text>
                                )}
                            </Flex>

                            <Divider my="md" />

                            {client.updated_at && (
                                <Flex direction="row" align="center" gap="xs">
                                    <IconClock size={14} style={{ color: 'var(--mantine-color-dimmed)' }} />
                                    <Text size="xs" c="dimmed">
                                        Last updated:{' '}
                                        {new Date(client.updated_at).toLocaleString()}
                                    </Text>
                                    <div style={{ marginLeft: 'auto' }}>
                                        <Badge color="blue" variant="light">
                                            {getJobsForClient(client.id).length} {getJobsForClient(client.id).length === 1 ? 'Job' : 'Jobs'}
                                        </Badge>
                                    </div>
                                </Flex>
                            )}
                        </Card>

                        {getJobsForClient(client.id).length > 0 && (
                            <Card
                              shadow="sm"
                              padding="lg"
                              radius="md"
                              mt="lg"
                              withBorder
                              w="85%"
                            >
                                <Text fz={24} fw={700} mb="md">Jobs</Text>
                                <Divider mb="md" />
                                <Flex direction="column" gap="md">
                                    {getJobsForClient(client.id).map((job) => (
                                        <Paper
                                          key={job.id}
                                          shadow="xs"
                                          radius="md"
                                          withBorder
                                          p="lg"
                                          onClick={() => router.push(`/projects/${job.id}`)}
                                          style={{ cursor: 'pointer' }}
                                        >
                                            <Flex direction="row" justify="space-between" align="center">
                                                <Flex direction="column" gap={4} style={{ flex: 1 }}>
                                                    {job.title && (
                                                        <Text size="md" fw={600}>
                                                            {job.title}
                                                        </Text>
                                                    )}
                                                    {job.scheduled_date && (
                                                        <Text size="sm" c="dimmed">
                                                            Scheduled:{' '}
                                                            {new Date(
                                                                job.scheduled_date
                                                            ).toLocaleDateString()}
                                                        </Text>
                                                    )}
                                                    {job.status && (
                                                        <Text size="xs" c="dimmed" mt={4}>
                                                            Status: {job.status}
                                                        </Text>
                                                    )}
                                                </Flex>
                                                {job.status && (
                                                    <Badge size="sm" variant="light">
                                                        {job.status}
                                                    </Badge>
                                                )}
                                            </Flex>
                                        </Paper>
                                    ))}
                                </Flex>
                            </Card>
                        )}
                    </>}
                </div>
            }
            <Modal
              opened={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              title="Update Client Details"
              size="lg"
            >
                <Flex direction="column" gap="md">
                    <TextInput
                      withAsterisk
                      label="Client Name"
                      placeholder={client?.name}
                      key={form.key('name')}
                      {...form.getInputProps('name')}
                    />
                    <TextInput
                      withAsterisk
                      label="Email"
                      placeholder={client?.email}
                      key={form.key('email')}
                      {...form.getInputProps('email')}
                    />
                    <TextInput
                      withAsterisk
                      label="Phone Number"
                      placeholder={client?.phone_number}
                      key={form.key('phone_number')}
                      {...form.getInputProps('phone_number')}
                    />
                    <Divider my="sm" />
                    <Text size="sm" fw={600} mb="xs">Address</Text>
                    <TextInput
                      label="Street Address"
                      placeholder={client?.address_street || 'Enter street address'}
                      key={form.key('address_street')}
                      {...form.getInputProps('address_street')}
                    />
                    <Flex direction="row" gap="md">
                        <TextInput
                          label="City"
                          placeholder={client?.address_city || 'Enter city'}
                          key={form.key('address_city')}
                          {...form.getInputProps('address_city')}
                          style={{ flex: 1 }}
                        />
                        <TextInput
                          label="State"
                          placeholder={client?.address_state || 'Enter state'}
                          key={form.key('address_state')}
                          {...form.getInputProps('address_state')}
                          style={{ width: '100px' }}
                        />
                        <TextInput
                          label="ZIP Code"
                          placeholder={client?.address_zipcode || 'Enter ZIP'}
                          key={form.key('address_zipcode')}
                          {...form.getInputProps('address_zipcode')}
                          style={{ width: '120px' }}
                        />
                    </Flex>
                    <TextInput
                      label="Country"
                      placeholder={client?.address_country || 'Enter country'}
                      key={form.key('address_country')}
                      {...form.getInputProps('address_country')}
                    />
                    <Divider my="sm" />
                    <Textarea
                      label="Notes"
                      placeholder="Add any notes about this client..."
                      key={form.key('notes')}
                      {...form.getInputProps('notes')}
                      minRows={4}
                    />

                    <Center mt="md">
                        <Button type="submit" onClick={() => setIsConfirmationModalOpen(true)}>
                            Update Client Details
                        </Button>
                    </Center>
                </Flex>
            </Modal>
            <Modal
              opened={isConfirmationModalOpen}
              onClose={() => setIsConfirmationModalOpen(false)}
              size="lg"
              title={<Text fz={30} fw={700}>Are you sure?</Text>}
            >
                <Center mt="md">
                    <Flex direction="column">
                        <Text mb="lg">
                            This will update the client details. Currently there are{' '}
                            {getJobsForClient(client.id).length} jobs associated with this client.
                        </Text>
                        <Flex direction="row" gap="lg" justify="center" align="center">
                            <Button type="submit" onClick={updateClient}>Confirm</Button>
                            <Button type="submit" variant="outline" onClick={closeModals}>Cancel</Button>
                        </Flex>
                    </Flex>
                </Center>
            </Modal>

            {/* Sub-Client Modal */}
            <Modal
              opened={isSubClientModalOpen}
              onClose={closeSubClientModal}
              title={editingSubClient ? 'Edit Sub-Client' : 'Add Sub-Client'}
              size="lg"
            >
                <Flex direction="column" gap="md">
                    <TextInput
                      withAsterisk
                      label="Name"
                      placeholder="Enter name"
                      key={subClientForm.key('name')}
                      {...subClientForm.getInputProps('name')}
                    />
                    <TextInput
                      withAsterisk
                      label="Email"
                      placeholder="Enter email"
                      key={subClientForm.key('email')}
                      {...subClientForm.getInputProps('email')}
                    />
                    <TextInput
                      withAsterisk
                      label="Phone Number"
                      placeholder="Enter phone number"
                      key={subClientForm.key('phone_number')}
                      {...subClientForm.getInputProps('phone_number')}
                    />
                    <TextInput
                      label="Role/Title"
                      placeholder="e.g., Owner, Sales Person, Project Manager"
                      key={subClientForm.key('role')}
                      {...subClientForm.getInputProps('role')}
                    />
                    <Textarea
                      label="Notes"
                      placeholder="Track interactions and important information about this contact..."
                      key={subClientForm.key('notes')}
                      {...subClientForm.getInputProps('notes')}
                      minRows={4}
                    />
                    <Group justify="flex-end" mt="md">
                        <Button variant="outline" onClick={closeSubClientModal}>
                            Cancel
                        </Button>
                        <Button onClick={saveSubClient}>
                            {editingSubClient ? 'Update' : 'Create'}
                        </Button>
                    </Group>
                </Flex>
            </Modal>
        </>
    );
}

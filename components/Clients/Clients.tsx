'use client';

import { useEffect, useState } from 'react';

import { Card, Flex, Group, Paper, Text } from '@mantine/core';
import { useRouter } from 'next/navigation';

import classes from './Clients.module.css';
import LoadingState from '../Global/LoadingState';
import { Client, Job } from '../Global/model';
import UniversalError from '../Global/UniversalError';

export default function ClientsList() {
  const [clients, setClients] = useState(new Array<Client>());
  const [jobs, setJobs] = useState(new Array<Job>());
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    setLoading(true);
    getPageData().finally(() => setLoading(false));
  }, []);

  async function getPageData() {
    await getClients();
    await getJobs();
  }

  async function getJobs() {
    const response = await fetch('/api/jobs', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const { Items }: { Items: Job[] } = await response.json();
    setJobs(Items);
  }

  async function getClients() {
    const response = await fetch('/api/clients', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const { Items }: { Items: Client[] } = await response.json();
    setClients(Items);
  }

  const getJobsForClient = (clientID: string): Job[] =>
    jobs.filter((job) => job.client_id === clientID);

  return (
    <>
      {loading ? (
        <LoadingState />
      ) : (
        <div className={classes.flexWrapper}>
          {clients ? (
            <>
              <h1>Clients List</h1>
              {clients.map((client) => (
                <Card
                  key={client.id}
                  shadow="sm"
                  padding="lg"
                  radius="md"
                  withBorder
                  w="85%"
                  style={{ cursor: 'pointer' }}
                  onClick={() => router.push(`/clients/${client.id}`)}
                >
                  <Group justify="space-between" mt="md" mb="xs">
                    <Text fw={500}>{client.client_name}</Text>
                  </Group>

                  <Flex
                    direction="row"
                    justify="space-between"
                    gap="lg"
                    mt="md"
                    mr="lg"
                    ml="lg"
                    mb="xs"
                  >
                    <Flex direction="column">
                      <Text size="sm" c="dimmed">
                        {client.email}
                      </Text>
                      <Text size="sm" c="dimmed">
                        Client Phone: {client.phone_number}
                      </Text>
                      <Text size="sm" c="dimmed">
                        Job Count: {client.jobs.length}
                      </Text>
                    </Flex>
                    <Flex direction="column" align="flex-end">
                      <Text size="sm" c="dimmed">
                        {client.address}
                      </Text>
                      <Text size="sm" c="dimmed">
                        {client.city}, {client.state}
                      </Text>
                      <Text size="sm" c="dimmed">
                        {client.zip_code}
                      </Text>
                    </Flex>
                  </Flex>
                  <Flex direction="column" gap="md" justify="center" align="center" mt="xl">
                    {getJobsForClient(client.id).map((job) => (
                      <Paper
                        key={job.id}
                        shadow="sm"
                        radius="md"
                        w="85%"
                        withBorder
                        p="lg"
                        onClick={() => router.push(`/jobs/${job.id}`)}
                        style={{ cursor: 'pointer' }}
                      >
                        <Flex direction="row" justify="space-between">
                          {job.estimate_date && (
                            <Text size="sm" c="dimmed">
                              {job.estimate_date.split('T')[0]}
                            </Text>
                          )}
                        </Flex>
                      </Paper>
                    ))}
                  </Flex>
                </Card>
              ))}
            </>
          ) : (
            <div style={{ marginTop: '100px' }}>
              <UniversalError message="Unable to access list of clients" />
            </div>
          )}
        </div>
      )}
    </>
  );
}

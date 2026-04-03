'use client';

import { Container, Stack, Text, Title } from '@mantine/core';

import EmployeeTeamsTab from '@/components/Settings/EmployeeTeamsTab';
import TeamTab from '@/components/Settings/TeamTab';

export default function EmployeesTeamsPage() {
  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <div>
          <Title order={1} c="white" mb="xs">
            Employees &amp; Teams
          </Title>
          <Text c="dimmed" size="sm">
            Configure roster lists for proposals and manage production teams (crews), capacity, and
            members.
          </Text>
        </div>
        <TeamTab />
        <EmployeeTeamsTab />
      </Stack>
    </Container>
  );
}

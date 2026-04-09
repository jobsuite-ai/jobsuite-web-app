'use client';

import { Container, Stack, Text, Title } from '@mantine/core';

import EmployeeRosterCard from '@/components/Settings/EmployeeRosterCard';
import EmployeeTeamsTab from '@/components/Settings/EmployeeTeamsTab';

export default function EmployeesTeamsPage() {
  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <div>
          <Title order={1} c="white" mb="xs">
            Employees &amp; Teams
          </Title>
          <Text c="dimmed" size="sm">
            Set job role on each employee where needed, and configure production teams (crews).
            Default capacity uses 10 hours per workday when a team has no custom capacity.
          </Text>
        </div>
        <EmployeeRosterCard />
        <EmployeeTeamsTab />
      </Stack>
    </Container>
  );
}

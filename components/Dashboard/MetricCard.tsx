'use client';

import { Paper, Text, Title } from '@mantine/core';

interface MetricCardProps {
  title: string;
  value: string;
  description: string;
}

export function MetricCard({ title, value, description }: MetricCardProps) {
  return (
    <Paper withBorder p="md" radius="md" h="100%">
      <Text size="xs" c="dimmed" fw={700} tt="uppercase">
        {title}
      </Text>
      <Title order={2} fw={700} mt="sm" mb="xs">
        {value}
      </Title>
      <Text size="sm" c="dimmed">
        {description}
      </Text>
    </Paper>
  );
}

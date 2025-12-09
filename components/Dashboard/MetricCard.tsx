'use client';

import { Paper, Skeleton, Text, Title } from '@mantine/core';

interface MetricCardProps {
  title: string;
  value: string;
  description: string;
  loading?: boolean;
}

export function MetricCard({ title, value, description, loading = false }: MetricCardProps) {
  return (
    <Paper withBorder p="md" radius="md" h="100%">
      <Text size="xs" c="dimmed" fw={700} tt="uppercase">
        {title}
      </Text>
      {loading ? (
        <Skeleton height={32} mt="sm" mb="xs" />
      ) : (
        <Title order={2} fw={700} mt="sm" mb="xs">
          {value}
        </Title>
      )}
      <Text size="sm" c="dimmed">
        {description}
      </Text>
    </Paper>
  );
}

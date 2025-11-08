import { ActionIcon, Card, Group, Text } from '@mantine/core';
import { IconEdit, IconTrash } from '@tabler/icons-react';

import { EstimateLineItem } from './LineItems';
import classes from '../styles/EstimateDetails.module.css';

export function LineItem({ lineItem, onEdit, onDelete }: {
    lineItem: EstimateLineItem;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const rate = lineItem.rate || 0;
    const formattedPrice = rate.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    return (
        <Card
          shadow="xs"
          padding="lg"
          radius="md"
          withBorder
          className={classes.lineItemCard}
        >
            <Group justify="space-between" align="flex-start">
                <div style={{ flex: 1 }}>
                    <Group justify="space-between" mb="xs">
                        <Text size="lg" fw={600}>
                            {lineItem.title || 'Untitled'}
                        </Text>
                        <Group gap="xs">
                            <ActionIcon
                              variant="subtle"
                              color="blue"
                              onClick={onEdit}
                              aria-label="Edit line item"
                            >
                                <IconEdit size={18} />
                            </ActionIcon>
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              onClick={onDelete}
                              aria-label="Delete line item"
                            >
                                <IconTrash size={18} />
                            </ActionIcon>
                        </Group>
                    </Group>
                    {lineItem.description && (
                        <Text size="sm" c="dimmed" mb="xs">
                            {lineItem.description}
                        </Text>
                    )}
                    <Group gap="md" mt="xs" justify="space-between">
                        <Group gap="md">
                            <Text size="sm" c="dimmed">
                                Hours: {lineItem.hours.toFixed(2)}
                            </Text>
                            <Text size="sm" c="dimmed">
                                Rate: ${formattedPrice}
                            </Text>
                        </Group>
                        <Text size="sm" fw={600}>
                            Total: ${(lineItem.hours * rate).toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })}
                        </Text>
                    </Group>
                </div>
            </Group>
        </Card>
    );
}

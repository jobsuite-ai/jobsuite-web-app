import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ActionIcon, Card, Group, Text } from '@mantine/core';
import { IconEdit, IconTrash, IconGripVertical } from '@tabler/icons-react';

import classes from '../styles/EstimateDetails.module.css';

// Type for EstimateLineItem matching the backend API response
export type EstimateLineItem = {
    id: string;
    estimate_id?: string;
    contractor_id?: string;
    title: string;
    description: string;
    hours: number;
    rate: number;
    created_by?: string;
    created_at: string;
    order?: number;
};

export function LineItem({ lineItem, onEdit, onDelete, disabled }: {
    lineItem: EstimateLineItem;
    onEdit: () => void;
    onDelete: () => void;
    disabled?: boolean;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: lineItem.id, disabled });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const rate = lineItem.rate || 0;
    const formattedPrice = rate.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    return (
        <Card
          ref={setNodeRef}
          style={style}
          shadow="xs"
          padding="lg"
          radius="md"
          withBorder
          className={classes.lineItemCard}
        >
            <Group justify="space-between" align="flex-start">
                <div style={{ flex: 1 }}>
                    <Group justify="space-between" mb="xs">
                        <Group gap="xs" align="center">
                            <ActionIcon
                              variant="subtle"
                              color="gray"
                              {...attributes}
                              {...listeners}
                              style={{ cursor: disabled ? 'not-allowed' : 'grab' }}
                              aria-label="Drag to reorder"
                            >
                                <IconGripVertical size={18} />
                            </ActionIcon>
                            <Text size="lg" fw={600}>
                                {lineItem.title || 'Untitled'}
                            </Text>
                        </Group>
                        <Group gap="xs">
                            <ActionIcon
                              variant="subtle"
                              color="blue"
                              onClick={onEdit}
                              aria-label="Edit line item"
                              disabled={disabled}
                            >
                                <IconEdit size={18} />
                            </ActionIcon>
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              onClick={onDelete}
                              aria-label="Delete line item"
                              disabled={disabled}
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

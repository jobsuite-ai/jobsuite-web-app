'use client';

import { useEffect, useState } from 'react';

import {
    Button,
    Card,
    Group,
    MultiSelect,
    Select,
    Stack,
    Text,
    TextInput,
    Title,
} from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';

import { JobStatus } from '@/components/Global/model';
import { ColumnConfig, getDefaultColumns, loadColumnSettings, saveColumnSettings } from '@/components/Global/settings';

// All available job statuses from the backend
const ALL_STATUSES: JobStatus[] = [
    'ESTIMATE_NEEDED' as JobStatus,
    'ESTIMATE_SCHEDULED' as JobStatus,
    'ESTIMATE_COMPLETED' as JobStatus,
    'PROPOSAL_SENT' as JobStatus,
    'PROPOSAL_APPROVED' as JobStatus,
    'SCHEDULED' as JobStatus,
    'IN_PROGRESS' as JobStatus,
    'COMPLETED' as JobStatus,
    'INVOICED' as JobStatus,
    'PAID' as JobStatus,
    'CANCELLED' as JobStatus,
];

export default function SettingsPage() {
    const [columns, setColumns] = useState<ColumnConfig[]>(getDefaultColumns());
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        // Load saved settings
        const savedSettings = loadColumnSettings();
        if (savedSettings && savedSettings.length > 0) {
            setColumns(savedSettings);
        }
    }, []);

    const handleAddColumn = () => {
        const newColumn: ColumnConfig = {
            id: `column-${Date.now()}`,
            title: 'New Column',
            statuses: [],
            defaultStatus: 'ESTIMATE_NEEDED' as JobStatus,
        };
        setColumns([...columns, newColumn]);
        setHasChanges(true);
    };

    const handleRemoveColumn = (columnId: string) => {
        if (columns.length <= 1) {
            // Don't allow removing the last column
            return;
        }
        setColumns(columns.filter((col) => col.id !== columnId));
        setHasChanges(true);
    };

    const handleUpdateColumn = (columnId: string, updates: Partial<ColumnConfig>) => {
        setColumns(
            columns.map((col) =>
                col.id === columnId ? { ...col, ...updates } : col
            )
        );
        setHasChanges(true);
    };

    const handleSave = () => {
        saveColumnSettings(columns);
        setHasChanges(false);
        // Dispatch custom event to notify other components of the change
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('localStorageChange'));
        }
    };

    const handleReset = () => {
        const defaultColumns = getDefaultColumns();
        setColumns(defaultColumns);
        setHasChanges(true);
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <Title order={1} mb="xl">
                Project Settings
            </Title>
            <Text c="dimmed" mb="xl">
                Configure the columns and status options for your project board.
                Drag and drop jobs between columns to update their status.
            </Text>

            <Stack gap="lg">
                {columns.map((column, index) => (
                    <Card key={column.id} shadow="sm" padding="lg" withBorder>
                        <Group justify="space-between" mb="md">
                            <Text fw={500}>Column {index + 1}</Text>
                            <Button
                              variant="subtle"
                              color="red"
                              size="sm"
                              onClick={() => handleRemoveColumn(column.id)}
                              disabled={columns.length <= 1}
                              leftSection={<IconTrash size={16} />}
                            >
                                Remove
                            </Button>
                        </Group>

                        <Stack gap="md">
                            <TextInput
                              label="Column Title"
                              placeholder="e.g., Estimate Needed"
                              value={column.title}
                              onChange={(e) =>
                                    handleUpdateColumn(column.id, {
                                        title: e.target.value,
                                    })
                                }
                            />

                            <MultiSelect
                              label="Statuses in this Column"
                              placeholder="Select statuses"
                              data={ALL_STATUSES.map((status) => ({
                                    value: status,
                                    label: status.replace(/_/g, ' '),
                                }))}
                              value={column.statuses}
                              onChange={(values) =>
                                    handleUpdateColumn(column.id, {
                                        statuses: values as JobStatus[],
                                    })
                                }
                            />

                            <Select
                              label="Default Status (when dropped here)"
                              placeholder="Select default status"
                              data={ALL_STATUSES.map((status) => ({
                                    value: status,
                                    label: status.replace(/_/g, ' '),
                                }))}
                              value={column.defaultStatus}
                              onChange={(value) => {
                                    if (value) {
                                        handleUpdateColumn(column.id, {
                                            defaultStatus: value as JobStatus,
                                        });
                                    }
                                }}
                              required
                            />
                        </Stack>
                    </Card>
                ))}

                <Group justify="space-between" mt="xl">
                    <Button
                      variant="light"
                      leftSection={<IconPlus size={16} />}
                      onClick={handleAddColumn}
                    >
                        Add Column
                    </Button>
                    <Group>
                        <Button variant="outline" onClick={handleReset}>
                            Reset to Default
                        </Button>
                        <Button onClick={handleSave} disabled={!hasChanges}>
                            Save Changes
                        </Button>
                    </Group>
                </Group>
            </Stack>
        </div>
    );
}

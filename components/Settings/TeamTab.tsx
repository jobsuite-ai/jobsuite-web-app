'use client';

import { useEffect, useState } from 'react';

import {
    ActionIcon,
    Button,
    Card,
    Group,
    Stack,
    Text,
    TextInput,
    Loader,
    Alert,
    Divider,
    NumberInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconPlus, IconTrash, IconX } from '@tabler/icons-react';

import { getApiHeaders } from '@/app/utils/apiClient';
import { invalidateTeamConfigCache, type ScheduleTeam } from '@/hooks/useTeamConfig';

interface ContractorConfiguration {
    id: string;
    user_id: string;
    contractor_id: string;
    settings: Record<string, unknown>;
    configuration_type: string;
    configuration: Record<string, unknown>;
    edited: unknown[];
    services: string[];
    created_at: string;
    updated_at: string;
}

const DEFAULT_TEAM_LISTS = {
    team_lead_painters: [] as string[],
    team_production_managers: [] as string[],
    team_sales_people: [] as string[],
};

function ListEditor({
    label,
    description,
    items,
    onChange,
    placeholder = 'Enter name',
}: {
    label: string;
    description: string;
    items: string[];
    onChange: (items: string[]) => void;
    placeholder?: string;
}) {
    const [newName, setNewName] = useState('');

    const add = () => {
        const trimmed = newName.trim();
        if (!trimmed || items.includes(trimmed)) return;
        onChange([...items, trimmed]);
        setNewName('');
    };

    const remove = (index: number) => {
        onChange(items.filter((_, i) => i !== index));
    };

    return (
        <Card padding="md" withBorder radius="md">
            <Stack gap="sm">
                <div>
                    <Text fw={600}>
                        {label}
                    </Text>
                    <Text c="dimmed" size="sm">
                        {description}
                    </Text>
                </div>
                <Group gap="xs" wrap="wrap">
                    {items.map((name, index) => (
                        <Group key={`${name}-${index}`} gap={4} className="badge-like">
                            <Text size="sm">
                                {name}
                            </Text>
                            <ActionIcon
                              size="xs"
                              variant="subtle"
                              color="red"
                              onClick={() => remove(index)}
                              aria-label={`Remove ${name}`}
                            >
                                <IconTrash size={14} />
                            </ActionIcon>
                        </Group>
                    ))}
                </Group>
                <Group gap="xs">
                    <TextInput
                      placeholder={placeholder}
                      value={newName}
                      onChange={(e) => setNewName(e.currentTarget.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
                      size="sm"
                      style={{ flex: 1, maxWidth: 240 }}
                    />
                    <Button size="sm" leftSection={<IconPlus size={14} />} onClick={add} variant="light">
                        Add
                    </Button>
                </Group>
            </Stack>
        </Card>
    );
}

export default function TeamTab({ embedded = false }: { embedded?: boolean }) {
    const [configId, setConfigId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [leadPainters, setLeadPainters] = useState<string[]>([]);
    const [productionManagers, setProductionManagers] = useState<string[]>([]);
    const [salesPeople, setSalesPeople] = useState<string[]>([]);
    const [scheduleDefaultDailyHours, setScheduleDefaultDailyHours] = useState<number>(8);
    const [scheduleTeams, setScheduleTeams] = useState<ScheduleTeam[]>([]);
    const [fullConfiguration, setFullConfiguration] = useState<Record<string, unknown>>({});

    useEffect(() => {
        loadConfiguration();
    }, []);

    const loadConfiguration = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch(
                '/api/configurations?config_type=contractor_config',
                { method: 'GET', headers: getApiHeaders() }
            );

            if (!response.ok) {
                if (response.status === 404) {
                    setConfigId(null);
                    setLeadPainters(DEFAULT_TEAM_LISTS.team_lead_painters);
                    setProductionManagers(DEFAULT_TEAM_LISTS.team_production_managers);
                    setSalesPeople(DEFAULT_TEAM_LISTS.team_sales_people);
                    setScheduleDefaultDailyHours(8);
                    setScheduleTeams([]);
                    setFullConfiguration({});
                    return;
                }
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to load configuration');
            }

            const configs: ContractorConfiguration[] = await response.json();
            const config = configs.find((c) => c.configuration_type === 'contractor_config');

            if (config) {
                setConfigId(config.id);
                const conf = (config.configuration || {}) as Record<string, unknown>;
                setFullConfiguration(conf);
                setLeadPainters(
                    Array.isArray(conf.team_lead_painters)
                        ? (conf.team_lead_painters as string[])
                        : []
                );
                setProductionManagers(
                    Array.isArray(conf.team_production_managers)
                        ? (conf.team_production_managers as string[])
                        : []
                );
                setSalesPeople(
                    Array.isArray(conf.team_sales_people)
                        ? (conf.team_sales_people as string[])
                        : []
                );
                if (typeof conf.schedule_default_daily_hours === 'number' && conf.schedule_default_daily_hours > 0) {
                    setScheduleDefaultDailyHours(conf.schedule_default_daily_hours);
                } else {
                    setScheduleDefaultDailyHours(8);
                }
                const rawTeams = conf.schedule_teams;
                if (Array.isArray(rawTeams)) {
                    const teams: ScheduleTeam[] = [];
                    rawTeams.forEach((item) => {
                        if (!item || typeof item !== 'object') return;
                        const o = item as Record<string, unknown>;
                        const id = typeof o.id === 'string' ? o.id.trim() : '';
                        const name = typeof o.name === 'string' ? o.name.trim() : '';
                        if (!id || !name) return;
                        teams.push({
                            id,
                            name,
                            painterCount:
                                typeof o.painterCount === 'number'
                                    ? o.painterCount
                                    : typeof o.painter_count === 'number'
                                      ? o.painter_count
                                      : undefined,
                            weeklyHours:
                                typeof o.weeklyHours === 'number'
                                    ? o.weeklyHours
                                    : typeof o.weekly_hours === 'number'
                                      ? o.weekly_hours
                                      : undefined,
                        });
                    });
                    setScheduleTeams(teams);
                } else {
                    setScheduleTeams([]);
                }
            } else {
                setConfigId(null);
                setFullConfiguration({});
                setLeadPainters(DEFAULT_TEAM_LISTS.team_lead_painters);
                setProductionManagers(DEFAULT_TEAM_LISTS.team_production_managers);
                setSalesPeople(DEFAULT_TEAM_LISTS.team_sales_people);
                setScheduleDefaultDailyHours(8);
                setScheduleTeams([]);
            }
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('Error loading team configuration:', err);
            setError(err instanceof Error ? err.message : 'Failed to load configuration');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setError(null);

            const configuration = {
                ...fullConfiguration,
                team_lead_painters: leadPainters,
                team_production_managers: productionManagers,
                team_sales_people: salesPeople,
                schedule_default_daily_hours: scheduleDefaultDailyHours,
                schedule_teams: scheduleTeams.map((t) => ({
                    id: t.id,
                    name: t.name,
                    painterCount: t.painterCount,
                    weeklyHours: t.weeklyHours,
                })),
            };

            const configData = {
                configuration_type: 'contractor_config',
                configuration,
            };

            if (configId) {
                const response = await fetch(`/api/configurations/${configId}`, {
                    method: 'PUT',
                    headers: getApiHeaders(),
                    body: JSON.stringify(configData),
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to save configuration');
                }
                const saved: ContractorConfiguration = await response.json();
                setConfigId(saved.id);
                setFullConfiguration((saved.configuration || {}) as Record<string, unknown>);
            } else {
                const response = await fetch('/api/configurations', {
                    method: 'POST',
                    headers: getApiHeaders(),
                    body: JSON.stringify(configData),
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to save configuration');
                }
                const saved: ContractorConfiguration = await response.json();
                setConfigId(saved.id);
                setFullConfiguration((saved.configuration || {}) as Record<string, unknown>);
            }

            notifications.show({
                title: 'Success',
                message: 'Team configuration saved successfully',
                color: 'green',
                icon: <IconCheck size={16} />,
            });
            invalidateTeamConfigCache();
            await loadConfiguration();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to save configuration';
            setError(message);
            notifications.show({
                title: 'Error',
                message,
                color: 'red',
                icon: <IconX size={16} />,
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Stack align="center" gap="md">
                <Loader size="md" />
                <Text c="dimmed">Loading team configuration...</Text>
            </Stack>
        );
    }

    const content = (
        <Stack gap="md">
            <div>
                <Text fw={600} size="lg" mb="xs">
                    Team Configuration
                </Text>
                <Text c="dimmed" size="sm">
                    Configure lead painters, production managers, and sales people.
                    These options will appear as dropdowns when editing estimate details.
                </Text>
            </div>

            {error && (
                <Alert color="red" title="Error">
                    {error}
                </Alert>
            )}

            <ListEditor
              label="Lead painters"
              description="Crew leads / job crew leads shown in estimate sidebar and completion forms."
              items={leadPainters}
              onChange={setLeadPainters}
              placeholder="e.g. John Smith"
            />
            <ListEditor
              label="Production managers"
              description="Production managers available in the estimate details sidebar."
              items={productionManagers}
              onChange={setProductionManagers}
              placeholder="e.g. Jane Doe"
            />
            <ListEditor
              label="Sales people"
              description="Sales people available in the estimate details sidebar."
              items={salesPeople}
              onChange={setSalesPeople}
              placeholder="e.g. Bob Wilson"
            />

            <Card padding="md" withBorder radius="md">
                <Stack gap="sm">
                    <div>
                        <Text fw={600}>
                            Scheduling & teams
                        </Text>
                        <Text c="dimmed" size="sm">
                            Default hours per workday for bid-hour length, and optional teams for
                            weekly capacity on the calendar.
                        </Text>
                    </div>
                    <NumberInput
                      label="Default hours per workday"
                      description="Used when a job has no team or the team has no capacity set."
                      min={0.5}
                      max={24}
                      step={0.5}
                      value={scheduleDefaultDailyHours}
                      onChange={(v) => setScheduleDefaultDailyHours(typeof v === 'number' ? v : 8)}
                    />
                    <Text fw={600} size="sm">
                        Teams (optional)
                    </Text>
                    <Text c="dimmed" size="xs">
                        Each team can define painter count and weekly hours. Daily capacity is
                        {' '}
                        (painters × weekly hours) / 5.
                    </Text>
                    {scheduleTeams.map((team, index) => (
                      <Card key={team.id} padding="sm" withBorder radius="sm">
                          <Group align="flex-end" wrap="wrap" gap="xs">
                              <TextInput
                                label="Name"
                                style={{ flex: 1, minWidth: 140 }}
                                value={team.name}
                                onChange={(e) => {
                                    const next = [...scheduleTeams];
                                    next[index] = { ...team, name: e.currentTarget.value };
                                    setScheduleTeams(next);
                                }}
                              />
                              <NumberInput
                                label="Painters"
                                min={0}
                                w={100}
                                value={team.painterCount ?? ''}
                                onChange={(v) => {
                                    const next = [...scheduleTeams];
                                    next[index] = {
                                      ...team,
                                      painterCount: typeof v === 'number' ? v : undefined,
                                    };
                                    setScheduleTeams(next);
                                }}
                              />
                              <NumberInput
                                label="Weekly hours"
                                min={0}
                                w={120}
                                value={team.weeklyHours ?? ''}
                                onChange={(v) => {
                                    const next = [...scheduleTeams];
                                    next[index] = {
                                      ...team,
                                      weeklyHours: typeof v === 'number' ? v : undefined,
                                    };
                                    setScheduleTeams(next);
                                }}
                              />
                              <ActionIcon
                                color="red"
                                variant="subtle"
                                onClick={() =>
                                  setScheduleTeams(scheduleTeams.filter((_, i) => i !== index))
                                }
                                aria-label="Remove team"
                              >
                                  <IconTrash size={16} />
                              </ActionIcon>
                          </Group>
                      </Card>
                    ))}
                    <Button
                      variant="light"
                      leftSection={<IconPlus size={16} />}
                      onClick={() => {
                          const id =
                            typeof crypto !== 'undefined' && crypto.randomUUID
                              ? crypto.randomUUID()
                              : `team-${Date.now()}`;
                          setScheduleTeams([
                              ...scheduleTeams,
                              { id, name: '', painterCount: 2, weeklyHours: 40 },
                          ]);
                      }}
                    >
                        Add team
                    </Button>
                </Stack>
            </Card>

            <Group justify="flex-end" mt="md">
                <Button onClick={handleSave} loading={saving} disabled={saving} variant={embedded ? 'outline' : 'filled'}>
                    Save team configuration
                </Button>
            </Group>
        </Stack>
    );

    if (embedded) {
        return (
            <>
                <Divider my="md" />
                {content}
            </>
        );
    }

    return (
        <Card shadow="sm" padding="lg" withBorder>
            {content}
        </Card>
    );
}

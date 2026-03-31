'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  Button,
  Card,
  Group,
  Select,
  Stack,
  Table,
  Tabs,
  Text,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';

import { getApiHeaders } from '@/app/utils/apiClient';

type CalEvent = {
  schedule_id?: string;
  estimate_id: string;
  client_name?: string | null;
  title?: string | null;
  estimate_type: string;
  team_id?: string | null;
  team_name?: string | null;
  team_lead_user_id?: string | null;
  schedule_work_dates: string[];
  schedule_tentative: boolean;
};

type TeamOpt = { value: string; label: string };

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

function eachDayInMonth(anchor: Date): Date[] {
  const start = startOfMonth(anchor);
  const end = endOfMonth(anchor);
  const out: Date[] = [];
  for (let x = new Date(start); x <= end; x.setDate(x.getDate() + 1)) {
    out.push(new Date(x));
  }
  return out;
}

export default function SchedulePage() {
  const [anchor, setAnchor] = useState(() => new Date());
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [teams, setTeams] = useState<TeamOpt[]>([]);
  const [teamFilter, setTeamFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<string | null>('month');

  const loadTeams = useCallback(async () => {
    const res = await fetch('/api/teams', { headers: getApiHeaders() });
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data)) {
      setTeams(data.map((t: { id: string; name: string }) => ({ value: t.id, label: t.name })));
    }
  }, []);

  const loadCalendar = useCallback(async () => {
    const monthStart = startOfMonth(anchor);
    const monthEnd = endOfMonth(anchor);
    const today = new Date();
    const ws = new Date(today);
    ws.setDate(today.getDate() - today.getDay());
    const we = new Date(ws);
    we.setDate(ws.getDate() + 6);
    const from = monthStart < ws ? monthStart : ws;
    const to = monthEnd > we ? monthEnd : we;
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        from: iso(from),
        to: iso(to),
      });
      if (teamFilter) qs.set('team_id', teamFilter);
      const res = await fetch(`/api/schedule/calendar?${qs}`, { headers: getApiHeaders() });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to load calendar');
      }
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch (e) {
      notifications.show({
        title: 'Calendar error',
        message: e instanceof Error ? e.message : 'Error',
        color: 'red',
      });
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [anchor, teamFilter]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  useEffect(() => {
    loadCalendar();
  }, [loadCalendar]);

  const eventsByDate = useMemo(() => {
    const m = new Map<string, CalEvent[]>();
    for (const ev of events) {
      for (const wd of ev.schedule_work_dates || []) {
        const list = m.get(wd) || [];
        list.push(ev);
        m.set(wd, list);
      }
    }
    return m;
  }, [events]);

  const monthDays = useMemo(() => eachDayInMonth(anchor), [anchor]);
  const firstDow = startOfMonth(anchor).getDay();
  const padding = (firstDow + 6) % 7;
  const cells: (Date | null)[] = [...Array(padding).fill(null), ...monthDays];

  const weekSlice = useMemo(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay());
    const days: Date[] = [];
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  }, []);

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <Title order={1} c="white" mb="md">
        Schedule
      </Title>
      <Text c="dimmed" mb="lg">
        Jobs with saved team schedules appear on working days. Filter by team to narrow the view.
      </Text>

      <Group mb="md">
        <Select
          placeholder="All teams"
          data={teams}
          value={teamFilter}
          onChange={setTeamFilter}
          clearable
          searchable
          w={260}
        />
        <Group>
          <Button
            variant="default"
            leftSection={<IconChevronLeft size={16} />}
            onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1))}
          >
            Prev
          </Button>
          <Text c="white" size="sm" w={160} ta="center">
            {anchor.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
          </Text>
          <Button
            variant="default"
            rightSection={<IconChevronRight size={16} />}
            onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1))}
          >
            Next
          </Button>
        </Group>
      </Group>

      <Tabs value={view} onChange={setView}>
        <Tabs.List>
          <Tabs.Tab value="month">Month</Tabs.Tab>
          <Tabs.Tab value="week">This week</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="month" pt="md">
          <Card withBorder padding="md">
            {loading ? (
              <Text c="dimmed">Loading…</Text>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: 4,
                }}
              >
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <Text key={d} size="xs" fw={600} c="dimmed" ta="center" mb={4}>
                    {d}
                  </Text>
                ))}
                {cells.map((day, idx) => {
                  if (!day) {
                    return <div key={`p-${idx}`} />;
                  }
                  const key = iso(day);
                  const dayEvents = eventsByDate.get(key) || [];
                  return (
                    <Card key={key} withBorder padding={4} radius="sm" style={{ minHeight: 72 }}>
                      <Text size="xs" fw={600}>
                        {day.getDate()}
                      </Text>
                      <Stack gap={2}>
                        {dayEvents.slice(0, 3).map((ev) => (
                          <Text key={`${ev.schedule_id || ev.estimate_id}-${key}`} size="10px" lineClamp={2} c="dimmed">
                            {ev.client_name || ev.title || ev.estimate_id.slice(0, 8)}
                            {ev.schedule_tentative ? ' (tent.)' : ''}
                          </Text>
                        ))}
                        {dayEvents.length > 3 && (
                          <Text size="10px" c="dimmed">
                            +{dayEvents.length - 3} more
                          </Text>
                        )}
                      </Stack>
                    </Card>
                  );
                })}
              </div>
            )}
          </Card>
        </Tabs.Panel>
        <Tabs.Panel value="week" pt="md">
          <Card withBorder padding="md">
            <Table>
              <Table.Thead>
                <Table.Tr>
                  {weekSlice.map((d) => (
                    <Table.Th key={iso(d)}>{d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</Table.Th>
                  ))}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                <Table.Tr>
                  {weekSlice.map((d) => {
                    const key = iso(d);
                    const dayEvents = eventsByDate.get(key) || [];
                    return (
                      <Table.Td key={key} valign="top">
                        <Stack gap={4}>
                          {dayEvents.map((ev) => (
                            <Text key={`${ev.schedule_id || ev.estimate_id}-${key}`} size="xs">
                              {ev.client_name || ev.title || 'Job'}
                              <Text span size="10px" c="dimmed" display="block">
                                {ev.team_name || ev.estimate_type}
                              </Text>
                            </Text>
                          ))}
                          {dayEvents.length === 0 && (
                            <Text size="xs" c="dimmed">
                              —
                            </Text>
                          )}
                        </Stack>
                      </Table.Td>
                    );
                  })}
                </Table.Tr>
              </Table.Tbody>
            </Table>
            <Text size="xs" c="dimmed" mt="sm">
              Week view uses the same month query; switch month above to load other weeks,
              or use Month view.
            </Text>
          </Card>
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}

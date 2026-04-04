'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  Button,
  Card,
  Checkbox,
  Container,
  Group,
  Loader,
  NumberInput,
  Select,
  Stack,
  Table,
  Text,
  Textarea,
  Title,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { IconTrash } from '@tabler/icons-react';
import { format, subDays } from 'date-fns';
import Link from 'next/link';

import { getApiHeaders } from '@/app/utils/apiClient';

type EstimateRow = { id: string; title?: string | null };
type LineItemRow = { id: string; title: string; estimatedHours: number };

type LineAllocApi = {
  estimate_line_item_id: string;
  hours: number;
  completed: boolean;
};

type WorkTimeEntry = {
  id: string;
  estimate_id: string;
  estimate_line_item_id: string | null;
  hours: number;
  work_date: string;
  notes: string | null;
  line_allocations?: LineAllocApi[] | null;
};

type PerLineState = { include: boolean; hours: number | string; completed: boolean };

function formatEntryDetail(row: WorkTimeEntry, lineTitle: (id: string) => string): string {
  if (row.line_allocations && row.line_allocations.length > 0) {
    return row.line_allocations
      .map(
        (a) =>
          `${lineTitle(a.estimate_line_item_id)}: ${a.hours}h${a.completed ? ' ✓' : ''}`
      )
      .join('; ');
  }
  if (row.estimate_line_item_id) {
    return `${lineTitle(row.estimate_line_item_id)}`;
  }
  return '—';
}

export function MyTimePage() {
  const [estimates, setEstimates] = useState<EstimateRow[]>([]);
  const [lineItems, setLineItems] = useState<LineItemRow[]>([]);
  const [loadingEstimates, setLoadingEstimates] = useState(true);
  const [entries, setEntries] = useState<WorkTimeEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [saving, setSaving] = useState(false);

  const [workDate, setWorkDate] = useState<Date | null>(() => new Date());
  const [hours, setHours] = useState<number | string>(8);
  const [estimateId, setEstimateId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [perLine, setPerLine] = useState<Record<string, PerLineState>>({});

  const rangeTo = format(new Date(), 'yyyy-MM-dd');
  const rangeFrom = format(subDays(new Date(), 30), 'yyyy-MM-dd');

  const loadEstimates = useCallback(async () => {
    setLoadingEstimates(true);
    try {
      const res = await fetch('/api/estimates/time-entry-eligible', {
        headers: getApiHeaders(),
      });
      if (!res.ok) {
        throw new Error('Failed to load jobs');
      }
      const body = await res.json();
      setEstimates(Array.isArray(body) ? body : []);
    } catch (e) {
      notifications.show({
        title: 'Jobs',
        message: e instanceof Error ? e.message : 'Error',
        color: 'red',
      });
    } finally {
      setLoadingEstimates(false);
    }
  }, []);

  const loadEntries = useCallback(async () => {
    setLoadingEntries(true);
    try {
      const res = await fetch(
        `/api/jobsuite-work-time?from=${rangeFrom}&to=${rangeTo}`,
        { headers: getApiHeaders() }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to load entries');
      }
      const data = await res.json();
      setEntries(Array.isArray(data) ? data : []);
    } catch (e) {
      notifications.show({
        title: 'Time entries',
        message: e instanceof Error ? e.message : 'Error',
        color: 'red',
      });
    } finally {
      setLoadingEntries(false);
    }
  }, [rangeFrom, rangeTo]);

  useEffect(() => {
    loadEstimates();
  }, [loadEstimates]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  useEffect(() => {
    if (!estimateId) {
      setLineItems([]);
      return () => {};
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/estimates/${estimateId}/line-items`, {
          headers: getApiHeaders(),
        });
        if (!res.ok) {
          return;
        }
        const data = await res.json();
        if (cancelled) {
          return;
        }
        const list = Array.isArray(data) ? data : data.Items ?? [];
        setLineItems(
          list.map((li: { id: string; title: string; hours?: number | string }) => {
            const h =
              typeof li.hours === 'string' ? parseFloat(li.hours) : Number(li.hours ?? 0);
            return {
              id: li.id,
              title: li.title,
              estimatedHours: Number.isFinite(h) ? h : 0,
            };
          })
        );
      } catch {
        if (!cancelled) {
          setLineItems([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [estimateId]);

  useEffect(() => {
    setPerLine((prev) => {
      const next = { ...prev };
      for (const li of lineItems) {
        if (!next[li.id]) {
          next[li.id] = { include: false, hours: 0, completed: false };
        }
      }
      return next;
    });
  }, [lineItems]);

  const estimateOptions = useMemo(
    () =>
      estimates.map((e) => ({
        value: e.id,
        label: (e.title || '').trim() || e.id,
      })),
    [estimates]
  );

  const estimateTitle = useCallback(
    (id: string) => estimates.find((e) => e.id === id)?.title || id,
    [estimates]
  );

  const lineTitle = useCallback(
    (lineId: string) => {
      const l = lineItems.find((x) => x.id === lineId);
      if (!l) {
        return lineId;
      }
      const est = Number(l.estimatedHours);
      const estLabel = Number.isFinite(est) ? ` (${est.toFixed(1)} h est.)` : '';
      return `${l.title}${estLabel}`;
    },
    [lineItems]
  );

  const submit = async () => {
    if (!workDate || estimateId == null) {
      notifications.show({ message: 'Choose a date and job', color: 'orange' });
      return;
    }
    const totalH = typeof hours === 'string' ? parseFloat(hours) : hours;
    if (!totalH || totalH <= 0) {
      notifications.show({ message: 'Enter hours greater than zero', color: 'orange' });
      return;
    }

    const allocations: LineAllocApi[] = [];
    for (const li of lineItems) {
      const st = perLine[li.id];
      if (st?.include) {
        const h = typeof st.hours === 'string' ? parseFloat(st.hours) : st.hours;
        if (!h || h <= 0) {
          notifications.show({
            message: `Enter hours for "${li.title}" (${li.estimatedHours.toFixed(1)} h est.) or uncheck it`,
            color: 'orange',
          });
          return;
        }
        allocations.push({
          estimate_line_item_id: li.id,
          hours: h,
          completed: Boolean(st.completed),
        });
      }
    }

    const allocSum = allocations.reduce((s, a) => s + a.hours, 0);
    if (allocations.length > 0 && allocSum - totalH > 1e-4) {
      notifications.show({
        message: `Line item hours (${allocSum.toFixed(2)}) cannot exceed total (${totalH.toFixed(2)})`,
        color: 'red',
      });
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        estimate_id: estimateId,
        hours: totalH,
        work_date: format(workDate, 'yyyy-MM-dd'),
        notes: notes.trim() || null,
      };
      if (allocations.length > 0) {
        body.line_allocations = allocations;
      }

      const res = await fetch('/api/jobsuite-work-time', {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Save failed');
      }
      notifications.show({ title: 'Saved', message: 'Time entry added', color: 'green' });
      setNotes('');
      setPerLine((prev) => {
        const next = { ...prev };
        for (const li of lineItems) {
          next[li.id] = { include: false, hours: 0, completed: false };
        }
        return next;
      });
      await loadEntries();
    } catch (e) {
      notifications.show({
        title: 'Save failed',
        message: e instanceof Error ? e.message : 'Error',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      const res = await fetch(`/api/jobsuite-work-time/${id}`, {
        method: 'DELETE',
        headers: getApiHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Delete failed');
      }
      notifications.show({ message: 'Deleted', color: 'green' });
      await loadEntries();
    } catch (e) {
      notifications.show({
        message: e instanceof Error ? e.message : 'Delete failed',
        color: 'red',
      });
    }
  };

  const cardSurface = {
    backgroundColor: '#fff',
    color: 'var(--mantine-color-dark-9)',
  } as const;

  return (
    <Container size="sm" py="xl">
      <Group justify="space-between" mb="md">
        <Title order={2}>My time</Title>
        <Button component={Link} href="/" variant="light" size="sm">
          My schedule
        </Button>
      </Group>

      <Stack gap="lg">
        <Card withBorder radius="md" p="md" style={cardSurface}>
          <Text fw={600} mb="sm" size="md">
            Add entry
          </Text>
          {loadingEstimates ? (
            <Loader size="sm" />
          ) : (
            <Stack gap="sm">
              <DateInput label="Date" value={workDate} onChange={setWorkDate} />
              <NumberInput
                label="Total hours (whole entry)"
                value={hours}
                onChange={setHours}
                min={0.25}
                step={0.25}
                decimalScale={2}
                description="Hours split across line items cannot exceed this total."
              />
              <Select
                label="Job"
                placeholder="Select estimate"
                data={estimateOptions}
                value={estimateId}
                onChange={setEstimateId}
                searchable
                nothingFoundMessage="No jobs"
              />
              {lineItems.length > 0 ? (
                <Stack gap="xs">
                  <Text size="sm" fw={500}>
                    Line items (optional breakdown)
                  </Text>
                  {lineItems.map((li) => {
                    const st = perLine[li.id] ?? {
                      include: false,
                      hours: 0,
                      completed: false,
                    };
                    return (
                      <Card key={li.id} withBorder p="sm" radius="sm" style={cardSurface}>
                        <Checkbox
                          label={
                            <Group gap={8} wrap="nowrap" align="center">
                              <Text span size="sm" fw={500}>
                                {li.title}
                              </Text>
                              <Text span size="sm" c="dimmed">
                                {li.estimatedHours.toFixed(1)} h estimated
                              </Text>
                            </Group>
                          }
                          checked={st.include}
                          onChange={(e) =>
                            setPerLine((prev) => ({
                              ...prev,
                              [li.id]: {
                                ...st,
                                include: e.currentTarget.checked,
                              },
                            }))
                          }
                        />
                        {st.include ? (
                          <Group gap="md" mt="xs" wrap="wrap" align="flex-end">
                            <NumberInput
                              label="Hours on this item"
                              value={st.hours}
                              onChange={(v) =>
                                setPerLine((prev) => ({
                                  ...prev,
                                  [li.id]: { ...st, hours: v },
                                }))
                              }
                              min={0.25}
                              step={0.25}
                              decimalScale={2}
                              size="sm"
                              w={160}
                            />
                            <Checkbox
                              label="Mark line item complete"
                              checked={st.completed}
                              onChange={(e) =>
                                setPerLine((prev) => ({
                                  ...prev,
                                  [li.id]: {
                                    ...st,
                                    completed: e.currentTarget.checked,
                                  },
                                }))
                              }
                            />
                          </Group>
                        ) : null}
                      </Card>
                    );
                  })}
                </Stack>
              ) : null}
              <Textarea
                label="Notes"
                value={notes}
                onChange={(e) => setNotes(e.currentTarget.value)}
                minRows={2}
              />
              <Button onClick={submit} loading={saving}>
                Save entry
              </Button>
            </Stack>
          )}
        </Card>

        <Card withBorder radius="md" p="md" style={cardSurface}>
          <Text fw={600} mb="sm" size="md">
            Recent entries (last ~30 days)
          </Text>
          {loadingEntries ? (
            <Loader size="sm" />
          ) : entries.length === 0 ? (
            <Text size="sm" c="dimmed">
              No entries yet.
            </Text>
          ) : (
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>Hours</Table.Th>
                  <Table.Th>Job</Table.Th>
                  <Table.Th>Line items</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {entries.map((row) => (
                  <Table.Tr key={row.id}>
                    <Table.Td>{row.work_date.slice(0, 10)}</Table.Td>
                    <Table.Td>{row.hours}</Table.Td>
                    <Table.Td>{estimateTitle(row.estimate_id)}</Table.Td>
                    <Table.Td>
                      <Text size="xs" style={{ maxWidth: 220 }}>
                        {formatEntryDetail(row, (id) =>
                          row.estimate_id === estimateId
                            ? lineTitle(id)
                            : `${id.slice(0, 8)}…`
                        )}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Button
                        size="xs"
                        variant="subtle"
                        color="red"
                        leftSection={<IconTrash size={14} />}
                        onClick={() => remove(row.id)}
                      >
                        Delete
                      </Button>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Card>
      </Stack>
    </Container>
  );
}

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ActionIcon,
  Button,
  Group,
  Menu,
  Paper,
  Stack,
  Text,
  Title,
  useMantineTheme,
} from '@mantine/core';
import { IconCalendarEvent, IconDots, IconGripVertical, IconUsers } from '@tabler/icons-react';
import { format, startOfDay } from 'date-fns';

import { getApiHeaders } from '@/app/utils/apiClient';
import type { Estimate } from '@/components/Global/model';
import { parseLocalDateString } from '@/utils/calendarWorkingDays';
import {
  colorForScheduleKey,
  mantineColorToCss,
  teamBacklogPaperBackground,
} from '@/utils/scheduleColors';
import type { SchedulingSeasonRules } from '@/utils/schedulingSeason';
import {
  computeTentativeBacklogPlacementClient,
  type LockedIntervalIso,
  type TeamShapeForBacklogBar,
} from '@/utils/tentativeBacklogCalendar';

export type TentativeBacklogItemRow = {
  schedule_id: string;
  estimate_id: string;
  job_name: string;
  labor_hours?: number;
};

function formatTentativeRangeLabel(isoStart: string, isoEnd: string): string {
  const a = startOfDay(parseLocalDateString(isoStart));
  const b = startOfDay(parseLocalDateString(isoEnd));
  return `${format(a, 'MMM d')}–${format(b, 'MMM d, yyyy')}`;
}

function SortableBacklogRow({
  item,
  metaLine,
  onSchedule,
  onChangeTeam,
  scheduleDisabled,
}: {
  item: TentativeBacklogItemRow;
  metaLine: string | null;
  onSchedule: () => void;
  onChangeTeam: () => void;
  scheduleDisabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.schedule_id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.65 : 1,
  };

  return (
    <Group ref={setNodeRef} style={style} justify="space-between" wrap="nowrap" gap="xs" py={4}>
      <ActionIcon
        variant="subtle"
        size="sm"
        aria-label="Drag to reorder"
        style={{ cursor: 'grab', flexShrink: 0 }}
        {...attributes}
        {...listeners}
      >
        <IconGripVertical size={16} />
      </ActionIcon>
      <Stack gap={2} style={{ minWidth: 0, flex: 1 }}>
        <Text size="sm" lineClamp={2}>
          {item.job_name}
        </Text>
        {metaLine ? (
          <Text size="xs" c="dimmed">
            {metaLine}
          </Text>
        ) : null}
      </Stack>
      <Menu shadow="md" width={200} withinPortal position="bottom-end">
        <Menu.Target>
          <ActionIcon
            size="sm"
            variant="light"
            aria-label="Job actions"
            style={{ flexShrink: 0 }}
          >
            <IconDots size={16} />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item
            leftSection={<IconCalendarEvent size={14} />}
            disabled={scheduleDisabled}
            onClick={onSchedule}
          >
            Schedule
          </Menu.Item>
          <Menu.Item leftSection={<IconUsers size={14} />} onClick={onChangeTeam}>
            Change team
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </Group>
  );
}

export function TentativeBacklogTeamCard({
  team,
  totalLaborHours,
  serverItems,
  lockedIntervals,
  estimates,
  schedulingSeason,
  onLockSchedule,
  onChangeTeam,
  onSaved,
}: {
  team: TeamShapeForBacklogBar;
  totalLaborHours: number;
  serverItems: TentativeBacklogItemRow[];
  lockedIntervals: LockedIntervalIso[] | undefined;
  estimates: Estimate[];
  schedulingSeason: SchedulingSeasonRules;
  onLockSchedule: (e: Estimate, impliedStartIso: string) => void;
  onChangeTeam: (e: Estimate) => void;
  onSaved: () => void;
}) {
  const theme = useMantineTheme();
  const [draftItems, setDraftItems] = useState<TentativeBacklogItemRow[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const serverSig = useMemo(() => serverItems.map((i) => i.schedule_id).join('|'), [serverItems]);

  useEffect(() => {
    setDraftItems(null);
    setSaveError(null);
  }, [serverSig]);

  const effectiveItems = draftItems ?? serverItems;

  const placementItems = useMemo(
    () =>
      effectiveItems.map((i) => ({
        labor_hours: i.labor_hours,
        estimate_type: estimates.find((e) => e.id === i.estimate_id)?.estimate_type as
          | string
          | undefined,
      })),
    [effectiveItems, estimates]
  );

  const placement = computeTentativeBacklogPlacementClient(team, {
    lockedIntervals: lockedIntervals ?? null,
    items: placementItems,
    seasonRules: schedulingSeason,
  });

  const totalWd = placement?.itemWorkingDays.reduce((a, b) => a + b, 0) ?? 0;

  const dirty =
    draftItems !== null &&
    JSON.stringify(draftItems.map((i) => i.schedule_id)) !==
      JSON.stringify(serverItems.map((i) => i.schedule_id));

  const { color, shade } = colorForScheduleKey(team.id);
  const cardBg = teamBacklogPaperBackground(theme.colors, color, shade ?? 6);
  const borderColor = mantineColorToCss(theme.colors, color, shade ?? 6);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) {
        return;
      }
      const items = draftItems ?? serverItems;
      const oldIndex = items.findIndex((i) => i.schedule_id === active.id);
      const newIndex = items.findIndex((i) => i.schedule_id === over.id);
      if (oldIndex < 0 || newIndex < 0) {
        return;
      }
      setDraftItems(arrayMove(items, oldIndex, newIndex));
      setSaveError(null);
    },
    [draftItems, serverItems]
  );

  const handleCancel = useCallback(() => {
    setDraftItems(null);
    setSaveError(null);
  }, []);

  const handleSave = useCallback(async () => {
    const ordered = draftItems ?? serverItems;
    setSaving(true);
    setSaveError(null);
    try {
      const getRes = await fetch(`/api/teams/${team.id}`, { headers: getApiHeaders() });
      const body = await getRes.json().catch(() => ({}));
      if (!getRes.ok) {
        throw new Error(body.message || body.detail || 'Could not load team');
      }
      const tc = body.team_config as Record<string, unknown> | undefined;
      if (!tc || !Array.isArray(tc.team_capacity)) {
        throw new Error('Team configuration is missing capacity');
      }
      const prevBacklog = (tc.schedule_backlog && typeof tc.schedule_backlog === 'object'
        ? tc.schedule_backlog
        : {}) as Record<string, unknown>;
      const total = ordered.reduce((s, i) => s + (Number(i.labor_hours) || 0), 0);
      const newBacklog: Record<string, unknown> = {
        ...prevBacklog,
        items: ordered,
        total_labor_hours: total,
      };
      delete newBacklog.last_locked_working_day;

      const putRes = await fetch(`/api/teams/${team.id}`, {
        method: 'PUT',
        headers: { ...getApiHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_config: {
            team_capacity: tc.team_capacity,
            schedule_backlog: newBacklog,
          },
        }),
      });
      const putBody = await putRes.json().catch(() => ({}));
      if (!putRes.ok) {
        throw new Error(putBody.message || putBody.detail || 'Could not save backlog order');
      }
      setDraftItems(null);
      onSaved();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }, [draftItems, serverItems, team.id, onSaved]);

  return (
    <Paper
      p="md"
      withBorder
      radius="md"
      style={{
        background: cardBg,
        borderColor,
      }}
    >
      <Group justify="space-between" align="flex-start" wrap="nowrap" gap="md" mb="sm">
        <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
          <Text size="sm" fw={600}>
            {team.name}
          </Text>
          <Title order={4}>
            {totalWd > 0
              ? `Tentative backlog (${totalWd} working days)`
              : 'Tentative backlog'}
          </Title>
        </Stack>
        <Stack gap={4} align="flex-end">
          <Text size="sm" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
            {totalLaborHours.toFixed(1)} hrs total
          </Text>
          {dirty ? (
            <Group gap="xs">
              <Button size="xs" variant="default" onClick={handleCancel} disabled={saving}>
                Cancel
              </Button>
              <Button size="xs" onClick={() => handleSave()} loading={saving}>
                Save
              </Button>
            </Group>
          ) : null}
        </Stack>
      </Group>
      {saveError ? (
        <Text size="sm" c="red" mb="xs">
          {saveError}
        </Text>
      ) : null}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={effectiveItems.map((i) => i.schedule_id)}
          strategy={verticalListSortingStrategy}
        >
          <Stack gap={4}>
            {effectiveItems.map((item, idx) => {
              const wd = placement?.itemWorkingDays[idx];
              const span = placement?.itemDateRanges[idx];
              let metaLine: string | null = null;
              if (wd != null && wd > 0 && span) {
                metaLine = `${wd} working days | ${formatTentativeRangeLabel(span.startIso, span.endIso)} (tentative)`;
              } else if (wd === 0) {
                metaLine = '0 working days (tentative)';
              }
              const est = estimates.find((e) => e.id === item.estimate_id);
              const impliedStartIso = span?.startIso ?? null;
              return (
                <SortableBacklogRow
                  key={item.schedule_id}
                  item={item}
                  metaLine={metaLine}
                  scheduleDisabled={!est || !impliedStartIso}
                  onSchedule={() => {
                    if (est) {
                      if (impliedStartIso) {
                        onLockSchedule(est, impliedStartIso);
                      }
                    }
                  }}
                  onChangeTeam={() => {
                    if (est) {
                      onChangeTeam(est);
                    }
                  }}
                />
              );
            })}
          </Stack>
        </SortableContext>
      </DndContext>
    </Paper>
  );
}

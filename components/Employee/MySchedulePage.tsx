'use client';

import type { CSSProperties } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  ActionIcon,
  Box,
  Container,
  Group,
  Loader,
  Paper,
  Stack,
  Switch,
  Table,
  Text,
  Title,
  useMantineTheme,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { addDays, eachWeekOfInterval, format, startOfDay } from 'date-fns';

import { getApiHeaders } from '@/app/utils/apiClient';
import { CalendarEventBar } from '@/components/Calendar/CalendarEventBar';
import classes from '@/components/Calendar/CalendarPage.module.css';
import type { CalendarGridJobEvent, WeekCalRow } from '@/utils/calendarGridMath';
import {
  assignLanesForWeek,
  buildDoubleBookHighlightForWeekBar,
  buildTeamMultiProjectDayKeyMap,
  CALENDAR_LOCKED_FETCH_PADDING_DAYS,
  CAL_EVENT_ROW_PX,
  CAL_WEEK_BODY_MIN_PX,
  explicitWorkDatesInSegment,
  formatBacklogSpanLabel,
  getFourWeekRange,
  navigateFourWeekWindow,
  pickPrimaryJobCalendarEvent,
  scheduleEventOverlapsVisibleRange,
  segmentForWeekOrFallback,
} from '@/utils/calendarGridMath';
import { parseLocalDateString, splitExplicitWorkDatesIntoContiguousSegments, splitRangeIntoWeekdaySegments } from '@/utils/calendarWorkingDays';
import {
  colorForScheduleKey,
  mantineColorToCss,
  teamBacklogCardBackground,
} from '@/utils/scheduleColors';

const SHOW_NON_WORKING_DAYS_STORAGE_KEY = 'jobsuite-my-schedule-show-weekends';

type WorkTimeEntry = {
  id: string;
  estimate_id: string;
  estimate_line_item_id: string | null;
  hours: number;
  work_date: string;
  notes: string | null;
};

export function MySchedulePage() {
  const theme = useMantineTheme();
  const [anchor, setAnchor] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [calEvents, setCalEvents] = useState<CalendarGridJobEvent[]>([]);
  const [workEntries, setWorkEntries] = useState<WorkTimeEntry[]>([]);
  const [showNonWorkingDays, setShowNonWorkingDays] = useState(false);

  useEffect(() => {
    try {
      if (typeof window === 'undefined') {
        return;
      }
      const v = localStorage.getItem(SHOW_NON_WORKING_DAYS_STORAGE_KEY);
      if (v === 'true') {
        setShowNonWorkingDays(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const setShowNonWorkingDaysPersisted = useCallback((next: boolean) => {
    setShowNonWorkingDays(next);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(SHOW_NON_WORKING_DAYS_STORAGE_KEY, next ? 'true' : 'false');
      }
    } catch {
      /* ignore */
    }
  }, []);

  const range = useMemo(() => getFourWeekRange(anchor), [anchor]);
  const weekStarts = useMemo(
    () => eachWeekOfInterval({ start: range.start, end: range.end }, { weekStartsOn: 1 }),
    [range.start, range.end]
  );

  const from = format(addDays(range.start, -CALENDAR_LOCKED_FETCH_PADDING_DAYS), 'yyyy-MM-dd');
  const to = format(addDays(range.end, CALENDAR_LOCKED_FETCH_PADDING_DAYS), 'yyyy-MM-dd');
  const wtFrom = format(range.start, 'yyyy-MM-dd');
  const wtTo = format(range.end, 'yyyy-MM-dd');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const headers = getApiHeaders();
      const [calRes, wtRes] = await Promise.all([
        fetch(`/api/schedule/calendar?from=${from}&to=${to}&only_my_teams=true`, { headers }),
        fetch(`/api/jobsuite-work-time?from=${wtFrom}&to=${wtTo}`, { headers }),
      ]);
      if (!calRes.ok) {
        const err = await calRes.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to load schedule');
      }
      if (!wtRes.ok) {
        const err = await wtRes.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to load work time');
      }
      const calJson = await calRes.json();
      const wtJson = await wtRes.json();
      setCalEvents(Array.isArray(calJson) ? (calJson as CalendarGridJobEvent[]) : []);
      setWorkEntries(Array.isArray(wtJson) ? wtJson : []);
    } catch (e) {
      notifications.show({
        title: 'Could not load schedule',
        message: e instanceof Error ? e.message : 'Unknown error',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  }, [from, to, wtFrom, wtTo]);

  useEffect(() => {
    load();
  }, [load]);

  const calendarJobEvents = useMemo(() => {
    const jobs = calEvents.filter((e) => e.calendar_kind === 'job');
    const noEstimateId: CalendarGridJobEvent[] = [];
    const byEstimate = new Map<string, CalendarGridJobEvent[]>();
    for (const ev of jobs) {
      const eid = ev.estimate_id?.trim();
      if (eid) {
        const list = byEstimate.get(eid) ?? [];
        list.push(ev);
        byEstimate.set(eid, list);
      } else {
        noEstimateId.push(ev);
      }
    }
    const deduped: CalendarGridJobEvent[] = [...noEstimateId];
    for (const list of byEstimate.values()) {
      deduped.push(pickPrimaryJobCalendarEvent(list));
    }
    return deduped;
  }, [calEvents]);

  const calendarJobEventsInView = useMemo(
    () => calendarJobEvents.filter((ev) => scheduleEventOverlapsVisibleRange(ev, range)),
    [calendarJobEvents, range]
  );

  const estimateTitleByIdForDoubleBook = useMemo(() => {
    const m = new Map<string, string>();
    for (const ev of calendarJobEventsInView) {
      const eid = ev.estimate_id?.trim();
      if (eid) {
        const t = (ev.title || '').trim() || eid;
        m.set(eid, t);
      }
    }
    return m;
  }, [calendarJobEventsInView]);

  const teamMultiProjectDayMap = useMemo(
    () => buildTeamMultiProjectDayKeyMap(calendarJobEventsInView, range),
    [calendarJobEventsInView, range]
  );

  const legendTeams = useMemo(() => {
    const m = new Map<string, string>();
    for (const ev of calendarJobEventsInView) {
      const tid = ev.team_id?.trim();
      if (tid) {
        m.set(tid, (ev.team_name || tid).trim());
      }
    }
    return [...m.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [calendarJobEventsInView]);

  const eventsByWeek = useMemo(() => {
    const map = new Map<string, WeekCalRow[]>();
    const eventsInWindow = calendarJobEvents.filter((ev) =>
      scheduleEventOverlapsVisibleRange(ev, range)
    );
    weekStarts.forEach((ws) => {
      const key = ws.toISOString();
      const list: WeekCalRow[] = [];
      eventsInWindow.forEach((ev) => {
        if (!ev.schedule_start_date?.trim() || !ev.schedule_end_date?.trim()) {
          return;
        }
        const start = startOfDay(parseLocalDateString(ev.schedule_start_date));
        const end = startOfDay(parseLocalDateString(ev.schedule_end_date));
        const r = end < start ? { start: end, end: start } : { start, end };
        const explicit = (ev.schedule_work_dates ?? []).filter(
          (s): s is string => typeof s === 'string' && s.trim().length > 0
        );
        const spanParts =
          explicit.length > 0
            ? splitExplicitWorkDatesIntoContiguousSegments(explicit)
            : splitRangeIntoWeekdaySegments(r.start, r.end);
        const cols: 5 | 7 = showNonWorkingDays ? 7 : 5;
        spanParts.forEach((seg) => {
          const explicitForSeg =
            explicit.length > 0 ? explicitWorkDatesInSegment(explicit, seg) : [];
          if (
            segmentForWeekOrFallback(
              ws,
              seg,
              cols,
              explicitForSeg.length > 0 ? explicitForSeg : undefined
            )
          ) {
            const colorKeyRaw = ev.team_id || 'default';
            const colorKey = (colorKeyRaw || 'default').trim() || 'default';
            const { color, shade } = colorForScheduleKey(colorKey);
            const backlogBackgroundCss =
              ev.calendar_kind === 'team_backlog'
                ? teamBacklogCardBackground(theme.colors, color, shade ?? 6)
                : null;
            list.push({
              rowKey: `${ev.schedule_id}-${seg.start.toISOString()}-${ev.calendar_kind}`,
              title:
                ev.title ||
                (ev.calendar_kind === 'team_backlog' ? 'Team backlog' : 'Job'),
              workRange: seg,
              labelRangeStart: r.start,
              labelRangeEnd: r.end,
              colorKey,
              href: null,
              isBacklog: ev.calendar_kind === 'team_backlog',
              teamName: ev.team_name,
              scheduleTentative: ev.schedule_tentative,
              scheduleId: ev.schedule_id,
              estimateId: ev.estimate_id,
              calendarKind: ev.calendar_kind,
              workDatesIso: explicitForSeg,
              scheduleDayTogglesIso: (ev.schedule_day_toggles ?? []).filter(
                (s): s is string => typeof s === 'string' && s.trim().length > 0
              ),
              scheduleStartIso: ev.schedule_start_date?.trim()
                ? ev.schedule_start_date.slice(0, 10)
                : null,
              scheduleEndIso: ev.schedule_end_date?.trim()
                ? ev.schedule_end_date.slice(0, 10)
                : null,
              backlogBackgroundCss,
            });
          }
        });
      });
      map.set(key, list);
    });
    return map;
  }, [calendarJobEvents, weekStarts, showNonWorkingDays, range, theme.colors]);

  const estimateTitles = useMemo(() => {
    const m: Record<string, string> = {};
    for (const ev of calendarJobEvents) {
      const id = ev.estimate_id?.trim();
      if (id && ev.title?.trim()) {
        m[id] = ev.title.trim();
      }
    }
    return m;
  }, [calendarJobEvents]);

  return (
    <Container size="xl" className={classes.calendar} py="xl">
      <Stack gap="lg">
        <Group justify="space-between" align="flex-start" wrap="wrap">
          <Stack gap={4}>
            <Title order={2} c="gray.0">My schedule</Title>
            <Text c="dimmed" size="sm">
              Four-week crew calendar for teams you belong to. Overlapping jobs stack so you can
              spot double-booked days. Time you logged in JobSuite appears below the grid.
            </Text>
            <Switch
              size="sm"
              label={<Text size="sm" c="gray.0">Show weekends</Text>}
              checked={showNonWorkingDays}
              onChange={(e) => setShowNonWorkingDaysPersisted(e.currentTarget.checked)}
            />
          </Stack>
          <Group gap="xs" align="center">
            <ActionIcon
              variant="default"
              size="lg"
              onClick={() => setAnchor((a) => navigateFourWeekWindow(a, -1))}
              aria-label="Previous four weeks"
            >
              <IconChevronLeft size={18} />
            </ActionIcon>
            <ActionIcon
              variant="default"
              size="lg"
              onClick={() => setAnchor((a) => navigateFourWeekWindow(a, 1))}
              aria-label="Next four weeks"
            >
              <IconChevronRight size={18} />
            </ActionIcon>
          </Group>
        </Group>

        {legendTeams.length > 0 && (
          <Paper p="md" withBorder radius="md">
            <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb="xs">
              Your teams (colors)
            </Text>
            <Group gap="lg" wrap="wrap">
              {legendTeams.map((team) => {
                const { color, shade } = colorForScheduleKey(team.id);
                const bg = mantineColorToCss(theme.colors, color, shade ?? 6);
                return (
                  <Group key={team.id} gap="xs" wrap="nowrap">
                    <Box className={classes.legendSwatch} style={{ backgroundColor: bg }} />
                    <Text size="sm" fw={600}>
                      {team.name}
                    </Text>
                  </Group>
                );
              })}
            </Group>
          </Paper>
        )}

        {loading ? (
          <Loader />
        ) : (
          <Paper p="md" withBorder radius="md">
            <Group justify="space-between" mb="md">
              <Text fw={600}>
                {`${format(range.start, 'MMM d')} – ${format(range.end, 'MMM d, yyyy')}`}
              </Text>
              <Text size="sm" c="dimmed">
                {calendarJobEventsInView.length} job
                {calendarJobEventsInView.length === 1 ? '' : 's'} in this window
              </Text>
            </Group>

            <Stack gap="xl">
              {weekStarts.map((weekStart) => {
                const key = weekStart.toISOString();
                const weekGridCols: 5 | 7 = showNonWorkingDays ? 7 : 5;
                const gridTemplateColumns = `repeat(${weekGridCols}, 1fr)`;
                const days = Array.from({ length: weekGridCols }, (_, i) => {
                  const d = new Date(weekStart);
                  d.setDate(d.getDate() + i);
                  return d;
                });
                const weekEvents = eventsByWeek.get(key) || [];
                const planned = weekEvents
                  .map((row) => {
                    const seg = segmentForWeekOrFallback(
                      weekStart,
                      row.workRange,
                      weekGridCols,
                      row.workDatesIso.length > 0 ? row.workDatesIso : undefined
                    );
                    if (!seg) {
                      return null;
                    }
                    return { row, seg };
                  })
                  .filter(
                    (
                      item
                    ): item is {
                      row: WeekCalRow;
                      seg: { colStart: number; colSpan: number };
                    } => item !== null
                  );

                const lanes = assignLanesForWeek(planned.map((p) => p.seg));
                const numLanes = lanes.length > 0 ? Math.max(...lanes) + 1 : 0;
                const stackMinH = numLanes === 0 ? 0 : 12 + numLanes * CAL_EVENT_ROW_PX;
                const weekBodyMinH = Math.max(CAL_WEEK_BODY_MIN_PX, stackMinH);
                const weekEventsGridRows =
                  numLanes > 0
                    ? `repeat(${numLanes}, minmax(${CAL_EVENT_ROW_PX}px, auto))`
                    : undefined;

                return (
                  <div key={key} className={classes.weekBlock}>
                    <div className={classes.weekTitle}>
                      Week of {format(weekStart, 'MMM d, yyyy')}
                    </div>
                    <div className={classes.weekHeader} style={{ gridTemplateColumns }}>
                      {days.map((d) => (
                        <div key={d.toISOString()} className={classes.dayHeader}>
                          {format(d, 'EEE')}{' '}
                          <Text span inherit fw={700} c="var(--mantine-color-text)">
                            {format(d, 'd')}
                          </Text>
                        </div>
                      ))}
                    </div>
                    <div className={classes.weekBody} style={{ minHeight: weekBodyMinH }}>
                      <div
                        className={classes.weekDayCells}
                        style={{
                          minHeight: weekBodyMinH,
                          gridTemplateColumns,
                        }}
                      >
                        {days.map((d) => (
                          <div key={d.toISOString()} className={classes.dayCell} />
                        ))}
                      </div>
                      <div
                        className={classes.weekEvents}
                        style={{
                          gridTemplateColumns,
                          ...(weekEventsGridRows
                            ? { gridTemplateRows: weekEventsGridRows }
                            : {}),
                        }}
                      >
                        {planned.map(({ row, seg }, idx) => {
                          const lane = lanes[idx] ?? 0;
                          const { color, shade } = colorForScheduleKey(row.colorKey);
                          const solidBg = mantineColorToCss(theme.colors, color, shade ?? 6);
                          const segmentDates =
                            row.isBacklog && row.scheduleStartIso && row.scheduleEndIso
                              ? (formatBacklogSpanLabel(row.scheduleStartIso, row.scheduleEndIso) ??
                                `${format(row.labelRangeStart, 'MMM d')}–${format(row.labelRangeEnd, 'MMM d')}`)
                              : `${format(row.labelRangeStart, 'MMM d')}–${format(row.labelRangeEnd, 'MMM d')}`;
                          const teamLabel = row.teamName || '—';
                          const metaSuffix = row.isBacklog
                            ? ' · tentative backlog'
                            : ` · ${teamLabel}`;
                          const barStyle: CSSProperties = {
                            gridRow: lane + 1,
                            gridColumn: `${seg.colStart} / span ${seg.colSpan}`,
                            ...(row.isBacklog && row.backlogBackgroundCss
                              ? { background: row.backlogBackgroundCss }
                              : {}),
                          };
                          const doubleBook =
                            !row.isBacklog && !row.scheduleTentative && row.estimateId
                              ? buildDoubleBookHighlightForWeekBar(
                                  row,
                                  weekStart,
                                  seg,
                                  teamMultiProjectDayMap,
                                  estimateTitleByIdForDoubleBook
                                )
                              : null;
                          return (
                            <CalendarEventBar
                              key={row.rowKey}
                              row={{
                                rowKey: row.rowKey,
                                title: row.title,
                                scheduleTentative: row.scheduleTentative,
                                scheduleId: row.scheduleId,
                                estimateId: row.estimateId,
                                isBacklog: row.isBacklog,
                                href: row.href,
                              }}
                              barStyle={barStyle}
                              solidBg={solidBg}
                              segmentDates={segmentDates}
                              metaSuffix={metaSuffix}
                              doubleBookDays={doubleBook?.dayFlags}
                              doubleBookTooltip={doubleBook?.tooltip}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </Stack>
          </Paper>
        )}

        {!loading && workEntries.length > 0 && (
          <Paper p="md" withBorder radius="md">
            <Title order={4} mb="sm">
              Time logged (this window)
            </Title>
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>Hours</Table.Th>
                  <Table.Th>Job</Table.Th>
                  <Table.Th>Notes</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {workEntries.map((w) => (
                  <Table.Tr key={w.id}>
                    <Table.Td>{w.work_date.slice(0, 10)}</Table.Td>
                    <Table.Td>{w.hours}</Table.Td>
                    <Table.Td>
                      {estimateTitles[w.estimate_id] || w.estimate_id}
                      {w.estimate_line_item_id ? ' (line item)' : ''}
                    </Table.Td>
                    <Table.Td>{w.notes || '—'}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        )}
      </Stack>
    </Container>
  );
}

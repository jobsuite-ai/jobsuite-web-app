'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { Badge, Box, Button, CloseButton, Group, Modal, Stack, Text } from '@mantine/core';
import { Calendar, DatePickerInput } from '@mantine/dates';
import { format, isSameDay } from 'date-fns';

import classes from './LockedScheduleEditModal.module.css';

type Props = {
  opened: boolean;
  onClose: () => void;
  scheduleId: string | null;
  /** ISO dates (YYYY-MM-DD) */
  startIso: string | null;
  /** Dates that flip baseline working vs non-working for this schedule. */
  dayTogglesIso: string[];
  onChange: (next: { startIso: string | null; dayTogglesIso: string[] }) => void;
  laborHours: number;
};

function toYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseYmd(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const day = Number(m[3]);
  const d = new Date(y, mo, day);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function LockedScheduleEditModal({
  opened,
  onClose,
  scheduleId,
  startIso,
  dayTogglesIso,
  onChange,
  laborHours,
}: Props) {
  const [start, setStart] = useState<Date | null>(null);
  const [dayToggles, setDayToggles] = useState<Date[]>([]);
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(() => new Date());

  /** Stable key so parent passing `[]` every render does not retrigger sync. */
  const dayTogglesKey = useMemo(
    () => JSON.stringify([...(dayTogglesIso ?? [])].map((s) => s.slice(0, 10)).sort()),
    [dayTogglesIso]
  );

  useEffect(() => {
    if (!opened || !scheduleId) {
      return;
    }
    const sd = startIso ? parseYmd(startIso) : null;
    setStart(sd);
    setDayToggles(
      (dayTogglesIso ?? [])
        .map((s) => parseYmd(s))
        .filter((d): d is Date => d !== null)
    );
    setCalendarViewDate(sd ?? new Date());
  }, [opened, scheduleId, startIso, dayTogglesKey]);

  const emit = useCallback(
    (nextStart: Date | null, nextToggles: Date[]) => {
      setStart(nextStart);
      setDayToggles(nextToggles);
      onChange({
        startIso: nextStart ? toYmd(nextStart) : null,
        dayTogglesIso: nextToggles.map((d) => toYmd(d)).sort(),
      });
    },
    [onChange]
  );

  const sortedToggles = useMemo(
    () => [...dayToggles].sort((a, b) => a.getTime() - b.getTime()),
    [dayToggles]
  );

  const removeToggleDay = useCallback(
    (d: Date) => {
      const y = toYmd(d);
      const next = dayToggles.filter((x) => toYmd(x) !== y);
      emit(start, next);
    },
    [dayToggles, emit, start]
  );

  const [addPickerKey, setAddPickerKey] = useState(0);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Adjust schedule"
      size="md"
      zIndex={400}
      overlayProps={{ opacity: 0.52 }}
      keepMounted={false}
    >
      <Stack gap="md">
        <Text size="sm" fw={500}>
          Start date
        </Text>
        <Box className={classes.calendarWrap}>
          <Calendar
            firstDayOfWeek={1}
            date={calendarViewDate}
            onDateChange={setCalendarViewDate}
            getDayProps={(dayDate) => ({
              selected: start != null && isSameDay(dayDate, start),
            })}
            __onDayClick={(_event, dayDate) => {
              emit(dayDate, dayToggles);
            }}
            minLevel="month"
            maxLevel="month"
            size="md"
            w="100%"
            maw="100%"
            styles={{
              levelsGroup: { width: '100%', maxWidth: '100%' },
              month: { width: '100%', tableLayout: 'fixed' },
            }}
          />
        </Box>
        <Stack gap="xs">
          <Text size="sm" fw={500}>
            Day toggles (flip working vs non-working)
          </Text>
          {sortedToggles.length > 0 ? (
            <Group gap="xs" wrap="wrap">
              {sortedToggles.map((d) => (
                <Badge
                  key={toYmd(d)}
                  variant="light"
                  color="gray"
                  size="lg"
                  radius="md"
                  pr={6}
                  styles={{ root: { alignItems: 'center' } }}
                  rightSection={
                    <CloseButton
                      size="xs"
                      iconSize={12}
                      aria-label={`Remove ${format(d, 'MMM d, yyyy')}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeToggleDay(d);
                      }}
                    />
                  }
                >
                  {format(d, 'MMM d, yyyy')}
                </Badge>
              ))}
            </Group>
          ) : (
            <Text size="sm" c="dimmed" style={{ fontStyle: 'italic' }}>
              No days toggled yet. Pick dates below to flip working vs non-working.
            </Text>
          )}
          <DatePickerInput
            key={`add-toggle-${addPickerKey}`}
            type="default"
            label="Add a day"
            placeholder="Pick a date"
            value={null}
            clearable
            dropdownType="popover"
            popoverProps={{ withinPortal: true, zIndex: 500 }}
            onChange={(picked) => {
              if (!picked) return;
              const y = toYmd(picked);
              if (dayToggles.some((x) => toYmd(x) === y)) {
                setAddPickerKey((k) => k + 1);
                return;
              }
              emit(start, [...dayToggles, picked].sort((a, b) => a.getTime() - b.getTime()));
              setAddPickerKey((k) => k + 1);
            }}
          />
        </Stack>
        <Text size="sm" c="dimmed">
          End date and work days are calculated from {laborHours.toFixed(1)} bid hours, team
          capacity, and day toggles. Changes preview on the calendar; use Save on the page to
          apply.
        </Text>
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose}>
            Close
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

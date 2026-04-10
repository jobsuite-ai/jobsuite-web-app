'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button, Group, Modal, Stack, Text } from '@mantine/core';
import { Calendar, DatePickerInput } from '@mantine/dates';
import { isSameDay } from 'date-fns';

type Props = {
  opened: boolean;
  onClose: () => void;
  scheduleId: string | null;
  /** ISO dates (YYYY-MM-DD) */
  startIso: string | null;
  nonWorkingIso: string[];
  onChange: (next: { startIso: string | null; nonWorkingIso: string[] }) => void;
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
  nonWorkingIso,
  onChange,
  laborHours,
}: Props) {
  const [start, setStart] = useState<Date | null>(null);
  const [nonWorking, setNonWorking] = useState<Date[]>([]);
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(() => new Date());

  /** Stable key so parent passing `[]` every render does not retrigger sync. */
  const nonWorkingKey = useMemo(
    () => JSON.stringify([...(nonWorkingIso ?? [])].map((s) => s.slice(0, 10)).sort()),
    [nonWorkingIso]
  );

  useEffect(() => {
    if (!opened || !scheduleId) {
      return;
    }
    const sd = startIso ? parseYmd(startIso) : null;
    setStart(sd);
    setNonWorking(
      (nonWorkingIso ?? [])
        .map((s) => parseYmd(s))
        .filter((d): d is Date => d !== null)
    );
    setCalendarViewDate(sd ?? new Date());
  }, [opened, scheduleId, startIso, nonWorkingKey]);

  const emit = useCallback(
    (nextStart: Date | null, nextNw: Date[]) => {
      setStart(nextStart);
      setNonWorking(nextNw);
      onChange({
        startIso: nextStart ? toYmd(nextStart) : null,
        nonWorkingIso: nextNw.map((d) => toYmd(d)).sort(),
      });
    },
    [onChange]
  );

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
        <Calendar
          firstDayOfWeek={1}
          date={calendarViewDate}
          onDateChange={setCalendarViewDate}
          getDayProps={(dayDate) => ({
            selected: start != null && isSameDay(dayDate, start),
          })}
          __onDayClick={(_event, dayDate) => {
            emit(dayDate, nonWorking);
          }}
          minLevel="month"
          maxLevel="month"
          size="sm"
        />
        <DatePickerInput
          type="multiple"
          label="Non-working days (gaps on calendar)"
          value={nonWorking}
          onChange={(nw) => emit(start, nw ?? [])}
          clearable
          dropdownType="popover"
          popoverProps={{ withinPortal: true, zIndex: 500 }}
        />
        <Text size="sm" c="dimmed">
          End date and work days are calculated from {laborHours.toFixed(1)} bid hours, team
          capacity, and non-working days. Changes preview on the calendar; use Save on the page
          to apply.
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

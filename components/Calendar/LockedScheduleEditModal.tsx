'use client';

import { useEffect, useState } from 'react';

import { Button, Group, Modal, Stack, Text } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';

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
  }, [opened, scheduleId, startIso, nonWorkingIso]);

  const emit = (nextStart: Date | null, nextNw: Date[]) => {
    setStart(nextStart);
    setNonWorking(nextNw);
    onChange({
      startIso: nextStart ? toYmd(nextStart) : null,
      nonWorkingIso: nextNw.map((d) => toYmd(d)).sort(),
    });
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Adjust schedule" size="md">
      <Stack gap="md">
        <DatePickerInput
          label="Start date"
          value={start}
          onChange={(d) => emit(d, nonWorking)}
        />
        <DatePickerInput
          type="multiple"
          label="Non-working days (gaps on calendar)"
          value={nonWorking}
          onChange={(nw) => emit(start, nw ?? [])}
          clearable
        />
        <Text size="sm" c="dimmed">
          End date and work days are calculated from {laborHours.toFixed(1)} bid hours, team
          capacity, and non-working days. Changes preview on the calendar; use Save below to apply.
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

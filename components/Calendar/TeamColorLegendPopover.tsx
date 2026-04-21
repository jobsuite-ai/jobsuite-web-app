'use client';

import { useCallback, useState } from 'react';

import type { MantineTheme } from '@mantine/core';
import {
  ActionIcon,
  Box,
  Button,
  ColorPicker,
  Group,
  Popover,
  Stack,
  Text,
} from '@mantine/core';

import classes from './CalendarPage.module.css';
import type { CalendarTeamOption } from './ScheduleJobModal';

import {
  normalizeCalendarColorHex,
  SCHEDULE_TEAM_HEX_COLOR_TEMPLATES,
  teamCalendarSolidCss,
} from '@/utils/scheduleColors';

export type TeamCalendarColorSave =
  | { kind: 'auto' }
  | { kind: 'palette'; hue: string }
  | { kind: 'hex'; hex: string };

const DEFAULT_PICKER_HEX = '#868e96';

function initialPickerHex(team: CalendarTeamOption): string {
  if (team.calendarColorHex) {
    return normalizeCalendarColorHex(team.calendarColorHex) ?? DEFAULT_PICKER_HEX;
  }
  return DEFAULT_PICKER_HEX;
}

export function TeamColorLegendPopover({
  team,
  theme,
  onSave,
}: {
  team: CalendarTeamOption;
  theme: MantineTheme;
  onSave: (team: CalendarTeamOption, next: TeamCalendarColorSave) => boolean | Promise<boolean>;
}) {
  const savedBg = teamCalendarSolidCss(theme.colors, team);
  const [opened, setOpened] = useState(false);
  const [pickerValue, setPickerValue] = useState(() => initialPickerHex(team));

  const resetDraftToTeam = useCallback(() => {
    setPickerValue(initialPickerHex(team));
  }, [team]);

  const previewCss = normalizeCalendarColorHex(pickerValue) ?? DEFAULT_PICKER_HEX;

  const runSave = useCallback(
    async (next: TeamCalendarColorSave) => {
      const ok = await Promise.resolve(onSave(team, next));
      if (ok) {
        setOpened(false);
      }
    },
    [onSave, team]
  );

  return (
    <Popover
      position="bottom"
      withArrow
      shadow="md"
      withinPortal
      opened={opened}
      onChange={setOpened}
      onOpen={resetDraftToTeam}
    >
      {/* Mantine: controlled Popover does not attach onClick to Target — toggle manually. */}
      <Popover.Target>
        <ActionIcon
          variant="transparent"
          size={22}
          p={0}
          className={classes.legendColorTrigger}
          aria-label={`Change calendar color for ${team.name}`}
          title="Change team color"
          type="button"
          onClick={() => setOpened((o) => !o)}
        >
          <Box className={classes.legendSwatch} style={{ backgroundColor: savedBg }} />
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown
        onClick={(e) => {
          e.stopPropagation();
        }}
        p="sm"
        style={{ minWidth: 240, maxWidth: 280 }}
      >
        <Stack gap={6}>
          <Text size="xs" fw={600}>
            Team color
          </Text>
          <Text size="xs" c="dimmed" lh={1.35}>
            Adjust the spectrum or tap a swatch, preview, then apply.
          </Text>
          <Group justify="center" wrap="nowrap">
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                runSave({ kind: 'auto' }).catch(() => {});
              }}
            >
              Automatic (from team id)
            </Button>
          </Group>
          <ColorPicker
            format="hex"
            fullWidth
            size="xs"
            value={pickerValue}
            onChange={setPickerValue}
            swatches={[...SCHEDULE_TEAM_HEX_COLOR_TEMPLATES]}
            swatchesPerRow={6}
            styles={{
              swatch: { width: 18, height: 18, minWidth: 18 },
              swatches: { gap: 10 },
            }}
          />
          <div>
            <Text size="xs" c="dimmed" mb={4}>
              Preview
            </Text>
            <Box
              h={28}
              style={{
                borderRadius: 6,
                backgroundColor: previewCss,
                border: '1px solid light-dark(rgb(0 0 0 / 12%), rgb(255 255 255 / 12%))',
              }}
            />
          </div>
          <Group justify="center" gap="xs" wrap="nowrap" mt={2}>
            <Button
              variant="default"
              size="sm"
              onClick={() => setPickerValue(initialPickerHex(team))}
            >
              Reset draft
            </Button>
            <Button
              size="sm"
              onClick={() => {
                const n = normalizeCalendarColorHex(pickerValue);
                if (n) {
                  runSave({ kind: 'hex', hex: n }).catch(() => {});
                }
              }}
            >
              Apply
            </Button>
          </Group>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}

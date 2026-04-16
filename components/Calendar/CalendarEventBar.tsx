'use client';

import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';

import { ActionIcon, Group, Menu, Tooltip } from '@mantine/core';
import { IconCalendarEvent, IconDots, IconGripVertical, IconUsers } from '@tabler/icons-react';
import Link from 'next/link';

import classes from './CalendarPage.module.css';

export type CalendarEventBarRow = {
  rowKey: string;
  title: string;
  scheduleTentative: boolean;
  scheduleId: string;
  estimateId: string | null;
  isBacklog: boolean;
  href: string | null;
};

type CalendarEventBarProps = {
  row: CalendarEventBarRow;
  barStyle: CSSProperties;
  solidBg: string;
  segmentDates: string;
  metaSuffix: string;
  /** Locked jobs: previewing unsaved schedule edits */
  isPreview?: boolean;
  /** Locked jobs: open adjust dialog */
  onSchedule?: () => void;
  /** Locked jobs: change / remove production team */
  onChangeTeam?: () => void;
  /** Same length as bar day columns; true = red inset outline (team double-booked that day). */
  doubleBookDays?: boolean[];
  doubleBookTooltip?: string | null;
  /** Locked jobs: drag handle for calendar reschedule (from @dnd-kit useDraggable). */
  dragHandle?: {
    setNodeRef: (el: HTMLElement | null) => void;
    attributes: Record<string, unknown>;
    listeners?: Record<string, unknown>;
  } | null;
  /** Trailing edge: drag horizontally to adjust last work day in this week (schedule edit). */
  resizeHandle?: {
    onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
  } | null;
};

export function CalendarEventBar({
  row,
  barStyle,
  solidBg,
  segmentDates,
  metaSuffix,
  isPreview,
  onSchedule,
  onChangeTeam,
  doubleBookDays,
  doubleBookTooltip,
  dragHandle,
  resizeHandle,
}: CalendarEventBarProps) {
  const { isBacklog, scheduleId, estimateId } = row;
  const showMenu =
    !isBacklog &&
    Boolean(estimateId) &&
    !scheduleId.startsWith('backlog:') &&
    Boolean(onSchedule || onChangeTeam);

  const style: CSSProperties = {
    ...barStyle,
    position: 'relative',
    ...(isBacklog ? {} : { backgroundColor: solidBg }),
    ...(isPreview
      ? {
          outline: '2px dashed rgba(255,255,255,0.85)',
          outlineOffset: -1,
        }
      : {}),
  };

  const showDayOutlines =
    Array.isArray(doubleBookDays) &&
    doubleBookDays.length > 0 &&
    doubleBookDays.some(Boolean);

  const titleBlock = row.href ? (
    <Link
      href={row.href}
      className={classes.eventBarText}
      style={{ color: 'inherit', textDecoration: 'none', minWidth: 0 }}
    >
      <div className={classes.eventTitle}>{row.title}</div>
      <div className={classes.eventMeta}>
        {segmentDates}
        {metaSuffix}
        {isPreview ? ' · preview' : ''}
      </div>
    </Link>
  ) : (
    <div className={classes.eventBarText}>
      <div className={classes.eventTitle}>{row.title}</div>
      <div className={classes.eventMeta}>
        {segmentDates}
        {metaSuffix}
        {isPreview ? ' · preview' : ''}
      </div>
    </div>
  );

  const className = [classes.eventBar, ''].filter(Boolean).join(' ');

  const barBody = (
    <div className={className} style={style}>
      {showDayOutlines ? (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            zIndex: 0,
            borderRadius: 'inherit',
            overflow: 'hidden',
            pointerEvents: 'none',
          }}
        >
          {doubleBookDays!.map((flag, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                minWidth: 0,
                boxSizing: 'border-box',
                boxShadow: flag ? 'inset 0 0 0 2px var(--mantine-color-red-6)' : undefined,
              }}
            />
          ))}
        </div>
      ) : null}
      <div
        className={classes.eventBarInner}
        style={showDayOutlines ? { position: 'relative', zIndex: 1 } : undefined}
      >
        <Group gap={4} wrap="nowrap" align="flex-start" style={{ minWidth: 0, flex: 1 }}>
          {dragHandle ? (
            <ActionIcon
              ref={dragHandle.setNodeRef}
              {...dragHandle.attributes}
              {...dragHandle.listeners}
              variant="filled"
              color="dark"
              size="sm"
              aria-label="Drag to reschedule on calendar"
              className={classes.eventBarDragHandle}
              style={{ cursor: 'grab', flexShrink: 0, touchAction: 'none' }}
              onClick={(e) => e.stopPropagation()}
            >
              <IconGripVertical size={14} />
            </ActionIcon>
          ) : null}
          {titleBlock}
        </Group>
        {showMenu ? (
          <div className={classes.eventBarActions}>
            <Menu shadow="md" width={220} withinPortal>
              <Menu.Target>
                <ActionIcon size="sm" variant="filled" color="dark" aria-label="Job actions">
                  <IconDots size={16} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                {onSchedule ? (
                  <Menu.Item leftSection={<IconCalendarEvent size={14} />} onClick={onSchedule}>
                    Schedule
                  </Menu.Item>
                ) : null}
                {onChangeTeam ? (
                  <Menu.Item leftSection={<IconUsers size={14} />} onClick={onChangeTeam}>
                    Change team
                  </Menu.Item>
                ) : null}
              </Menu.Dropdown>
            </Menu>
          </div>
        ) : null}
      </div>
      {resizeHandle ? (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize schedule end in this week"
          onPointerDown={(e) => {
            e.stopPropagation();
            resizeHandle.onPointerDown(e);
          }}
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: 10,
            cursor: 'ew-resize',
            zIndex: 2,
            touchAction: 'none',
          }}
        />
      ) : null}
    </div>
  );

  if (doubleBookTooltip) {
    return (
      <Tooltip label={doubleBookTooltip} multiline maw={360} withArrow>
        {barBody}
      </Tooltip>
    );
  }

  return barBody;
}

'use client';

import type { CSSProperties } from 'react';

import { ActionIcon, Menu } from '@mantine/core';
import { IconCalendarEvent, IconDots, IconPencil, IconUsers } from '@tabler/icons-react';
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
}: CalendarEventBarProps) {
  const { isBacklog, scheduleId, estimateId } = row;
  const showMenu =
    !isBacklog &&
    Boolean(estimateId) &&
    !scheduleId.startsWith('backlog:') &&
    Boolean(onSchedule || onChangeTeam);

  const style: CSSProperties = {
    ...barStyle,
    ...(isBacklog ? {} : { backgroundColor: solidBg }),
    ...(isPreview
      ? {
          outline: '2px dashed rgba(255,255,255,0.85)',
          outlineOffset: -1,
        }
      : {}),
  };

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

  return (
    <div className={className} style={style}>
      <div className={classes.eventBarInner}>
        {titleBlock}
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
                {row.href ? (
                  <Menu.Item
                    component={Link}
                    href={row.href}
                    leftSection={<IconPencil size={14} />}
                  >
                    Open proposal
                  </Menu.Item>
                ) : null}
              </Menu.Dropdown>
            </Menu>
          </div>
        ) : null}
      </div>
    </div>
  );
}

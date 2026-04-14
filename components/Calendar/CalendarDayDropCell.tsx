'use client';

import { useCallback } from 'react';

import { useDroppable } from '@dnd-kit/core';
import { format } from 'date-fns';

import classes from './CalendarPage.module.css';

type Props = {
  day: Date;
  /** True when this day is not allowed as a drag start date (e.g. before exterior season). */
  invalidDrop?: boolean;
  /** Registers the cell element for floating invalid-drop UI (keyed by YYYY-MM-DD). */
  registerDayCell?: (ymd: string, el: HTMLDivElement | null) => void;
};

/** Droppable target for dragging a locked job onto a calendar day column. */
export function CalendarDayDropCell({ day, invalidDrop = false, registerDayCell }: Props) {
  const ymd = format(day, 'yyyy-MM-dd');
  const { setNodeRef, isOver } = useDroppable({
    id: `cal-drop:${ymd}`,
    data: { ymd },
  });

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      setNodeRef(node);
      registerDayCell?.(ymd, node);
    },
    [setNodeRef, registerDayCell, ymd]
  );

  const overClass = isOver
    ? invalidDrop
      ? classes.dayCellDropInvalid
      : classes.dayCellDropOver
    : '';

  return (
    <div
      ref={setRefs}
      className={`${classes.dayCell} ${overClass}`}
    />
  );
}

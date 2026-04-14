'use client';

import type { ComponentProps, CSSProperties } from 'react';

import { useDraggable } from '@dnd-kit/core';

import { CalendarEventBar } from './CalendarEventBar';

import type { WeekCalRow } from '@/utils/calendarGridMath';

type Props = Omit<ComponentProps<typeof CalendarEventBar>, 'dragHandle'> & {
  rowMeta: WeekCalRow;
  dragEnabled: boolean;
};

/**
 * Locked schedule segments: grip handle uses @dnd-kit to drop on calendar day cells.
 */
export function CalendarScheduleDraggableBar({ rowMeta, dragEnabled, barStyle, ...rest }: Props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `cal-drag:${rowMeta.rowKey}`,
    disabled: !dragEnabled,
    data: { type: 'schedule-bar' as const, row: rowMeta },
  });

  const mergedStyle: CSSProperties = {
    ...barStyle,
    ...(isDragging ? { opacity: 0.35 } : {}),
  };

  return (
    <CalendarEventBar
      {...rest}
      barStyle={mergedStyle}
      dragHandle={
        !dragEnabled
          ? null
          : {
              setNodeRef,
              attributes: attributes as unknown as Record<string, unknown>,
              listeners: listeners as unknown as Record<string, unknown>,
            }
      }
    />
  );
}

import type { MantineColorsTuple } from '@mantine/core';

const PALETTE_INDICES = [6, 7, 8, 5, 4, 9] as const;

const BRAND_HUES: string[] = [
  'blue',
  'teal',
  'violet',
  'grape',
  'cyan',
  'indigo',
  'green',
  'orange',
  'pink',
  'lime',
];

/** Stable hue + shade from a string (team id or crew lead name). */
export function colorForScheduleKey(key: string | null | undefined): {
  color: string;
  shade?: number;
} {
  const s = (key || 'default').trim() || 'default';
  let hash = 0;
  for (let i = 0; i < s.length; i += 1) {
    hash = (hash * 31 + s.charCodeAt(i)) | 0;
  }
  const hue = BRAND_HUES[Math.abs(hash) % BRAND_HUES.length];
  const shade = PALETTE_INDICES[Math.abs(hash >> 8) % PALETTE_INDICES.length];
  return { color: hue, shade };
}

/** Solid CSS color from Mantine theme (for inline backgrounds). */
export function mantineColorToCss(
  themeColors: Record<string, MantineColorsTuple>,
  color: string,
  shade: number
): string {
  const tuple = themeColors[color];
  if (!tuple) {
    return 'var(--mantine-color-blue-6)';
  }
  return tuple[shade] ?? tuple[6];
}

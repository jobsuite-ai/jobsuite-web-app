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

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '').trim();
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  if (Number.isNaN(n) || full.length !== 6) {
    return { r: 120, g: 120, b: 120 };
  }
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/**
 * Striped fill for tentative team backlog (calendar bars + backlog cards), tinted to the team hue.
 */
export function teamBacklogStripedBackground(
  themeColors: Record<string, MantineColorsTuple>,
  color: string,
  shade: number
): string {
  const hex = mantineColorToCss(themeColors, color, shade);
  const { r, g, b } = hex.startsWith('#') ? hexToRgb(hex) : hexToRgb('#6b7280');
  const a1 = 0.28;
  const a2 = 0.14;
  return (
    `linear-gradient(135deg, rgba(${r},${g},${b},${a1}) 25%, rgba(${r},${g},${b},${a2}) 25%, ` +
    `rgba(${r},${g},${b},${a2}) 50%, rgba(${r},${g},${b},${a1}) 50%, rgba(${r},${g},${b},${a1}) 75%, ` +
    `rgba(${r},${g},${b},${a2}) 75%)`
  );
}

/** Calendar backlog bars: team tint underneath + striped overlay. */
export function teamBacklogCardBackground(
  themeColors: Record<string, MantineColorsTuple>,
  color: string,
  shade: number
): string {
  const hex = mantineColorToCss(themeColors, color, shade);
  const { r, g, b } = hex.startsWith('#') ? hexToRgb(hex) : hexToRgb('#6b7280');
  const base = `linear-gradient(rgba(${r},${g},${b},0.2), rgba(${r},${g},${b},0.2))`;
  const stripes = teamBacklogStripedBackground(themeColors, color, shade);
  return `${stripes}, ${base}`;
}

/** Tentative backlog list cards: solid white base so page background does not show through. */
export function teamBacklogPaperBackground(
  themeColors: Record<string, MantineColorsTuple>,
  color: string,
  shade: number
): string {
  const stripes = teamBacklogStripedBackground(themeColors, color, shade);
  return `${stripes}, linear-gradient(#ffffff, #ffffff)`;
}

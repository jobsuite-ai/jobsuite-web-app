import type { MantineColorsTuple } from '@mantine/core';

const PALETTE_INDICES = [6, 7, 8, 5, 4, 9] as const;

/** Mantine palette names for optional team calendar color (see job-engine TeamConfigModel). */
export const SCHEDULE_PALETTE_COLOR_NAMES = [
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
] as const;

export type SchedulePaletteColorName = (typeof SCHEDULE_PALETTE_COLOR_NAMES)[number];

const BRAND_HUES: string[] = [...SCHEDULE_PALETTE_COLOR_NAMES];

const PALETTE_NAME_SET = new Set<string>(SCHEDULE_PALETTE_COLOR_NAMES);

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

export type TeamCalendarColorSource = {
  id: string;
  calendarColor?: string | null;
  calendarColorShade?: number | null;
  /** Normalized #rrggbb from team_config.calendar_color_hex when set. */
  calendarColorHex?: string | null;
};

/** Distinct hex swatches for the calendar “template” row (custom picker presets). */
export const SCHEDULE_TEAM_HEX_COLOR_TEMPLATES = [
  '#c92a2a',
  '#d9480f',
  '#e67700',
  '#2f9e44',
  '#0ca678',
  '#1098ad',
  '#1971c2',
  '#5f3dc4',
  '#ae3ec9',
  '#495057',
] as const;

/** Accepts #RGB or #RRGGBB; returns lowercase #rrggbb or null. */
export function normalizeCalendarColorHex(raw: string | null | undefined): string | null {
  if (raw == null || typeof raw !== 'string') {
    return null;
  }
  const s = raw.trim();
  if (!s.startsWith('#')) {
    return null;
  }
  const body = s.slice(1);
  if (body.length === 3 && /^[0-9a-fA-F]{3}$/.test(body)) {
    return `#${body
      .split('')
      .map((c) => c + c)
      .join('')
      .toLowerCase()}`;
  }
  if (body.length === 6 && /^[0-9a-fA-F]{6}$/.test(body)) {
    return `#${body.toLowerCase()}`;
  }
  return null;
}

/** team_config override, else same hash as colorForScheduleKey(team.id). */
export function colorForTeam(team: TeamCalendarColorSource): { color: string; shade: number } {
  const raw = team.calendarColor?.trim();
  if (raw && PALETTE_NAME_SET.has(raw)) {
    const sh = team.calendarColorShade;
    const shade =
      typeof sh === 'number' && Number.isFinite(sh) && sh >= 4 && sh <= 9 ? Math.round(sh) : 6;
    return { color: raw, shade };
  }
  const auto = colorForScheduleKey(team.id);
  return { color: auto.color, shade: auto.shade ?? 6 };
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
  const norm = normalizeCalendarColorHex(hex);
  const h = (norm ?? hex).replace('#', '').trim();
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  if (Number.isNaN(n) || full.length !== 6) {
    return { r: 120, g: 120, b: 120 };
  }
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function teamBacklogStripedBackgroundFromRgb(r: number, g: number, b: number): string {
  const a1 = 0.28;
  const a2 = 0.14;
  return (
    `linear-gradient(135deg, rgba(${r},${g},${b},${a1}) 25%, rgba(${r},${g},${b},${a2}) 25%, ` +
    `rgba(${r},${g},${b},${a2}) 50%, rgba(${r},${g},${b},${a1}) 50%, rgba(${r},${g},${b},${a1}) 75%, ` +
    `rgba(${r},${g},${b},${a2}) 75%)`
  );
}

/** Striped backlog fill from a custom hex (calendar bars + backlog cards). */
export function teamBacklogStripedBackgroundFromHex(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  return teamBacklogStripedBackgroundFromRgb(r, g, b);
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
  return teamBacklogStripedBackgroundFromRgb(r, g, b);
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

export function teamBacklogCardBackgroundFromHex(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  const base = `linear-gradient(rgba(${r},${g},${b},0.2), rgba(${r},${g},${b},0.2))`;
  const stripes = teamBacklogStripedBackgroundFromHex(hex);
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

export function teamBacklogPaperBackgroundFromHex(hex: string): string {
  const stripes = teamBacklogStripedBackgroundFromHex(hex);
  return `${stripes}, linear-gradient(#ffffff, #ffffff)`;
}

/** Solid bar / border color for a team (hex overrides Mantine palette / hash). */
export function teamCalendarSolidCss(
  themeColors: Record<string, MantineColorsTuple>,
  team: TeamCalendarColorSource
): string {
  const hex = normalizeCalendarColorHex(team.calendarColorHex);
  if (hex) {
    return hex;
  }
  const { color, shade } = colorForTeam(team);
  return mantineColorToCss(themeColors, color, shade ?? 6);
}

export function teamBacklogCardBackgroundForTeam(
  themeColors: Record<string, MantineColorsTuple>,
  team: TeamCalendarColorSource
): string {
  const hex = normalizeCalendarColorHex(team.calendarColorHex);
  if (hex) {
    return teamBacklogCardBackgroundFromHex(hex);
  }
  const { color, shade } = colorForTeam(team);
  return teamBacklogCardBackground(themeColors, color, shade ?? 6);
}

export function teamBacklogPaperBackgroundForTeam(
  themeColors: Record<string, MantineColorsTuple>,
  team: TeamCalendarColorSource
): string {
  const hex = normalizeCalendarColorHex(team.calendarColorHex);
  if (hex) {
    return teamBacklogPaperBackgroundFromHex(hex);
  }
  const { color, shade } = colorForTeam(team);
  return teamBacklogPaperBackground(themeColors, color, shade ?? 6);
}

/** Like teamCalendarSolidCss when only team id is known (e.g. calendar row without full team). */
export function teamCalendarSolidCssForTeamId(
  themeColors: Record<string, MantineColorsTuple>,
  teamId: string,
  teams: TeamCalendarColorSource[] | undefined
): string {
  const id = (teamId || 'default').trim() || 'default';
  const team = teams?.find((t) => t.id === id);
  if (team) {
    return teamCalendarSolidCss(themeColors, team);
  }
  const { color, shade } = colorForScheduleKey(id);
  return mantineColorToCss(themeColors, color, shade ?? 6);
}

export function teamBacklogCardBackgroundForTeamId(
  themeColors: Record<string, MantineColorsTuple>,
  teamId: string,
  teams: TeamCalendarColorSource[] | undefined
): string {
  const id = (teamId || 'default').trim() || 'default';
  const team = teams?.find((t) => t.id === id);
  if (team) {
    return teamBacklogCardBackgroundForTeam(themeColors, team);
  }
  const { color, shade } = colorForScheduleKey(id);
  return teamBacklogCardBackground(themeColors, color, shade ?? 6);
}

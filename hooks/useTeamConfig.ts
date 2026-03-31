import { useEffect, useState } from 'react';

import { getApiHeaders } from '@/app/utils/apiClient';
import { DEFAULT_SCHEDULE_DAILY_HOURS } from '@/utils/scheduleMath';

export interface ScheduleTeam {
  id: string;
  name: string;
  painterCount?: number;
  weeklyHours?: number;
}

export interface TeamConfig {
  leadPainters: string[];
  productionManagers: string[];
  salesPeople: string[];
  /** Hours per business day when no team-specific capacity applies */
  scheduleDefaultDailyHours: number;
  /** Optional teams for capacity + calendar assignment */
  scheduleTeams: ScheduleTeam[];
}

let teamConfigCache: TeamConfig | null = null;
let teamConfigCachePromise: Promise<TeamConfig> | null = null;

function parseScheduleTeams(raw: unknown): ScheduleTeam[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: ScheduleTeam[] = [];
  raw.forEach((item) => {
    if (!item || typeof item !== 'object') return;
    const o = item as Record<string, unknown>;
    const id = typeof o.id === 'string' ? o.id.trim() : '';
    const name = typeof o.name === 'string' ? o.name.trim() : '';
    if (!id || !name) return;
    const painterCount =
      typeof o.painterCount === 'number'
        ? o.painterCount
        : typeof o.painter_count === 'number'
          ? o.painter_count
          : undefined;
    const weeklyHours =
      typeof o.weeklyHours === 'number'
        ? o.weeklyHours
        : typeof o.weekly_hours === 'number'
          ? o.weekly_hours
          : undefined;
    out.push({
      id,
      name,
      painterCount,
      weeklyHours,
    });
  });
  return out;
}

function parseTeamConfig(configuration: Record<string, unknown> | undefined): TeamConfig {
  const scheduleRaw = configuration?.schedule_default_daily_hours;
  let scheduleDefaultDailyHours = DEFAULT_SCHEDULE_DAILY_HOURS;
  if (typeof scheduleRaw === 'number' && scheduleRaw > 0) {
    scheduleDefaultDailyHours = scheduleRaw;
  }

  return {
    leadPainters: Array.isArray(configuration?.team_lead_painters)
      ? (configuration.team_lead_painters as string[])
      : [],
    productionManagers: Array.isArray(configuration?.team_production_managers)
      ? (configuration.team_production_managers as string[])
      : [],
    salesPeople: Array.isArray(configuration?.team_sales_people)
      ? (configuration.team_sales_people as string[])
      : [],
    scheduleDefaultDailyHours,
    scheduleTeams: parseScheduleTeams(configuration?.schedule_teams),
  };
}

export function useTeamConfig() {
  const [teamConfig, setTeamConfig] = useState<TeamConfig>(
    teamConfigCache ?? {
      leadPainters: [],
      productionManagers: [],
      salesPeople: [],
      scheduleDefaultDailyHours: DEFAULT_SCHEDULE_DAILY_HOURS,
      scheduleTeams: [],
    }
  );
  const [loading, setLoading] = useState(!teamConfigCache);

  useEffect(() => {
    if (teamConfigCache) {
      setTeamConfig(teamConfigCache);
      setLoading(false);
      return;
    }

    if (teamConfigCachePromise) {
      teamConfigCachePromise.then((data) => {
        setTeamConfig(data);
        setLoading(false);
      });
      return;
    }

    setLoading(true);
    teamConfigCachePromise = fetch('/api/configurations?config_type=contractor_config', {
      method: 'GET',
      headers: getApiHeaders(),
    })
      .then((response) => {
        if (!response.ok && response.status !== 404) {
          throw new Error('Failed to load team configuration');
        }
        return response.ok ? response.json() : [];
      })
      .then(
        (
          configs: Array<{
            configuration_type: string;
            configuration?: Record<string, unknown>;
          }>
        ) => {
          const config = configs.find((c) => c.configuration_type === 'contractor_config');
          const parsed = parseTeamConfig(config?.configuration);
          teamConfigCache = parsed;
          setTeamConfig(parsed);
          setLoading(false);
          return parsed;
        }
      )
      .catch((error) => {
        // eslint-disable-next-line no-console
        console.error('Error loading team config:', error);
        const fallback: TeamConfig = {
          leadPainters: [],
          productionManagers: [],
          salesPeople: [],
          scheduleDefaultDailyHours: DEFAULT_SCHEDULE_DAILY_HOURS,
          scheduleTeams: [],
        };
        setTeamConfig(fallback);
        setLoading(false);
        return fallback;
      })
      .finally(() => {
        teamConfigCachePromise = null;
      });
  }, []);

  return { teamConfig, loading };
}

export function invalidateTeamConfigCache() {
  teamConfigCache = null;
  teamConfigCachePromise = null;
}

import { useEffect, useState } from 'react';

import { getApiHeaders } from '@/app/utils/apiClient';

export interface TeamConfig {
  leadPainters: string[];
  productionManagers: string[];
  salesPeople: string[];
}

let teamConfigCache: TeamConfig | null = null;
let teamConfigCachePromise: Promise<TeamConfig> | null = null;

function parseTeamConfig(configuration: Record<string, unknown> | undefined): TeamConfig {
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
  };
}

export function useTeamConfig() {
  const [teamConfig, setTeamConfig] = useState<TeamConfig>(teamConfigCache ?? {
    leadPainters: [],
    productionManagers: [],
    salesPeople: [],
  });
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
          const config = configs.find(
            (c) => c.configuration_type === 'contractor_config'
          );
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
        const fallback: TeamConfig = { leadPainters: [], productionManagers: [], salesPeople: [] };
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

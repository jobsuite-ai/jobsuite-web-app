'use client';

import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

import { getApiHeaders } from '@/app/utils/apiClient';
import { clearCachedData, getCachedData, setCachedData, type CacheKey } from '@/app/utils/dataCache';
import { ContractorClient, Estimate, Job } from '@/components/Global/model';

interface DataCacheContextType {
  // Data
  clients: ContractorClient[];
  estimates: Estimate[];
  projects: Job[];

  // Loading states
  loading: {
    clients: boolean;
    estimates: boolean;
    projects: boolean;
  };

  // Errors
  errors: {
    clients: string | null;
    estimates: string | null;
    projects: string | null;
  };

  // Functions
  refreshData: (key?: CacheKey) => Promise<void>;
  invalidateCache: (key?: CacheKey) => void;
  getData: <T extends CacheKey>(
    key: T
  ) => T extends 'clients'
    ? ContractorClient[]
    : T extends 'estimates'
    ? Estimate[]
    : T extends 'projects'
    ? Job[]
    : never;
  // Optimistic update methods
  updateEstimate: (updatedEstimate: Estimate) => void;
  updateProject: (updatedProject: Job) => void;
  updateClient: (updatedClient: ContractorClient) => void;
}

const DataCacheContext = createContext<DataCacheContextType | undefined>(undefined);

export function DataCacheProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<ContractorClient[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [projects, setProjects] = useState<Job[]>([]);

  const [loading, setLoading] = useState({
    clients: false,
    estimates: false,
    projects: false,
  });

  const [errors, setErrors] = useState({
    clients: null as string | null,
    estimates: null as string | null,
    projects: null as string | null,
  });

  // Load from cache on mount
  useEffect(() => {
    const cachedClients = getCachedData<ContractorClient>('clients');
    const cachedEstimates = getCachedData<Estimate>('estimates');
    const cachedProjects = getCachedData<Job>('projects');

    if (cachedClients) {
      setClients(cachedClients);
    }
    if (cachedEstimates) {
      setEstimates(cachedEstimates);
    }
    if (cachedProjects) {
      setProjects(cachedProjects);
    }
  }, []);

  // Fetch data from API
  const fetchClients = useCallback(async (): Promise<ContractorClient[]> => {
    const response = await fetch('/api/clients', {
      method: 'GET',
      headers: getApiHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch clients');
    }

    const data = await response.json();
    const clientsList = data.Items || data || [];
    return Array.isArray(clientsList) ? clientsList : [];
  }, []);

  const fetchEstimates = useCallback(async (): Promise<Estimate[]> => {
    const response = await fetch('/api/estimates', {
      method: 'GET',
      headers: getApiHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch estimates');
    }

    const data = await response.json();
    const estimatesList = data.Items || data || [];
    return Array.isArray(estimatesList) ? estimatesList : [];
  }, []);

  const fetchProjects = useCallback(async (): Promise<Job[]> => {
    const response = await fetch('/api/projects', {
      method: 'GET',
      headers: getApiHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch projects');
    }

    const data = await response.json();
    const projectsList = data.Items || data || [];
    return Array.isArray(projectsList) ? projectsList : [];
  }, []);

  // Refresh data for a specific key or all keys using stale-while-revalidate pattern
  const refreshData = useCallback(async (key?: CacheKey) => {
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

    if (!accessToken) {
      // Clear data if no token
      setClients([]);
      setEstimates([]);
      setProjects([]);
      return;
    }

    const keysToRefresh: CacheKey[] = key ? [key] : ['clients', 'estimates', 'projects'];

    // Check cache validity - only show loading if cache is missing or expired
    const hasValidCache: Record<CacheKey, boolean> = {
      clients: !!getCachedData<ContractorClient>('clients'),
      estimates: !!getCachedData<Estimate>('estimates'),
      projects: !!getCachedData<Job>('projects'),
    };

    // Set loading states only for keys without valid cache
    keysToRefresh.forEach((k) => {
      if (!hasValidCache[k]) {
        setLoading((prev) => ({ ...prev, [k]: true }));
      }
      setErrors((prev) => ({ ...prev, [k]: null }));
    });

    try {
      const promises: Promise<void>[] = [];

      if (keysToRefresh.includes('clients')) {
        promises.push(
          fetchClients()
            .then((data) => {
              setClients(data);
              setCachedData('clients', data);
            })
            .catch((err) => {
              setErrors((prev) => ({
                ...prev,
                clients: err instanceof Error ? err.message : 'Failed to fetch clients',
              }));
            })
        );
      }

      if (keysToRefresh.includes('estimates')) {
        promises.push(
          fetchEstimates()
            .then((data) => {
              setEstimates(data);
              setCachedData('estimates', data);
            })
            .catch((err) => {
              setErrors((prev) => ({
                ...prev,
                estimates: err instanceof Error ? err.message : 'Failed to fetch estimates',
              }));
            })
        );
      }

      if (keysToRefresh.includes('projects')) {
        promises.push(
          fetchProjects()
            .then((data) => {
              setProjects(data);
              setCachedData('projects', data);
            })
            .catch((err) => {
              setErrors((prev) => ({
                ...prev,
                projects: err instanceof Error ? err.message : 'Failed to fetch projects',
              }));
            })
        );
      }

      await Promise.all(promises);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error refreshing data:', err);
    } finally {
      // Clear loading states
      keysToRefresh.forEach((k) => {
        setLoading((prev) => ({ ...prev, [k]: false }));
      });
    }
  }, [fetchClients, fetchEstimates, fetchProjects]);

  // Invalidate cache (clear from localStorage and state)
  const invalidateCache = useCallback((key?: CacheKey) => {
    if (key) {
      clearCachedData(key);
      if (key === 'clients') {
        setClients([]);
      } else if (key === 'estimates') {
        setEstimates([]);
      } else if (key === 'projects') {
        setProjects([]);
      }
    } else {
      clearCachedData('clients');
      clearCachedData('estimates');
      clearCachedData('projects');
      setClients([]);
      setEstimates([]);
      setProjects([]);
    }
  }, []);

  // Get data helper
  const getData = useCallback(<T extends CacheKey>(key: T) => {
    if (key === 'clients') {
      return clients as any;
    } if (key === 'estimates') {
      return estimates as any;
    } if (key === 'projects') {
      return projects as any;
    }
    throw new Error(`Unknown cache key: ${key}`);
  }, [clients, estimates, projects]);

  // Optimistic update methods - update single items in cache immediately
  const updateEstimate = useCallback((updatedEstimate: Estimate) => {
    // Update estimates array
    setEstimates((prev) => {
      const index = prev.findIndex((e) => e.id === updatedEstimate.id);
      const newEstimates = index >= 0
        ? [...prev.slice(0, index), updatedEstimate, ...prev.slice(index + 1)]
        : [...prev, updatedEstimate];

      // Update localStorage cache
      setCachedData('estimates', newEstimates);
      return newEstimates;
    });

    // Also update projects array if this estimate is a project
    // (estimates and projects share the same data structure, just different views)
    setProjects((prev) => {
      const index = prev.findIndex((p) => p.id === updatedEstimate.id);
      if (index >= 0) {
        const newProjects = [
          ...prev.slice(0, index),
          updatedEstimate as Job,
          ...prev.slice(index + 1),
        ];
        setCachedData('projects', newProjects);
        return newProjects;
      }
      // If not found in projects but is a project, add it
      if (updatedEstimate.is_project) {
        const newProjects = [...prev, updatedEstimate as Job];
        setCachedData('projects', newProjects);
        return newProjects;
      }
      return prev;
    });
  }, []);

  const updateProject = useCallback((updatedProject: Job) => {
    setProjects((prev) => {
      const index = prev.findIndex((p) => p.id === updatedProject.id);
      const newProjects = index >= 0
        ? [...prev.slice(0, index), updatedProject, ...prev.slice(index + 1)]
        : [...prev, updatedProject];

      // Update localStorage cache
      setCachedData('projects', newProjects);
      return newProjects;
    });

    // Also update estimates array since projects are estimates
    setEstimates((prev) => {
      const index = prev.findIndex((e) => e.id === updatedProject.id);
      if (index >= 0) {
        const newEstimates = [
          ...prev.slice(0, index),
          updatedProject as Estimate,
          ...prev.slice(index + 1),
        ];
        setCachedData('estimates', newEstimates);
        return newEstimates;
      }
      // If not found in estimates, add it
      const newEstimates = [...prev, updatedProject as Estimate];
      setCachedData('estimates', newEstimates);
      return newEstimates;
    });
  }, []);

  const updateClient = useCallback((updatedClient: ContractorClient) => {
    setClients((prev) => {
      const index = prev.findIndex((c) => c.id === updatedClient.id);
      const newClients = index >= 0
        ? [...prev.slice(0, index), updatedClient, ...prev.slice(index + 1)]
        : [...prev, updatedClient];

      // Update localStorage cache
      setCachedData('clients', newClients);
      return newClients;
    });
  }, []);

  // Initial load: show cached data immediately,
  // then fetch fresh data in background if cache expired
  useEffect(() => {
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

    if (!accessToken) {
      return;
    }

    // Use stale-while-revalidate: show cached data immediately, refresh in background
    // Only fetch if cache is expired or missing (refreshData handles this)
    refreshData();
  }, [refreshData]);

  // Listen for storage changes (e.g., after login)
  useEffect(() => {
    const handleStorageChange = () => {
      const accessToken = localStorage.getItem('access_token');
      if (accessToken) {
        // Reload from cache first
        const cachedClients = getCachedData<ContractorClient>('clients');
        const cachedEstimates = getCachedData<Estimate>('estimates');
        const cachedProjects = getCachedData<Job>('projects');

        if (cachedClients) setClients(cachedClients);
        if (cachedEstimates) setEstimates(cachedEstimates);
        if (cachedProjects) setProjects(cachedProjects);
      } else {
        // Clear data if logged out
        setClients([]);
        setEstimates([]);
        setProjects([]);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('localStorageChange', handleStorageChange as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localStorageChange', handleStorageChange as EventListener);
    };
  }, []);

  return (
    <DataCacheContext.Provider
      value={{
        clients,
        estimates,
        projects,
        loading,
        errors,
        refreshData,
        invalidateCache,
        getData,
        updateEstimate,
        updateProject,
        updateClient,
      }}
    >
      {children}
    </DataCacheContext.Provider>
  );
}

export function useDataCache() {
  const context = useContext(DataCacheContext);
  if (context === undefined) {
    throw new Error('useDataCache must be used within a DataCacheProvider');
  }
  return context;
}

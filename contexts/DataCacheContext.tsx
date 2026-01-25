'use client';

import { ReactNode, useCallback, useEffect, useRef, createContext, useContext } from 'react';

import { getApiHeaders } from '@/app/utils/apiClient';
import { ContractorClient, Estimate, Job } from '@/components/Global/model';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  setClients,
  setLoading as setClientsLoading,
  setError as setClientsError,
  selectAllClients,
  selectClientsLoading,
  selectClientsError,
  updateClient as updateClientAction,
} from '@/store/slices/clientsSlice';
import {
  setEstimates,
  setLoading as setEstimatesLoading,
  setError as setEstimatesError,
  cleanupArchived as cleanupArchivedEstimates,
  selectAllEstimates,
  selectEstimatesLoading,
  selectEstimatesError,
  updateEstimate as updateEstimateAction,
} from '@/store/slices/estimatesSlice';
import {
  setProjects,
  setLoading as setProjectsLoading,
  setError as setProjectsError,
  cleanupArchived as cleanupArchivedProjects,
  selectAllProjects,
  selectProjectsLoading,
  selectProjectsError,
  updateProject as updateProjectAction,
} from '@/store/slices/projectsSlice';

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
  refreshData: (key?: 'clients' | 'estimates' | 'projects', force?: boolean) => Promise<void>;
  invalidateCache: (key?: 'clients' | 'estimates' | 'projects') => void;
  getData: <T extends 'clients' | 'estimates' | 'projects'>(
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

// This will be provided by the provider component
export const DataCacheContext = createContext<DataCacheContextType | undefined>(undefined);

export function DataCacheProvider({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();

  // Get data from Redux store
  const estimates = useAppSelector(selectAllEstimates);
  const clients = useAppSelector(selectAllClients);
  const projects = useAppSelector(selectAllProjects);

  // Use refs to track current values without causing dependency issues
  const estimatesRef = useRef(estimates);
  const clientsRef = useRef(clients);
  const projectsRef = useRef(projects);
  const hasInitialLoadRef = useRef(false);
  const lastAccessTokenRef = useRef<string | null>(null);
  // Track in-flight requests to prevent duplicate fetches
  const inFlightRequestsRef = useRef<Map<'clients' | 'estimates' | 'projects', Promise<void>>>(new Map());

  // Update refs when values change
  useEffect(() => {
    estimatesRef.current = estimates;
    clientsRef.current = clients;
    projectsRef.current = projects;
  }, [estimates, clients, projects]);

  const estimatesLoading = useAppSelector(selectEstimatesLoading);
  const clientsLoading = useAppSelector(selectClientsLoading);
  const projectsLoading = useAppSelector(selectProjectsLoading);

  const estimatesError = useAppSelector(selectEstimatesError);
  const clientsError = useAppSelector(selectClientsError);
  const projectsError = useAppSelector(selectProjectsError);

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

  // Refresh data for a specific key or all keys
  const refreshData = useCallback(
    async (key?: 'clients' | 'estimates' | 'projects') => {
      const accessToken = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

      if (!accessToken) {
        // Clear data if no token
        return;
      }

      const keysToFetch: Array<'clients' | 'estimates' | 'projects'> = key
        ? [key]
        : ['clients', 'estimates', 'projects'];

      // Check for in-flight requests and reuse them to prevent duplicates
      const existingPromises: Promise<void>[] = [];
      const newPromises: Promise<void>[] = [];

      // Set loading states only for keys that need fetching AND don't have data yet
      // This prevents flashing loading state when refreshing with existing data
      // Use refs to check current values without adding to dependencies
      if (keysToFetch.includes('clients')) {
        const existingRequest = inFlightRequestsRef.current.get('clients');
        if (existingRequest) {
          existingPromises.push(existingRequest);
        } else {
          // Only show loading if we don't have clients data yet
          if (clientsRef.current.length === 0) {
            dispatch(setClientsLoading(true));
          }
          dispatch(setClientsError(null));
        }
      }
      if (keysToFetch.includes('estimates')) {
        const existingRequest = inFlightRequestsRef.current.get('estimates');
        if (existingRequest) {
          existingPromises.push(existingRequest);
        } else {
          // Only show loading if we don't have estimates data yet
          if (estimatesRef.current.length === 0) {
            dispatch(setEstimatesLoading(true));
          }
          dispatch(setEstimatesError(null));
        }
      }
      if (keysToFetch.includes('projects')) {
        const existingRequest = inFlightRequestsRef.current.get('projects');
        if (existingRequest) {
          existingPromises.push(existingRequest);
        } else {
          // Only show loading if we don't have projects data yet
          if (projectsRef.current.length === 0) {
            dispatch(setProjectsLoading(true));
          }
          dispatch(setProjectsError(null));
        }
      }

      // If all requests are already in flight, just wait for them
      if (existingPromises.length === keysToFetch.length) {
        await Promise.all(existingPromises);
        return;
      }

      try {
        // Create new fetch promises only for keys that don't have in-flight requests
        if (keysToFetch.includes('clients') && !inFlightRequestsRef.current.has('clients')) {
          const clientsPromise = fetchClients()
            .then((data) => {
              dispatch(setClients(data));
            })
            .catch((err) => {
              dispatch(
                setClientsError(err instanceof Error ? err.message : 'Failed to fetch clients')
              );
            })
            .finally(() => {
              inFlightRequestsRef.current.delete('clients');
              dispatch(setClientsLoading(false));
            });
          inFlightRequestsRef.current.set('clients', clientsPromise);
          newPromises.push(clientsPromise);
        }

        if (keysToFetch.includes('estimates') && !inFlightRequestsRef.current.has('estimates')) {
          const estimatesPromise = fetchEstimates()
            .then((data) => {
              dispatch(setEstimates(data));
            })
            .catch((err) => {
              dispatch(
                setEstimatesError(err instanceof Error ? err.message : 'Failed to fetch estimates')
              );
            })
            .finally(() => {
              inFlightRequestsRef.current.delete('estimates');
              dispatch(setEstimatesLoading(false));
            });
          inFlightRequestsRef.current.set('estimates', estimatesPromise);
          newPromises.push(estimatesPromise);
        }

        if (keysToFetch.includes('projects') && !inFlightRequestsRef.current.has('projects')) {
          const projectsPromise = fetchProjects()
            .then((data) => {
              dispatch(setProjects(data));
            })
            .catch((err) => {
              dispatch(
                setProjectsError(err instanceof Error ? err.message : 'Failed to fetch projects')
              );
            })
            .finally(() => {
              inFlightRequestsRef.current.delete('projects');
              dispatch(setProjectsLoading(false));
            });
          inFlightRequestsRef.current.set('projects', projectsPromise);
          newPromises.push(projectsPromise);
        }

        // Wait for both existing and new promises
        await Promise.all([...existingPromises, ...newPromises]);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error refreshing data:', err);
        // Clean up in-flight requests on error
        keysToFetch.forEach((k) => {
          inFlightRequestsRef.current.delete(k);
        });
        // Clear loading states
        if (keysToFetch.includes('clients')) {
          dispatch(setClientsLoading(false));
        }
        if (keysToFetch.includes('estimates')) {
          dispatch(setEstimatesLoading(false));
        }
        if (keysToFetch.includes('projects')) {
          dispatch(setProjectsLoading(false));
        }
      }
    },
    [dispatch, fetchClients, fetchEstimates, fetchProjects]
  );

  // Invalidate cache (clear from localStorage and state)
  const invalidateCache = useCallback(
    (key?: 'clients' | 'estimates' | 'projects') => {
      // Clear from Redux state
      if (key === 'clients') {
        dispatch(setClients([]));
      } else if (key === 'estimates') {
        dispatch(setEstimates([]));
      } else if (key === 'projects') {
        dispatch(setProjects([]));
      } else {
        dispatch(setClients([]));
        dispatch(setEstimates([]));
        dispatch(setProjects([]));
      }
    },
    [dispatch]
  );

  // Get data helper
  const getData = useCallback(
    <T extends 'clients' | 'estimates' | 'projects'>(key: T) => {
      if (key === 'clients') {
        return clients as any;
      }
      if (key === 'estimates') {
        return estimates as any;
      }
      if (key === 'projects') {
        return projects as any;
      }
      throw new Error(`Unknown cache key: ${key}`);
    },
    [clients, estimates, projects]
  );

  // Optimistic update methods - update single items in cache immediately
  const updateEstimate = useCallback(
    (updatedEstimate: Estimate) => {
      dispatch(updateEstimateAction(updatedEstimate));
    },
    [dispatch]
  );

  const updateProject = useCallback(
    (updatedProject: Job) => {
      dispatch(updateProjectAction(updatedProject));
    },
    [dispatch]
  );

  const updateClient = useCallback(
    (updatedClient: ContractorClient) => {
      dispatch(updateClientAction(updatedClient));
    },
    [dispatch]
  );

  // Initial load: check if we have persisted data, then optionally refresh
  useEffect(() => {
    // Prevent multiple initial loads
    if (hasInitialLoadRef.current) {
      return;
    }

    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

    if (!accessToken) {
      return;
    }

    lastAccessTokenRef.current = accessToken;

    // Mark as loaded to prevent duplicate fetches
    hasInitialLoadRef.current = true;

    // Cleanup archived estimates/projects from Redux state
    dispatch(cleanupArchivedEstimates());
    dispatch(cleanupArchivedProjects());

    // Check if we have persisted data in Redux (from redux-persist)
    // If we have data, we can show it immediately and refresh in background
    // If no data, fetch immediately
    const hasPersistedData =
      estimatesRef.current.length > 0 ||
      clientsRef.current.length > 0 ||
      projectsRef.current.length > 0;

    if (hasPersistedData) {
      // We have persisted data, so refresh in background (non-blocking)
      // This allows the UI to show immediately with cached data
      refreshData(undefined).catch((err) => {
        // eslint-disable-next-line no-console
        console.error('Background refresh failed:', err);
      });
    } else {
      // No persisted data, fetch immediately
      refreshData(undefined);
    }
  }, [dispatch, refreshData]);

  // Listen for storage changes (e.g., after login)
  useEffect(() => {
    const handleStorageChange = (event?: StorageEvent) => {
      // Only react to auth token changes to avoid refresh loops across tabs.
      if (event?.key && event.key !== 'access_token' && event.key !== 'refresh_token') {
        return;
      }

      const accessToken = localStorage.getItem('access_token');
      if (accessToken === lastAccessTokenRef.current) {
        return;
      }

      lastAccessTokenRef.current = accessToken;

      if (accessToken) {
        // Cleanup archived estimates/projects
        dispatch(cleanupArchivedEstimates());
        dispatch(cleanupArchivedProjects());

        // Fetch fresh data after login
        refreshData(undefined);
      } else {
        // Clear data if logged out
        dispatch(setClients([]));
        dispatch(setEstimates([]));
        dispatch(setProjects([]));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('localStorageChange', handleStorageChange as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localStorageChange', handleStorageChange as EventListener);
    };
  }, [dispatch, refreshData]);

  const contextValue: DataCacheContextType = {
    clients,
    estimates,
    projects,
    loading: {
      clients: clientsLoading,
      estimates: estimatesLoading,
      projects: projectsLoading,
    },
    errors: {
      clients: clientsError,
      estimates: estimatesError,
      projects: projectsError,
    },
    refreshData,
    invalidateCache,
    getData,
    updateEstimate,
    updateProject,
    updateClient,
  };

  return (
    <DataCacheContext.Provider value={contextValue}>{children}</DataCacheContext.Provider>
  );
}

export function useDataCache() {
  const context = useContext(DataCacheContext);
  if (context === undefined) {
    throw new Error('useDataCache must be used within a DataCacheProvider');
  }
  return context;
}

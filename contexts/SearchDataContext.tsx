'use client';

import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

import { getApiHeaders } from '@/app/utils/apiClient';
import { ContractorClient, Estimate } from '@/components/Global/model';

interface SearchDataContextType {
  clients: ContractorClient[];
  estimates: Estimate[];
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
}

const SearchDataContext = createContext<SearchDataContextType | undefined>(undefined);

export function SearchDataProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<ContractorClient[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const accessToken = localStorage.getItem('access_token');

      if (!accessToken) {
        setClients([]);
        setEstimates([]);
        setLoading(false);
        return;
      }

      // Load clients and estimates in parallel
      const [clientsResponse, estimatesResponse] = await Promise.all([
        fetch('/api/clients', {
          method: 'GET',
          headers: getApiHeaders(),
        }),
        fetch('/api/estimates', {
          method: 'GET',
          headers: getApiHeaders(),
        }),
      ]);

      if (!clientsResponse.ok || !estimatesResponse.ok) {
        throw new Error('Failed to load search data');
      }

      const clientsData = await clientsResponse.json();
      const estimatesData = await estimatesResponse.json();

      const clientsList = clientsData.Items || clientsData || [];
      const estimatesList = estimatesData.Items || estimatesData || [];

      setClients(Array.isArray(clientsList) ? clientsList : []);
      setEstimates(Array.isArray(estimatesList) ? estimatesList : []);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error loading search data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load search data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial load
    loadData();

    // Refresh data every 5 minutes to keep it relatively fresh
    const refreshInterval = setInterval(() => {
      loadData();
    }, 10 * 60 * 1000); // 10 minutes

    // Also refresh when storage changes (e.g., after login)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'access_token') {
        loadData();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Listen for custom event for same-origin storage changes
    const handleCustomStorageChange = () => {
      loadData();
    };

    window.addEventListener('localStorageChange', handleCustomStorageChange as EventListener);

    return () => {
      clearInterval(refreshInterval);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localStorageChange', handleCustomStorageChange as EventListener);
    };
  }, [loadData]);

  return (
    <SearchDataContext.Provider
      value={{
        clients,
        estimates,
        loading,
        error,
        refreshData: loadData,
      }}
    >
      {children}
    </SearchDataContext.Provider>
  );
}

export function useSearchData() {
  const context = useContext(SearchDataContext);
  if (context === undefined) {
    throw new Error('useSearchData must be used within a SearchDataProvider');
  }
  return context;
}

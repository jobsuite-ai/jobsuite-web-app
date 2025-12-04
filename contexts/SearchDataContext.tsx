'use client';

import { createContext, ReactNode, useContext } from 'react';

import { useDataCache } from './DataCacheContext';

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
  const { clients, estimates, loading, errors, refreshData: refreshCacheData } = useDataCache();

  const refreshData = async () => {
    await refreshCacheData('clients');
    await refreshCacheData('estimates');
  };

  const isLoading = loading.clients || loading.estimates;
  const error = errors.clients || errors.estimates;

  return (
    <SearchDataContext.Provider
      value={{
        clients,
        estimates,
        loading: isLoading,
        error,
        refreshData,
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

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { ContractorClient } from '@/components/Global/model';

interface ClientsState {
  entities: Record<string, ContractorClient>;
  ids: string[];
  lastFetched: number | null;
  loading: boolean;
  error: string | null;
}

const initialState: ClientsState = {
  entities: {},
  ids: [],
  lastFetched: null,
  loading: false,
  error: null,
};

const clientsSlice = createSlice({
  name: 'clients',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setClients: (state, action: PayloadAction<ContractorClient[]>) => {
      const clients = action.payload;
      // Normalize into entities and ids
      state.entities = {};
      state.ids = [];
      clients.forEach((client) => {
        state.entities[client.id] = client;
        state.ids.push(client.id);
      });
      state.lastFetched = Date.now();
      state.loading = false;
      state.error = null;
    },
    addClient: (state, action: PayloadAction<ContractorClient>) => {
      const client = action.payload;
      if (!state.entities[client.id]) {
        state.ids.push(client.id);
      }
      state.entities[client.id] = client;
    },
    updateClient: (state, action: PayloadAction<ContractorClient>) => {
      const client = action.payload;
      if (state.entities[client.id]) {
        state.entities[client.id] = { ...state.entities[client.id], ...client };
      } else {
        state.entities[client.id] = client;
        state.ids.push(client.id);
      }
    },
    removeClient: (state, action: PayloadAction<string>) => {
      const clientId = action.payload;
      if (state.entities[clientId]) {
        state.ids = state.ids.filter((id) => id !== clientId);
        delete state.entities[clientId];
      }
    },
  },
});

export const {
  setLoading,
  setError,
  setClients,
  addClient,
  updateClient,
  removeClient,
} = clientsSlice.actions;

// Selectors
export const selectAllClients = (state: { clients: ClientsState }): ContractorClient[] =>
  state.clients.ids.map((id) => state.clients.entities[id]);

export const selectClientById = (
  state: { clients: ClientsState },
  clientId: string
): ContractorClient | undefined => state.clients.entities[clientId];

export const selectClientsLoading = (state: { clients: ClientsState }): boolean =>
  state.clients.loading;

export const selectClientsError = (state: { clients: ClientsState }): string | null =>
  state.clients.error;

export const selectClientsLastFetched = (state: { clients: ClientsState }): number | null =>
  state.clients.lastFetched;

export default clientsSlice.reducer;

import { configureStore } from '@reduxjs/toolkit';
import { persistReducer, persistStore, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import storageSession from 'redux-persist/lib/storage/session';

import { refreshMiddleware } from './middleware/refreshMiddleware';
import clientsReducer from './slices/clientsSlice';
import estimateDetailsReducer from './slices/estimateDetailsSlice';
import estimatesReducer from './slices/estimatesSlice';
import projectsReducer from './slices/projectsSlice';

// Create persisted reducers - only persist entities, ids, and lastFetched
// (not loading/error states)
const persistedEstimatesReducer = persistReducer(
  {
    key: 'estimates',
    storage,
    // Only persist entities, ids, and lastFetched - not loading/error
    whitelist: ['entities', 'ids', 'lastFetched'],
  },
  estimatesReducer
);

const persistedClientsReducer = persistReducer(
  {
    key: 'clients',
    storage,
    whitelist: ['entities', 'ids', 'lastFetched'],
  },
  clientsReducer
);

const persistedProjectsReducer = persistReducer(
  {
    key: 'projects',
    storage,
    whitelist: ['entities', 'ids', 'lastFetched'],
  },
  projectsReducer
);

// Session-only: speeds up reload in the same tab without growing localStorage
const persistedEstimateDetailsReducer = persistReducer(
  {
    key: 'estimateDetails',
    storage: storageSession,
    whitelist: ['details'],
  },
  estimateDetailsReducer
);

export const store = configureStore({
  reducer: {
    estimates: persistedEstimatesReducer,
    clients: persistedClientsReducer,
    projects: persistedProjectsReducer,
    estimateDetails: persistedEstimateDetailsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore redux-persist action types
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(refreshMiddleware),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

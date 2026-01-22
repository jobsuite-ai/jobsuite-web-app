import { configureStore } from '@reduxjs/toolkit';

import { refreshMiddleware } from './middleware/refreshMiddleware';
import clientsReducer from './slices/clientsSlice';
import estimatesReducer from './slices/estimatesSlice';
import projectsReducer from './slices/projectsSlice';

export const store = configureStore({
  reducer: {
    estimates: estimatesReducer,
    clients: clientsReducer,
    projects: projectsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }).concat(refreshMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

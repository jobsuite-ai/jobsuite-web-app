import { type AnyAction, type ThunkDispatch } from '@reduxjs/toolkit';

import clientsReducer from './slices/clientsSlice';
import estimateDetailsReducer from './slices/estimateDetailsSlice';
import estimatesReducer from './slices/estimatesSlice';
import projectsReducer from './slices/projectsSlice';

// Infer the root state type from the reducer shape
export type RootState = {
  estimates: ReturnType<typeof estimatesReducer>;
  clients: ReturnType<typeof clientsReducer>;
  projects: ReturnType<typeof projectsReducer>;
  estimateDetails: ReturnType<typeof estimateDetailsReducer>;
};

export type AppDispatch = ThunkDispatch<RootState, unknown, AnyAction>;

import { Middleware, type AnyAction } from '@reduxjs/toolkit';

import { RootState } from '../types';

import { setCachedData } from '@/app/utils/dataCache';
import { ContractorClient, Estimate, Job } from '@/components/Global/model';

/**
 * Middleware that persists Redux state to localStorage cache
 * Implements write-through pattern: every state update immediately updates cache
 */
export const cacheMiddleware: Middleware<{}, RootState> = (store) => (next) => (action) => {
  const result = next(action);
  const state = store.getState();

  // Type guard to check if action has a type property
  if (typeof action !== 'object' || action === null || !('type' in action)) {
    return result;
  }

  const typedAction = action as AnyAction;

  // Persist estimates to cache whenever they change
  if (
    typedAction.type.startsWith('estimates/') &&
    (typedAction.type.includes('setEstimates') ||
      typedAction.type.includes('addEstimate') ||
      typedAction.type.includes('updateEstimate') ||
      typedAction.type.includes('enrichEstimate') ||
      typedAction.type.includes('removeEstimate') ||
      typedAction.type.includes('cleanupArchived'))
  ) {
    const estimates = state.estimates.ids.map((id) => state.estimates.entities[id]);
    setCachedData<Estimate>('estimates', estimates);
  }

  // Persist clients to cache whenever they change
  if (
    typedAction.type.startsWith('clients/') &&
    (typedAction.type.includes('setClients') ||
      typedAction.type.includes('addClient') ||
      typedAction.type.includes('updateClient') ||
      typedAction.type.includes('removeClient'))
  ) {
    const clients = state.clients.ids.map((id) => state.clients.entities[id]);
    setCachedData<ContractorClient>('clients', clients);
  }

  // Persist projects to cache whenever they change
  if (
    typedAction.type.startsWith('projects/') &&
    (typedAction.type.includes('setProjects') ||
      typedAction.type.includes('addProject') ||
      typedAction.type.includes('updateProject') ||
      typedAction.type.includes('removeProject') ||
      typedAction.type.includes('cleanupArchived'))
  ) {
    const projects = state.projects.ids.map((id) => state.projects.entities[id]);
    setCachedData<Job>('projects', projects);
  }

  return result;
};

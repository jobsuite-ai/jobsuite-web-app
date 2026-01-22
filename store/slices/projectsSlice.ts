import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { EstimateStatus, Job } from '@/components/Global/model';

interface ProjectsState {
  entities: Record<string, Job>;
  ids: string[];
  lastFetched: number | null;
  loading: boolean;
  error: string | null;
}

const initialState: ProjectsState = {
  entities: {},
  ids: [],
  lastFetched: null,
  loading: false,
  error: null,
};

const projectsSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setProjects: (state, action: PayloadAction<Job[]>) => {
      const projects = action.payload;
      // Filter out archived, completed, and cancelled projects
      const filteredProjects = projects.filter(
        (proj) =>
          proj.status !== EstimateStatus.ARCHIVED &&
          proj.status !== EstimateStatus.PROJECT_COMPLETED &&
          proj.status !== EstimateStatus.PROJECT_CANCELLED
      );

      // Normalize into entities and ids
      state.entities = {};
      state.ids = [];
      filteredProjects.forEach((project) => {
        state.entities[project.id] = project;
        state.ids.push(project.id);
      });
      state.lastFetched = Date.now();
      state.loading = false;
      state.error = null;
    },
    addProject: (state, action: PayloadAction<Job>) => {
      const project = action.payload;
      // Only add if not archived, completed, or cancelled
      if (
        project.status !== EstimateStatus.ARCHIVED &&
        project.status !== EstimateStatus.PROJECT_COMPLETED &&
        project.status !== EstimateStatus.PROJECT_CANCELLED
      ) {
        if (!state.entities[project.id]) {
          state.ids.push(project.id);
        }
        state.entities[project.id] = project;
      } else if (state.entities[project.id]) {
        // Remove if it exists and is now archived/completed/cancelled
        state.ids = state.ids.filter((id) => id !== project.id);
        delete state.entities[project.id];
      }
    },
    updateProject: (state, action: PayloadAction<Job>) => {
      const project = action.payload;
      const existingProject = state.entities[project.id];

      // If project is archived/completed/cancelled, remove it
      if (
        project.status === EstimateStatus.ARCHIVED ||
        project.status === EstimateStatus.PROJECT_COMPLETED ||
        project.status === EstimateStatus.PROJECT_CANCELLED
      ) {
        if (existingProject) {
          state.ids = state.ids.filter((id) => id !== project.id);
          delete state.entities[project.id];
        }
        return;
      }

      // Update or add project
      if (existingProject) {
        state.entities[project.id] = { ...existingProject, ...project };
      } else {
        state.entities[project.id] = project;
        state.ids.push(project.id);
      }
    },
    removeProject: (state, action: PayloadAction<string>) => {
      const projectId = action.payload;
      if (state.entities[projectId]) {
        state.ids = state.ids.filter((id) => id !== projectId);
        delete state.entities[projectId];
      }
    },
    cleanupArchived: (state) => {
      // Remove any archived, completed, or cancelled projects that might have slipped through
      const idsToRemove: string[] = [];
      state.ids.forEach((id) => {
        const project = state.entities[id];
        if (
          project &&
          (project.status === EstimateStatus.ARCHIVED ||
            project.status === EstimateStatus.PROJECT_COMPLETED ||
            project.status === EstimateStatus.PROJECT_CANCELLED)
        ) {
          idsToRemove.push(id);
        }
      });
      idsToRemove.forEach((id) => {
        state.ids = state.ids.filter((existingId) => existingId !== id);
        delete state.entities[id];
      });
    },
  },
});

export const {
  setLoading,
  setError,
  setProjects,
  addProject,
  updateProject,
  removeProject,
  cleanupArchived,
} = projectsSlice.actions;

// Selectors
export const selectAllProjects = (state: { projects: ProjectsState }): Job[] =>
  state.projects.ids.map((id) => state.projects.entities[id]);

export const selectProjectById = (
    state: { projects: ProjectsState },
    projectId: string
): Job | undefined =>
  state.projects.entities[projectId];

export const selectProjectsLoading = (state: { projects: ProjectsState }): boolean =>
  state.projects.loading;

export const selectProjectsError = (state: { projects: ProjectsState }): string | null =>
  state.projects.error;

export const selectProjectsLastFetched = (state: { projects: ProjectsState }): number | null =>
  state.projects.lastFetched;

export default projectsSlice.reducer;

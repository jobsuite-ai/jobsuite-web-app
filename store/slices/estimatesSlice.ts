import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { Estimate, EstimateStatus } from '@/components/Global/model';

interface EstimatesState {
  entities: Record<string, Estimate>;
  ids: string[];
  lastFetched: number | null;
  loading: boolean;
  error: string | null;
}

const initialState: EstimatesState = {
  entities: {},
  ids: [],
  lastFetched: null,
  loading: false,
  error: null,
};

const estimatesSlice = createSlice({
  name: 'estimates',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setEstimates: (state, action: PayloadAction<Estimate[]>) => {
      const estimates = action.payload;
      // Filter out archived, completed, and cancelled estimates
      const filteredEstimates = estimates.filter(
        (est) =>
          est.status !== EstimateStatus.ARCHIVED &&
          est.status !== EstimateStatus.PROJECT_COMPLETED &&
          est.status !== EstimateStatus.PROJECT_CANCELLED
      );

      // Normalize into entities and ids
      state.entities = {};
      state.ids = [];
      filteredEstimates.forEach((estimate) => {
        state.entities[estimate.id] = estimate;
        state.ids.push(estimate.id);
      });
      state.lastFetched = Date.now();
      state.loading = false;
      state.error = null;
    },
    addEstimate: (state, action: PayloadAction<Estimate>) => {
      const estimate = action.payload;
      // Only add if not archived, completed, or cancelled
      if (
        estimate.status !== EstimateStatus.ARCHIVED &&
        estimate.status !== EstimateStatus.PROJECT_COMPLETED &&
        estimate.status !== EstimateStatus.PROJECT_CANCELLED
      ) {
        if (!state.entities[estimate.id]) {
          state.ids.push(estimate.id);
        }
        state.entities[estimate.id] = estimate;
      } else if (state.entities[estimate.id]) {
        // Remove if it exists and is now archived/completed/cancelled
        state.ids = state.ids.filter((id) => id !== estimate.id);
        delete state.entities[estimate.id];
      }
    },
    updateEstimate: (state, action: PayloadAction<Estimate>) => {
      const estimate = action.payload;
      const existingEstimate = state.entities[estimate.id];

      // If estimate is archived/completed/cancelled, remove it
      if (
        estimate.status === EstimateStatus.ARCHIVED ||
        estimate.status === EstimateStatus.PROJECT_COMPLETED ||
        estimate.status === EstimateStatus.PROJECT_CANCELLED
      ) {
        if (existingEstimate) {
          state.ids = state.ids.filter((id) => id !== estimate.id);
          delete state.entities[estimate.id];
        }
        return;
      }

      // Update or add estimate
      if (existingEstimate) {
        state.entities[estimate.id] = { ...existingEstimate, ...estimate };
      } else {
        state.entities[estimate.id] = estimate;
        state.ids.push(estimate.id);
      }
    },
    enrichEstimate: (
      state,
      action: PayloadAction<{
        estimateId: string;
        data: Partial<Estimate> & {
          hours_worked?: number;
          has_video?: boolean;
          has_images?: boolean;
          has_files?: boolean;
          has_description?: boolean;
          has_spanish_transcription?: boolean;
          line_items_count?: number;
        };
      }>
    ) => {
      const { estimateId, data } = action.payload;
      if (state.entities[estimateId]) {
        state.entities[estimateId] = {
          ...state.entities[estimateId],
          ...data,
        };
      }
    },
    removeEstimate: (state, action: PayloadAction<string>) => {
      const estimateId = action.payload;
      if (state.entities[estimateId]) {
        state.ids = state.ids.filter((id) => id !== estimateId);
        delete state.entities[estimateId];
      }
    },
    cleanupArchived: (state) => {
      // Remove any archived, completed, or cancelled estimates that might have slipped through
      const idsToRemove: string[] = [];
      state.ids.forEach((id) => {
        const estimate = state.entities[id];
        if (
          estimate &&
          (estimate.status === EstimateStatus.ARCHIVED ||
            estimate.status === EstimateStatus.PROJECT_COMPLETED ||
            estimate.status === EstimateStatus.PROJECT_CANCELLED)
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
  setEstimates,
  addEstimate,
  updateEstimate,
  enrichEstimate,
  removeEstimate,
  cleanupArchived,
} = estimatesSlice.actions;

// Selectors
export const selectAllEstimates = (state: { estimates: EstimatesState }): Estimate[] =>
  state.estimates.ids.map((id) => state.estimates.entities[id]);

export const selectEstimateById = (
  state: { estimates: EstimatesState },
  estimateId: string
): Estimate | undefined => state.estimates.entities[estimateId];

export const selectEstimatesLoading = (state: { estimates: EstimatesState }): boolean =>
  state.estimates.loading;

export const selectEstimatesError = (state: { estimates: EstimatesState }): string | null =>
  state.estimates.error;

export const selectEstimatesLastFetched = (
  state: { estimates: EstimatesState }
): number | null => state.estimates.lastFetched;

export default estimatesSlice.reducer;

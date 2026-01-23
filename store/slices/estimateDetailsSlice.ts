import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { EstimateLineItem } from '@/components/EstimateDetails/estimate/LineItem';
import { Estimate, EstimateResource } from '@/components/Global/model';

export type EstimateSignature = {
  signature_type: string;
  signature_data?: string;
  signer_name?: string;
  signer_email?: string;
  signed_at?: string;
  is_valid?: boolean;
};

export type EstimateComment = {
  id: string;
  estimate_id: string;
  comment: string;
  created_by: string;
  created_at: string;
  updated_at?: string;
  [key: string]: any;
};

export type TimeEntry = {
  id: string;
  estimate_id: string;
  employee_name?: string;
  hours: number;
  date: string;
  [key: string]: any;
};

interface EstimateDetailsState {
  // Map of estimate ID to its details
  details: Record<
    string,
    {
      lineItems: EstimateLineItem[];
      comments: EstimateComment[];
      changeOrders: Estimate[];
      timeEntries: TimeEntry[];
      resources: EstimateResource[];
      signatures: EstimateSignature[];
      lastFetched: number | null;
    }
  >;
}

const initialState: EstimateDetailsState = {
  details: {},
};

const estimateDetailsSlice = createSlice({
  name: 'estimateDetails',
  initialState,
  reducers: {
    setEstimateDetails: (
      state,
      action: PayloadAction<{
        estimateId: string;
        lineItems?: EstimateLineItem[];
        comments?: EstimateComment[];
        changeOrders?: Estimate[];
        timeEntries?: TimeEntry[];
        resources?: EstimateResource[];
        signatures?: EstimateSignature[];
      }>
    ) => {
      const { estimateId, ...data } = action.payload;
      const existing = state.details[estimateId] || {
        lineItems: [],
        comments: [],
        changeOrders: [],
        timeEntries: [],
        resources: [],
        signatures: [],
        lastFetched: null,
      };

      state.details[estimateId] = {
        ...existing,
        ...(data.lineItems !== undefined && { lineItems: data.lineItems }),
        ...(data.comments !== undefined && { comments: data.comments }),
        ...(data.changeOrders !== undefined && { changeOrders: data.changeOrders }),
        ...(data.timeEntries !== undefined && { timeEntries: data.timeEntries }),
        ...(data.resources !== undefined && { resources: data.resources }),
        ...(data.signatures !== undefined && { signatures: data.signatures }),
        lastFetched: Date.now(),
      };
    },
    updateLineItems: (
      state,
      action: PayloadAction<{
        estimateId: string;
        lineItems: EstimateLineItem[];
      }>
    ) => {
      const { estimateId, lineItems } = action.payload;
      if (state.details[estimateId]) {
        state.details[estimateId].lineItems = lineItems;
        state.details[estimateId].lastFetched = Date.now();
      }
    },
    addLineItem: (
      state,
      action: PayloadAction<{
        estimateId: string;
        lineItem: EstimateLineItem;
      }>
    ) => {
      const { estimateId, lineItem } = action.payload;
      if (state.details[estimateId]) {
        state.details[estimateId].lineItems.push(lineItem);
        state.details[estimateId].lastFetched = Date.now();
      }
    },
    updateLineItem: (
      state,
      action: PayloadAction<{
        estimateId: string;
        lineItemId: string;
        updates: Partial<EstimateLineItem>;
      }>
    ) => {
      const { estimateId, lineItemId, updates } = action.payload;
      if (state.details[estimateId]) {
        const index = state.details[estimateId].lineItems.findIndex((li) => li.id === lineItemId);
        if (index !== -1) {
          state.details[estimateId].lineItems[index] = {
            ...state.details[estimateId].lineItems[index],
            ...updates,
          };
          state.details[estimateId].lastFetched = Date.now();
        }
      }
    },
    removeLineItem: (
      state,
      action: PayloadAction<{
        estimateId: string;
        lineItemId: string;
      }>
    ) => {
      const { estimateId, lineItemId } = action.payload;
      if (state.details[estimateId]) {
        state.details[estimateId].lineItems = state.details[estimateId].lineItems.filter(
          (li) => li.id !== lineItemId
        );
        state.details[estimateId].lastFetched = Date.now();
      }
    },
    updateComments: (
      state,
      action: PayloadAction<{
        estimateId: string;
        comments: EstimateComment[];
      }>
    ) => {
      const { estimateId, comments } = action.payload;
      if (state.details[estimateId]) {
        state.details[estimateId].comments = comments;
        state.details[estimateId].lastFetched = Date.now();
      }
    },
    addComment: (
      state,
      action: PayloadAction<{
        estimateId: string;
        comment: EstimateComment;
      }>
    ) => {
      const { estimateId, comment } = action.payload;
      if (state.details[estimateId]) {
        state.details[estimateId].comments.push(comment);
        state.details[estimateId].lastFetched = Date.now();
      }
    },
    updateResources: (
      state,
      action: PayloadAction<{
        estimateId: string;
        resources: EstimateResource[];
      }>
    ) => {
      const { estimateId, resources } = action.payload;
      if (state.details[estimateId]) {
        state.details[estimateId].resources = resources;
        state.details[estimateId].lastFetched = Date.now();
      }
    },
    addResource: (
      state,
      action: PayloadAction<{
        estimateId: string;
        resource: EstimateResource;
      }>
    ) => {
      const { estimateId, resource } = action.payload;
      if (state.details[estimateId]) {
        state.details[estimateId].resources.push(resource);
        state.details[estimateId].lastFetched = Date.now();
      }
    },
    updateResource: (
      state,
      action: PayloadAction<{
        estimateId: string;
        resourceId: string;
        updates: Partial<EstimateResource>;
      }>
    ) => {
      const { estimateId, resourceId, updates } = action.payload;
      if (state.details[estimateId]) {
        const index = state.details[estimateId].resources.findIndex((r) => r.id === resourceId);
        if (index !== -1) {
          state.details[estimateId].resources[index] = {
            ...state.details[estimateId].resources[index],
            ...updates,
          };
          state.details[estimateId].lastFetched = Date.now();
        }
      }
    },
    removeResource: (
      state,
      action: PayloadAction<{
        estimateId: string;
        resourceId: string;
      }>
    ) => {
      const { estimateId, resourceId } = action.payload;
      if (state.details[estimateId]) {
        state.details[estimateId].resources = state.details[estimateId].resources.filter(
          (r) => r.id !== resourceId
        );
        state.details[estimateId].lastFetched = Date.now();
      }
    },
    updateChangeOrders: (
      state,
      action: PayloadAction<{
        estimateId: string;
        changeOrders: Estimate[];
      }>
    ) => {
      const { estimateId, changeOrders } = action.payload;
      if (state.details[estimateId]) {
        state.details[estimateId].changeOrders = changeOrders;
        state.details[estimateId].lastFetched = Date.now();
      }
    },
    updateTimeEntries: (
      state,
      action: PayloadAction<{
        estimateId: string;
        timeEntries: TimeEntry[];
      }>
    ) => {
      const { estimateId, timeEntries } = action.payload;
      if (state.details[estimateId]) {
        state.details[estimateId].timeEntries = timeEntries;
        state.details[estimateId].lastFetched = Date.now();
      }
    },
    updateSignatures: (
      state,
      action: PayloadAction<{
        estimateId: string;
        signatures: EstimateSignature[];
      }>
    ) => {
      const { estimateId, signatures } = action.payload;
      if (state.details[estimateId]) {
        state.details[estimateId].signatures = signatures;
        state.details[estimateId].lastFetched = Date.now();
      }
    },
    clearEstimateDetails: (state, action: PayloadAction<string>) => {
      delete state.details[action.payload];
    },
  },
});

export const {
  setEstimateDetails,
  updateLineItems,
  addLineItem,
  updateLineItem,
  removeLineItem,
  updateComments,
  addComment,
  updateResources,
  addResource,
  updateResource,
  removeResource,
  updateChangeOrders,
  updateTimeEntries,
  updateSignatures,
  clearEstimateDetails,
} = estimateDetailsSlice.actions;

// Selectors
export const selectEstimateDetails = (
  state: { estimateDetails: EstimateDetailsState },
  estimateId: string
) => state.estimateDetails.details[estimateId];

export const selectLineItems = (
  state: { estimateDetails: EstimateDetailsState },
  estimateId: string
): EstimateLineItem[] => state.estimateDetails.details[estimateId]?.lineItems || [];

export const selectComments = (
  state: { estimateDetails: EstimateDetailsState },
  estimateId: string
): EstimateComment[] => state.estimateDetails.details[estimateId]?.comments || [];

export const selectChangeOrders = (
  state: { estimateDetails: EstimateDetailsState },
  estimateId: string
): Estimate[] => state.estimateDetails.details[estimateId]?.changeOrders || [];

export const selectTimeEntries = (
  state: { estimateDetails: EstimateDetailsState },
  estimateId: string
): TimeEntry[] => state.estimateDetails.details[estimateId]?.timeEntries || [];

export const selectResources = (
  state: { estimateDetails: EstimateDetailsState },
  estimateId: string
): EstimateResource[] => state.estimateDetails.details[estimateId]?.resources || [];

export const selectSignatures = (
  state: { estimateDetails: EstimateDetailsState },
  estimateId: string
): EstimateSignature[] => state.estimateDetails.details[estimateId]?.signatures || [];

export const selectDetailsLastFetched = (
  state: { estimateDetails: EstimateDetailsState },
  estimateId: string
): number | null => state.estimateDetails.details[estimateId]?.lastFetched || null;

export default estimateDetailsSlice.reducer;

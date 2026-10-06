import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type ViewMode = "table" | "grid";

export interface UiState {
  viewMode: ViewMode;
  isFilterDrawerOpen: boolean;
}

const initialState: UiState = {
  viewMode: "table",
  isFilterDrawerOpen: false,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    viewModeChanged(state, action: PayloadAction<ViewMode>) {
      state.viewMode = action.payload;
    },
    filterDrawerOpened(state) {
      state.isFilterDrawerOpen = true;
    },
    filterDrawerClosed(state) {
      state.isFilterDrawerOpen = false;
    },
  },
  selectors: {
    selectViewMode: (state) => state.viewMode,
    selectIsFilterDrawerOpen: (state) => state.isFilterDrawerOpen,
  },
});

export const { viewModeChanged, filterDrawerOpened, filterDrawerClosed } = uiSlice.actions;
export const { selectViewMode, selectIsFilterDrawerOpen } = uiSlice.selectors;
export default uiSlice;

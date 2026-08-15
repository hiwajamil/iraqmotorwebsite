import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { ConditionFilter } from "@/lib/home-data";

type FiltersState = {
  brandId: string | null;
  city: string | null;
  condition: ConditionFilter;
  q: string;
};

const initialState: FiltersState = {
  brandId: null,
  city: null,
  condition: "all",
  q: "",
};

const filtersSlice = createSlice({
  name: "filters",
  initialState,
  reducers: {
    setBrandId(state, action: PayloadAction<string | null>) {
      state.brandId = action.payload;
    },
    setCity(state, action: PayloadAction<string | null>) {
      state.city = action.payload;
    },
    setCondition(state, action: PayloadAction<ConditionFilter>) {
      state.condition = action.payload;
    },
    setQuery(state, action: PayloadAction<string>) {
      state.q = action.payload;
    },
    resetFilters() {
      return initialState;
    },
  },
});

export const { setBrandId, setCity, setCondition, setQuery, resetFilters } =
  filtersSlice.actions;
export default filtersSlice.reducer;

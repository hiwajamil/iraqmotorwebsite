import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import preferencesReducer from "./slices/preferencesSlice";
import filtersReducer from "./slices/filtersSlice";
import favoritesReducer from "./slices/favoritesSlice";

export function makeStore() {
  return configureStore({
    reducer: {
      auth: authReducer,
      preferences: preferencesReducer,
      filters: filtersReducer,
      favorites: favoritesReducer,
    },
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];

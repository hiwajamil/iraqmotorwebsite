import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Locale } from "@/lib/i18n";

export type ThemeMode = "light" | "dark";

type PreferencesState = {
  locale: Locale;
  theme: ThemeMode;
  hydrated: boolean;
};

const initialState: PreferencesState = {
  locale: "en",
  theme: "light",
  hydrated: false,
};

const preferencesSlice = createSlice({
  name: "preferences",
  initialState,
  reducers: {
    hydratePreferences(
      state,
      action: PayloadAction<{ locale: Locale; theme: ThemeMode }>,
    ) {
      state.locale = action.payload.locale;
      state.theme = action.payload.theme;
      state.hydrated = true;
    },
    setLocale(state, action: PayloadAction<Locale>) {
      state.locale = action.payload;
    },
    setTheme(state, action: PayloadAction<ThemeMode>) {
      state.theme = action.payload;
    },
    toggleTheme(state) {
      state.theme = state.theme === "dark" ? "light" : "dark";
    },
  },
});

export const { hydratePreferences, setLocale, setTheme, toggleTheme } =
  preferencesSlice.actions;
export default preferencesSlice.reducer;

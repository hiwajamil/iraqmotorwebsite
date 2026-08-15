import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { api, type Car } from "@/lib/api";
import type { RootState } from "../index";

type FavoritesState = {
  ids: string[];
  items: Car[];
  loading: boolean;
  error: string | null;
};

const initialState: FavoritesState = {
  ids: [],
  items: [],
  loading: false,
  error: null,
};

export const fetchFavorites = createAsyncThunk(
  "favorites/fetch",
  async () => {
    const data = await api.get<{ items: Car[] }>("/cars/favorites");
    return data.items ?? [];
  },
);

export const toggleFavorite = createAsyncThunk(
  "favorites/toggle",
  async (carId: string, { getState }) => {
    const state = getState() as RootState;
    const isFav = state.favorites.ids.includes(carId);
    if (isFav) {
      await api.delete(`/cars/${carId}/favorite`);
      return { carId, favorite: false as const };
    }
    await api.post(`/cars/${carId}/favorite`);
    // Best-effort: try to include car in wishlist items.
    let car: Car | null = null;
    try {
      car = await api.get<Car>(`/cars/${carId}`);
    } catch {
      car = null;
    }
    return { carId, favorite: true as const, car };
  },
);

const favoritesSlice = createSlice({
  name: "favorites",
  initialState,
  reducers: {
    clearFavorites() {
      return initialState;
    },
    setFavoriteIds(state, action: PayloadAction<string[]>) {
      state.ids = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFavorites.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFavorites.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
        state.ids = action.payload.map((c) => c.id);
      })
      .addCase(fetchFavorites.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? "Failed to load favorites";
      })
      .addCase(toggleFavorite.fulfilled, (state, action) => {
        const { carId, favorite, car } = action.payload as {
          carId: string;
          favorite: boolean;
          car?: Car | null;
        };
        if (favorite) {
          if (!state.ids.includes(carId)) state.ids.push(carId);
          if (car && !state.items.some((c) => c.id === carId)) {
            state.items.unshift(car);
          }
        } else {
          state.ids = state.ids.filter((x) => x !== carId);
          state.items = state.items.filter((c) => c.id !== carId);
        }
      });
  },
});

export const { clearFavorites, setFavoriteIds } = favoritesSlice.actions;
export default favoritesSlice.reducer;

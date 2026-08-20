import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { api, type Car } from "@/lib/api";
import type { RootState } from "../index";

type FavoritesState = {
  ids: string[];
  items: Car[];
  total: number;
  loading: boolean;
  error: string | null;
};

const initialState: FavoritesState = {
  ids: [],
  items: [],
  total: 0,
  loading: false,
  error: null,
};

export const fetchFavorites = createAsyncThunk(
  "favorites/fetch",
  async () => {
    const data = await api.get<{ items: Car[]; total?: number }>("/cars/favorites");
    const items = data.items ?? [];
    return {
      items,
      total: data.total ?? items.length,
    };
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
        state.items = action.payload.items;
        state.ids = action.payload.items.map((c) => c.id);
        state.total = action.payload.total;
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
          const wasNew = !state.ids.includes(carId);
          if (wasNew) {
            state.ids.push(carId);
            state.total += 1;
          }
          if (car && !state.items.some((c) => c.id === carId)) {
            state.items.unshift(car);
          }
        } else {
          const wasSaved = state.ids.includes(carId);
          state.ids = state.ids.filter((x) => x !== carId);
          state.items = state.items.filter((c) => c.id !== carId);
          if (wasSaved) state.total = Math.max(0, state.total - 1);
        }
      });
  },
});

export const { clearFavorites, setFavoriteIds } = favoritesSlice.actions;
export default favoritesSlice.reducer;

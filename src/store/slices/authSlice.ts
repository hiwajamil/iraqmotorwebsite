import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {
  getFirebaseAuth,
  signOut as fbSignOut,
  type User,
} from "@/lib/firebase";
import { api } from "@/lib/api";

export type AuthUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
};

export type Me = {
  uid: string;
  email?: string;
  isSuperAdmin?: boolean;
  mfaEnrollmentRequired?: boolean;
  isAllowlistedSuperAdmin?: boolean;
  profile?: Record<string, unknown> | null;
  preferences?: {
    priceAlerts: boolean;
    newMatchAlerts: boolean;
  };
};

type AuthState = {
  user: AuthUser | null;
  me: Me | null;
  loading: boolean;
};

/** Plain serializable snapshot — never put Firebase `User` in Redux. */
export function toAuthUser(
  u: Pick<User, "uid" | "email" | "displayName">,
): AuthUser {
  return {
    uid: String(u.uid),
    email: u.email != null ? String(u.email) : null,
    displayName: u.displayName != null ? String(u.displayName) : null,
  };
}

const initialState: AuthState = {
  user: null,
  me: null,
  loading: true,
};

export const refreshMe = createAsyncThunk(
  "auth/refreshMe",
  async (): Promise<{ user: AuthUser; me: Me }> => {
    const auth = getFirebaseAuth();
    const current = auth?.currentUser;
    if (!current) throw new Error("Not signed in");
    const me = await api.get<Me>("/users/me");
    return { user: toAuthUser(current), me };
  },
);

export const signOut = createAsyncThunk("auth/signOut", async () => {
  try {
    await api.post("/auth/logout");
  } catch {
    // Still clear local session if revoke fails.
  }
  const auth = getFirebaseAuth();
  if (auth) await fbSignOut(auth);
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAuthUser: {
      // Convert in `prepare` so a raw Firebase User never enters the action.
      prepare(user: AuthUser | User | null) {
        return { payload: user ? toAuthUser(user) : null };
      },
      reducer(state, action: PayloadAction<AuthUser | null>) {
        state.user = action.payload;
        if (!action.payload) state.me = null;
      },
    },
    setMe(state, action: PayloadAction<Me | null>) {
      state.me = action.payload;
    },
    setAuthLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(refreshMe.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.me = action.payload.me;
      })
      .addCase(signOut.fulfilled, (state) => {
        state.user = null;
        state.me = null;
      });
  },
});

export const { setAuthUser, setMe, setAuthLoading } = authSlice.actions;
export default authSlice.reducer;

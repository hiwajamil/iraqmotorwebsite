"use client";

import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  refreshMe as refreshMeThunk,
  signOut as signOutThunk,
  type AuthUser,
  type Me,
} from "@/store/slices/authSlice";

export type { AuthUser, Me };

type AuthContextValue = {
  user: AuthUser | null;
  me: Me | null;
  loading: boolean;
  refreshMe: () => Promise<void>;
  signOut: () => Promise<void>;
};

/** Auth hook backed by the Redux store. */
export function useAuth(): AuthContextValue {
  const dispatch = useAppDispatch();
  const { user, me, loading } = useAppSelector((s) => s.auth);

  const refreshMe = useCallback(async () => {
    await dispatch(refreshMeThunk()).unwrap();
  }, [dispatch]);

  const signOut = useCallback(async () => {
    await dispatch(signOutThunk()).unwrap();
  }, [dispatch]);

  return { user, me, loading, refreshMe, signOut };
}

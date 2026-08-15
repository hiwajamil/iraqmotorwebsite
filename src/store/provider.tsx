"use client";

import { useEffect, useState } from "react";
import { Provider } from "react-redux";
import { makeStore } from "./index";
import { getFirebaseAuth, onAuthStateChanged } from "@/lib/firebase";
import { api, setApiTokenGetter } from "@/lib/api";
import {
  setAuthLoading,
  setAuthUser,
  setMe,
  type Me,
} from "./slices/authSlice";
import {
  hydratePreferences,
  type ThemeMode,
} from "./slices/preferencesSlice";
import { clearFavorites } from "./slices/favoritesSlice";
import { isRtl, type Locale } from "@/lib/i18n";
import { useAppDispatch, useAppSelector } from "./hooks";

function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    setApiTokenGetter(async () => {
      const auth = getFirebaseAuth();
      const u = auth?.currentUser;
      if (!u) return null;
      return u.getIdToken();
    });

    const auth = getFirebaseAuth();
    if (!auth) {
      dispatch(setAuthLoading(false));
      return;
    }

    let generation = 0;

    return onAuthStateChanged(auth, async (u) => {
      const gen = ++generation;
      dispatch(setAuthUser(u));
      if (u) {
        try {
          const data = await api.get<Me>("/users/me");
          // Ignore stale responses after sign-out / account switch.
          if (gen !== generation) return;
          dispatch(setMe(data));
        } catch {
          if (gen !== generation) return;
          // Don't invent isSuperAdmin — leave me null so admin gate waits/denies.
          dispatch(setMe(null));
        }
      } else {
        dispatch(setMe(null));
        dispatch(clearFavorites());
      }
      if (gen === generation) {
        dispatch(setAuthLoading(false));
      }
    });
  }, [dispatch]);

  return children;
}

function PreferencesBootstrap({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const { locale, theme, hydrated } = useAppSelector((s) => s.preferences);

  useEffect(() => {
    const savedLocale = localStorage.getItem("iq_locale");
    const localeValue: Locale =
      savedLocale === "en" || savedLocale === "ar" || savedLocale === "ku"
        ? savedLocale
        : "en";
    const savedTheme = localStorage.getItem("iq_theme");
    const themeValue: ThemeMode = savedTheme === "dark" ? "dark" : "light";
    dispatch(hydratePreferences({ locale: localeValue, theme: themeValue }));
  }, [dispatch]);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.lang = locale;
    document.documentElement.dir = isRtl(locale) ? "rtl" : "ltr";
    localStorage.setItem("iq_locale", locale);
  }, [locale, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("iq_theme", theme);
  }, [theme, hydrated]);

  return children;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [store] = useState(() => makeStore());

  return (
    <Provider store={store}>
      <AuthBootstrap>
        <PreferencesBootstrap>{children}</PreferencesBootstrap>
      </AuthBootstrap>
    </Provider>
  );
}

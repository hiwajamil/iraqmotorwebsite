"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/components/auth-provider";
import { api, type DashboardSummary } from "@/lib/api";

type DashboardData = {
  summary: DashboardSummary | null;
  loading: boolean;
  error: string | null;
};

const DashboardDataContext = createContext<DashboardData>({
  summary: null,
  loading: true,
  error: null,
});

export function DashboardDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(Boolean(user));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setSummary(null);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const data = await api.get<DashboardSummary>("/users/me/dashboard");
        if (cancelled) return;
        setSummary(data);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setSummary(null);
        setError(e instanceof Error ? e.message : "dashFailed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <DashboardDataContext.Provider value={{ summary, loading, error }}>
      {children}
    </DashboardDataContext.Provider>
  );
}

export function useDashboardData() {
  return useContext(DashboardDataContext);
}

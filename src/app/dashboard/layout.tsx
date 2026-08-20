"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import {
  DashboardDataProvider,
  useDashboardData,
} from "@/components/dashboard-provider";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { useAppSelector } from "@/store/hooks";
import { t } from "@/lib/i18n";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const locale = useAppSelector((s) => s.preferences.locale);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth?next=/dashboard");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <p className="px-[4%] pt-28 text-center text-muted">
        {t(locale, "loading")}
      </p>
    );
  }

  return (
    <DashboardDataProvider>
      <DashboardChrome>{children}</DashboardChrome>
    </DashboardDataProvider>
  );
}

function DashboardChrome({ children }: { children: React.ReactNode }) {
  const { summary } = useDashboardData();
  return (
    <div className="mx-auto grid w-full max-w-[1400px] gap-6 px-[4%] pb-16 pt-24 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8">
      <DashboardSidebar
        unreadCount={summary?.unreadMessages}
        profile={summary?.profile}
      />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

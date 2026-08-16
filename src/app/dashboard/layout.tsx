"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { api } from "@/lib/api";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth?next=/dashboard");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      try {
        const data = await api.get<{ count: number }>("/messages/unread-count");
        setUnread(data.count ?? 0);
      } catch {
        setUnread(0);
      }
    })();
  }, [user]);

  if (loading || !user) {
    return <p className="px-[4%] pt-28 text-center text-muted">Loading…</p>;
  }

  return (
    <div className="mx-auto grid w-full max-w-[1400px] gap-6 px-[4%] pb-16 pt-24 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8">
      <DashboardSidebar unreadCount={unread} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

"use client";

import { useEffect } from "react";

export function AdminToast({
  message,
  tone = "success",
  onDismiss,
}: {
  message: string | null;
  tone?: "success" | "error";
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(onDismiss, 3500);
    return () => window.clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`fixed bottom-6 end-6 z-[70] max-w-sm rounded-[var(--radius-card)] px-4 py-3 text-sm font-semibold shadow-lg ring-1 ${
        tone === "error"
          ? "bg-red-600 text-white ring-red-500/30"
          : "bg-emerald-600 text-white ring-emerald-500/30"
      }`}
    >
      {message}
    </div>
  );
}

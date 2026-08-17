"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { formatAdminWhen, statusBadgeClass } from "@/lib/admin";
import {
  INTENT_LABEL_KEYS,
  LEAD_STATUSES,
  type LeadIntent,
  type LeadRequest,
  type LeadStatus,
} from "@/lib/leads";
import { t, leadStatusLabel, type Locale } from "@/lib/i18n";
import { useAppSelector } from "@/store/hooks";

function intentLabel(locale: Locale, intent: string): string {
  const key = INTENT_LABEL_KEYS[intent as LeadIntent];
  return key ? t(locale, key) : intent;
}

function leadStatusClass(status?: string): string {
  switch (status) {
    case "new":
      return "bg-sky-500/15 text-sky-700";
    case "contacted":
      return "bg-amber-500/15 text-amber-700";
    case "resolved":
      return "bg-emerald-500/15 text-emerald-700";
    default:
      return statusBadgeClass(status);
  }
}

export default function AdminLeadsPage() {
  const locale = useAppSelector((s) => s.preferences.locale);
  const [items, setItems] = useState<LeadRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<LeadStatus | "all">("new");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void api
      .get<{ items: LeadRequest[]; total: number }>("/admin/leads")
      .then((d) => {
        if (cancelled) return;
        setItems(d.items ?? []);
        setTotal(d.total ?? d.items?.length ?? 0);
        setError(null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : t(locale, "failedToLoadLeads"));
      });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  async function setStatus(id: string, status: LeadStatus) {
    setBusyId(id);
    try {
      const updated = await api.patch<LeadRequest>(`/admin/leads/${id}`, {
        status,
      });
      setItems((list) =>
        list.map((item) => (item.id === id ? { ...item, ...updated } : item)),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : t(locale, "updateFailed"));
    } finally {
      setBusyId(null);
    }
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (filter !== "all" && item.status !== filter) return false;
      if (!q) return true;
      return [
        item.name,
        item.email,
        item.whatsappNumber,
        item.intent,
        intentLabel(locale, item.intent),
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [items, filter, query, locale]);

  const newCount = items.filter((i) => i.status === "new").length;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{t(locale, "adminLeadsTitle")}</h1>
          <p className="mt-1 text-sm text-muted">
            {t(locale, "adminLeadsSubtitle")}
            {total ? ` · ${total}` : ""}
            {newCount ? ` · ${newCount} ${t(locale, "leadStatusNew")}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setReload((n) => n + 1)}
          className="rounded-[var(--radius-control)] bg-input px-3 py-2 text-xs font-semibold"
        >
          {t(locale, "refresh")}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {(["new", "contacted", "resolved", "all"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
              filter === key
                ? "bg-primary text-on-primary"
                : "bg-input text-muted"
            }`}
          >
            {key === "all"
              ? t(locale, "all")
              : leadStatusLabel(locale, key)}
          </button>
        ))}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t(locale, "leadsSearchPlaceholder")}
          className="ms-auto w-full max-w-xs rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm sm:w-auto"
        />
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <div className="mt-6 overflow-x-auto rounded-[var(--radius-card)] bg-card ring-1 ring-outline">
        {visible.length === 0 ? (
          <div className="p-8 text-center">
            <p className="font-semibold">
              {items.length === 0
                ? t(locale, "leadsEmptyTitle")
                : t(locale, "noMatches")}
            </p>
            <p className="mt-1 text-sm text-muted">
              {items.length === 0
                ? t(locale, "leadsEmptyHint")
                : t(locale, "tryDifferentFilter")}
            </p>
          </div>
        ) : (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-outline text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">
                  {t(locale, "colName")}
                </th>
                <th className="px-4 py-3 font-semibold">
                  {t(locale, "colContact")}
                </th>
                <th className="px-4 py-3 font-semibold">
                  {t(locale, "colLookingTo")}
                </th>
                <th className="px-4 py-3 font-semibold">
                  {t(locale, "colStatus")}
                </th>
                <th className="px-4 py-3 font-semibold">
                  {t(locale, "colSubmitted")}
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-outline/70 last:border-0"
                >
                  <td className="px-4 py-3 font-medium">{item.name}</td>
                  <td className="px-4 py-3">
                    <a
                      href={`mailto:${item.email}`}
                      className="block text-primary hover:underline"
                    >
                      {item.email}
                    </a>
                    <a
                      href={`https://wa.me/${item.whatsappNumber.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-0.5 block text-xs text-muted hover:text-foreground"
                      dir="ltr"
                    >
                      {item.whatsappNumber}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    {intentLabel(locale, item.intent)}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={item.status}
                      disabled={busyId === item.id}
                      onChange={(e) =>
                        void setStatus(item.id, e.target.value as LeadStatus)
                      }
                      className={`rounded-full px-2 py-1 text-xs font-semibold capitalize outline-none ${leadStatusClass(item.status)}`}
                    >
                      {LEAD_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {leadStatusLabel(locale, status)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted">
                    {formatAdminWhen(item.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

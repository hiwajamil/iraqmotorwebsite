"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { formatAdminWhen, statusBadgeClass } from "@/lib/admin";
import {
  LEAD_STATUSES,
  type LeadIntent,
  type LeadRequest,
  type LeadStatus,
} from "@/lib/leads";

const INTENT_FALLBACK: Record<LeadIntent, string> = {
  buy_car: "Buy a car",
  sell_car: "Sell a car",
  finance: "Get financing",
  valuation: "Get a valuation",
  showroom: "Find a showroom",
  other: "Something else",
};

function intentLabel(intent: string): string {
  if (intent in INTENT_FALLBACK) {
    return INTENT_FALLBACK[intent as LeadIntent];
  }
  return intent;
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
        setError(e instanceof Error ? e.message : "Failed to load leads");
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
      setError(e instanceof Error ? e.message : "Update failed");
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
        intentLabel(item.intent),
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [items, filter, query]);

  const newCount = items.filter((i) => i.status === "new").length;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Lead requests</h1>
          <p className="mt-1 text-sm text-muted">
            Help-widget submissions from the website
            {total ? ` · ${total} total` : ""}
            {newCount ? ` · ${newCount} new` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setReload((n) => n + 1)}
          className="rounded-[var(--radius-control)] bg-input px-3 py-2 text-xs font-semibold"
        >
          Refresh
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
            {key}
          </button>
        ))}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, email, WhatsApp…"
          className="ms-auto w-full max-w-xs rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm sm:w-auto"
        />
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <div className="mt-6 overflow-x-auto rounded-[var(--radius-card)] bg-card ring-1 ring-outline">
        {visible.length === 0 ? (
          <div className="p-8 text-center">
            <p className="font-semibold">
              {items.length === 0 ? "No lead requests yet" : "No matches"}
            </p>
            <p className="mt-1 text-sm text-muted">
              {items.length === 0
                ? "Submissions from the help widget will show up here."
                : "Try a different filter or search."}
            </p>
          </div>
        ) : (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-outline text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Contact</th>
                <th className="px-4 py-3 font-semibold">Looking to</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Submitted</th>
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
                  <td className="px-4 py-3">{intentLabel(item.intent)}</td>
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
                          {status}
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

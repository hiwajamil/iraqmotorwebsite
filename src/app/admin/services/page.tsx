"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { formatAdminWhen, statusBadgeClass } from "@/lib/admin";
import {
  SERVICE_STATUSES,
  serviceCategoryTitle,
  serviceCityLabel,
  serviceStatusLabel,
  type ServiceStatus,
  type UserService,
} from "@/lib/car-services";
import { t } from "@/lib/i18n";
import { useAppSelector } from "@/store/hooks";

function serviceStatusClass(status?: string): string {
  switch (status) {
    case "approved":
      return "bg-emerald-500/15 text-emerald-700";
    case "pending":
      return "bg-amber-500/15 text-amber-700";
    case "rejected":
      return "bg-red-500/15 text-red-700";
    default:
      return statusBadgeClass(status);
  }
}

export default function AdminServicesPage() {
  const locale = useAppSelector((s) => s.preferences.locale);
  const [items, setItems] = useState<UserService[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ServiceStatus | "all">("pending");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void api
      .get<{ items: UserService[]; total: number }>("/admin/services")
      .then((d) => {
        if (cancelled) return;
        setItems(d.items ?? []);
        setTotal(d.total ?? d.items?.length ?? 0);
        setError(null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(
          e instanceof Error ? e.message : t(locale, "servicesLoadFailed"),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [reload, locale]);

  async function setStatus(id: string, status: ServiceStatus) {
    setBusyId(id);
    try {
      const updated = await api.patch<UserService>(`/admin/services/${id}`, {
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
        item.title,
        item.description,
        item.city,
        item.phone,
        item.categoryTitle,
        item.categorySlug,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [items, filter, query]);

  const pendingCount = items.filter((i) => i.status === "pending").length;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{t(locale, "adminServicesTitle")}</h1>
          <p className="mt-1 text-sm text-muted">
            {t(locale, "adminServicesSubtitle")}
            {total ? ` · ${total}` : ""}
            {pendingCount
              ? ` · ${pendingCount} ${t(locale, "servicesStatusPending")}`
              : ""}
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
        {(["pending", "approved", "rejected", "all"] as const).map((key) => (
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
              : serviceStatusLabel(locale, key)}
          </button>
        ))}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t(locale, "servicesSearch")}
          className="ms-auto w-full max-w-xs rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm sm:w-auto"
        />
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <div className="mt-6 overflow-x-auto rounded-[var(--radius-card)] bg-card ring-1 ring-outline">
        {visible.length === 0 ? (
          <div className="p-8 text-center">
            <p className="font-semibold">
              {items.length === 0
                ? t(locale, "adminServicesEmptyTitle")
                : t(locale, "noMatches")}
            </p>
            <p className="mt-1 text-sm text-muted">
              {items.length === 0
                ? t(locale, "adminServicesEmptyHint")
                : t(locale, "tryDifferentFilter")}
            </p>
          </div>
        ) : (
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-outline text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">
                  {t(locale, "servicesTitle")}
                </th>
                <th className="px-4 py-3 font-semibold">
                  {t(locale, "servicesCategory")}
                </th>
                <th className="px-4 py-3 font-semibold">
                  {t(locale, "colCity")}
                </th>
                <th className="px-4 py-3 font-semibold">
                  {t(locale, "colPhone")}
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
                  <td className="px-4 py-3">
                    <p className="font-medium">{item.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted">
                      {item.description}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {item.categoryTitle
                      ? serviceCategoryTitle(locale, {
                          slug: item.categorySlug || "",
                          title: item.categoryTitle,
                        })
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {serviceCityLabel(locale, item.city)}
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`tel:${item.phone}`}
                      className="text-primary hover:underline"
                      dir="ltr"
                    >
                      {item.phone}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={item.status}
                      disabled={busyId === item.id}
                      onChange={(e) =>
                        void setStatus(item.id, e.target.value as ServiceStatus)
                      }
                      className={`rounded-full px-2 py-1 text-xs font-semibold outline-none ${serviceStatusClass(item.status)}`}
                    >
                      {SERVICE_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {serviceStatusLabel(locale, status)}
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

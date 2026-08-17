"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { groupByCity, type AdminUser } from "@/lib/admin";
import { t } from "@/lib/i18n";
import { useAppSelector } from "@/store/hooks";

export default function AdminShowroomsPage() {
  const locale = useAppSelector((s) => s.preferences.locale);
  const [items, setItems] = useState<AdminUser[]>([]);
  const [city, setCity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "cities">("list");
  const [cityFilter, setCityFilter] = useState<string | null>(null);

  async function load(nextCity = city) {
    try {
      const d = await api.get<{ items: AdminUser[] }>(
        "/admin/showrooms",
        nextCity.trim() ? { city: nextCity.trim() } : undefined,
      );
      setItems(d.items ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t(locale, "failedGeneric"));
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleBan(u: AdminUser) {
    const next = !u.banned;
    if (
      !window.confirm(
        t(locale, next ? "confirmBanShowroom" : "confirmUnbanShowroom", {
          name: u.showroomName || u.displayName || u.uid,
        }),
      )
    ) {
      return;
    }
    setBusyId(u.uid);
    try {
      const updated = await api.patch<AdminUser>(`/admin/users/${u.uid}`, {
        banned: next,
      });
      setItems((list) =>
        list.map((row) =>
          row.uid === u.uid
            ? { ...row, banned: updated.banned ?? next }
            : row,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : t(locale, "banFailed"));
    } finally {
      setBusyId(null);
    }
  }

  async function demote(u: AdminUser) {
    if (
      !window.confirm(
        t(locale, "confirmDemoteShowroom", {
          name: u.showroomName || u.displayName || u.uid,
        }),
      )
    ) {
      return;
    }
    setBusyId(u.uid);
    try {
      await api.patch(`/admin/users/${u.uid}`, { accountType: "individual" });
      setItems((list) => list.filter((row) => row.uid !== u.uid));
    } catch (e) {
      setError(e instanceof Error ? e.message : t(locale, "demoteFailed"));
    } finally {
      setBusyId(null);
    }
  }

  const cities = useMemo(() => groupByCity(items), [items]);
  const visible = useMemo(() => {
    if (!cityFilter) return items;
    return items.filter(
      (u) => String(u.city || "Unknown").trim() === cityFilter,
    );
  }, [items, cityFilter]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{t(locale, "adminShowroomsTitle")}</h1>
          <p className="mt-1 text-sm text-muted">
            {t(locale, "adminShowroomsSubtitle", { count: items.length })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setView(view === "list" ? "cities" : "list")}
            className="rounded-[var(--radius-control)] bg-input px-3 py-2 text-xs font-semibold"
          >
            {view === "list" ? t(locale, "viewByCity") : t(locale, "viewList")}
          </button>
          <Link
            href="/showrooms"
            className="rounded-[var(--radius-control)] bg-input px-3 py-2 text-xs font-semibold text-primary"
          >
            {t(locale, "publicDirectoryLink")}
          </Link>
        </div>
      </div>

      <form
        className="mt-4 flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
      >
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder={t(locale, "filterByCityServer")}
          className="w-full max-w-sm rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-[var(--radius-control)] bg-primary px-4 py-2 text-xs font-semibold text-on-primary"
        >
          {t(locale, "filter")}
        </button>
        {cityFilter ? (
          <button
            type="button"
            onClick={() => setCityFilter(null)}
            className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
          >
            {t(locale, "cityFilterChip", {
              name:
                cityFilter === "Unknown"
                  ? t(locale, "unknownCity")
                  : cityFilter,
            })}
          </button>
        ) : null}
      </form>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      {view === "cities" ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {cities.length === 0 ? (
            <div className="rounded-[var(--radius-card)] bg-card p-8 text-center ring-1 ring-outline sm:col-span-2 lg:col-span-3">
              <p className="font-semibold">{t(locale, "showroomsEmptyTitle")}</p>
              <p className="mt-1 text-sm text-muted">
                {t(locale, "usersEmptyHint")}
              </p>
            </div>
          ) : (
            cities.map((group) => (
              <button
                key={group.city}
                type="button"
                onClick={() => {
                  setCityFilter(group.city);
                  setView("list");
                }}
                className="rounded-[var(--radius-card)] bg-card p-4 text-left ring-1 ring-outline transition hover:ring-primary"
              >
                <p className="font-semibold">
                  {group.city === "Unknown"
                    ? t(locale, "unknownCity")
                    : group.city}
                </p>
                <p className="mt-2 text-2xl font-bold">{group.items.length}</p>
                <p className="text-xs text-muted">
                  {t(locale, "showroomsCountLabel")}
                </p>
              </button>
            ))
          )}
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {visible.length === 0 ? (
            <div className="rounded-[var(--radius-card)] bg-card p-8 text-center ring-1 ring-outline">
              <p className="font-semibold">{t(locale, "showroomsEmptyTitle")}</p>
              <p className="mt-1 text-sm text-muted">
                {city.trim()
                  ? t(locale, "showroomsNoMatch", { city: city.trim() })
                  : t(locale, "showroomsDefaultEmptyHint")}
              </p>
            </div>
          ) : (
            visible.map((u) => (
              <div
                key={u.uid}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] bg-card p-4 ring-1 ring-outline"
              >
                <div>
                  <p className="font-semibold">
                    {u.showroomName ||
                      u.displayName ||
                      t(locale, "showroomDefaultName")}
                  </p>
                  <p className="text-xs text-muted">
                    {[u.ownerName, u.phone, u.city].filter(Boolean).join(" · ") ||
                      u.uid}
                  </p>
                  {u.banned ? (
                    <p className="mt-1 text-xs font-semibold text-red-600">
                      {t(locale, "statusBanned")}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/admin/listings?sellerId=${encodeURIComponent(u.uid)}`}
                    className="rounded-[var(--radius-control)] bg-input px-3 py-2 text-xs font-semibold"
                  >
                    {t(locale, "listingsLink")}
                  </Link>
                  <button
                    type="button"
                    disabled={busyId === u.uid}
                    className="rounded-[var(--radius-control)] bg-input px-3 py-2 text-xs font-semibold disabled:opacity-50"
                    onClick={() => void demote(u)}
                  >
                    {t(locale, "demote")}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === u.uid}
                    className="rounded-[var(--radius-control)] bg-primary px-3 py-2 text-xs font-semibold text-on-primary disabled:opacity-50"
                    onClick={() => void toggleBan(u)}
                  >
                    {u.banned ? t(locale, "unban") : t(locale, "ban")}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

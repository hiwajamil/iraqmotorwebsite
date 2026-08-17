"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { groupByCity, type AdminUser } from "@/lib/admin";
import { t, accountTypeLabel } from "@/lib/i18n";
import { useAppSelector } from "@/store/hooks";

export default function AdminUsersPage() {
  const locale = useAppSelector((s) => s.preferences.locale);
  const [items, setItems] = useState<AdminUser[]>([]);
  const [city, setCity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editCity, setEditCity] = useState("");
  const [editType, setEditType] = useState<"individual" | "showroom">(
    "individual",
  );
  const [view, setView] = useState<"list" | "cities">("list");
  const [cityFilter, setCityFilter] = useState<string | null>(null);

  async function load(nextCity = city) {
    try {
      const d = await api.get<{ items: AdminUser[] }>(
        "/admin/users",
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
        t(locale, next ? "confirmBan" : "confirmUnban", {
          name: u.displayName || u.showroomName || u.uid,
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

  function startEdit(u: AdminUser) {
    setEditing(u.uid);
    setEditCity(u.city || "");
    setEditType(u.accountType === "showroom" ? "showroom" : "individual");
  }

  async function saveEdit(uid: string) {
    setBusyId(uid);
    try {
      const updated = await api.patch<AdminUser>(`/admin/users/${uid}`, {
        city: editCity.trim() || undefined,
        accountType: editType,
      });
      setItems((list) =>
        list.map((row) =>
          row.uid === uid
            ? {
                ...row,
                city: updated.city ?? editCity,
                accountType: updated.accountType ?? editType,
              }
            : row,
        ),
      );
      setEditing(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t(locale, "updateFailed"));
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
          <h1 className="text-3xl font-bold">{t(locale, "adminUsersTitle")}</h1>
          <p className="mt-1 text-sm text-muted">
            {t(locale, "adminUsersSubtitle", { count: items.length })}
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
            href="/admin/showrooms"
            className="rounded-[var(--radius-control)] bg-input px-3 py-2 text-xs font-semibold text-primary"
          >
            {t(locale, "showrooms")}
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
              <p className="font-semibold">{t(locale, "usersEmptyTitle")}</p>
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
                <p className="text-xs text-muted">{t(locale, "usersCountLabel")}</p>
              </button>
            ))
          )}
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-[var(--radius-card)] ring-1 ring-outline">
          <table className="w-full text-left text-sm">
            <thead className="bg-input text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3">{t(locale, "colName")}</th>
                <th className="px-4 py-3">{t(locale, "colPhone")}</th>
                <th className="px-4 py-3">{t(locale, "colCity")}</th>
                <th className="px-4 py-3">{t(locale, "colType")}</th>
                <th className="px-4 py-3">{t(locale, "colStatus")}</th>
                <th className="px-4 py-3">{t(locale, "colActions")}</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted">
                    {t(locale, "usersEmptyTitle")}
                  </td>
                </tr>
              ) : (
                visible.map((u) => (
                  <tr key={u.uid} className="border-t border-outline align-top">
                    <td className="px-4 py-3">
                      <p className="font-medium">
                        {u.displayName || u.showroomName || "—"}
                      </p>
                      <p className="text-xs text-muted">{u.uid}</p>
                    </td>
                    <td className="px-4 py-3">{u.phone || "—"}</td>
                    <td className="px-4 py-3">
                      {editing === u.uid ? (
                        <input
                          value={editCity}
                          onChange={(e) => setEditCity(e.target.value)}
                          className="w-28 rounded bg-input px-2 py-1 text-xs"
                        />
                      ) : (
                        u.city || "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editing === u.uid ? (
                        <select
                          value={editType}
                          onChange={(e) =>
                            setEditType(
                              e.target.value as "individual" | "showroom",
                            )
                          }
                          className="rounded bg-input px-2 py-1 text-xs"
                        >
                          <option value="individual">
                            {accountTypeLabel(locale, "individual")}
                          </option>
                          <option value="showroom">
                            {accountTypeLabel(locale, "showroom")}
                          </option>
                        </select>
                      ) : (
                        accountTypeLabel(locale, u.accountType) || "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-semibold ${
                          u.banned ? "text-red-600" : "text-muted"
                        }`}
                      >
                        {u.banned
                          ? t(locale, "statusBanned")
                          : t(locale, "statusActive")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {editing === u.uid ? (
                          <>
                            <button
                              type="button"
                              disabled={busyId === u.uid}
                              className="text-xs font-semibold text-primary disabled:opacity-50"
                              onClick={() => void saveEdit(u.uid)}
                            >
                              {t(locale, "save")}
                            </button>
                            <button
                              type="button"
                              className="text-xs font-semibold text-muted"
                              onClick={() => setEditing(null)}
                            >
                              {t(locale, "dashCancel")}
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="text-xs font-semibold text-muted hover:text-foreground"
                            onClick={() => startEdit(u)}
                          >
                            {t(locale, "edit")}
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={busyId === u.uid}
                          className="text-xs font-semibold text-primary disabled:opacity-50"
                          onClick={() => void toggleBan(u)}
                        >
                          {u.banned ? t(locale, "unban") : t(locale, "ban")}
                        </button>
                        <Link
                          href={`/admin/listings?sellerId=${encodeURIComponent(u.uid)}`}
                          className="text-xs font-semibold text-muted hover:text-foreground"
                        >
                          {t(locale, "userAdsLink")}
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

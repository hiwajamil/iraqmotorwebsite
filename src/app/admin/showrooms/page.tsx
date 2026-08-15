"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { groupByCity, type AdminUser } from "@/lib/admin";

export default function AdminShowroomsPage() {
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
      setError(e instanceof Error ? e.message : "Failed");
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
        next
          ? `Ban showroom ${u.showroomName || u.displayName || u.uid}?`
          : `Unban showroom ${u.showroomName || u.displayName || u.uid}?`,
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
      setError(e instanceof Error ? e.message : "Ban failed");
    } finally {
      setBusyId(null);
    }
  }

  async function demote(u: AdminUser) {
    if (
      !window.confirm(
        `Demote ${u.showroomName || u.displayName || u.uid} to individual?`,
      )
    ) {
      return;
    }
    setBusyId(u.uid);
    try {
      await api.patch(`/admin/users/${u.uid}`, { accountType: "individual" });
      setItems((list) => list.filter((row) => row.uid !== u.uid));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Demote failed");
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
          <h1 className="text-3xl font-bold">Showrooms</h1>
          <p className="mt-1 text-sm text-muted">
            Dealer accounts ({items.length})
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setView(view === "list" ? "cities" : "list")}
            className="rounded-[var(--radius-control)] bg-input px-3 py-2 text-xs font-semibold"
          >
            {view === "list" ? "By city" : "List view"}
          </button>
          <Link
            href="/showrooms"
            className="rounded-[var(--radius-control)] bg-input px-3 py-2 text-xs font-semibold text-primary"
          >
            Public directory →
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
          placeholder="Filter by city (server)"
          className="w-full max-w-sm rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-[var(--radius-control)] bg-primary px-4 py-2 text-xs font-semibold text-on-primary"
        >
          Filter
        </button>
        {cityFilter ? (
          <button
            type="button"
            onClick={() => setCityFilter(null)}
            className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
          >
            City: {cityFilter} ×
          </button>
        ) : null}
      </form>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      {view === "cities" ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {cities.length === 0 ? (
            <div className="rounded-[var(--radius-card)] bg-card p-8 text-center ring-1 ring-outline sm:col-span-2 lg:col-span-3">
              <p className="font-semibold">No showrooms found</p>
              <p className="mt-1 text-sm text-muted">Try clearing the city filter.</p>
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
                <p className="font-semibold">{group.city}</p>
                <p className="mt-2 text-2xl font-bold">{group.items.length}</p>
                <p className="text-xs text-muted">showrooms</p>
              </button>
            ))
          )}
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {visible.length === 0 ? (
            <div className="rounded-[var(--radius-card)] bg-card p-8 text-center ring-1 ring-outline">
              <p className="font-semibold">No showrooms found</p>
              <p className="mt-1 text-sm text-muted">
                {city.trim()
                  ? `Nothing matched “${city.trim()}”.`
                  : "Dealer accounts will appear here."}
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
                    {u.showroomName || u.displayName || "Showroom"}
                  </p>
                  <p className="text-xs text-muted">
                    {[u.ownerName, u.phone, u.city].filter(Boolean).join(" · ") ||
                      u.uid}
                  </p>
                  {u.banned ? (
                    <p className="mt-1 text-xs font-semibold text-red-600">
                      Banned
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/admin/listings?sellerId=${encodeURIComponent(u.uid)}`}
                    className="rounded-[var(--radius-control)] bg-input px-3 py-2 text-xs font-semibold"
                  >
                    Listings
                  </Link>
                  <button
                    type="button"
                    disabled={busyId === u.uid}
                    className="rounded-[var(--radius-control)] bg-input px-3 py-2 text-xs font-semibold disabled:opacity-50"
                    onClick={() => void demote(u)}
                  >
                    Demote
                  </button>
                  <button
                    type="button"
                    disabled={busyId === u.uid}
                    className="rounded-[var(--radius-control)] bg-primary px-3 py-2 text-xs font-semibold text-on-primary disabled:opacity-50"
                    onClick={() => void toggleBan(u)}
                  >
                    {u.banned ? "Unban" : "Ban"}
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

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { MoreHorizontal } from "lucide-react";
import { AdminConfirmDialog } from "@/components/admin-confirm-dialog";
import { AdminToast } from "@/components/admin-toast";
import { api } from "@/lib/api";
import {
  formatAdminWhen,
  groupByCity,
  type AdminUser,
} from "@/lib/admin";
import { HOME_CITIES, homeCityLabel } from "@/lib/home-data";
import { t, type Locale } from "@/lib/i18n";
import { useAppSelector } from "@/store/hooks";

const SEARCH_DEBOUNCE_MS = 300;
const MENU_ITEM =
  "flex w-full rounded-[var(--radius-control)] px-3 py-2 text-left text-xs font-semibold data-focus:bg-input disabled:opacity-50";

type StatusPill = "all" | "active" | "banned";

type PendingAction =
  | { type: "ban"; user: AdminUser; next: boolean }
  | { type: "demote"; user: AdminUser };

type ShowroomsResponse = {
  items: AdminUser[];
  total?: number;
  bannedCount?: number;
};

function showroomName(u: AdminUser, locale: Locale): string {
  return (
    u.showroomName ||
    u.displayName ||
    t(locale, "showroomDefaultName")
  );
}

function showroomPhoto(u: AdminUser): string | null {
  const value = u.photoUrl || u.photoURL || u.avatarUrl;
  return typeof value === "string" && value.trim() ? value : null;
}

function hasListingCounts(u: AdminUser): boolean {
  return Boolean(u.listingCounts);
}

function listingsHref(uid: string): string {
  return `/admin/listings?sellerId=${encodeURIComponent(uid)}`;
}

function ShowroomActionsMenu({
  user,
  busy,
  locale,
  onBan,
  onDemote,
  onEditCity,
}: {
  user: AdminUser;
  busy: boolean;
  locale: Locale;
  onBan: () => void;
  onDemote: () => void;
  onEditCity: () => void;
}) {
  return (
    <Menu>
      <MenuButton
        disabled={busy}
        aria-label={t(locale, "openMenu")}
        className="rounded-[var(--radius-control)] p-1.5 text-muted hover:bg-input hover:text-foreground disabled:opacity-50"
      >
        <MoreHorizontal className="h-4 w-4" />
      </MenuButton>
      <MenuItems
        anchor="bottom end"
        className="z-30 w-48 origin-top-end rounded-[var(--radius-card)] bg-card p-1 shadow-lg ring-1 ring-outline [--anchor-gap:4px]"
      >
        <MenuItem>
          <Link href={listingsHref(user.uid)} className={MENU_ITEM}>
            {t(locale, "listingsLink")}
          </Link>
        </MenuItem>
        <MenuItem>
          <button type="button" disabled={busy} className={MENU_ITEM} onClick={onBan}>
            {user.banned ? t(locale, "unban") : t(locale, "ban")}
          </button>
        </MenuItem>
        <MenuItem>
          <button type="button" disabled={busy} className={MENU_ITEM} onClick={onEditCity}>
            {t(locale, "showroomsEditCity")}
          </button>
        </MenuItem>
        <MenuItem>
          <button
            type="button"
            disabled={busy}
            className={`${MENU_ITEM} text-red-600`}
            onClick={onDemote}
          >
            {t(locale, "demote")}
          </button>
        </MenuItem>
      </MenuItems>
    </Menu>
  );
}

function SkeletonRows({ rows = 8 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <tr key={i} className="border-t border-outline">
          <td className="px-4 py-3" colSpan={7}>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 animate-pulse rounded-full bg-input" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-3 w-40 max-w-full animate-pulse rounded bg-input" />
                <div className="h-2.5 w-24 animate-pulse rounded bg-input" />
              </div>
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

function SkeletonCards({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-2 md:hidden">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-[var(--radius-card)] bg-card p-3 ring-1 ring-outline"
        >
          <div className="h-9 w-9 animate-pulse rounded-full bg-input" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-36 max-w-full animate-pulse rounded bg-input" />
            <div className="h-2.5 w-20 animate-pulse rounded bg-input" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminShowroomsPage() {
  const locale = useAppSelector((s) => s.preferences.locale);
  const [items, setItems] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [bannedCount, setBannedCount] = useState(0);
  const [city, setCity] = useState("");
  const [qDraft, setQDraft] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusPill>("all");
  const [cityFilter, setCityFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    tone: "success" | "error";
  } | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [editCity, setEditCity] = useState("");

  useEffect(() => {
    const id = window.setTimeout(() => setQ(qDraft.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [qDraft]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query: Record<string, string> = {};
      if (city.trim()) query.city = city.trim();
      if (q.trim()) query.q = q.trim();
      const d = await api.get<ShowroomsResponse>("/admin/showrooms", query);
      const list = d.items ?? [];
      setItems(list);
      setTotal(d.total ?? list.length);
      setBannedCount(
        d.bannedCount ?? list.filter((row) => row.banned).length,
      );
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t(locale, "failedGeneric"));
      setItems([]);
      setTotal(0);
      setBannedCount(0);
    } finally {
      setLoading(false);
    }
  }, [city, q, locale]);

  useEffect(() => {
    void load();
  }, [load]);

  const cityGroups = useMemo(() => groupByCity(items), [items]);
  const citiesCovered = cityGroups.filter((g) => g.city !== "Unknown").length;
  const activeListingsTotal = useMemo(() => {
    if (!items.some(hasListingCounts)) return null;
    return items.reduce((sum, row) => sum + (row.listingCounts?.active ?? 0), 0);
  }, [items]);

  const visible = useMemo(() => {
    return items.filter((u) => {
      if (status === "active" && u.banned) return false;
      if (status === "banned" && !u.banned) return false;
      if (!cityFilter) return true;
      return String(u.city || "Unknown").trim() === cityFilter;
    });
  }, [items, status, cityFilter]);

  function requestBan(user: AdminUser) {
    setPending({ type: "ban", user, next: !user.banned });
  }

  function requestDemote(user: AdminUser) {
    setPending({ type: "demote", user });
  }

  async function applyBan(user: AdminUser, next: boolean) {
    setBusyId(user.uid);
    try {
      const updated = await api.patch<AdminUser>(`/admin/users/${user.uid}`, {
        banned: next,
      });
      setItems((list) =>
        list.map((row) =>
          row.uid === user.uid
            ? { ...row, banned: updated.banned ?? next }
            : row,
        ),
      );
      setBannedCount((n) => Math.max(0, n + (next ? 1 : -1)));
      setToast({
        message: next
          ? t(locale, "showroomsBannedToast")
          : t(locale, "showroomsUnbannedToast"),
        tone: "success",
      });
      setError(null);
      return true;
    } catch (e) {
      const message = e instanceof Error ? e.message : t(locale, "banFailed");
      setError(message);
      setToast({ message, tone: "error" });
      return false;
    } finally {
      setBusyId(null);
    }
  }

  async function applyDemote(user: AdminUser) {
    setBusyId(user.uid);
    try {
      await api.patch(`/admin/users/${user.uid}`, { accountType: "individual" });
      setItems((list) => list.filter((row) => row.uid !== user.uid));
      setTotal((n) => Math.max(0, n - 1));
      if (user.banned) setBannedCount((n) => Math.max(0, n - 1));
      setToast({
        message: t(locale, "showroomsDemotedToast"),
        tone: "success",
      });
      setError(null);
      return true;
    } catch (e) {
      const message = e instanceof Error ? e.message : t(locale, "demoteFailed");
      setError(message);
      setToast({ message, tone: "error" });
      return false;
    } finally {
      setBusyId(null);
    }
  }

  async function confirmPending() {
    if (!pending) return;
    const ok =
      pending.type === "demote"
        ? await applyDemote(pending.user)
        : await applyBan(pending.user, pending.next);
    if (ok) setPending(null);
  }

  function startEditCity(u: AdminUser) {
    setEditingUid(u.uid);
    setEditCity(u.city || "");
  }

  async function saveCity(uid: string) {
    setBusyId(uid);
    try {
      const updated = await api.patch<AdminUser>(`/admin/users/${uid}`, {
        city: editCity.trim() || undefined,
      });
      setItems((list) =>
        list.map((row) =>
          row.uid === uid ? { ...row, city: updated.city ?? editCity.trim() } : row,
        ),
      );
      setEditingUid(null);
      setToast({ message: t(locale, "showroomsCitySaved"), tone: "success" });
      setError(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : t(locale, "updateFailed");
      setError(message);
      setToast({ message, tone: "error" });
    } finally {
      setBusyId(null);
    }
  }

  const pendingName = pending
    ? showroomName(pending.user, locale)
    : "";
  const confirmTitle = pending
    ? pending.type === "demote"
      ? t(locale, "showroomsConfirmDemoteTitle")
      : pending.next
        ? t(locale, "showroomsConfirmBanTitle")
        : t(locale, "showroomsConfirmUnbanTitle")
    : "";
  const confirmDescription = pending
    ? pending.type === "demote"
      ? t(locale, "confirmDemoteShowroom", { name: pendingName })
      : t(locale, pending.next ? "confirmBanShowroom" : "confirmUnbanShowroom", {
          name: pendingName,
        })
    : "";

  const showSkeleton = loading && items.length === 0;
  const empty = !loading && visible.length === 0;
  const truncated = total > items.length;

  function rowMenu(u: AdminUser) {
    return (
      <ShowroomActionsMenu
        user={u}
        busy={busyId === u.uid}
        locale={locale}
        onBan={() => requestBan(u)}
        onDemote={() => requestDemote(u)}
        onEditCity={() => startEditCity(u)}
      />
    );
  }

  function inventoryCell(u: AdminUser) {
    const href = listingsHref(u.uid);
    if (!hasListingCounts(u) || !u.listingCounts) {
      return (
        <Link href={href} className="text-xs font-semibold text-primary hover:underline">
          {t(locale, "listingsLink")}
        </Link>
      );
    }
    return (
      <Link href={href} className="text-xs font-semibold text-primary hover:underline">
        {t(locale, "showroomsInventoryActive", {
          count: u.listingCounts.active,
        })}
        {u.listingCounts.pending > 0
          ? ` · ${t(locale, "showroomsInventoryPending", {
              count: u.listingCounts.pending,
            })}`
          : ""}
      </Link>
    );
  }

  const kpi = [
    { key: "showroomsKpiTotal" as const, value: total },
    { key: "showroomsKpiBanned" as const, value: bannedCount },
    { key: "showroomsKpiCities" as const, value: citiesCovered },
    ...(activeListingsTotal != null
      ? [{ key: "showroomsKpiActiveListings" as const, value: activeListingsTotal }]
      : []),
  ];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{t(locale, "adminShowroomsTitle")}</h1>
          <p className="mt-1 text-sm text-muted">
            {t(locale, "adminShowroomsSubtitle", { count: total })}
          </p>
        </div>
        <Link
          href="/showrooms"
          className="rounded-[var(--radius-control)] bg-input px-3 py-2 text-xs font-semibold text-primary"
        >
          {t(locale, "publicDirectoryLink")}
        </Link>
      </div>

      <div
        className={`mt-4 grid gap-2 ${
          kpi.length === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"
        }`}
      >
        {kpi.map((card) => (
          <div
            key={card.key}
            className="rounded-[var(--radius-card)] bg-card px-3 py-2 ring-1 ring-outline"
          >
            <p className="text-[11px] uppercase tracking-wide text-muted">
              {t(locale, card.key)}
            </p>
            <p className="mt-1 text-lg font-bold">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {HOME_CITIES.map((c) => {
          const value = c.key ? c.en : "";
          const active = (!city && !c.key) || city === value;
          return (
            <button
              key={c.key ?? "all"}
              type="button"
              onClick={() => {
                setCity(value);
                setCityFilter(null);
              }}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
                active
                  ? "bg-primary text-on-primary"
                  : "bg-card ring-1 ring-outline"
              }`}
            >
              {homeCityLabel(c, locale)}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          value={qDraft}
          onChange={(e) => setQDraft(e.target.value)}
          placeholder={t(locale, "showroomsSearchPlaceholder")}
          className="w-full max-w-md rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm"
        />
        {(
          [
            ["all", "all"],
            ["active", "statusActive"],
            ["banned", "statusBanned"],
          ] as const
        ).map(([value, labelKey]) => (
          <button
            key={value}
            type="button"
            onClick={() => setStatus(value)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              status === value
                ? "bg-primary text-on-primary"
                : "bg-input text-muted"
            }`}
          >
            {t(locale, labelKey)}
          </button>
        ))}
        {truncated ? (
          <p className="ms-auto text-xs text-muted">
            {t(locale, "showroomsShowingOf", {
              loaded: items.length,
              total,
            })}
          </p>
        ) : null}
      </div>

      {cityGroups.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {cityGroups.map((group) => {
            const active = cityFilter === group.city;
            return (
              <button
                key={group.city}
                type="button"
                onClick={() =>
                  setCityFilter(active ? null : group.city)
                }
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  active
                    ? "bg-primary text-on-primary"
                    : "bg-input text-muted"
                }`}
              >
                {group.city === "Unknown"
                  ? t(locale, "unknownCity")
                  : group.city}{" "}
                {group.items.length}
              </button>
            );
          })}
        </div>
      ) : null}

      {error ? (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {showSkeleton ? <div className="mt-4"><SkeletonCards /></div> : null}

      {empty ? (
        <div className="mt-6 rounded-[var(--radius-card)] bg-card p-8 text-center ring-1 ring-outline">
          <p className="font-semibold">{t(locale, "showroomsEmptyTitle")}</p>
          <p className="mt-1 text-sm text-muted">
            {city.trim()
              ? t(locale, "showroomsNoMatch", { city: city.trim() })
              : t(locale, "showroomsDefaultEmptyHint")}
          </p>
        </div>
      ) : (
        <>
          <div className="mt-4 space-y-2 md:hidden">
            {visible.map((u) => {
              const photo = showroomPhoto(u);
              return (
                <div
                  key={u.uid}
                  className="flex items-start gap-3 rounded-[var(--radius-card)] bg-card p-3 ring-1 ring-outline"
                >
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photo}
                      alt=""
                      className="h-9 w-9 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-input text-[10px] font-bold text-muted">
                      {showroomName(u, locale).slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{showroomName(u, locale)}</p>
                    {u.ownerName ? (
                      <p className="text-[11px] text-muted">{u.ownerName}</p>
                    ) : null}
                    <p className="mt-0.5 text-xs text-muted">
                      {[u.city, u.phone].filter(Boolean).join(" · ") || u.uid.slice(0, 10)}
                    </p>
                    <div className="mt-1">{inventoryCell(u)}</div>
                    <span
                      className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        u.banned
                          ? "bg-red-500/15 text-red-700"
                          : "bg-emerald-500/15 text-emerald-700"
                      }`}
                    >
                      {u.banned
                        ? t(locale, "statusBanned")
                        : t(locale, "statusActive")}
                    </span>
                  </div>
                  {rowMenu(u)}
                </div>
              );
            })}
          </div>

          <div className="mt-4 hidden overflow-x-auto rounded-[var(--radius-card)] ring-1 ring-outline md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-input text-xs uppercase text-muted">
                <tr>
                  <th className="px-4 py-3">{t(locale, "showrooms")}</th>
                  <th className="px-3 py-3">{t(locale, "colCity")}</th>
                  <th className="px-3 py-3">{t(locale, "colPhone")}</th>
                  <th className="px-3 py-3">{t(locale, "showroomsColInventory")}</th>
                  <th className="px-3 py-3">{t(locale, "colStatus")}</th>
                  <th className="px-3 py-3">{t(locale, "showroomsColJoined")}</th>
                  <th className="w-12 px-2 py-3">
                    <span className="sr-only">{t(locale, "colActions")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {showSkeleton ? (
                  <SkeletonRows />
                ) : (
                  visible.map((u) => {
                    const photo = showroomPhoto(u);
                    return (
                      <tr key={u.uid} className="border-t border-outline align-middle">
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-3">
                            {photo ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={photo}
                                alt=""
                                className="h-9 w-9 shrink-0 rounded-full object-cover"
                              />
                            ) : (
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-input text-[10px] font-bold text-muted">
                                {showroomName(u, locale).slice(0, 1).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-semibold">{showroomName(u, locale)}</p>
                              <p className="text-[11px] text-muted">
                                {u.ownerName || u.uid.slice(0, 10)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          {editingUid === u.uid ? (
                            <div className="flex flex-wrap items-center gap-1">
                              <input
                                value={editCity}
                                onChange={(e) => setEditCity(e.target.value)}
                                className="w-28 rounded bg-input px-2 py-1 text-xs"
                              />
                              <button
                                type="button"
                                disabled={busyId === u.uid}
                                className="text-xs font-semibold text-primary disabled:opacity-50"
                                onClick={() => void saveCity(u.uid)}
                              >
                                {t(locale, "save")}
                              </button>
                              <button
                                type="button"
                                className="text-xs font-semibold text-muted"
                                onClick={() => setEditingUid(null)}
                              >
                                {t(locale, "dashCancel")}
                              </button>
                            </div>
                          ) : (
                            <span className="text-muted">{u.city || "—"}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-muted">{u.phone || "—"}</td>
                        <td className="px-3 py-2">{inventoryCell(u)}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                              u.banned
                                ? "bg-red-500/15 text-red-700"
                                : "bg-emerald-500/15 text-emerald-700"
                            }`}
                          >
                            {u.banned
                              ? t(locale, "statusBanned")
                              : t(locale, "statusActive")}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-xs text-muted">
                          {formatAdminWhen(u.createdAt) || "—"}
                        </td>
                        <td className="px-2 py-2 text-right">{rowMenu(u)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      <AdminConfirmDialog
        open={Boolean(pending)}
        title={confirmTitle}
        description={confirmDescription}
        danger={pending?.type === "demote"}
        busy={Boolean(pending && busyId === pending.user.uid)}
        onConfirm={() => void confirmPending()}
        onCancel={() => {
          if (!busyId) setPending(null);
        }}
      />

      <AdminToast
        message={toast?.message ?? null}
        tone={toast?.tone}
        onDismiss={() => setToast(null)}
      />
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { AlertTriangle, MoreHorizontal } from "lucide-react";
import { AdminAdFormModal } from "@/components/admin-ad-form-modal";
import { AdminConfirmDialog } from "@/components/admin-confirm-dialog";
import { AdminToast } from "@/components/admin-toast";
import { api } from "@/lib/api";
import {
  AD_SLOTS,
  AD_TYPE_LABELS,
  adDeliveryBadgeClass,
  adDeliveryState,
  adHasCreative,
  adImageUrl,
  adIsEnabled,
  adSlotLabel,
  formatAdDate,
  formatAdDateUtc,
  liveAdsInSlot,
  normalizeAdSlot,
  pickLiveAdForSlot,
  type AdDeliveryState,
  type AdSlotKey,
  type AdvertiseAdmin,
} from "@/lib/ads";
import { t, type DictKey } from "@/lib/i18n";
import { useAppSelector } from "@/store/hooks";

type StatusFilter = "all" | AdDeliveryState;
type SlotFilter = "all" | AdSlotKey;

const MENU_ITEM =
  "flex w-full rounded-[var(--radius-control)] px-3 py-2 text-left text-xs font-semibold data-focus:bg-input disabled:opacity-50";

const STATUS_PILLS: { value: StatusFilter; labelKey: DictKey }[] = [
  { value: "all", labelKey: "all" },
  { value: "live", labelKey: "adDeliveryLive" },
  { value: "scheduled", labelKey: "adDeliveryScheduled" },
  { value: "expired", labelKey: "adDeliveryExpired" },
  { value: "disabled", labelKey: "adDeliveryDisabled" },
];

const DELIVERY_LABEL: Record<AdDeliveryState, DictKey> = {
  live: "adDeliveryLive",
  scheduled: "adDeliveryScheduled",
  expired: "adDeliveryExpired",
  disabled: "adDeliveryDisabled",
};

function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <tr key={i} className="border-b border-outline/70 last:border-0">
          <td className="px-4 py-3" colSpan={10}>
            <div className="flex items-center gap-3">
              <div className="h-12 w-20 animate-pulse rounded-lg bg-input" />
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

export default function AdminAdsPage() {
  const locale = useAppSelector((s) => s.preferences.locale);
  const [items, setItems] = useState<AdvertiseAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [slotFilter, setSlotFilter] = useState<SlotFilter>("all");
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    tone: "success" | "error";
  } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdvertiseAdmin | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdvertiseAdmin | null>(
    null,
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<{ items: AdvertiseAdmin[] }>("/admin/ads");
      setItems(data.items ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t(locale, "failedToLoad"));
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

  const homeLive = useMemo(
    () => pickLiveAdForSlot(items, "home_banner"),
    [items],
  );
  const gridLive = useMemo(
    () => pickLiveAdForSlot(items, "grid_tile"),
    [items],
  );
  const homeCompetitors = useMemo(
    () => liveAdsInSlot(items, "home_banner").length,
    [items],
  );
  const gridCompetitors = useMemo(
    () => liveAdsInSlot(items, "grid_tile").length,
    [items],
  );

  const statusCounts = useMemo(() => {
    const source =
      slotFilter === "all"
        ? items
        : items.filter((ad) => normalizeAdSlot(ad.slotPosition) === slotFilter);
    const counts: Record<StatusFilter, number> = {
      all: source.length,
      live: 0,
      scheduled: 0,
      expired: 0,
      disabled: 0,
    };
    for (const ad of source) {
      counts[adDeliveryState(ad)] += 1;
    }
    return counts;
  }, [items, slotFilter]);

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return items.filter((ad) => {
      if (slotFilter !== "all" && normalizeAdSlot(ad.slotPosition) !== slotFilter) {
        return false;
      }
      if (status !== "all" && adDeliveryState(ad) !== status) return false;
      if (!q) return true;
      return [ad.title, ad.description, ad.slotPosition, ad.targetLink, ad.url]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [items, filter, status, slotFilter]);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(ad: AdvertiseAdmin) {
    setEditing(ad);
    setModalOpen(true);
  }

  async function toggleActive(ad: AdvertiseAdmin) {
    const next = !adIsEnabled(ad);
    setBusyId(ad.id);
    try {
      const updated = await api.patch<AdvertiseAdmin>(`/admin/ads/${ad.id}`, {
        isActive: next,
      });
      setItems((list) =>
        list.map((row) => (row.id === ad.id ? { ...row, ...updated } : row)),
      );
      setToast({
        message: next ? t(locale, "adActivated") : t(locale, "adDeactivated"),
        tone: "success",
      });
    } catch (e) {
      setToast({
        message:
          e instanceof Error ? e.message : t(locale, "couldNotUpdateStatus"),
        tone: "error",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setBusyId(pendingDelete.id);
    try {
      await api.delete(`/admin/ads/${pendingDelete.id}`);
      setItems((list) => list.filter((row) => row.id !== pendingDelete.id));
      if (editing?.id === pendingDelete.id) {
        setModalOpen(false);
        setEditing(null);
      }
      setToast({ message: t(locale, "adDeleted"), tone: "success" });
      setPendingDelete(null);
    } catch (e) {
      setToast({
        message: e instanceof Error ? e.message : t(locale, "couldNotDeleteAd"),
        tone: "error",
      });
    } finally {
      setBusyId(null);
    }
  }

  const showSkeleton = loading && items.length === 0;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{t(locale, "adminAdsTitle")}</h1>
          <p className="mt-1 text-sm text-muted">
            {t(locale, "adminAdsSubtitle")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-[var(--radius-control)] bg-input px-3 py-2 text-xs font-semibold"
          >
            {t(locale, "refresh")}
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="rounded-[var(--radius-control)] bg-primary-fill px-3 py-2 text-xs font-semibold text-on-primary"
          >
            {t(locale, "newAd")}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {(
          [
            {
              slot: "home_banner" as const,
              labelKey: "adsPlacementHome" as const,
              winner: homeLive,
              competing: homeCompetitors,
              empty: t(locale, "adsHouseBannerDefault"),
              previewHref: "/",
              previewKey: "adsPreviewHome" as const,
            },
            {
              slot: "grid_tile" as const,
              labelKey: "adsPlacementGrid" as const,
              winner: gridLive,
              competing: gridCompetitors,
              empty: t(locale, "adsPlacementEmpty"),
              previewHref: "/cars",
              previewKey: "adsPreviewListings" as const,
            },
          ] as const
        ).map((card) => (
          <div
            key={card.slot}
            className="rounded-[var(--radius-card)] bg-card px-4 py-3 ring-1 ring-outline"
          >
            <p className="text-[11px] uppercase tracking-wide text-muted">
              {t(locale, card.labelKey)}
            </p>
            <p className="mt-1 font-semibold">
              {card.winner?.title || card.empty}
            </p>
            {card.competing > 1 ? (
              <p className="mt-1 text-xs font-medium text-amber-700">
                {t(locale, "adsSlotCompeting", { count: card.competing })}
              </p>
            ) : null}
            <Link
              href={card.previewHref}
              className="mt-2 inline-block text-xs font-semibold text-primary-strong hover:underline"
            >
              {t(locale, card.previewKey)}
            </Link>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSlotFilter("all")}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            slotFilter === "all"
              ? "bg-primary-fill text-on-primary"
              : "bg-input text-muted"
          }`}
        >
          {t(locale, "adsFilterAllSlots")}
        </button>
        {AD_SLOTS.map((slot) => (
          <button
            key={slot.key}
            type="button"
            onClick={() => setSlotFilter(slot.key)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              slotFilter === slot.key
                ? "bg-primary-fill text-on-primary"
                : "bg-input text-muted"
            }`}
          >
            {t(locale, slot.labelKey)}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {STATUS_PILLS.map((pill) => (
          <button
            key={pill.value}
            type="button"
            onClick={() => setStatus(pill.value)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              status === pill.value
                ? "bg-primary-fill text-on-primary"
                : "bg-input text-muted"
            }`}
          >
            {t(locale, pill.labelKey)} {statusCounts[pill.value]}
          </button>
        ))}
      </div>

      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder={t(locale, "adsFilterPlaceholder")}
        className="mt-4 w-full max-w-md rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm"
      />
      <p className="mt-1 text-[11px] text-muted">{t(locale, "adsLocalTzHint")}</p>

      {error ? (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-6 overflow-x-auto rounded-[var(--radius-card)] bg-card ring-1 ring-outline">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-outline text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">
                {t(locale, "colThumbnail")}
              </th>
              <th className="px-4 py-3 font-semibold">
                {t(locale, "colTitle")}
              </th>
              <th className="px-4 py-3 font-semibold">
                {t(locale, "colType")}
              </th>
              <th className="px-4 py-3 font-semibold">
                {t(locale, "colSlot")}
              </th>
              <th className="px-4 py-3 font-semibold">
                {t(locale, "colStatus")}
              </th>
              <th className="px-4 py-3 font-semibold">
                {t(locale, "colImpressions")}
              </th>
              <th className="px-4 py-3 font-semibold">
                {t(locale, "colClicks")}
              </th>
              <th className="px-4 py-3 font-semibold">
                {t(locale, "colStartDate")}
              </th>
              <th className="px-4 py-3 font-semibold">
                {t(locale, "colEndDate")}
              </th>
              <th className="px-4 py-3 font-semibold">
                {t(locale, "colActions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {showSkeleton ? (
              <SkeletonRows />
            ) : visible.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center">
                  <p className="font-semibold">{t(locale, "adsEmptyTitle")}</p>
                  <p className="mt-1 text-sm text-muted">
                    {t(locale, "adsEmptyHint")}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {t(locale, "adsEmptyHouseFallback")}
                  </p>
                  <button
                    type="button"
                    onClick={openCreate}
                    className="mt-4 rounded-[var(--radius-control)] bg-primary-fill px-4 py-2 text-xs font-semibold text-on-primary"
                  >
                    {t(locale, "adsEmptyCta")}
                  </button>
                </td>
              </tr>
            ) : (
              visible.map((ad) => {
                const img = adImageUrl(ad);
                const enabled = adIsEnabled(ad);
                const delivery = adDeliveryState(ad);
                const toggling = busyId === ad.id;
                const missingCreative =
                  (delivery === "live" || enabled) && !adHasCreative(ad);
                return (
                  <tr
                    key={ad.id}
                    className="cursor-pointer border-b border-outline/70 last:border-0 hover:bg-input/40"
                    onClick={() => openEdit(ad)}
                  >
                    <td className="px-4 py-3">
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={img}
                          alt=""
                          className={`h-12 w-20 rounded-lg object-cover ${
                            missingCreative ? "ring-2 ring-amber-500" : ""
                          }`}
                        />
                      ) : (
                        <div
                          className={`flex h-12 w-20 items-center justify-center rounded-lg bg-input text-[10px] text-muted ${
                            missingCreative ? "ring-2 ring-amber-500" : ""
                          }`}
                        >
                          {t(locale, "noImage")}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="text-left font-semibold hover:text-primary-strong"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(ad);
                        }}
                      >
                        {ad.title}
                      </button>
                      <p className="max-w-[220px] truncate text-xs text-muted">
                        {ad.targetLink || ad.url || t(locale, "noLink")}
                      </p>
                      {missingCreative ? (
                        <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-amber-700">
                          <AlertTriangle className="h-3 w-3" />
                          {t(locale, "adsNoImageWarning")}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-input px-2 py-0.5 text-[11px] font-medium">
                        {AD_TYPE_LABELS[ad.advertiseTypeId ?? 1]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-input px-2 py-0.5 text-[11px] font-medium">
                        {adSlotLabel(locale, ad.slotPosition)}
                      </span>
                    </td>
                    <td
                      className="px-4 py-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${adDeliveryBadgeClass(delivery)}`}
                      >
                        {t(locale, DELIVERY_LABEL[delivery])}
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={enabled}
                        disabled={toggling}
                        onClick={() => void toggleActive(ad)}
                        className="mt-2 flex items-center gap-2 disabled:opacity-60"
                      >
                        <span
                          className={`relative h-6 w-11 rounded-full transition ${
                            enabled
                              ? "bg-emerald-500"
                              : "bg-slate-300 dark:bg-slate-600"
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition ${
                              enabled ? "start-5" : "start-0.5"
                            }`}
                          />
                        </span>
                        <span
                          className={`text-xs font-semibold ${
                            enabled ? "text-emerald-700" : "text-muted"
                          }`}
                        >
                          {toggling
                            ? t(locale, "saving")
                            : enabled
                              ? t(locale, "statusActive")
                              : t(locale, "statusInactive")}
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {ad.impressionCount ?? 0}
                      {ad.impressionLimit != null
                        ? ` / ${ad.impressionLimit}`
                        : ""}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {ad.clickCount ?? 0}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">
                      <p>{formatAdDate(ad.startDate)}</p>
                      {ad.startDate ? (
                        <p className="text-[10px]">
                          {t(locale, "adsUtcHint")}: {formatAdDateUtc(ad.startDate)}
                        </p>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">
                      <p>{formatAdDate(ad.endDate)}</p>
                      {ad.endDate ? (
                        <p className="text-[10px]">
                          {t(locale, "adsUtcHint")}: {formatAdDateUtc(ad.endDate)}
                        </p>
                      ) : null}
                    </td>
                    <td
                      className="px-4 py-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(ad)}
                          className="rounded-[var(--radius-control)] bg-input px-3 py-1.5 text-xs font-semibold"
                        >
                          {t(locale, "edit")}
                        </button>
                        <Menu>
                          <MenuButton
                            disabled={toggling}
                            aria-label={t(locale, "openMenu")}
                            className="rounded-[var(--radius-control)] p-1.5 text-muted hover:bg-input hover:text-foreground disabled:opacity-50"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </MenuButton>
                          <MenuItems
                            anchor="bottom end"
                            className="z-30 w-36 origin-top-end rounded-[var(--radius-card)] bg-card p-1 shadow-lg ring-1 ring-outline [--anchor-gap:4px]"
                          >
                            <MenuItem>
                              <button
                                type="button"
                                disabled={toggling}
                                className={`${MENU_ITEM} text-red-600`}
                                onClick={() => setPendingDelete(ad)}
                              >
                                {t(locale, "dashDelete")}
                              </button>
                            </MenuItem>
                          </MenuItems>
                        </Menu>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <AdminAdFormModal
        open={modalOpen}
        ad={editing}
        existingAds={items}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSaved={(saved, created) => {
          setItems((list) => {
            const exists = list.some((row) => row.id === saved.id);
            return exists
              ? list.map((row) => (row.id === saved.id ? saved : row))
              : [saved, ...list];
          });
          setModalOpen(false);
          setEditing(null);
          setToast({
            message: created ? t(locale, "adCreated") : t(locale, "adSaved"),
            tone: "success",
          });
        }}
      />

      <AdminConfirmDialog
        open={Boolean(pendingDelete)}
        title={t(locale, "deleteAdTitle")}
        description={t(locale, "deleteAdDescription", {
          title: pendingDelete?.title ?? t(locale, "thisAd"),
        })}
        confirmLabel={t(locale, "confirm")}
        danger
        busy={Boolean(pendingDelete && busyId === pendingDelete.id)}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void confirmDelete()}
      />

      <AdminToast
        message={toast?.message ?? null}
        tone={toast?.tone}
        onDismiss={() => setToast(null)}
      />
    </div>
  );
}

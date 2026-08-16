"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminAdFormModal } from "@/components/admin-ad-form-modal";
import { AdminConfirmDialog } from "@/components/admin-confirm-dialog";
import { AdminToast } from "@/components/admin-toast";
import { api } from "@/lib/api";
import {
  adImageUrl,
  adIsActive,
  adSlotLabel,
  formatAdDate,
  type AdvertiseAdmin,
} from "@/lib/ads";

type StatusFilter = "all" | "active" | "inactive";

export default function AdminAdsPage() {
  const [items, setItems] = useState<AdvertiseAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
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
      setError(e instanceof Error ? e.message : "Failed to load advertisements");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return items.filter((ad) => {
      const active = adIsActive(ad);
      if (status === "active" && !active) return false;
      if (status === "inactive" && active) return false;
      if (!q) return true;
      return [ad.title, ad.description, ad.slotPosition, ad.targetLink, ad.url]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [items, filter, status]);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(ad: AdvertiseAdmin) {
    setEditing(ad);
    setModalOpen(true);
  }

  async function toggleActive(ad: AdvertiseAdmin) {
    const next = !adIsActive(ad);
    setBusyId(ad.id);
    try {
      const updated = await api.patch<AdvertiseAdmin>(`/admin/ads/${ad.id}`, {
        isActive: next,
      });
      setItems((list) =>
        list.map((row) => (row.id === ad.id ? { ...row, ...updated } : row)),
      );
      setToast({
        message: next ? "Advertisement activated" : "Advertisement turned off",
        tone: "success",
      });
    } catch (e) {
      setToast({
        message: e instanceof Error ? e.message : "Could not update status",
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
      setToast({ message: "Advertisement deleted", tone: "success" });
      setPendingDelete(null);
    } catch (e) {
      setToast({
        message: e instanceof Error ? e.message : "Could not delete ad",
        tone: "error",
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Ads</h1>
          <p className="mt-1 text-sm text-muted">
            Manage sponsor banners. Only active ads inside their date window
            appear on the site.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-[var(--radius-control)] bg-input px-3 py-2 text-xs font-semibold"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="rounded-[var(--radius-control)] bg-primary px-3 py-2 text-xs font-semibold text-on-primary"
          >
            New ad
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(
          [
            ["all", "All"],
            ["active", "Active"],
            ["inactive", "Inactive"],
          ] as const
        ).map(([value, label]) => (
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
            {label}
          </button>
        ))}
      </div>

      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter by title, slot, or link…"
        className="mt-4 w-full max-w-md rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm"
      />

      {error ? (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-6 overflow-x-auto rounded-[var(--radius-card)] bg-card ring-1 ring-outline">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-outline text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Thumbnail</th>
              <th className="px-4 py-3 font-semibold">Title</th>
              <th className="px-4 py-3 font-semibold">Slot</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Start date</th>
              <th className="px-4 py-3 font-semibold">End date</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted">
                  Loading advertisements…
                </td>
              </tr>
            ) : visible.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center">
                  <p className="font-semibold">No advertisements yet</p>
                  <p className="mt-1 text-sm text-muted">
                    Create an ad to replace the default iraqMotors banner.
                  </p>
                </td>
              </tr>
            ) : (
              visible.map((ad) => {
                const img = adImageUrl(ad);
                const active = adIsActive(ad);
                const toggling = busyId === ad.id;
                return (
                  <tr
                    key={ad.id}
                    className="border-b border-outline/70 last:border-0"
                  >
                    <td className="px-4 py-3">
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={img}
                          alt=""
                          className="h-12 w-20 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-20 items-center justify-center rounded-lg bg-input text-[10px] text-muted">
                          No image
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{ad.title}</p>
                      <p className="max-w-[220px] truncate text-xs text-muted">
                        {ad.targetLink || ad.url || "No link"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-input px-2 py-0.5 text-[11px] font-medium">
                        {adSlotLabel(ad.slotPosition)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={active}
                        disabled={toggling}
                        onClick={() => void toggleActive(ad)}
                        className="flex items-center gap-2 disabled:opacity-60"
                      >
                        <span
                          className={`relative h-6 w-11 rounded-full transition ${
                            active ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition ${
                              active ? "start-5" : "start-0.5"
                            }`}
                          />
                        </span>
                        <span
                          className={`text-xs font-semibold ${
                            active ? "text-emerald-700" : "text-muted"
                          }`}
                        >
                          {toggling ? "Saving…" : active ? "Active" : "Inactive"}
                        </span>
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">
                      {formatAdDate(ad.startDate)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">
                      {formatAdDate(ad.endDate)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(ad)}
                          className="rounded-[var(--radius-control)] bg-input px-3 py-1.5 text-xs font-semibold"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={toggling}
                          onClick={() => setPendingDelete(ad)}
                          className="rounded-[var(--radius-control)] px-3 py-1.5 text-xs font-semibold text-red-600 disabled:opacity-60"
                        >
                          Delete
                        </button>
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
            message: created ? "Advertisement created" : "Advertisement saved",
            tone: "success",
          });
        }}
      />

      <AdminConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete advertisement?"
        description={`“${pendingDelete?.title ?? "This ad"}” will be removed. The iraqMotors fallback will show if no other ad is live.`}
        confirmLabel="Delete"
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

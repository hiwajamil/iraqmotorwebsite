"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, type Car } from "@/lib/api";
import { type FlaggedAd, carImage, carTitle } from "@/lib/admin";
import { AdReviewModal } from "@/components/admin-ad-review";

function flagToCar(item: FlaggedAd): Car | null {
  if (item.adData && typeof item.adData === "object") {
    return {
      ...item.adData,
      id: String(item.adId || item.adData.id || ""),
    } as Car;
  }
  return null;
}

export default function AdminFlaggedPage() {
  const [items, setItems] = useState<FlaggedAd[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "open" | "resolved" | "dismissed">(
    "open",
  );
  const [query, setQuery] = useState("");
  const [review, setReview] = useState<Car | null>(null);
  const [reviewFlagId, setReviewFlagId] = useState<string | null>(null);

  async function load() {
    try {
      const d = await api.get<{ items: FlaggedAd[] }>("/admin/flagged");
      setItems(d.items ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function updateStatus(
    id: string,
    status: "resolved" | "dismissed" | "open",
    resolution?: string,
  ) {
    setBusyId(id);
    try {
      await api.patch(`/admin/flagged/${id}`, {
        status,
        ...(resolution ? { resolution } : {}),
      });
      setItems((list) =>
        list.map((item) =>
          item.id === id
            ? { ...item, status, resolution: resolution ?? item.resolution }
            : item,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteAd(item: FlaggedAd) {
    if (!item.adId) return;
    if (
      !window.confirm(
        "Delete this listing permanently and resolve the report?",
      )
    ) {
      return;
    }
    setBusyId(item.id);
    try {
      await api.delete(`/cars/${item.adId}`);
      await api.patch(`/admin/flagged/${item.id}`, {
        status: "resolved",
        resolution: "Listing deleted by admin",
      });
      setItems((list) =>
        list.map((row) =>
          row.id === item.id
            ? {
                ...row,
                status: "resolved",
                resolution: "Listing deleted by admin",
              }
            : row,
        ),
      );
      if (reviewFlagId === item.id) {
        setReview(null);
        setReviewFlagId(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusyId(null);
    }
  }

  async function openReview(item: FlaggedAd) {
    setReviewFlagId(item.id);
    const embedded = flagToCar(item);
    if (embedded?.id) {
      setReview(embedded);
      return;
    }
    if (!item.adId) return;
    try {
      const car = await api.get<Car>(`/cars/${item.adId}`);
      setReview(car);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load listing");
    }
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      const status =
        item.status === "pending" ? "open" : item.status || "open";
      if (filter !== "all" && status !== filter) return false;
      if (!q) return true;
      const preview = flagToCar(item);
      return [item.reason, item.details, item.adId, item.resolution, preview?.brandId, preview?.modelKey]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [items, filter, query]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Flagged ads</h1>
          <p className="mt-1 text-sm text-muted">
            Resolve, dismiss, or delete reported listings
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-[var(--radius-control)] bg-input px-3 py-2 text-xs font-semibold"
        >
          Refresh
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(["open", "resolved", "dismissed", "all"] as const).map((key) => (
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
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search reason, ad id, brand…"
        className="mt-4 w-full max-w-md rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm"
      />

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <div className="mt-6 space-y-3">
        {visible.length === 0 ? (
          <div className="rounded-[var(--radius-card)] bg-card p-8 text-center ring-1 ring-outline">
            <p className="font-semibold">No flagged ads in this filter</p>
            <p className="mt-1 text-sm text-muted">
              Reports from users will appear here for moderation.
            </p>
          </div>
        ) : (
          visible.map((item) => {
            const status =
              item.status === "pending" ? "open" : item.status || "open";
            const preview = flagToCar(item);
            const img = preview ? carImage(preview) : null;
            return (
              <div
                key={item.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-[var(--radius-card)] bg-card p-4 ring-1 ring-outline"
              >
                <div className="flex min-w-0 flex-1 gap-3">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img}
                      alt=""
                      className="h-16 w-24 rounded-lg object-cover"
                    />
                  ) : null}
                  <div className="min-w-0">
                    <p className="font-semibold">{item.reason || "Report"}</p>
                    {preview ? (
                      <p className="text-sm capitalize text-muted">
                        {carTitle(preview)}
                      </p>
                    ) : null}
                    {item.details ? (
                      <p className="mt-1 text-sm text-muted">{item.details}</p>
                    ) : null}
                    <p className="mt-2 text-xs text-muted">
                      Ad {item.adId || "—"} · {status}
                      {item.resolution ? ` · ${item.resolution}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-[var(--radius-control)] bg-input px-3 py-2 text-xs font-semibold"
                    onClick={() => void openReview(item)}
                  >
                    Review
                  </button>
                  {item.adId ? (
                    <Link
                      href={`/cars/${item.adId}`}
                      className="rounded-[var(--radius-control)] bg-input px-3 py-2 text-xs font-semibold"
                    >
                      Open
                    </Link>
                  ) : null}
                  {status !== "resolved" ? (
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      className="rounded-[var(--radius-control)] bg-primary px-3 py-2 text-xs font-semibold text-on-primary disabled:opacity-50"
                      onClick={() =>
                        void updateStatus(
                          item.id,
                          "resolved",
                          "Resolved by admin",
                        )
                      }
                    >
                      Resolve
                    </button>
                  ) : null}
                  {status !== "dismissed" ? (
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      className="rounded-[var(--radius-control)] bg-input px-3 py-2 text-xs font-semibold disabled:opacity-50"
                      onClick={() =>
                        void updateStatus(
                          item.id,
                          "dismissed",
                          "Dismissed by admin",
                        )
                      }
                    >
                      Dismiss
                    </button>
                  ) : null}
                  {item.adId ? (
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      className="rounded-[var(--radius-control)] px-3 py-2 text-xs font-semibold text-red-600 hover:bg-input disabled:opacity-50"
                      onClick={() => void deleteAd(item)}
                    >
                      Delete ad
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      {review ? (
        <AdReviewModal
          car={review}
          open
          busy={busyId != null}
          onClose={() => {
            setReview(null);
            setReviewFlagId(null);
          }}
          onApprove={() => {
            if (!reviewFlagId) return;
            void (async () => {
              await api.patch(`/admin/cars/${review.id}/status`, {
                status: "active",
              });
              await updateStatus(reviewFlagId, "resolved", "Approved after review");
              setReview(null);
            })();
          }}
          onReject={() => {
            if (!reviewFlagId) return;
            void (async () => {
              await api.patch(`/admin/cars/${review.id}/status`, {
                status: "rejected",
              });
              await updateStatus(reviewFlagId, "resolved", "Rejected after review");
              setReview(null);
            })();
          }}
        />
      ) : null}
    </div>
  );
}

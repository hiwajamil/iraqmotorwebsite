"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type Car } from "@/lib/api";
import {
  carImage,
  carTitle,
  statusBadgeClass,
  type AdminUser,
} from "@/lib/admin";

type Props = {
  car: Car;
  open: boolean;
  busy?: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  onExpire?: () => void;
  onSold?: () => void;
  onDelete?: () => void;
  onUpdated?: (car: Car) => void;
};

function Field({ label, value }: { label: string; value?: unknown }) {
  if (value == null || value === "") return null;
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-0.5 text-sm">{String(value)}</p>
    </div>
  );
}

type EditForm = {
  priceValue: string;
  year: string;
  mileageValue: string;
  city: string;
  province: string;
  description: string;
  fuelKey: string;
  transmissionKey: string;
};

function toEditForm(car: Car): EditForm {
  return {
    priceValue: car.priceValue != null ? String(car.priceValue) : "",
    year: car.year != null ? String(car.year) : "",
    mileageValue: car.mileageValue != null ? String(car.mileageValue) : "",
    city: String(car.city ?? ""),
    province: String(car.province ?? ""),
    description: String(car.description ?? ""),
    fuelKey: String(car.fuelKey ?? ""),
    transmissionKey: String(car.transmissionKey ?? ""),
  };
}

export function AdReviewModal({
  car,
  open,
  busy,
  onClose,
  onApprove,
  onReject,
  onExpire,
  onSold,
  onDelete,
  onUpdated,
}: Props) {
  const [seller, setSeller] = useState<AdminUser | null>(null);
  const [index, setIndex] = useState(0);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EditForm>(() => toEditForm(car));
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [localCar, setLocalCar] = useState(car);

  const images = [
    ...(typeof localCar.imageUrl === "string" && localCar.imageUrl
      ? [localCar.imageUrl]
      : []),
    ...(Array.isArray(localCar.imageUrls)
      ? localCar.imageUrls.filter((u): u is string => typeof u === "string")
      : []),
  ].filter((u, i, arr) => arr.indexOf(u) === i);

  useEffect(() => {
    if (!open) return;
    setIndex(0);
    setSeller(null);
    setEditing(false);
    setEditError(null);
    setLocalCar(car);
    setForm(toEditForm(car));
    if (!car.sellerId) return;
    void api
      .get<AdminUser>(`/users/${car.sellerId}`)
      .then(setSeller)
      .catch(() => setSeller(null));
  }, [open, car]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function saveEdit() {
    setSaving(true);
    setEditError(null);
    try {
      const patch: Record<string, unknown> = {
        city: form.city.trim() || null,
        province: form.province.trim() || null,
        description: form.description.trim() || null,
        fuelKey: form.fuelKey.trim() || null,
        transmissionKey: form.transmissionKey.trim() || null,
      };
      if (form.priceValue.trim()) {
        patch.priceValue = Number(form.priceValue);
      }
      if (form.year.trim()) {
        const y = Number(form.year);
        patch.year = Number.isFinite(y) ? y : form.year.trim();
      }
      if (form.mileageValue.trim()) {
        patch.mileageValue = Number(form.mileageValue);
      }
      const updated = await api.patch<Car>(`/cars/${localCar.id}`, patch);
      const next = { ...localCar, ...updated, id: localCar.id };
      setLocalCar(next);
      setEditing(false);
      onUpdated?.(next);
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  const thumb = carImage(localCar);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div
        className="absolute inset-0"
        onClick={onClose}
        onKeyDown={() => undefined}
        role="presentation"
      />
      <div className="relative z-10 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[var(--radius-card)] bg-card p-5 shadow-xl ring-1 ring-outline">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold capitalize">
                {carTitle(localCar)}
              </h2>
              {localCar.status ? (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusBadgeClass(localCar.status)}`}
                >
                  {localCar.status}
                </span>
              ) : null}
            </div>
            <p className="text-xs text-muted">{localCar.id}</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setEditing((v) => !v);
                setEditError(null);
                setForm(toEditForm(localCar));
              }}
              className="rounded-[var(--radius-control)] bg-input px-3 py-1.5 text-xs font-semibold"
            >
              {editing ? "Cancel edit" : "Edit fields"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-[var(--radius-control)] bg-input px-3 py-1.5 text-xs font-semibold"
            >
              Close
            </button>
          </div>
        </div>

        <div className="mt-4">
          {images.length > 0 ? (
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={images[index] ?? images[0] ?? thumb ?? ""}
                alt=""
                className="h-56 w-full rounded-xl object-cover sm:h-72"
              />
              {images.length > 1 ? (
                <div className="mt-2 flex gap-2 overflow-x-auto">
                  {images.map((src, i) => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => setIndex(i)}
                      className={`h-14 w-20 shrink-0 overflow-hidden rounded-lg ring-2 ${
                        i === index ? "ring-primary" : "ring-transparent"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center rounded-xl bg-input text-sm text-muted">
              No photos
            </div>
          )}
        </div>

        {editing ? (
          <div className="mt-5 space-y-3">
            {editError ? (
              <p className="text-sm text-red-600">{editError}</p>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["priceValue", "Price"],
                  ["year", "Year"],
                  ["mileageValue", "Mileage"],
                  ["city", "City"],
                  ["province", "Province"],
                  ["fuelKey", "Fuel"],
                  ["transmissionKey", "Transmission"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="text-xs font-semibold text-muted">
                  {label}
                  <input
                    value={form[key]}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, [key]: e.target.value }))
                    }
                    className="mt-1 w-full rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm text-foreground"
                  />
                </label>
              ))}
            </div>
            <label className="block text-xs font-semibold text-muted">
              Description
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                rows={4}
                className="mt-1 w-full rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm text-foreground"
              />
            </label>
            <button
              type="button"
              disabled={saving || busy}
              onClick={() => void saveEdit()}
              className="rounded-[var(--radius-control)] bg-primary px-4 py-2 text-xs font-semibold text-on-primary disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        ) : (
          <>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field
                label="Price"
                value={
                  localCar.priceValue != null
                    ? `${Number(localCar.priceValue).toLocaleString()} ${localCar.currencyKey || ""}`
                    : null
                }
              />
              <Field label="Year" value={localCar.year} />
              <Field label="Mileage" value={localCar.mileageValue} />
              <Field
                label="City"
                value={[localCar.city, localCar.province]
                  .filter(Boolean)
                  .join(", ")}
              />
              <Field label="Fuel" value={localCar.fuelKey} />
              <Field label="Transmission" value={localCar.transmissionKey} />
              <Field
                label="Condition"
                value={localCar.conditionKey || localCar.condition}
              />
              <Field label="Status" value={localCar.status} />
              <Field label="Highest bid" value={localCar.highestBid} />
            </div>

            {localCar.description ? (
              <div className="mt-5">
                <p className="text-[11px] uppercase tracking-wide text-muted">
                  Description
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm">
                  {String(localCar.description)}
                </p>
              </div>
            ) : null}
          </>
        )}

        <div className="mt-5 rounded-xl bg-input/60 p-4">
          <p className="text-[11px] uppercase tracking-wide text-muted">Seller</p>
          <p className="mt-1 text-sm font-semibold">
            {seller?.displayName ||
              seller?.showroomName ||
              localCar.sellerId ||
              "Unknown"}
          </p>
          <p className="text-xs text-muted">
            {[seller?.accountType, seller?.phone, seller?.city]
              .filter(Boolean)
              .join(" · ") || "Profile unavailable without Admin credentials"}
          </p>
          {localCar.sellerId ? (
            <Link
              href={`/admin/listings?sellerId=${encodeURIComponent(localCar.sellerId)}`}
              className="mt-2 inline-block text-xs font-semibold text-primary"
            >
              View seller listings
            </Link>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap gap-2 border-t border-outline pt-4">
          <Link
            href={`/cars/${localCar.id}`}
            className="rounded-[var(--radius-control)] bg-input px-3 py-2 text-xs font-semibold"
          >
            Open page
          </Link>
          {localCar.status !== "active" ? (
            <button
              type="button"
              disabled={busy}
              onClick={onApprove}
              className="rounded-[var(--radius-control)] bg-primary px-3 py-2 text-xs font-semibold text-on-primary disabled:opacity-50"
            >
              {localCar.status === "pending" ? "Approve" : "Activate"}
            </button>
          ) : null}
          {localCar.status !== "rejected" ? (
            <button
              type="button"
              disabled={busy}
              onClick={onReject}
              className="rounded-[var(--radius-control)] bg-input px-3 py-2 text-xs font-semibold disabled:opacity-50"
            >
              Reject
            </button>
          ) : null}
          {onExpire && localCar.status !== "expired" ? (
            <button
              type="button"
              disabled={busy}
              onClick={onExpire}
              className="rounded-[var(--radius-control)] px-3 py-2 text-xs font-semibold text-muted hover:bg-input disabled:opacity-50"
            >
              Expire
            </button>
          ) : null}
          {onSold && localCar.status !== "sold" ? (
            <button
              type="button"
              disabled={busy}
              onClick={onSold}
              className="rounded-[var(--radius-control)] bg-input px-3 py-2 text-xs font-semibold disabled:opacity-50"
            >
              Mark sold
            </button>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              disabled={busy}
              onClick={onDelete}
              className="rounded-[var(--radius-control)] px-3 py-2 text-xs font-semibold text-red-600 hover:bg-input disabled:opacity-50"
            >
              Delete
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

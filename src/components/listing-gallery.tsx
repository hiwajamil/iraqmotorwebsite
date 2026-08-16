"use client";

import { useCallback, useEffect, useId, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { t, type Locale } from "@/lib/i18n";

function ChevronIcon({ dir }: { dir: "left" | "right" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="rtl:rotate-180"
    >
      {dir === "left" ? (
        <path d="m15 18-6-6 6-6" />
      ) : (
        <path d="m9 18 6-6-6-6" />
      )}
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" x2="14" y1="3" y2="10" />
      <line x1="3" x2="10" y1="21" y2="14" />
    </svg>
  );
}

function ImageLightbox({
  images,
  index,
  title,
  locale,
  onClose,
  onIndexChange,
}: {
  images: string[];
  index: number;
  title: string;
  locale: Locale;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}) {
  const labelId = useId();
  const total = images.length;
  const src = images[index];

  const go = useCallback(
    (delta: number) => {
      if (total <= 1) return;
      onIndexChange((index + delta + total) % total);
    },
    [index, onIndexChange, total],
  );

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [go, onClose]);

  if (!src) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelId}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/88 p-3 backdrop-blur-sm animate-[lightbox-in_180ms_ease-out]"
      onClick={onClose}
    >
      <p id={labelId} className="sr-only">
        {t(locale, "viewFullscreen", { current: index + 1, total })}
      </p>
      <button
        type="button"
        onClick={onClose}
        aria-label={t(locale, "close")}
        className="absolute end-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
      >
        <CloseIcon />
      </button>
      {total > 1 ? (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
            aria-label={t(locale, "previousImage")}
            className="absolute start-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 md:start-6"
          >
            <ChevronIcon dir="left" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
            aria-label={t(locale, "nextImage")}
            className="absolute end-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 md:end-6"
          >
            <ChevronIcon dir="right" />
          </button>
        </>
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={title}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88vh] max-w-[min(1100px,94vw)] rounded-2xl object-contain shadow-2xl"
      />
      {total > 1 ? (
        <p className="absolute bottom-5 start-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-xs font-medium text-white">
          {index + 1} / {total}
        </p>
      ) : null}
    </div>,
    document.body,
  );
}

export function ListingGallery({
  images,
  title,
  locale,
  badge,
  actions,
}: {
  images: string[];
  title: string;
  locale: Locale;
  badge?: ReactNode;
  actions?: ReactNode;
}) {
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const current = images[active] ?? images[0];

  function openAt(index: number) {
    setActive(index);
    setOpen(true);
  }

  return (
    <div>
      <div className="relative rounded-[16px] bg-input ring-1 ring-outline">
        <div className="overflow-hidden rounded-[16px]">
        {current ? (
          <button
            type="button"
            onClick={() => openAt(active)}
            aria-label={t(locale, "expandImage")}
            className="group relative block w-full cursor-zoom-in"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current}
              alt={title}
              className="aspect-[4/3] w-full object-cover transition duration-300 group-hover:scale-[1.02]"
            />
            <span className="pointer-events-none absolute end-3 bottom-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white opacity-0 shadow-sm backdrop-blur-sm transition group-hover:opacity-100">
              <ExpandIcon />
            </span>
          </button>
        ) : (
          <div className="flex aspect-[4/3] items-center justify-center text-muted">
            {t(locale, "noPhoto")}
          </div>
        )}
        </div>
        {badge}
        {actions}
      </div>
      {images.length > 1 ? (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {images.map((url, i) => (
            <button
              key={`${url}-${i}`}
              type="button"
              onClick={() => openAt(i)}
              className={`h-16 w-20 shrink-0 overflow-hidden rounded-[10px] ring-2 transition ${
                i === active
                  ? "ring-primary"
                  : "ring-transparent opacity-80 hover:opacity-100"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
      {open ? (
        <ImageLightbox
          images={images}
          index={active}
          title={title}
          locale={locale}
          onClose={() => setOpen(false)}
          onIndexChange={setActive}
        />
      ) : null}
    </div>
  );
}

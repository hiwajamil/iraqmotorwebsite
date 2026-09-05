"use client";

import Link from "next/link";

export type PaginationPageItem = number | "ellipsis";

export function visiblePageItems(
  currentPage: number,
  totalPages: number,
  windowSize = 2,
): PaginationPageItem[] {
  if (totalPages <= 1) return totalPages === 1 ? [1] : [];
  if (totalPages <= 9) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = new Set<number>();
  pages.add(1);
  pages.add(totalPages);
  for (let p = currentPage - windowSize; p <= currentPage + windowSize; p += 1) {
    if (p >= 1 && p <= totalPages) pages.add(p);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const items: PaginationPageItem[] = [];
  for (let i = 0; i < sorted.length; i += 1) {
    const page = sorted[i]!;
    if (i > 0 && page - sorted[i - 1]! > 1) items.push("ellipsis");
    items.push(page);
  }
  return items;
}

export function hrefWithPage(
  pathname: string,
  search: string | URLSearchParams,
  page: number,
): string {
  const params = new URLSearchParams(
    typeof search === "string" ? search : search.toString(),
  );
  if (page <= 1) params.delete("page");
  else params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

const btnBase =
  "inline-flex h-10 min-w-10 items-center justify-center rounded-xl px-3 text-sm font-semibold transition";
const btnIdle =
  "bg-card text-foreground ring-1 ring-outline/70 hover:bg-primary/10 hover:text-primary-strong hover:ring-primary/40";
const btnActive =
  "bg-primary-fill text-on-primary shadow-md shadow-primary/25 ring-1 ring-primary";
const btnDisabled = "cursor-not-allowed bg-card text-muted ring-1 ring-outline/40 opacity-45";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  buildHref: (page: number) => string;
  previousLabel: string;
  nextLabel: string;
  navLabel?: string;
  pageLabel?: (page: number) => string;
  className?: string;
};

export function Pagination({
  currentPage,
  totalPages,
  buildHref,
  previousLabel,
  nextLabel,
  navLabel = "Pagination",
  pageLabel,
  className = "",
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = visiblePageItems(currentPage, totalPages);
  const prevHref = currentPage > 1 ? buildHref(currentPage - 1) : null;
  const nextHref = currentPage < totalPages ? buildHref(currentPage + 1) : null;

  return (
    <nav
      aria-label={navLabel}
      className={`mt-10 flex flex-wrap items-center justify-center gap-2 ${className}`}
    >
      {prevHref ? (
        <Link
          href={prevHref}
          className={`${btnBase} ${btnIdle} px-4`}
          aria-label={previousLabel}
        >
          {previousLabel}
        </Link>
      ) : (
        <span className={`${btnBase} ${btnDisabled} px-4`} aria-disabled="true">
          {previousLabel}
        </span>
      )}

      {pages.map((item, index) =>
        item === "ellipsis" ? (
          <span
            key={`ellipsis-${index}`}
            className="px-1 text-sm font-semibold text-muted"
            aria-hidden="true"
          >
            …
          </span>
        ) : item === currentPage ? (
          <span
            key={item}
            className={`${btnBase} ${btnActive}`}
            aria-current="page"
            aria-label={pageLabel?.(item) ?? String(item)}
          >
            {item}
          </span>
        ) : (
          <Link
            key={item}
            href={buildHref(item)}
            className={`${btnBase} ${btnIdle}`}
            aria-label={pageLabel?.(item) ?? String(item)}
          >
            {item}
          </Link>
        ),
      )}

      {nextHref ? (
        <Link
          href={nextHref}
          className={`${btnBase} ${btnIdle} px-4`}
          aria-label={nextLabel}
        >
          {nextLabel}
        </Link>
      ) : (
        <span className={`${btnBase} ${btnDisabled} px-4`} aria-disabled="true">
          {nextLabel}
        </span>
      )}
    </nav>
  );
}

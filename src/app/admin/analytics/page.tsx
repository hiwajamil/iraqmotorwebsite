"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/lib/api";
import {
  type AnalyticsReport,
  defaultAnalyticsRange,
  downloadCsv,
  presetRange,
} from "@/lib/admin";
import { t, type DictKey } from "@/lib/i18n";
import { useAppSelector } from "@/store/hooks";

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_SPAN = 366;
const PRESETS = [7, 14, 30, 90] as const;
const PRESET_LABEL: Record<(typeof PRESETS)[number], DictKey> = {
  7: "preset7",
  14: "preset14",
  30: "preset30",
  90: "preset90",
};

function isDay(value: string): boolean {
  return DAY_RE.test(value);
}

function spanDays(startDate: string, endDate: string): number {
  const start = Date.UTC(
    Number(startDate.slice(0, 4)),
    Number(startDate.slice(5, 7)) - 1,
    Number(startDate.slice(8, 10)),
  );
  const end = Date.UTC(
    Number(endDate.slice(0, 4)),
    Number(endDate.slice(5, 7)) - 1,
    Number(endDate.slice(8, 10)),
  );
  return Math.floor((end - start) / 86_400_000) + 1;
}

function isValidRange(startDate: string, endDate: string): boolean {
  return (
    isDay(startDate) &&
    isDay(endDate) &&
    startDate <= endDate &&
    spanDays(startDate, endDate) <= MAX_SPAN
  );
}

function formatIqd(n: number) {
  return `${n.toLocaleString()} IQD`;
}

function matchingPreset(startDate: string, endDate: string): number | null {
  for (const days of PRESETS) {
    const range = presetRange(days);
    if (range.startDate === startDate && range.endDate === endDate) return days;
  }
  return null;
}

function DailyArea({
  data,
  emptyLabel,
}: {
  data: { date: string; count: number }[];
  emptyLabel: string;
}) {
  if (data.length === 0) {
    return <p className="text-sm text-muted">{emptyLabel}</p>;
  }
  return (
    <div className="h-40">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <CartesianGrid stroke="var(--outline)" strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--outline)" }}
            minTickGap={28}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--outline)" }}
            width={36}
          />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--outline)",
              borderRadius: 12,
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--foreground)" }}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="var(--primary)"
            fill="var(--primary)"
            fillOpacity={0.18}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-[var(--radius-card)] bg-card p-4 ring-1 ring-outline">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-muted">{hint}</p> : null}
    </div>
  );
}

function KpiSkeleton() {
  return (
    <div className="rounded-[var(--radius-card)] bg-card p-4 ring-1 ring-outline">
      <div className="h-3 w-24 animate-pulse rounded bg-input" />
      <div className="mt-3 h-7 w-20 animate-pulse rounded bg-input" />
    </div>
  );
}

function AnalyticsInner() {
  const locale = useAppSelector((s) => s.preferences.locale);
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaults = defaultAnalyticsRange();
  const urlStart = searchParams.get("start") || "";
  const urlEnd = searchParams.get("end") || "";
  const initial = isValidRange(urlStart, urlEnd)
    ? { startDate: urlStart, endDate: urlEnd }
    : defaults;

  const [startDate, setStartDate] = useState(initial.startDate);
  const [endDate, setEndDate] = useState(initial.endDate);
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const writeRange = useCallback(
    (start: string, end: string) => {
      const params = new URLSearchParams();
      params.set("start", start);
      params.set("end", end);
      router.replace(`/admin/analytics?${params.toString()}`, { scroll: false });
    },
    [router],
  );

  const generate = useCallback(
    async (nextStart = startDate, nextEnd = endDate) => {
      if (!isValidRange(nextStart, nextEnd)) {
        setError(t(locale, "failedToLoadAnalytics"));
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await api.post<AnalyticsReport>("/admin/analytics", {
          startDate: nextStart,
          endDate: nextEnd,
        });
        setReport(data);
        writeRange(nextStart, nextEnd);
      } catch (e) {
        setReport(null);
        setError(
          e instanceof Error ? e.message : t(locale, "failedToLoadAnalytics"),
        );
      } finally {
        setLoading(false);
      }
    },
    [startDate, endDate, locale, writeRange],
  );

  useEffect(() => {
    void generate(initial.startDate, initial.endDate);
    // First paint only; later range changes go through Generate / presets.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyPreset(days: number) {
    const range = presetRange(days);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
    void generate(range.startDate, range.endDate);
  }

  const activePreset = matchingPreset(startDate, endDate);
  const gaOk = report?.gaAvailable === true;
  const estimated =
    report?.estimatedListingFees ??
    (report?.revenueCard ?? 0) +
      (report?.revenueEWallet ?? 0) +
      (report?.revenueUnknown ?? 0);
  const paid = report?.paidRevenue ?? report?.totalRevenue ?? 0;

  const cities = useMemo(
    () =>
      report?.cityPerformance?.length
        ? report.cityPerformance
        : (report?.cityVisitors ?? []).map((c) => ({
            city: c.city,
            totalAds: 0,
            approvedAds: 0,
            visitorCount: c.count,
          })),
    [report],
  );

  const showSkeleton = loading && !report;

  return (
    <div>
      <div>
        <h1 className="text-3xl font-bold">
          {t(locale, "adminAnalyticsTitle")}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {t(locale, "adminAnalyticsSubtitle")}
        </p>
        <p className="mt-1 text-xs text-muted">{t(locale, "analyticsUtcHint")}</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {PRESETS.map((days) => (
          <button
            key={days}
            type="button"
            disabled={loading}
            onClick={() => applyPreset(days)}
            className={`rounded-full px-3 py-1 text-xs font-semibold disabled:opacity-50 ${
              activePreset === days
                ? "bg-primary text-on-primary"
                : "bg-input text-muted"
            }`}
          >
            {t(locale, PRESET_LABEL[days])}
          </button>
        ))}
      </div>

      <form
        className="mt-4 flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void generate();
        }}
      >
        <label className="text-xs font-semibold text-muted">
          {t(locale, "dateStart")}
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 block rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm text-foreground"
          />
        </label>
        <label className="text-xs font-semibold text-muted">
          {t(locale, "dateEnd")}
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-1 block rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm text-foreground"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="rounded-[var(--radius-control)] bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-50"
        >
          {loading ? t(locale, "loading") : t(locale, "generateReport")}
        </button>
        {report ? (
          <button
            type="button"
            className="rounded-[var(--radius-control)] bg-input px-4 py-2 text-sm font-semibold"
            onClick={() => {
              const rows: string[][] = [
                ["Metric", "Value"],
                [t(locale, "metricNewAds"), String(report.totalNewAds ?? 0)],
                [t(locale, "metricEstimatedFees"), String(estimated)],
                [t(locale, "metricPaidRevenue"), String(paid)],
                [t(locale, "metricPaidCount"), String(report.paidCount ?? 0)],
                [
                  t(locale, "metricCardRevenue"),
                  String(report.estimatedFeesCard ?? report.revenueCard ?? 0),
                ],
                [
                  t(locale, "metricEwalletRevenue"),
                  String(
                    report.estimatedFeesEWallet ?? report.revenueEWallet ?? 0,
                  ),
                ],
                [
                  t(locale, "metricUnknownPayment"),
                  String(report.estimatedFeesUnknown ?? report.revenueUnknown ?? 0),
                ],
                [
                  t(locale, "metricTodaysDau"),
                  gaOk ? String(report.todaysActiveUsers) : "",
                ],
                [
                  t(locale, "metricAppDownloads"),
                  gaOk ? String(report.totalAppDownloads) : "",
                ],
                [],
                ["Date", t(locale, "metricNewAds")],
                ...(report.dailyNewAds ?? []).map((d) => [
                  d.date,
                  String(d.count),
                ]),
                [],
                ["Date", t(locale, "chartDailyDau")],
                ...report.dailyActiveUsers.map((d) => [
                  d.date,
                  String(d.count),
                ]),
                [],
                [
                  t(locale, "colCity"),
                  t(locale, "colVisitors"),
                  t(locale, "colNewAds"),
                  t(locale, "colApproved"),
                ],
                ...cities.map((c) => [
                  c.city,
                  String(c.visitorCount ?? 0),
                  String(c.totalAds),
                  String(c.approvedAds),
                ]),
              ];
              downloadCsv(`analytics-${startDate}-${endDate}.csv`, rows);
            }}
          >
            {t(locale, "exportCsv")}
          </button>
        ) : null}
      </form>

      {error ? (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {showSkeleton ? (
        <div className="mt-8 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <KpiSkeleton key={i} />
            ))}
          </div>
          <div className="grid gap-6 xl:grid-cols-2">
            <div className="h-56 animate-pulse rounded-[var(--radius-card)] bg-card ring-1 ring-outline" />
            <div className="h-56 animate-pulse rounded-[var(--radius-card)] bg-card ring-1 ring-outline" />
          </div>
        </div>
      ) : null}

      {report ? (
        <>
          <h2 className="mt-8 text-lg font-semibold">
            {t(locale, "analyticsMarketplace")}
          </h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            <Kpi
              label={t(locale, "metricNewAds")}
              value={(report.totalNewAds ?? 0).toLocaleString()}
            />
            <Kpi
              label={t(locale, "metricEstimatedFees")}
              value={formatIqd(estimated)}
            />
            <Kpi
              label={t(locale, "metricPaidRevenue")}
              value={formatIqd(paid)}
            />
            <Kpi
              label={t(locale, "metricPaidCount")}
              value={(report.paidCount ?? 0).toLocaleString()}
            />
            <Kpi
              label={t(locale, "metricCardRevenue")}
              value={formatIqd(
                report.estimatedFeesCard ?? report.revenueCard ?? 0,
              )}
            />
            <Kpi
              label={t(locale, "metricEwalletRevenue")}
              value={formatIqd(
                report.estimatedFeesEWallet ?? report.revenueEWallet ?? 0,
              )}
            />
            <Kpi
              label={t(locale, "metricUnknownPayment")}
              value={formatIqd(
                report.estimatedFeesUnknown ?? report.revenueUnknown ?? 0,
              )}
            />
            <Kpi
              label={t(locale, "metricCities")}
              value={cities.length.toLocaleString()}
            />
          </div>

          <h2 className="mt-10 text-lg font-semibold">
            {t(locale, "analyticsAudience")}
          </h2>
          <p className="mt-1 text-xs text-muted">
            {t(locale, "analyticsGaOptional")}
          </p>
          {!gaOk ? (
            <p className="mt-2 text-sm text-muted">
              {report.gaError
                ? t(locale, "gaWarning", { error: report.gaError })
                : t(locale, "gaUnavailableHint")}
            </p>
          ) : null}
          <div className="mt-3 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            <Kpi
              label={t(locale, "metricTodaysDau")}
              value={gaOk ? report.todaysActiveUsers.toLocaleString() : "—"}
            />
            <Kpi
              label={t(locale, "metricAppDownloads")}
              value={gaOk ? report.totalAppDownloads.toLocaleString() : "—"}
            />
            <Kpi
              label={t(locale, "metricGaStatus")}
              value={
                gaOk ? t(locale, "gaConnected") : t(locale, "gaOffline")
              }
            />
          </div>

          <div className="mt-10 grid gap-6 xl:grid-cols-2">
            <section className="rounded-[var(--radius-card)] bg-card p-4 ring-1 ring-outline">
              <h2 className="text-lg font-semibold">
                {t(locale, "chartDailyNewAds")}
              </h2>
              <p className="mt-1 text-[11px] text-muted">
                {t(locale, "analyticsUtcHint")}
              </p>
              <div className="mt-4">
                <DailyArea
                  data={report.dailyNewAds ?? []}
                  emptyLabel={t(locale, "noData")}
                />
              </div>
            </section>
            <section className="rounded-[var(--radius-card)] bg-card p-4 ring-1 ring-outline">
              <h2 className="text-lg font-semibold">
                {t(locale, "chartDailyDau")}
              </h2>
              <p className="mt-1 text-[11px] text-muted">
                {gaOk
                  ? t(locale, "analyticsUtcHint")
                  : t(locale, "gaUnavailableHint")}
              </p>
              <div className="mt-4">
                <DailyArea
                  data={report.dailyActiveUsers}
                  emptyLabel={t(locale, "noData")}
                />
              </div>
            </section>
          </div>

          <h2 className="mt-10 text-lg font-semibold">
            {t(locale, "cityPerformance")}
          </h2>
          <div className="mt-4 overflow-x-auto rounded-[var(--radius-card)] ring-1 ring-outline">
            <table className="w-full text-left text-sm">
              <thead className="bg-input text-xs uppercase text-muted">
                <tr>
                  <th className="px-4 py-3">{t(locale, "colCity")}</th>
                  <th className="px-4 py-3">{t(locale, "colVisitors")}</th>
                  <th className="px-4 py-3">{t(locale, "colNewAds")}</th>
                  <th className="px-4 py-3">{t(locale, "colApproved")}</th>
                </tr>
              </thead>
              <tbody>
                {cities.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-muted">
                      {t(locale, "noCityData")}
                    </td>
                  </tr>
                ) : (
                  cities.slice(0, 50).map((row) => (
                    <tr key={row.city} className="border-t border-outline">
                      <td className="px-4 py-3">{row.city}</td>
                      <td className="px-4 py-3">
                        {gaOk ? (row.visitorCount ?? 0).toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {row.totalAds.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        {row.approvedAds.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-3">
          <div className="h-8 w-48 animate-pulse rounded bg-input" />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-[var(--radius-card)] bg-card ring-1 ring-outline"
              />
            ))}
          </div>
        </div>
      }
    >
      <AnalyticsInner />
    </Suspense>
  );
}

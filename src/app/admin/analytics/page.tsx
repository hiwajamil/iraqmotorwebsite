"use client";

import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import {
  type AnalyticsReport,
  defaultAnalyticsRange,
  downloadCsv,
} from "@/lib/admin";

function presetRange(days: number): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  start.setUTCDate(end.getUTCDate() - (days - 1));
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { startDate: fmt(start), endDate: fmt(end) };
}

function formatIqd(n: number) {
  return `${n.toLocaleString()} IQD`;
}

function MiniBars({
  data,
  max,
  colorClass = "bg-primary/80",
}: {
  data: { date: string; count: number }[];
  max: number;
  colorClass?: string;
}) {
  if (data.length === 0) {
    return <p className="text-sm text-muted">No data.</p>;
  }
  return (
    <div className="flex h-40 items-end gap-1 overflow-x-auto">
      {data.map((day) => (
        <div
          key={day.date}
          className="group flex min-w-[10px] flex-1 flex-col items-center justify-end"
          title={`${day.date}: ${day.count.toLocaleString()}`}
        >
          <span className="mb-1 hidden text-[9px] text-muted opacity-0 group-hover:inline group-hover:opacity-100">
            {day.count}
          </span>
          <div
            className={`w-full rounded-t ${colorClass} transition group-hover:opacity-100`}
            style={{
              height: `${Math.max(4, (day.count / Math.max(max, 1)) * 100)}%`,
            }}
          />
        </div>
      ))}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const defaults = defaultAnalyticsRange();
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate(nextStart = startDate, nextEnd = endDate) {
    setLoading(true);
    setError(null);
    try {
      const data = await api.post<AnalyticsReport>("/admin/analytics", {
        startDate: nextStart,
        endDate: nextEnd,
      });
      setReport(data);
      if (data.gaError && !data.gaAvailable) {
        setError(`GA: ${data.gaError} — marketplace metrics still loaded.`);
      }
    } catch (e) {
      setReport(null);
      setError(e instanceof Error ? e.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }

  function applyPreset(days: number) {
    const range = presetRange(days);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
    void generate(range.startDate, range.endDate);
  }

  const maxDau = Math.max(
    1,
    ...(report?.dailyActiveUsers.map((d) => d.count) ?? [1]),
  );
  const maxAds = Math.max(
    1,
    ...(report?.dailyNewAds?.map((d) => d.count) ?? [1]),
  );

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

  return (
    <div>
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="mt-1 text-sm text-muted">
          Marketplace revenue &amp; new ads, plus Google Analytics when configured
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {[
          [7, "7 days"],
          [14, "14 days"],
          [30, "30 days"],
          [90, "90 days"],
        ].map(([days, label]) => (
          <button
            key={String(days)}
            type="button"
            disabled={loading}
            onClick={() => applyPreset(Number(days))}
            className="rounded-full bg-input px-3 py-1 text-xs font-semibold disabled:opacity-50"
          >
            {label}
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
          Start
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 block rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm text-foreground"
          />
        </label>
        <label className="text-xs font-semibold text-muted">
          End
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
          {loading ? "Loading…" : "Generate report"}
        </button>
        {report ? (
          <button
            type="button"
            className="rounded-[var(--radius-control)] bg-input px-4 py-2 text-sm font-semibold"
            onClick={() => {
              const rows: string[][] = [
                ["Metric", "Value"],
                ["Todays active users", String(report.todaysActiveUsers)],
                ["App downloads", String(report.totalAppDownloads)],
                ["New ads", String(report.totalNewAds ?? 0)],
                ["Total revenue IQD", String(report.totalRevenue ?? 0)],
                ["Card revenue IQD", String(report.revenueCard ?? 0)],
                ["E-wallet revenue IQD", String(report.revenueEWallet ?? 0)],
                [],
                ["Date", "Daily active users"],
                ...report.dailyActiveUsers.map((d) => [
                  d.date,
                  String(d.count),
                ]),
                [],
                ["Date", "New ads"],
                ...(report.dailyNewAds ?? []).map((d) => [
                  d.date,
                  String(d.count),
                ]),
                [],
                ["City", "Visitors", "Total ads", "Approved ads"],
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
            Export CSV
          </button>
        ) : null}
      </form>

      {error ? <p className="mt-4 text-sm text-amber-700">{error}</p> : null}

      {!report && !error ? (
        <div className="mt-8 rounded-[var(--radius-card)] bg-card p-8 text-center ring-1 ring-outline">
          <p className="font-semibold">Generate a report</p>
          <p className="mt-1 text-sm text-muted">
            Pick a preset or date range. Marketplace metrics work without GA;
            visitor charts need GA credentials on the API.
          </p>
        </div>
      ) : null}

      {report ? (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {(
              [
                ["New ads", report.totalNewAds ?? 0],
                ["Total revenue", report.totalRevenue ?? 0, true],
                ["Card revenue", report.revenueCard ?? 0, true],
                ["E-wallet revenue", report.revenueEWallet ?? 0, true],
                ["Today's active users", report.todaysActiveUsers],
                ["App downloads", report.totalAppDownloads],
                ["Cities", cities.length],
                [
                  "GA status",
                  report.gaAvailable ? "Connected" : "Offline",
                  false,
                  true,
                ],
              ] as const
            ).map(([label, value, money, text]) => (
              <div
                key={label}
                className="rounded-[var(--radius-card)] bg-card p-4 ring-1 ring-outline"
              >
                <p className="text-xs uppercase tracking-wide text-muted">
                  {label}
                </p>
                <p className="mt-2 text-2xl font-bold">
                  {text
                    ? String(value)
                    : money
                      ? formatIqd(Number(value))
                      : Number(value).toLocaleString()}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-10 grid gap-6 xl:grid-cols-2">
            <section className="rounded-[var(--radius-card)] bg-card p-4 ring-1 ring-outline">
              <h2 className="text-lg font-semibold">Daily new ads</h2>
              <div className="mt-4">
                <MiniBars
                  data={report.dailyNewAds ?? []}
                  max={maxAds}
                  colorClass="bg-emerald-500/80 group-hover:bg-emerald-500"
                />
              </div>
            </section>
            <section className="rounded-[var(--radius-card)] bg-card p-4 ring-1 ring-outline">
              <h2 className="text-lg font-semibold">Daily active users</h2>
              <div className="mt-4">
                <MiniBars data={report.dailyActiveUsers} max={maxDau} />
              </div>
            </section>
          </div>

          <h2 className="mt-10 text-lg font-semibold">City performance</h2>
          <div className="mt-4 overflow-x-auto rounded-[var(--radius-card)] ring-1 ring-outline">
            <table className="w-full text-left text-sm">
              <thead className="bg-input text-xs uppercase text-muted">
                <tr>
                  <th className="px-4 py-3">City</th>
                  <th className="px-4 py-3">Visitors</th>
                  <th className="px-4 py-3">New ads</th>
                  <th className="px-4 py-3">Approved</th>
                </tr>
              </thead>
              <tbody>
                {cities.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-muted">
                      No city data.
                    </td>
                  </tr>
                ) : (
                  cities.slice(0, 50).map((row) => (
                    <tr key={row.city} className="border-t border-outline">
                      <td className="px-4 py-3">{row.city}</td>
                      <td className="px-4 py-3">
                        {(row.visitorCount ?? 0).toLocaleString()}
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

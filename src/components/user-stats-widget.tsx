"use client";

import { useEffect, useState } from "react";
import { Apple, Globe, Smartphone, Users } from "lucide-react";
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
  defaultAnalyticsRange,
  presetRange,
  type UserRegistrationStats,
} from "@/lib/admin";
import { t, type DictKey } from "@/lib/i18n";
import { useAppSelector } from "@/store/hooks";

type PresetId = "today" | "week" | "month";

const PRESETS: { id: PresetId; days: number; labelKey: DictKey }[] = [
  { id: "today", days: 1, labelKey: "presetToday" },
  { id: "week", days: 7, labelKey: "presetThisWeek" },
  { id: "month", days: 30, labelKey: "presetThisMonth" },
];

export function UserStatsWidget() {
  const locale = useAppSelector((s) => s.preferences.locale);
  const defaults = defaultAnalyticsRange();
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [preset, setPreset] = useState<PresetId | "custom">("month");
  const [stats, setStats] = useState<UserRegistrationStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await api.get<UserRegistrationStats>(
          "/admin/users/stats",
          { startDate, endDate },
        );
        if (!cancelled) setStats(data);
      } catch (e) {
        if (!cancelled) {
          setStats(null);
          setError(
            e instanceof Error
              ? e.message
              : t(locale, "failedToLoadUserStats"),
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [startDate, endDate, locale]);

  function applyPreset(id: PresetId, days: number) {
    const range = presetRange(days);
    setPreset(id);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  }

  const cards = [
    {
      key: "total",
      label: t(locale, "userStatsTotal"),
      value: stats?.totalRegistrations ?? 0,
      Icon: Users,
    },
    {
      key: "ios",
      label: t(locale, "userStatsIos"),
      value: stats?.platformBreakdown.ios ?? 0,
      Icon: Apple,
    },
    {
      key: "android",
      label: t(locale, "userStatsAndroid"),
      value: stats?.platformBreakdown.android ?? 0,
      Icon: Smartphone,
    },
    {
      key: "web",
      label: t(locale, "userStatsWeb"),
      value: stats?.platformBreakdown.web ?? 0,
      Icon: Globe,
    },
  ] as const;

  const empty =
    !loading &&
    !error &&
    (stats?.totalRegistrations ?? 0) === 0;

  return (
    <section className="mt-6 rounded-[var(--radius-card)] bg-card p-4 ring-1 ring-outline sm:p-5">
      <div>
        <h2 className="text-lg font-semibold">{t(locale, "userStatsTitle")}</h2>
        <p className="mt-1 text-sm text-muted">
          {t(locale, "userStatsSubtitle")}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {PRESETS.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={loading}
            onClick={() => applyPreset(item.id, item.days)}
            className={`rounded-full px-3 py-1 text-xs font-semibold disabled:opacity-50 ${
              preset === item.id
                ? "bg-primary text-on-primary"
                : "bg-input"
            }`}
          >
            {t(locale, item.labelKey)}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="text-xs font-semibold text-muted">
          {t(locale, "dateStart")}
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setPreset("custom");
              setStartDate(e.target.value);
            }}
            className="mt-1 block rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm text-foreground"
          />
        </label>
        <label className="text-xs font-semibold text-muted">
          {t(locale, "dateEnd")}
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setPreset("custom");
              setEndDate(e.target.value);
            }}
            className="mt-1 block rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm text-foreground"
          />
        </label>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-red-600">{error}</p>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ key, label, value, Icon }) => (
          <div
            key={key}
            className="rounded-[var(--radius-card)] bg-card p-4 ring-1 ring-outline"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs uppercase tracking-wide text-muted">
                {label}
              </p>
              <Icon className="size-4 text-primary" aria-hidden />
            </div>
            <p className="mt-2 text-2xl font-bold text-primary">
              {loading ? "—" : value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5">
        <h3 className="text-sm font-semibold">
          {t(locale, "userStatsChartTitle")}
        </h3>
        <div className="mt-3 h-56">
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-muted">
              {t(locale, "loading")}
            </div>
          ) : empty ? (
            <div className="flex h-full items-center justify-center text-sm text-muted">
              {t(locale, "userStatsEmpty")}
            </div>
          ) : stats ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.chartData}>
                <CartesianGrid stroke="var(--outline)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "var(--muted)" }}
                  tickLine={false}
                  axisLine={{ stroke: "var(--outline)" }}
                  minTickGap={24}
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
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted">
              {t(locale, "noData")}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

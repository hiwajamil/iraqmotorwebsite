"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, MapPin, Search } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { OfferServiceModal } from "@/components/offer-service-modal";
import { api } from "@/lib/api";
import {
  SERVICE_CITIES,
  serviceCategoryIcon,
  serviceCategorySubtext,
  serviceCategoryTitle,
  serviceCityLabel,
  serviceStatusLabel,
  type ServiceCategory,
  type UserService,
} from "@/lib/car-services";
import { homeCityLabel } from "@/lib/home-data";
import { t } from "@/lib/i18n";
import { useAppSelector } from "@/store/hooks";

type Tab = "categories" | "cities";

function statusClass(status: string): string {
  if (status === "approved") return "bg-emerald-500/15 text-emerald-700";
  if (status === "pending") return "bg-amber-500/15 text-amber-700";
  if (status === "rejected") return "bg-red-500/15 text-red-700";
  return "bg-input text-muted";
}

export function ServicesClient({
  initialCategories,
}: {
  initialCategories: ServiceCategory[];
}) {
  const locale = useAppSelector((s) => s.preferences.locale);
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("categories");
  const [search, setSearch] = useState("");
  const [categories, setCategories] = useState(initialCategories);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [offerOpen, setOfferOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] =
    useState<ServiceCategory | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [offerings, setOfferings] = useState<UserService[]>([]);
  const [offeringsLoading, setOfferingsLoading] = useState(false);
  const [offeringsError, setOfferingsError] = useState<string | null>(null);
  const [mine, setMine] = useState<UserService[]>([]);

  useEffect(() => {
    if (initialCategories.length) return;
    let cancelled = false;
    void api
      .get<{ items: ServiceCategory[] }>("/services/categories")
      .then((d) => {
        if (!cancelled) {
          setCategories(d.items ?? []);
          setCategoriesError(null);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setCategoriesError(
            e instanceof Error ? e.message : t(locale, "servicesLoadFailed"),
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [initialCategories.length, locale]);

  const loadMine = useCallback(() => {
    if (!user) {
      setMine([]);
      return;
    }
    void api
      .get<{ items: UserService[] }>("/services/mine")
      .then((d) => setMine(d.items ?? []))
      .catch(() => setMine([]));
  }, [user]);

  useEffect(() => {
    loadMine();
  }, [loadMine]);

  useEffect(() => {
    if (!selectedCategory && !selectedCity) {
      setOfferings([]);
      setOfferingsError(null);
      return;
    }
    let cancelled = false;
    setOfferingsLoading(true);
    const query: Record<string, string> = {};
    if (selectedCategory) query.categoryId = String(selectedCategory.id);
    if (selectedCity) query.city = selectedCity;
    void api
      .get<{ items: UserService[] }>("/services", query)
      .then((d) => {
        if (cancelled) return;
        setOfferings(d.items ?? []);
        setOfferingsError(null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setOfferings([]);
        setOfferingsError(
          e instanceof Error ? e.message : t(locale, "servicesLoadFailed"),
        );
      })
      .finally(() => {
        if (!cancelled) setOfferingsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCategory, selectedCity, locale]);

  const q = search.trim().toLowerCase();
  const filteredCategories = useMemo(
    () =>
      categories.filter((c) => {
        if (!q) return true;
        const title = serviceCategoryTitle(locale, c).toLowerCase();
        const sub = serviceCategorySubtext(locale, c).toLowerCase();
        return title.includes(q) || sub.includes(q) || c.slug.includes(q);
      }),
    [categories, locale, q],
  );
  const filteredCities = useMemo(
    () =>
      SERVICE_CITIES.filter((c) => {
        if (!q) return true;
        return (
          homeCityLabel(c, locale).toLowerCase().includes(q) ||
          c.en.toLowerCase().includes(q)
        );
      }),
    [locale, q],
  );

  const drilldown = selectedCategory || selectedCity;

  function openOffer() {
    if (!user) {
      window.location.assign("/auth?next=/services");
      return;
    }
    setOfferOpen(true);
  }

  return (
    <div className="mx-auto max-w-[1400px] px-[4%] pb-16 pt-24">
      <div className="lg:grid lg:grid-cols-[minmax(0,320px)_1fr] lg:items-start lg:gap-8">
        <aside className="mb-8 space-y-4 lg:sticky lg:top-24 lg:mb-0 lg:self-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              {t(locale, "services")}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {t(locale, "servicesSubtitle")}
            </p>
          </div>

          <label className="relative block">
            <Search
              className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t(locale, "servicesSearch")}
              className="w-full rounded-[12px] bg-input py-3.5 ps-10 pe-4 text-sm outline-none ring-1 ring-transparent focus:ring-primary"
            />
          </label>

          <div className="flex rounded-[12px] bg-input p-1">
            {(
              [
                ["categories", "servicesTabCategories"],
                ["cities", "servicesTabCities"],
              ] as const
            ).map(([key, labelKey]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setTab(key);
                  setSelectedCategory(null);
                  setSelectedCity(null);
                }}
                className={`flex-1 rounded-[10px] px-2 py-2 text-xs font-semibold transition ${
                  tab === key
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {t(locale, labelKey)}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={openOffer}
            className="w-full rounded-[12px] bg-primary px-4 py-3.5 text-sm font-semibold text-on-primary shadow-sm transition hover:brightness-110"
          >
            {t(locale, "servicesOffer")}
          </button>

          {mine.length ? (
            <div className="rounded-[16px] bg-card p-4 ring-1 ring-outline">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                {t(locale, "servicesYourOfferings")}
              </p>
              <ul className="mt-2 space-y-2">
                {mine.slice(0, 5).map((item) => (
                  <li key={item.id} className="text-sm">
                    <p className="font-medium">{item.title}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {serviceCityLabel(locale, item.city)}
                      <span
                        className={`ms-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClass(item.status)}`}
                      >
                        {serviceStatusLabel(locale, item.status)}
                      </span>
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>

        <section>
          {drilldown ? (
            <div>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory(null);
                  setSelectedCity(null);
                }}
                className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-primary"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                {t(locale, "servicesBackToGrid")}
              </button>
              <h2 className="text-2xl font-bold">
                {selectedCategory
                  ? serviceCategoryTitle(locale, selectedCategory)
                  : selectedCity
                    ? serviceCityLabel(locale, selectedCity)
                    : ""}
              </h2>
              {selectedCategory ? (
                <p className="mt-1 text-sm text-muted">
                  {serviceCategorySubtext(locale, selectedCategory)}
                </p>
              ) : null}

              {offeringsError ? (
                <p className="mt-4 text-sm text-red-600" role="alert">
                  {offeringsError}
                </p>
              ) : null}

              {offeringsLoading ? (
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-36 animate-pulse rounded-[16px] bg-input"
                    />
                  ))}
                </div>
              ) : !offeringsError && offerings.length === 0 ? (
                <div className="mt-8 rounded-[16px] bg-card p-8 text-center ring-1 ring-outline">
                  <p className="font-semibold">
                    {t(locale, "servicesEmptyOfferings")}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {t(locale, "servicesEmptyOfferingsHint")}
                  </p>
                </div>
              ) : (
                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                  {offerings.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-[16px] bg-card p-5 ring-1 ring-outline"
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                        {item.categoryTitle
                          ? serviceCategoryTitle(locale, {
                              slug: item.categorySlug || "",
                              title: item.categoryTitle,
                            })
                          : serviceCityLabel(locale, item.city)}
                      </p>
                      <h3 className="mt-1 font-semibold">{item.title}</h3>
                      <p className="mt-2 text-sm text-muted">{item.description}</p>
                      <p className="mt-3 text-sm font-medium">
                        {serviceCityLabel(locale, item.city)}
                      </p>
                      {item.phone ? (
                        <a
                          href={`tel:${item.phone}`}
                          className="mt-1 inline-block text-sm font-semibold text-primary"
                          dir="ltr"
                        >
                          {item.phone}
                        </a>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </div>
          ) : tab === "categories" ? (
            <>
              {categoriesError ? (
                <p className="text-sm text-red-600" role="alert">
                  {categoriesError}
                </p>
              ) : null}
              {filteredCategories.length === 0 ? (
                <div className="rounded-[16px] bg-card p-8 text-center ring-1 ring-outline">
                  <p className="font-semibold">
                    {t(locale, "servicesEmptyCategories")}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {filteredCategories.map((category) => {
                    const Icon = serviceCategoryIcon(category.iconName);
                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(category);
                          setSelectedCity(null);
                        }}
                        className="flex items-start gap-4 rounded-[16px] bg-card p-5 text-start ring-1 ring-outline transition hover:ring-primary/40"
                      >
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] bg-primary/10 text-primary">
                          <Icon className="h-6 w-6" aria-hidden />
                        </span>
                        <span>
                          <span className="block font-semibold">
                            {serviceCategoryTitle(locale, category)}
                          </span>
                          <span className="mt-1 block text-sm text-muted">
                            {serviceCategorySubtext(locale, category)}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          ) : filteredCities.length === 0 ? (
            <div className="rounded-[16px] bg-card p-8 text-center ring-1 ring-outline">
              <p className="font-semibold">{t(locale, "servicesEmptyCities")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {filteredCities.map((city) => (
                <button
                  key={city.key}
                  type="button"
                  onClick={() => {
                    setSelectedCity(city.en);
                    setSelectedCategory(null);
                  }}
                  className="flex flex-col items-start gap-3 rounded-[16px] bg-card p-5 text-start ring-1 ring-outline transition hover:ring-primary/40"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-primary/10 text-primary">
                    <MapPin className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="font-semibold">
                    {homeCityLabel(city, locale)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      <OfferServiceModal
        open={offerOpen}
        categories={categories}
        onClose={() => setOfferOpen(false)}
        onCreated={() => loadMine()}
      />
    </div>
  );
}

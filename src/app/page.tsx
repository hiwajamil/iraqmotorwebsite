import { HomeMarketplace } from "@/components/home-marketplace";
import { api, type Car } from "@/lib/api";

export const dynamic = "force-dynamic";

async function loadHomeData() {
  try {
    const [list, recommendedRes, trendingRes] = await Promise.all([
      api.get<{ items: Car[] }>("/cars", { limit: "24" }, { revalidate: 30 }),
      api
        .get<{ items: Car[] }>("/cars/recommended", undefined, { revalidate: 60 })
        .catch(() => ({ items: [] as Car[] })),
      api
        .get<{ items: Car[] }>("/cars/trending", undefined, { revalidate: 60 })
        .catch(() => ({ items: [] as Car[] })),
    ]);
    const items = list.items ?? [];
    const recommended =
      (recommendedRes.items?.length
        ? recommendedRes.items
        : trendingRes.items?.length
          ? trendingRes.items
          : items
      ).slice(0, 8);
    return { cars: items, recommended };
  } catch {
    return { cars: [], recommended: [] };
  }
}

export default async function HomePage() {
  const { cars, recommended } = await loadHomeData();
  return <HomeMarketplace initialCars={cars} recommended={recommended} />;
}

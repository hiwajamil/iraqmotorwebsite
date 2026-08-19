import { HomeMarketplace } from "@/components/home-marketplace";
import { api, type Car } from "@/lib/api";

export const dynamic = "force-dynamic";

const HOME_CARS_LIMIT = "24";

async function loadHomeData() {
  try {
    const list = await api.get<{ items: Car[] }>(
      "/cars",
      { status: "active", limit: HOME_CARS_LIMIT },
      { revalidate: 30 },
    );
    return { cars: list.items ?? [], loadError: false };
  } catch {
    return { cars: [] as Car[], loadError: true };
  }
}

export default async function HomePage() {
  const { cars, loadError } = await loadHomeData();
  return <HomeMarketplace initialCars={cars} loadError={loadError} />;
}

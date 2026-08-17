import { api } from "@/lib/api";
import type { ServiceCategory } from "@/lib/car-services";
import { ServicesClient } from "./services-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Car Services — Iraq Motors",
  description:
    "Find maintenance, insurance, registration, tyres, and mechanical services across Iraq — or offer your own.",
};

async function loadCategories(): Promise<ServiceCategory[]> {
  try {
    const data = await api.get<{ items: ServiceCategory[] }>(
      "/services/categories",
      undefined,
      { revalidate: 60 },
    );
    return data.items ?? [];
  } catch {
    return [];
  }
}

export default async function ServicesPage() {
  const categories = await loadCategories();
  return <ServicesClient initialCategories={categories} />;
}

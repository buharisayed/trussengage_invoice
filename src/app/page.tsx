import { getDashboardData } from "@/lib/storage";
import { Dashboard } from "@/components/Dashboard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { documents, settings } = await getDashboardData();

  return <Dashboard initialDocuments={documents} settings={settings} />;
}

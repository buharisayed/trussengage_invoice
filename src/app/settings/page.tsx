import { SettingsClient } from "@/components/SettingsClient";
import { getSettingsAndClients, getStorageMode } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { settings, clients } = await getSettingsAndClients();
  const storageMode = getStorageMode();
  return (
    <SettingsClient
      initialSettings={settings}
      initialClients={clients}
      storageMode={storageMode}
    />
  );
}

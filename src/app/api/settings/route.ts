import { NextResponse } from "next/server";
import {
  deleteClientById,
  getSettingsAndClients,
  updateSettings,
  upsertClient,
} from "@/lib/storage";
import type { ClientRecord, CompanySettings } from "@/types/document";

export async function GET() {
  try {
    const data = await getSettingsAndClients();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to load settings:", error);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as { settings: CompanySettings };
    if (!body?.settings) {
      return NextResponse.json({ error: "Invalid settings payload" }, { status: 400 });
    }
    const saved = await updateSettings(body.settings);
    return NextResponse.json({ settings: saved });
  } catch (error) {
    console.error("Failed to update settings:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { client: ClientRecord };
    if (!body?.client?.name) {
      return NextResponse.json({ error: "Client name is required" }, { status: 400 });
    }
    const client: ClientRecord = {
      ...body.client,
      id: body.client.id || `client-${Date.now()}`,
      createdAt: body.client.createdAt || new Date().toISOString(),
    };
    const clients = await upsertClient(client);
    return NextResponse.json({ clients, client }, { status: 201 });
  } catch (error) {
    console.error("Failed to save client:", error);
    return NextResponse.json({ error: "Failed to save client" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    if (!clientId) {
      return NextResponse.json({ error: "clientId is required" }, { status: 400 });
    }
    const clients = await deleteClientById(clientId);
    return NextResponse.json({ clients });
  } catch (error) {
    console.error("Failed to delete client:", error);
    return NextResponse.json({ error: "Failed to delete client" }, { status: 500 });
  }
}

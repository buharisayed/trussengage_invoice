import fs from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import type {
  ClientRecord,
  CompanySettings,
  DatabaseSchema,
  DocumentRecord,
} from "@/types/document";
import { getDefaultSettings } from "@/lib/defaults";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

export function getStorageMode(): "neon" | "local" {
  return process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0
    ? "neon"
    : "local";
}

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not configured");
  }
  return neon(url);
}

let schemaInitialized = false;

function createSeedDatabase(): DatabaseSchema {
  const settings = getDefaultSettings();
  const now = new Date().toISOString();

  const sampleClient: ClientRecord = {
    id: "client-acme",
    name: "Acme Architectural Group",
    email: "accounts@acmearch.io",
    phone: "+1 (555) 890-1234",
    address: "750 Market Street, Floor 9\nSan Francisco, CA 94102",
    taxId: "US-88-449102",
    createdAt: now,
  };

  const sampleQuote: DocumentRecord = {
    id: "doc-sample-quote",
    type: "quotation",
    status: "sent",
    documentNumber: "QUO-1001",
    title: "QUOTATION",
    issueDate: now.slice(0, 10),
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    currency: "USD",
    branding: {
      logoDataUrl: "",
      logoSize: 52,
      accentColor: "#2563eb",
      templateId: "modern-minimal",
      fontStyle: "sans",
    },
    from: { ...settings.from },
    to: {
      name: sampleClient.name,
      email: sampleClient.email,
      phone: sampleClient.phone,
      address: sampleClient.address,
      taxId: sampleClient.taxId,
    },
    customFields: [
      { id: "cf-1", label: "Project", value: "Brand & Web Platform Redesign" },
      { id: "cf-2", label: "Prepared By", value: "Alex Morgan" },
    ],
    columns: {
      showSku: false,
      showUnit: true,
      showItemDiscount: false,
      showItemTax: false,
    },
    items: [
      {
        id: "li-1",
        sku: "DES-01",
        name: "UI/UX Design System",
        description: "Component library, typography scale, and interactive prototypes",
        quantity: 1,
        unit: "pkg",
        rate: 3200,
        discountPercent: 0,
        taxPercent: 0,
      },
      {
        id: "li-2",
        sku: "DEV-02",
        name: "Frontend Engineering",
        description: "Next.js responsive implementation and CMS integration",
        quantity: 40,
        unit: "hrs",
        rate: 125,
        discountPercent: 0,
        taxPercent: 0,
      },
    ],
    taxMode: "overall",
    taxLabel: "Tax",
    overallTaxPercent: 8.5,
    overallDiscountType: "percent",
    overallDiscountValue: 0,
    shipping: 0,
    amountPaid: 0,
    notes: "We look forward to partnering with your team on this project.",
    terms: "Quotation valid for 30 days. 50% deposit required upon acceptance.",
    paymentDetails: "",
    signature: { ...settings.signature },
    createdAt: now,
    updatedAt: now,
  };

  const sampleInvoice: DocumentRecord = {
    ...sampleQuote,
    id: "doc-sample-invoice",
    type: "invoice",
    status: "paid",
    documentNumber: "INV-1001",
    title: "INVOICE",
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    branding: {
      ...sampleQuote.branding,
      templateId: "bold-executive",
      accentColor: "#0f172a",
    },
    customFields: [{ id: "cf-3", label: "PO Number", value: "PO-2026-441" }],
    paymentDetails: settings.defaultPaymentDetails,
    terms: settings.defaultTerms,
    amountPaid: 8897,
  };

  return {
    settings,
    clients: [sampleClient],
    documents: [sampleInvoice, sampleQuote],
  };
}

async function ensureNeonSchema() {
  if (schemaInitialized) return;
  const sql = getSql();

  await sql`
    CREATE TABLE IF NOT EXISTS app_settings (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      document_number TEXT NOT NULL,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  const existingSettings = await sql`SELECT id FROM app_settings WHERE id = 'default'`;
  if (existingSettings.length === 0) {
    const seed = createSeedDatabase();
    await sql`
      INSERT INTO app_settings (id, data)
      VALUES ('default', ${JSON.stringify(seed.settings)}::jsonb)
      ON CONFLICT (id) DO NOTHING
    `;
    for (const c of seed.clients) {
      await sql`
        INSERT INTO clients (id, name, data, created_at)
        VALUES (${c.id}, ${c.name}, ${JSON.stringify(c)}::jsonb, ${c.createdAt}::timestamptz)
        ON CONFLICT (id) DO NOTHING
      `;
    }
    for (const d of seed.documents) {
      await sql`
        INSERT INTO documents (id, type, status, document_number, data, created_at, updated_at)
        VALUES (
          ${d.id},
          ${d.type},
          ${d.status},
          ${d.documentNumber},
          ${JSON.stringify(d)}::jsonb,
          ${d.createdAt}::timestamptz,
          ${d.updatedAt}::timestamptz
        )
        ON CONFLICT (id) DO NOTHING
      `;
    }
  }

  schemaInitialized = true;
}

// Local JSON fallback helpers
function readLocalDatabase(): DatabaseSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    const seed = createSeedDatabase();
    fs.writeFileSync(DB_PATH, JSON.stringify(seed, null, 2), "utf-8");
    return seed;
  }
  const raw = fs.readFileSync(DB_PATH, "utf-8");
  return JSON.parse(raw) as DatabaseSchema;
}

function writeLocalDatabase(db: DatabaseSchema): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
}

// Public async storage API
export async function listDocuments(): Promise<DocumentRecord[]> {
  if (getStorageMode() === "neon") {
    await ensureNeonSchema();
    const sql = getSql();
    const rows = await sql`
      SELECT data FROM documents ORDER BY updated_at DESC
    `;
    return rows.map((r) => r.data as DocumentRecord);
  }

  const db = readLocalDatabase();
  return db.documents.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export async function getDocumentById(
  id: string
): Promise<DocumentRecord | undefined> {
  if (getStorageMode() === "neon") {
    await ensureNeonSchema();
    const sql = getSql();
    const rows = await sql`SELECT data FROM documents WHERE id = ${id}`;
    return rows[0]?.data as DocumentRecord | undefined;
  }

  const db = readLocalDatabase();
  return db.documents.find((d) => d.id === id);
}

export async function upsertDocument(
  doc: DocumentRecord,
  incrementCounter = false
): Promise<DocumentRecord> {
  const now = new Date().toISOString();

  if (getStorageMode() === "neon") {
    await ensureNeonSchema();
    const sql = getSql();
    const existing = await sql`SELECT created_at FROM documents WHERE id = ${doc.id}`;
    const isNew = existing.length === 0;
    const record: DocumentRecord = {
      ...doc,
      createdAt: isNew ? doc.createdAt || now : String(existing[0].created_at),
      updatedAt: now,
    };

    await sql`
      INSERT INTO documents (id, type, status, document_number, data, created_at, updated_at)
      VALUES (
        ${record.id},
        ${record.type},
        ${record.status},
        ${record.documentNumber},
        ${JSON.stringify(record)}::jsonb,
        ${record.createdAt}::timestamptz,
        ${record.updatedAt}::timestamptz
      )
      ON CONFLICT (id) DO UPDATE SET
        type = EXCLUDED.type,
        status = EXCLUDED.status,
        document_number = EXCLUDED.document_number,
        data = EXCLUDED.data,
        updated_at = EXCLUDED.updated_at
    `;

    if (isNew && incrementCounter) {
      const { settings } = await getSettingsAndClients();
      if (record.type === "invoice") {
        settings.nextInvoiceNumber += 1;
      } else {
        settings.nextQuotationNumber += 1;
      }
      await updateSettings(settings);
    }

    return record;
  }

  const db = readLocalDatabase();
  const idx = db.documents.findIndex((d) => d.id === doc.id);
  const record: DocumentRecord = {
    ...doc,
    updatedAt: now,
    createdAt: idx >= 0 ? db.documents[idx].createdAt : doc.createdAt || now,
  };

  if (idx >= 0) {
    db.documents[idx] = record;
  } else {
    db.documents.unshift(record);
    if (incrementCounter) {
      if (record.type === "invoice") {
        db.settings.nextInvoiceNumber += 1;
      } else {
        db.settings.nextQuotationNumber += 1;
      }
    }
  }

  writeLocalDatabase(db);
  return record;
}

export async function deleteDocumentById(id: string): Promise<boolean> {
  if (getStorageMode() === "neon") {
    await ensureNeonSchema();
    const sql = getSql();
    const rows = await sql`DELETE FROM documents WHERE id = ${id} RETURNING id`;
    return rows.length > 0;
  }

  const db = readLocalDatabase();
  const before = db.documents.length;
  db.documents = db.documents.filter((d) => d.id !== id);
  if (db.documents.length !== before) {
    writeLocalDatabase(db);
    return true;
  }
  return false;
}

export async function getSettingsAndClients(): Promise<{
  settings: CompanySettings;
  clients: ClientRecord[];
}> {
  if (getStorageMode() === "neon") {
    await ensureNeonSchema();
    const sql = getSql();
    const settingsRows = await sql`
      SELECT data FROM app_settings WHERE id = 'default'
    `;
    const clientRows = await sql`
      SELECT data FROM clients ORDER BY created_at DESC
    `;
    const settings =
      (settingsRows[0]?.data as CompanySettings | undefined) ?? getDefaultSettings();
    const clients = clientRows.map((r) => r.data as ClientRecord);
    return { settings, clients };
  }

  const db = readLocalDatabase();
  return { settings: db.settings, clients: db.clients };
}

export async function updateSettings(
  settings: CompanySettings
): Promise<CompanySettings> {
  if (getStorageMode() === "neon") {
    await ensureNeonSchema();
    const sql = getSql();
    await sql`
      INSERT INTO app_settings (id, data, updated_at)
      VALUES ('default', ${JSON.stringify(settings)}::jsonb, NOW())
      ON CONFLICT (id) DO UPDATE SET
        data = EXCLUDED.data,
        updated_at = NOW()
    `;
    return settings;
  }

  const db = readLocalDatabase();
  db.settings = settings;
  writeLocalDatabase(db);
  return db.settings;
}

export async function upsertClient(client: ClientRecord): Promise<ClientRecord[]> {
  if (getStorageMode() === "neon") {
    await ensureNeonSchema();
    const sql = getSql();
    await sql`
      INSERT INTO clients (id, name, data, created_at)
      VALUES (
        ${client.id},
        ${client.name},
        ${JSON.stringify(client)}::jsonb,
        ${client.createdAt || new Date().toISOString()}::timestamptz
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        data = EXCLUDED.data
    `;
    const { clients } = await getSettingsAndClients();
    return clients;
  }

  const db = readLocalDatabase();
  const idx = db.clients.findIndex((c) => c.id === client.id);
  if (idx >= 0) {
    db.clients[idx] = client;
  } else {
    db.clients.unshift(client);
  }
  writeLocalDatabase(db);
  return db.clients;
}

export async function deleteClientById(id: string): Promise<ClientRecord[]> {
  if (getStorageMode() === "neon") {
    await ensureNeonSchema();
    const sql = getSql();
    await sql`DELETE FROM clients WHERE id = ${id}`;
    const { clients } = await getSettingsAndClients();
    return clients;
  }

  const db = readLocalDatabase();
  db.clients = db.clients.filter((c) => c.id !== id);
  writeLocalDatabase(db);
  return db.clients;
}

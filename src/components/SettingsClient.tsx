"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  ImagePlus,
  Plus,
  Save,
  Trash2,
  UserPlus,
} from "lucide-react";
import { CURRENCIES } from "@/lib/calculations";
import type { ClientRecord, CompanySettings, TemplateId } from "@/types/document";

interface SettingsClientProps {
  initialSettings: CompanySettings;
  initialClients: ClientRecord[];
  storageMode?: "neon" | "local";
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export function SettingsClient({
  initialSettings,
  initialClients,
  storageMode = "local",
}: SettingsClientProps) {
  const [settings, setSettings] = useState<CompanySettings>(initialSettings);
  const [clients, setClients] = useState<ClientRecord[]>(initialClients);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [newClient, setNewClient] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    taxId: "",
  });

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 2500);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      if (res.ok) {
        showNotice("Invoicing details & defaults saved");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    setSettings((prev) => ({ ...prev, logoDataUrl: dataUrl }));
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.name.trim()) return;
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client: {
          ...newClient,
          id: `client-${Date.now()}`,
          createdAt: new Date().toISOString(),
        },
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setClients(data.clients);
      setNewClient({ name: "", email: "", phone: "", address: "", taxId: "" });
      showNotice("Client added");
    }
  };

  const handleDeleteClient = async (id: string) => {
    const res = await fetch(`/api/settings?clientId=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      const data = await res.json();
      setClients(data.clients);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-lg hover:bg-slate-100"
            >
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </Link>
            <div className="h-5 w-px bg-slate-200" />
            <h1 className="text-base font-bold text-slate-900">
              Saved Invoicing Details & Clients
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${
                storageMode === "neon"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-800 border-amber-200"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  storageMode === "neon" ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
              {storageMode === "neon" ? "Neon Cloud Synced" : "Local JSON Fallback"}
            </span>
            {notice && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                <Check className="w-3.5 h-3.5" />
                {notice}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Company & Branding Defaults */}
        <form
          onSubmit={handleSaveSettings}
          className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-5"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Company Profile & Defaults
              </h2>
              <p className="text-xs text-slate-500">
                Automatically applied to every new invoice and quotation.
              </p>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition shadow-sm"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save Defaults"}
            </button>
          </div>

          {/* Logo */}
          <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/70">
            {settings.logoDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={settings.logoDataUrl}
                alt="Company Logo"
                className="h-14 w-auto object-contain bg-white p-1.5 rounded-lg border border-slate-200"
              />
            ) : (
              <div className="h-14 w-24 rounded-lg bg-white border border-dashed border-slate-300 flex items-center justify-center text-[11px] text-slate-400">
                No Logo
              </div>
            )}
            <div className="flex-1 space-y-1.5">
              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100">
                <ImagePlus className="w-3.5 h-3.5" />
                {settings.logoDataUrl ? "Change Default Logo" : "Upload Default Logo"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </label>
              {settings.logoDataUrl && (
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, logoDataUrl: "" })}
                  className="ml-3 text-xs text-red-600 hover:underline"
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Business Name
              </label>
              <input
                type="text"
                value={settings.from.name}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    from: { ...settings.from, name: e.target.value },
                  })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={settings.from.email}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    from: { ...settings.from, email: e.target.value },
                  })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phone
              </label>
              <input
                type="text"
                value={settings.from.phone}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    from: { ...settings.from, phone: e.target.value },
                  })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Address
              </label>
              <textarea
                rows={2}
                value={settings.from.address}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    from: { ...settings.from, address: e.target.value },
                  })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tax ID / GST / VAT
              </label>
              <input
                type="text"
                value={settings.from.taxId}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    from: { ...settings.from, taxId: e.target.value },
                  })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Default Currency
              </label>
              <select
                value={settings.currency}
                onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Default Template
              </label>
              <select
                value={settings.templateId}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    templateId: e.target.value as TemplateId,
                  })
                }
                className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs"
              >
                <option value="modern-minimal">Modern Minimal</option>
                <option value="bold-executive">Bold Executive</option>
                <option value="editorial-split">Editorial Split</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tax Label
              </label>
              <input
                type="text"
                value={settings.taxLabel}
                onChange={(e) => setSettings({ ...settings, taxLabel: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Default Tax %
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={settings.defaultTaxPercent}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    defaultTaxPercent: Number(e.target.value),
                  })
                }
                className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Invoice Prefix
              </label>
              <input
                type="text"
                value={settings.invoicePrefix}
                onChange={(e) =>
                  setSettings({ ...settings, invoicePrefix: e.target.value })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Quotation Prefix
              </label>
              <input
                type="text"
                value={settings.quotationPrefix}
                onChange={(e) =>
                  setSettings({ ...settings, quotationPrefix: e.target.value })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Default Payment / Bank Details
            </label>
            <textarea
              rows={3}
              value={settings.defaultPaymentDetails}
              onChange={(e) =>
                setSettings({ ...settings, defaultPaymentDetails: e.target.value })
              }
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Default Terms & Conditions
            </label>
            <textarea
              rows={2}
              value={settings.defaultTerms}
              onChange={(e) =>
                setSettings({ ...settings, defaultTerms: e.target.value })
              }
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
            />
          </div>
        </form>

        {/* Saved Clients Directory */}
        <div className="lg:col-span-5 space-y-5">
          <form
            onSubmit={handleAddClient}
            className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-3"
          >
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <UserPlus className="w-4 h-4 text-blue-600" />
              Add Saved Client
            </div>
            <input
              type="text"
              required
              placeholder="Client / Company Name *"
              value={newClient.name}
              onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="email"
                placeholder="Email"
                value={newClient.email}
                onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
              />
              <input
                type="text"
                placeholder="Phone"
                value={newClient.phone}
                onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
              />
            </div>
            <textarea
              rows={2}
              placeholder="Address"
              value={newClient.address}
              onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
            />
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition"
            >
              <Plus className="w-3.5 h-3.5" /> Save Client
            </button>
          </form>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900">
              Saved Clients ({clients.length})
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {clients.map((c) => (
                <div
                  key={c.id}
                  className="flex items-start justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      {c.name}
                    </div>
                    {c.email && (
                      <div className="text-xs text-slate-500 truncate">{c.email}</div>
                    )}
                    {c.address && (
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">
                        {c.address}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteClient(c.id)}
                    className="p-1 text-slate-400 hover:text-red-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {clients.length === 0 && (
                <p className="text-xs text-slate-400">No saved clients yet.</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}


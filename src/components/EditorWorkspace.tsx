"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Check,
  Download,
  FileText,
  ImagePlus,
  LayoutTemplate,
  ListPlus,
  Palette,
  Plus,
  Save,
  Trash2,
  UserPlus,
} from "lucide-react";
import { CURRENCIES, calculateDocumentTotals, formatCurrency } from "@/lib/calculations";
import { createEmptyLineItem } from "@/lib/defaults";
import { DocumentPreview } from "@/components/templates/DocumentPreview";
import type {
  ClientRecord,
  CompanySettings,
  DocumentRecord,
  DocumentStatus,
  DocumentType,
  FontStyle,
  TemplateId,
} from "@/types/document";

interface EditorWorkspaceProps {
  initialDoc: DocumentRecord;
  isNew: boolean;
  initialClients: ClientRecord[];
  initialSettings: CompanySettings;
  autoPrint?: boolean;
}

type EditorTab = "basics" | "parties" | "items" | "totals" | "design";

const ACCENT_PRESETS = [
  "#2563eb", // Royal Blue
  "#0f172a", // Slate Ink
  "#059669", // Emerald
  "#7c3aed", // Violet
  "#dc2626", // Crimson
  "#d97706", // Amber
  "#0891b2", // Cyan
];

const STATUS_OPTIONS: { value: DocumentStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "paid", label: "Paid" },
  { value: "accepted", label: "Accepted" },
  { value: "declined", label: "Declined" },
  { value: "overdue", label: "Overdue" },
];

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export function EditorWorkspace({
  initialDoc,
  isNew,
  initialClients,
  initialSettings,
  autoPrint = false,
}: EditorWorkspaceProps) {
  const router = useRouter();
  const [doc, setDoc] = useState<DocumentRecord>(initialDoc);
  const [clients, setClients] = useState<ClientRecord[]>(initialClients);
  const [settings, setSettings] = useState<CompanySettings>(initialSettings);
  const [activeTab, setActiveTab] = useState<EditorTab>("basics");
  const [zoom, setZoom] = useState<number>(0.75);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [hasCreated, setHasCreated] = useState(!isNew);

  useEffect(() => {
    if (autoPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [autoPrint]);

  const totals = calculateDocumentTotals(doc);

  const showToast = (msg: string) => {
    setSavedNotice(msg);
    setTimeout(() => setSavedNotice(null), 2500);
  };

  const handleSave = async (): Promise<boolean> => {
    setSaving(true);
    try {
      if (!hasCreated) {
        const res = await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ document: doc, incrementCounter: true }),
        });
        if (!res.ok) throw new Error("Save failed");
        const data = await res.json();
        setDoc(data.document);
        setHasCreated(true);
        showToast("Document saved");
        router.replace(`/editor/${data.document.id}`);
      } else {
        const res = await fetch(`/api/documents/${doc.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ document: doc }),
        });
        if (!res.ok) throw new Error("Update failed");
        const data = await res.json();
        setDoc(data.document);
        showToast("Changes saved");
      }
      return true;
    } catch {
      showToast("Error saving document");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleExportPdf = async () => {
    await handleSave();
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    setDoc((prev) => ({
      ...prev,
      branding: { ...prev.branding, logoDataUrl: dataUrl },
    }));
  };

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    setDoc((prev) => ({
      ...prev,
      signature: { ...prev.signature, imageDataUrl: dataUrl, enabled: true },
    }));
  };

  const handleSaveCompanyAsDefault = async () => {
    const updated: CompanySettings = {
      ...settings,
      from: { ...doc.from },
      logoDataUrl: doc.branding.logoDataUrl,
      logoSize: doc.branding.logoSize,
      accentColor: doc.branding.accentColor,
      templateId: doc.branding.templateId,
      fontStyle: doc.branding.fontStyle,
      currency: doc.currency,
      taxLabel: doc.taxLabel,
      defaultNotes: doc.notes,
      defaultTerms: doc.terms,
      defaultPaymentDetails: doc.paymentDetails || settings.defaultPaymentDetails,
      signature: { ...doc.signature },
    };
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings: updated }),
    });
    if (res.ok) {
      setSettings(updated);
      showToast("Default company profile updated");
    }
  };

  const handleSaveClient = async () => {
    if (!doc.to.name.trim()) {
      showToast("Enter a client name first");
      return;
    }
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client: {
          id: `client-${Date.now()}`,
          name: doc.to.name,
          email: doc.to.email,
          phone: doc.to.phone,
          address: doc.to.address,
          taxId: doc.to.taxId,
          createdAt: new Date().toISOString(),
        },
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setClients(data.clients);
      showToast("Client saved to directory");
    }
  };

  const handleSelectClient = (clientId: string) => {
    const found = clients.find((c) => c.id === clientId);
    if (!found) return;
    setDoc((prev) => ({
      ...prev,
      to: {
        name: found.name,
        email: found.email,
        phone: found.phone,
        address: found.address,
        taxId: found.taxId,
      },
    }));
  };

  const handleTypeSwitch = (newType: DocumentType) => {
    setDoc((prev) => ({
      ...prev,
      type: newType,
      title: newType === "invoice" ? "INVOICE" : "QUOTATION",
      paymentDetails:
        newType === "invoice" && !prev.paymentDetails
          ? settings.defaultPaymentDetails
          : prev.paymentDetails,
    }));
  };

  const updateLineItem = (id: string, patch: Partial<DocumentRecord["items"][number]>) => {
    setDoc((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  };

  const removeLineItem = (id: string) => {
    setDoc((prev) => ({
      ...prev,
      items: prev.items.length > 1 ? prev.items.filter((i) => i.id !== id) : prev.items,
    }));
  };

  const addCustomField = () => {
    setDoc((prev) => ({
      ...prev,
      customFields: [
        ...prev.customFields,
        { id: `cf-${Date.now()}`, label: "Reference", value: "" },
      ],
    }));
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      {/* Top Toolbar */}
      <header className="no-print sticky top-0 z-30 bg-white border-b border-slate-200 px-4 lg:px-6 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <div className="h-5 w-px bg-slate-200" />
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide ${
                doc.type === "invoice"
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : "bg-violet-50 text-violet-700 border border-violet-200"
              }`}
            >
              {doc.type}
            </span>
            <span className="font-mono font-semibold text-slate-900 text-sm truncate">
              #{doc.documentNumber}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {savedNotice && (
            <span className="hidden md:inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
              <Check className="w-3.5 h-3.5" />
              {savedNotice}
            </span>
          )}

          <select
            value={doc.status}
            onChange={(e) =>
              setDoc((prev) => ({ ...prev, status: e.target.value as DocumentStatus }))
            }
            className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                Status: {opt.label}
              </option>
            ))}
          </select>

          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60 transition shadow-sm"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Saving..." : "Save"}</span>
          </button>

          <button
            onClick={handleExportPdf}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Save as PDF</span>
          </button>
        </div>
      </header>

      {/* Main Split Workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12">
        {/* Left Editor Panel */}
        <aside className="no-print lg:col-span-5 xl:col-span-4 bg-white border-r border-slate-200 flex flex-col lg:h-[calc(100vh-4rem)] lg:sticky lg:top-16">
          {/* Section Tabs */}
          <nav className="grid grid-cols-5 border-b border-slate-200 bg-slate-50/70 p-1 gap-1">
            {[
              { id: "basics", label: "Basics", icon: FileText },
              { id: "parties", label: "Parties", icon: Building2 },
              { id: "items", label: "Items", icon: ListPlus },
              { id: "totals", label: "Totals", icon: LayoutTemplate },
              { id: "design", label: "Design", icon: Palette },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as EditorTab)}
                  className={`flex flex-col items-center justify-center py-2 px-1 rounded-md text-[11px] font-medium transition ${
                    active
                      ? "bg-white text-blue-600 shadow-sm border border-slate-200/80"
                      : "text-slate-500 hover:text-slate-800 hover:bg-white/60"
                  }`}
                >
                  <Icon className="w-4 h-4 mb-0.5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {activeTab === "basics" && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Document Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["invoice", "quotation"] as DocumentType[]).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => handleTypeSwitch(t)}
                        className={`py-2 px-3 rounded-lg text-sm font-medium border capitalize transition ${
                          doc.type === t
                            ? "bg-blue-50 border-blue-500 text-blue-700"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Document Title
                    </label>
                    <input
                      type="text"
                      value={doc.title}
                      onChange={(e) => setDoc({ ...doc, title: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="INVOICE"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Document Number
                    </label>
                    <input
                      type="text"
                      value={doc.documentNumber}
                      onChange={(e) => setDoc({ ...doc, documentNumber: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Issue Date
                    </label>
                    <input
                      type="date"
                      value={doc.issueDate}
                      onChange={(e) => setDoc({ ...doc, issueDate: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {doc.type === "invoice" ? "Due Date" : "Valid Until"}
                    </label>
                    <input
                      type="date"
                      value={doc.dueDate}
                      onChange={(e) => setDoc({ ...doc, dueDate: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Currency
                  </label>
                  <select
                    value={doc.currency}
                    onChange={(e) => setDoc({ ...doc, currency: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} ({c.symbol}) — {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Custom Metadata Fields */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-700">
                      Custom Fields (PO #, Project, etc.)
                    </span>
                    <button
                      type="button"
                      onClick={addCustomField}
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Field
                    </button>
                  </div>
                  <div className="space-y-2">
                    {doc.customFields.map((cf) => (
                      <div key={cf.id} className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={cf.label}
                          onChange={(e) =>
                            setDoc({
                              ...doc,
                              customFields: doc.customFields.map((f) =>
                                f.id === cf.id ? { ...f, label: e.target.value } : f
                              ),
                            })
                          }
                          placeholder="Label"
                          className="w-2/5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                        />
                        <input
                          type="text"
                          value={cf.value}
                          onChange={(e) =>
                            setDoc({
                              ...doc,
                              customFields: doc.customFields.map((f) =>
                                f.id === cf.id ? { ...f, value: e.target.value } : f
                              ),
                            })
                          }
                          placeholder="Value"
                          className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setDoc({
                              ...doc,
                              customFields: doc.customFields.filter((f) => f.id !== cf.id),
                            })
                          }
                          className="p-1.5 text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {doc.customFields.length === 0 && (
                      <p className="text-xs text-slate-400">
                        No custom fields added yet.
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}

            {activeTab === "parties" && (
              <>
                {/* Logo Upload */}
                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-800">Company Logo</span>
                    {doc.branding.logoDataUrl && (
                      <button
                        type="button"
                        onClick={() =>
                          setDoc({
                            ...doc,
                            branding: { ...doc.branding, logoDataUrl: "" },
                          })
                        }
                        className="text-xs text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2.5 text-xs font-medium text-slate-600 hover:border-blue-400 hover:text-blue-600 transition">
                      <ImagePlus className="w-4 h-4" />
                      <span>
                        {doc.branding.logoDataUrl ? "Replace Logo" : "Upload Logo (PNG/JPG/SVG)"}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {doc.branding.logoDataUrl && (
                    <div>
                      <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                        <span>Logo Height</span>
                        <span>{doc.branding.logoSize}px</span>
                      </div>
                      <input
                        type="range"
                        min={28}
                        max={96}
                        value={doc.branding.logoSize}
                        onChange={(e) =>
                          setDoc({
                            ...doc,
                            branding: {
                              ...doc.branding,
                              logoSize: Number(e.target.value),
                            },
                          })
                        }
                        className="w-full accent-blue-600"
                      />
                    </div>
                  )}
                </div>

                {/* From (Your Company) */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      From (Your Business)
                    </h3>
                    <button
                      type="button"
                      onClick={handleSaveCompanyAsDefault}
                      className="text-xs font-medium text-blue-600 hover:underline"
                    >
                      Save as Default
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Company / Your Name"
                    value={doc.from.name}
                    onChange={(e) =>
                      setDoc({ ...doc, from: { ...doc.from, name: e.target.value } })
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="email"
                      placeholder="Email"
                      value={doc.from.email}
                      onChange={(e) =>
                        setDoc({ ...doc, from: { ...doc.from, email: e.target.value } })
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Phone"
                      value={doc.from.phone}
                      onChange={(e) =>
                        setDoc({ ...doc, from: { ...doc.from, phone: e.target.value } })
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                    />
                  </div>
                  <textarea
                    rows={2}
                    placeholder="Business Address"
                    value={doc.from.address}
                    onChange={(e) =>
                      setDoc({ ...doc, from: { ...doc.from, address: e.target.value } })
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Tax ID / GST / VAT Number"
                    value={doc.from.taxId}
                    onChange={(e) =>
                      setDoc({ ...doc, from: { ...doc.from, taxId: e.target.value } })
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>

                {/* Bill To (Client) */}
                <div className="space-y-2.5 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Bill To (Client)
                    </h3>
                    <button
                      type="button"
                      onClick={handleSaveClient}
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Save Client
                    </button>
                  </div>

                  {clients.length > 0 && (
                    <select
                      defaultValue=""
                      onChange={(e) => handleSelectClient(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700"
                    >
                      <option value="" disabled>
                        Load from saved clients...
                      </option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.email ? `(${c.email})` : ""}
                        </option>
                      ))}
                    </select>
                  )}

                  <input
                    type="text"
                    placeholder="Client / Company Name"
                    value={doc.to.name}
                    onChange={(e) =>
                      setDoc({ ...doc, to: { ...doc.to, name: e.target.value } })
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="email"
                      placeholder="Client Email"
                      value={doc.to.email}
                      onChange={(e) =>
                        setDoc({ ...doc, to: { ...doc.to, email: e.target.value } })
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Client Phone"
                      value={doc.to.phone}
                      onChange={(e) =>
                        setDoc({ ...doc, to: { ...doc.to, phone: e.target.value } })
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                    />
                  </div>
                  <textarea
                    rows={2}
                    placeholder="Client Address"
                    value={doc.to.address}
                    onChange={(e) =>
                      setDoc({ ...doc, to: { ...doc.to, address: e.target.value } })
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Client Tax ID (Optional)"
                    value={doc.to.taxId}
                    onChange={(e) =>
                      setDoc({ ...doc, to: { ...doc.to, taxId: e.target.value } })
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
              </>
            )}

            {activeTab === "items" && (
              <>
                {/* Flexible Column Toggles */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80">
                  <div className="text-xs font-semibold text-slate-700 mb-2">
                    Visible Table Columns
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: "showSku", label: "SKU / Code" },
                      { key: "showUnit", label: "Unit" },
                      { key: "showItemDiscount", label: "Item Discount %" },
                      { key: "showItemTax", label: "Item Tax %" },
                    ].map((col) => {
                      const active = doc.columns[col.key as keyof typeof doc.columns];
                      return (
                        <button
                          key={col.key}
                          type="button"
                          onClick={() =>
                            setDoc((prev) => ({
                              ...prev,
                              columns: {
                                ...prev.columns,
                                [col.key]: !active,
                              },
                              taxMode:
                                col.key === "showItemTax" && !active
                                  ? "per-item"
                                  : prev.taxMode,
                            }))
                          }
                          className={`px-2.5 py-1 rounded-md text-xs font-medium border transition ${
                            active
                              ? "bg-blue-600 border-blue-600 text-white"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {col.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Line Items */}
                <div className="space-y-3">
                  {doc.items.map((item, idx) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-200 bg-white p-3 space-y-2.5 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          Item #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeLineItem(item.id)}
                          className="text-slate-400 hover:text-red-600 p-1"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {doc.columns.showSku && (
                        <input
                          type="text"
                          placeholder="SKU / Item Code"
                          value={item.sku}
                          onChange={(e) => updateLineItem(item.id, { sku: e.target.value })}
                          className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-mono"
                        />
                      )}

                      <input
                        type="text"
                        placeholder="Item or Service Name"
                        value={item.name}
                        onChange={(e) => updateLineItem(item.id, { name: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-medium"
                      />

                      <textarea
                        rows={2}
                        placeholder="Description (optional)"
                        value={item.description}
                        onChange={(e) =>
                          updateLineItem(item.id, { description: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                      />

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                            Qty
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.quantity}
                            onChange={(e) =>
                              updateLineItem(item.id, {
                                quantity: Number(e.target.value),
                              })
                            }
                            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                          />
                        </div>

                        {doc.columns.showUnit && (
                          <div>
                            <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                              Unit
                            </label>
                            <input
                              type="text"
                              placeholder="pcs / hrs"
                              value={item.unit}
                              onChange={(e) =>
                                updateLineItem(item.id, { unit: e.target.value })
                              }
                              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                            />
                          </div>
                        )}

                        <div>
                          <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                            Rate
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.rate}
                            onChange={(e) =>
                              updateLineItem(item.id, { rate: Number(e.target.value) })
                            }
                            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                          />
                        </div>
                      </div>

                      {(doc.columns.showItemDiscount ||
                        (doc.taxMode === "per-item" && doc.columns.showItemTax)) && (
                        <div className="grid grid-cols-2 gap-2">
                          {doc.columns.showItemDiscount && (
                            <div>
                              <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                                Discount %
                              </label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="any"
                                value={item.discountPercent}
                                onChange={(e) =>
                                  updateLineItem(item.id, {
                                    discountPercent: Number(e.target.value),
                                  })
                                }
                                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                              />
                            </div>
                          )}
                          {doc.taxMode === "per-item" && doc.columns.showItemTax && (
                            <div>
                              <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                                {doc.taxLabel || "Tax"} %
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={item.taxPercent}
                                onChange={(e) =>
                                  updateLineItem(item.id, {
                                    taxPercent: Number(e.target.value),
                                  })
                                }
                                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() =>
                      setDoc((prev) => ({
                        ...prev,
                        items: [...prev.items, createEmptyLineItem()],
                      }))
                    }
                    className="w-full py-2.5 rounded-xl border border-dashed border-blue-300 bg-blue-50/50 text-blue-700 text-xs font-semibold hover:bg-blue-50 transition flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Add Line Item
                  </button>
                </div>
              </>
            )}

            {activeTab === "totals" && (
              <>
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-700">
                    Tax Mode
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "overall", label: "Overall Tax" },
                      { id: "per-item", label: "Per Item" },
                      { id: "none", label: "No Tax" },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() =>
                          setDoc((prev) => ({
                            ...prev,
                            taxMode: m.id as DocumentRecord["taxMode"],
                            columns:
                              m.id === "per-item"
                                ? { ...prev.columns, showItemTax: true }
                                : prev.columns,
                          }))
                        }
                        className={`py-2 px-2 rounded-lg text-xs font-medium border transition ${
                          doc.taxMode === m.id
                            ? "bg-blue-50 border-blue-500 text-blue-700"
                            : "bg-white border-slate-200 text-slate-600"
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {doc.taxMode !== "none" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Tax Label (GST, VAT, etc.)
                      </label>
                      <input
                        type="text"
                        value={doc.taxLabel}
                        onChange={(e) => setDoc({ ...doc, taxLabel: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </div>
                    {doc.taxMode === "overall" && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Tax Rate (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={doc.overallTaxPercent}
                          onChange={(e) =>
                            setDoc({
                              ...doc,
                              overallTaxPercent: Number(e.target.value),
                            })
                          }
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        />
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Overall Discount Type
                    </label>
                    <select
                      value={doc.overallDiscountType}
                      onChange={(e) =>
                        setDoc({
                          ...doc,
                          overallDiscountType: e.target.value as "percent" | "fixed",
                        })
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    >
                      <option value="percent">Percentage (%)</option>
                      <option value="fixed">Fixed Amount</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Discount Value
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={doc.overallDiscountValue}
                      onChange={(e) =>
                        setDoc({
                          ...doc,
                          overallDiscountValue: Number(e.target.value),
                        })
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Shipping / Handling
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={doc.shipping}
                      onChange={(e) =>
                        setDoc({ ...doc, shipping: Number(e.target.value) })
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>

                  {doc.type === "invoice" && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Amount Paid / Deposit
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={doc.amountPaid}
                        onChange={(e) =>
                          setDoc({ ...doc, amountPaid: Number(e.target.value) })
                        }
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-1.5 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>Grand Total</span>
                    <span className="font-bold text-slate-900">
                      {formatCurrency(totals.grandTotal, doc.currency)}
                    </span>
                  </div>
                  {doc.type === "invoice" && totals.amountPaid > 0 && (
                    <div className="flex justify-between text-blue-700 font-semibold">
                      <span>Balance Due</span>
                      <span>{formatCurrency(totals.balanceDue, doc.currency)}</span>
                    </div>
                  )}
                </div>
              </>
            )}

            {activeTab === "design" && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Modern Template
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      {
                        id: "modern-minimal",
                        name: "Modern Minimal",
                        desc: "Clean accent bar, crisp whitespace & structured grid",
                      },
                      {
                        id: "bold-executive",
                        name: "Bold Executive",
                        desc: "Full-width colored header banner with high contrast",
                      },
                      {
                        id: "editorial-split",
                        name: "Editorial Split",
                        desc: "Refined agency-style typography & clean dividers",
                      },
                    ].map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() =>
                          setDoc({
                            ...doc,
                            branding: {
                              ...doc.branding,
                              templateId: tpl.id as TemplateId,
                            },
                          })
                        }
                        className={`text-left p-3 rounded-xl border transition ${
                          doc.branding.templateId === tpl.id
                            ? "border-blue-600 bg-blue-50/70"
                            : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <div className="text-sm font-semibold text-slate-900">
                          {tpl.name}
                        </div>
                        <div className="text-xs text-slate-500">{tpl.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Brand Accent Color
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {ACCENT_PRESETS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() =>
                          setDoc({
                            ...doc,
                            branding: { ...doc.branding, accentColor: color },
                          })
                        }
                        style={{ backgroundColor: color }}
                        className={`w-7 h-7 rounded-full border-2 transition ${
                          doc.branding.accentColor === color
                            ? "border-slate-900 scale-110"
                            : "border-white shadow-sm"
                        }`}
                      />
                    ))}
                    <input
                      type="color"
                      value={doc.branding.accentColor}
                      onChange={(e) =>
                        setDoc({
                          ...doc,
                          branding: { ...doc.branding, accentColor: e.target.value },
                        })
                      }
                      className="w-8 h-8 rounded cursor-pointer border border-slate-200"
                      title="Custom Hex Color"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Typography Style
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "sans", label: "Clean Sans" },
                      { id: "serif", label: "Editorial Serif" },
                      { id: "mono-accent", label: "Tech Mono" },
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() =>
                          setDoc({
                            ...doc,
                            branding: {
                              ...doc.branding,
                              fontStyle: f.id as FontStyle,
                            },
                          })
                        }
                        className={`py-2 px-2 rounded-lg text-xs font-medium border ${
                          doc.branding.fontStyle === f.id
                            ? "bg-blue-50 border-blue-500 text-blue-700"
                            : "bg-white border-slate-200 text-slate-600"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      rows={2}
                      value={doc.notes}
                      onChange={(e) => setDoc({ ...doc, notes: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Terms & Conditions
                    </label>
                    <textarea
                      rows={2}
                      value={doc.terms}
                      onChange={(e) => setDoc({ ...doc, terms: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Bank / Payment Details
                    </label>
                    <textarea
                      rows={3}
                      value={doc.paymentDetails}
                      onChange={(e) => setDoc({ ...doc, paymentDetails: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                {/* Signature Block */}
                <div className="space-y-2.5 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">
                      Signature Block
                    </label>
                    <input
                      type="checkbox"
                      checked={doc.signature.enabled}
                      onChange={(e) =>
                        setDoc({
                          ...doc,
                          signature: { ...doc.signature, enabled: e.target.checked },
                        })
                      }
                      className="rounded accent-blue-600"
                    />
                  </div>
                  {doc.signature.enabled && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Signer Name"
                          value={doc.signature.name}
                          onChange={(e) =>
                            setDoc({
                              ...doc,
                              signature: { ...doc.signature, name: e.target.value },
                            })
                          }
                          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                        />
                        <input
                          type="text"
                          placeholder="Title / Role"
                          value={doc.signature.title}
                          onChange={(e) =>
                            setDoc({
                              ...doc,
                              signature: { ...doc.signature, title: e.target.value },
                            })
                          }
                          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                        />
                      </div>
                      <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:underline">
                        <ImagePlus className="w-3.5 h-3.5" />
                        <span>
                          {doc.signature.imageDataUrl
                            ? "Change Signature Image"
                            : "Upload Signature Image (Optional)"}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleSignatureUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </aside>

        {/* Right Live Preview Panel */}
        <main className="lg:col-span-7 xl:col-span-8 p-4 lg:p-8 overflow-auto flex flex-col items-center">
          <div className="no-print w-full max-w-[210mm] flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-slate-500">
              Live A4 Print Preview
            </span>
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
              {[0.65, 0.75, 0.9, 1].map((z) => (
                <button
                  key={z}
                  type="button"
                  onClick={() => setZoom(z)}
                  className={`px-2 py-1 rounded text-xs font-medium transition ${
                    zoom === z
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {Math.round(z * 100)}%
                </button>
              ))}
            </div>
          </div>

          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "top center",
            }}
            className="print-only-container transition-transform duration-150"
          >
            <DocumentPreview doc={doc} />
          </div>
        </main>
      </div>
    </div>
  );
}


"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRightLeft,
  Copy,
  Download,
  Edit3,
  FileCheck2,
  FilePlus2,
  FileText,
  Lock,
  Search,
  Settings,
  Trash2,
} from "lucide-react";
import { calculateDocumentTotals, formatCurrency } from "@/lib/calculations";
import { formatDocNumber } from "@/lib/defaults";
import type { CompanySettings, DocumentRecord, DocumentType } from "@/types/document";

interface DashboardProps {
  initialDocuments: DocumentRecord[];
  settings: CompanySettings;
}

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  sent: "bg-blue-50 text-blue-700 border-blue-200",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  accepted: "bg-emerald-50 text-emerald-700 border-emerald-200",
  declined: "bg-rose-50 text-rose-700 border-rose-200",
  overdue: "bg-amber-50 text-amber-800 border-amber-200",
};

export function Dashboard({ initialDocuments, settings }: DashboardProps) {
  const router = useRouter();
  const [documents, setDocuments] = useState<DocumentRecord[]>(initialDocuments);
  const [typeFilter, setTypeFilter] = useState<"all" | DocumentType>("all");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return documents.filter((d) => {
      if (typeFilter !== "all" && d.type !== typeFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchNum = d.documentNumber.toLowerCase().includes(q);
        const matchClient = d.to.name.toLowerCase().includes(q);
        if (!matchNum && !matchClient) return false;
      }
      return true;
    });
  }, [documents, typeFilter, search]);

  const stats = useMemo(() => {
    let totalInvoiced = 0;
    let totalPaid = 0;
    let openQuotes = 0;
    let draftCount = 0;

    for (const d of documents) {
      const { grandTotal } = calculateDocumentTotals(d);
      if (d.type === "invoice") {
        totalInvoiced += grandTotal;
        if (d.status === "paid") totalPaid += grandTotal;
      } else {
        if (d.status !== "declined") openQuotes += grandTotal;
      }
      if (d.status === "draft") draftCount += 1;
    }

    return { totalInvoiced, totalPaid, openQuotes, draftCount };
  }, [documents]);

  const handleDelete = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== id));
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleDuplicate = async (doc: DocumentRecord) => {
    setBusyId(doc.id);
    try {
      const copy: DocumentRecord = {
        ...doc,
        id: `doc-${Date.now()}`,
        status: "draft",
        documentNumber: `${doc.documentNumber}-COPY`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document: copy, incrementCounter: false }),
      });
      if (res.ok) {
        const data = await res.json();
        setDocuments((prev) => [data.document, ...prev]);
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleConvertToInvoice = async (quote: DocumentRecord) => {
    setBusyId(quote.id);
    try {
      const newInvoice: DocumentRecord = {
        ...quote,
        id: `doc-${Date.now()}`,
        type: "invoice",
        status: "draft",
        title: "INVOICE",
        documentNumber: formatDocNumber(
          settings.invoicePrefix,
          settings.nextInvoiceNumber
        ),
        issueDate: new Date().toISOString().slice(0, 10),
        dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
        paymentDetails: quote.paymentDetails || settings.defaultPaymentDetails,
        convertedFromId: quote.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document: newInvoice, incrementCounter: true }),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/editor/${data.document.id}`);
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-sm">
              TE
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">
                {settings.from.name || "TrussEngage Invoice"}
              </h1>
              <p className="text-xs text-slate-500">Invoices & Quotations Studio</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/settings"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition"
            >
              <Settings className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">Brand & Clients</span>
            </Link>

            <Link
              href="/editor/new?type=quotation"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 transition"
            >
              <FilePlus2 className="w-4 h-4" />
              <span>New Quote</span>
            </Link>

            <Link
              href="/editor/new?type=invoice"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition shadow-sm"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>New Invoice</span>
            </Link>

            <button
              type="button"
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" });
                router.push("/login");
                router.refresh();
              }}
              title="Lock Studio"
              className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition"
            >
              <Lock className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
            <div className="text-xs font-medium text-slate-500">Total Invoiced</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {formatCurrency(stats.totalInvoiced, settings.currency)}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
            <div className="text-xs font-medium text-slate-500">Paid Invoices</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">
              {formatCurrency(stats.totalPaid, settings.currency)}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
            <div className="text-xs font-medium text-slate-500">Active Quotations</div>
            <div className="text-2xl font-bold text-violet-600 mt-1">
              {formatCurrency(stats.openQuotes, settings.currency)}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
            <div className="text-xs font-medium text-slate-500">Saved Documents</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {documents.length}{" "}
              <span className="text-xs font-normal text-slate-400">
                ({stats.draftCount} drafts)
              </span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="inline-flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm self-start">
            {(["all", "invoice", "quotation"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                  typeFilter === t
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {t === "all" ? "All Documents" : `${t}s`}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by # or client name..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Documents Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-16 text-center px-4">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-900">
                No documents found
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Create a new invoice or quotation to get started.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-5">Document</th>
                    <th className="py-3.5 px-4">Client</th>
                    <th className="py-3.5 px-4">Issue Date</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Amount</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filtered.map((doc) => {
                    const totals = calculateDocumentTotals(doc);
                    return (
                      <tr
                        key={doc.id}
                        className="hover:bg-slate-50/70 transition group"
                      >
                        <td className="py-3.5 px-5">
                          <Link
                            href={`/editor/${doc.id}`}
                            className="flex items-center gap-2.5"
                          >
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                doc.type === "invoice"
                                  ? "bg-blue-50 text-blue-700"
                                  : "bg-violet-50 text-violet-700"
                              }`}
                            >
                              {doc.type === "invoice" ? "INV" : "QUO"}
                            </span>
                            <span className="font-mono font-semibold text-slate-900 group-hover:text-blue-600 transition">
                              {doc.documentNumber}
                            </span>
                          </Link>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-900">
                            {doc.to.name || "Untitled Client"}
                          </div>
                          {doc.to.email && (
                            <div className="text-xs text-slate-400">{doc.to.email}</div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600 font-mono">
                          {doc.issueDate}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${
                              STATUS_BADGE[doc.status] || STATUS_BADGE.draft
                            }`}
                          >
                            {doc.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold text-slate-900 tabular-nums">
                          {formatCurrency(totals.grandTotal, doc.currency)}
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <div className="inline-flex items-center gap-1">
                            <Link
                              href={`/editor/${doc.id}`}
                              title="Edit Document"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition"
                            >
                              <Edit3 className="w-4 h-4" />
                            </Link>
                            <Link
                              href={`/editor/${doc.id}?print=1`}
                              title="Save as PDF"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition"
                            >
                              <Download className="w-4 h-4" />
                            </Link>
                            {doc.type === "quotation" && (
                              <button
                                type="button"
                                disabled={busyId === doc.id}
                                onClick={() => handleConvertToInvoice(doc)}
                                title="Convert Quotation to Invoice"
                                className="p-1.5 rounded-lg text-slate-500 hover:text-violet-600 hover:bg-violet-50 transition"
                              >
                                <ArrowRightLeft className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={busyId === doc.id}
                              onClick={() => handleDuplicate(doc)}
                              title="Duplicate"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              disabled={busyId === doc.id}
                              onClick={() => handleDelete(doc.id)}
                              title="Delete"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}


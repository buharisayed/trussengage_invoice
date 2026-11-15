"use client";

import React from "react";
import {
  calculateDocumentTotals,
  calculateLineItem,
  formatCurrency,
} from "@/lib/calculations";
import type { DocumentRecord } from "@/types/document";

interface DocumentPreviewProps {
  doc: DocumentRecord;
}

export function DocumentPreview({ doc }: DocumentPreviewProps) {
  const totals = calculateDocumentTotals(doc);
  const accent = doc.branding.accentColor || "#2563eb";
  const template = doc.branding.templateId || "modern-minimal";

  const fontClass =
    doc.branding.fontStyle === "serif"
      ? "font-serif"
      : doc.branding.fontStyle === "mono-accent"
        ? "font-sans"
        : "font-sans";

  const monoClass =
    doc.branding.fontStyle === "mono-accent" ? "font-mono" : "font-sans tabular-nums";

  const dateLabel = doc.type === "invoice" ? "Due Date" : "Valid Until";

  const renderLogo = (onDark = false) => {
    if (!doc.branding.logoDataUrl) {
      return (
        <div
          className={`inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm font-bold tracking-tight ${
            onDark
              ? "bg-white/15 text-white border border-white/25"
              : "bg-slate-100 text-slate-800 border border-slate-200"
          }`}
        >
          {doc.from.name || "Your Company"}
        </div>
      );
    }

    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={doc.branding.logoDataUrl}
        alt={doc.from.name || "Company Logo"}
        style={{ height: `${doc.branding.logoSize || 52}px`, width: "auto" }}
        className={`object-contain ${onDark ? "rounded bg-white/95 p-1.5" : ""}`}
      />
    );
  };

  const renderHeader = () => {
    if (template === "bold-executive") {
      return (
        <div
          style={{ backgroundColor: accent }}
          className="px-10 py-8 text-white flex flex-col gap-6"
        >
          <div className="flex items-start justify-between gap-6">
            <div className="space-y-3">
              {renderLogo(true)}
              <div className="text-xs leading-relaxed text-white/85 whitespace-pre-line">
                <div className="font-semibold text-sm text-white">{doc.from.name}</div>
                {doc.from.address && <div>{doc.from.address}</div>}
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                  {doc.from.email && <span>{doc.from.email}</span>}
                  {doc.from.phone && <span>{doc.from.phone}</span>}
                  {doc.from.website && <span>{doc.from.website}</span>}
                </div>
                {doc.from.taxId && <div className="mt-0.5">Tax ID: {doc.from.taxId}</div>}
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="text-3xl font-bold tracking-wider uppercase">
                {doc.title || (doc.type === "invoice" ? "INVOICE" : "QUOTATION")}
              </div>
              <div className={`text-sm font-medium text-white/90 mt-1 ${monoClass}`}>
                #{doc.documentNumber}
              </div>
              <div className="mt-4 space-y-1 text-xs text-white/85">
                <div>
                  <span className="text-white/65">Issued: </span>
                  <span className={`font-medium text-white ${monoClass}`}>{doc.issueDate}</span>
                </div>
                {doc.dueDate && (
                  <div>
                    <span className="text-white/65">{dateLabel}: </span>
                    <span className={`font-medium text-white ${monoClass}`}>{doc.dueDate}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (template === "editorial-split") {
      return (
        <div className="px-10 pt-10 pb-6 border-b border-slate-200">
          <div className="flex items-start justify-between gap-6">
            <div className="space-y-3">
              {renderLogo(false)}
              <div className="text-xs text-slate-500 leading-relaxed whitespace-pre-line">
                <div className="font-semibold text-slate-900 text-sm">{doc.from.name}</div>
                {doc.from.address && <div>{doc.from.address}</div>}
                {doc.from.email && <div>{doc.from.email}</div>}
                {doc.from.phone && <div>{doc.from.phone}</div>}
                {doc.from.taxId && <div>Tax ID: {doc.from.taxId}</div>}
              </div>
            </div>

            <div className="text-right">
              <span
                style={{ color: accent }}
                className="text-xs font-semibold uppercase tracking-[0.2em]"
              >
                {doc.type === "invoice" ? "Statement of Account" : "Commercial Proposal"}
              </span>
              <h1 className="text-4xl font-bold tracking-tight text-slate-900 mt-1">
                {doc.title || (doc.type === "invoice" ? "INVOICE" : "QUOTATION")}
              </h1>
              <div
                style={{ borderColor: accent }}
                className={`inline-block mt-2 border-b-2 pb-0.5 text-sm font-semibold text-slate-800 ${monoClass}`}
              >
                #{doc.documentNumber}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Default: modern-minimal
    return (
      <div className="px-10 pt-10 pb-6">
        <div
          style={{ backgroundColor: accent }}
          className="h-1.5 w-full rounded-full mb-8"
        />
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-3">
            {renderLogo(false)}
            <div className="text-xs text-slate-500 leading-relaxed whitespace-pre-line">
              <div className="font-semibold text-slate-900 text-sm">{doc.from.name}</div>
              {doc.from.address && <div>{doc.from.address}</div>}
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                {doc.from.email && <span>{doc.from.email}</span>}
                {doc.from.phone && <span>{doc.from.phone}</span>}
              </div>
              {doc.from.taxId && <div className="mt-0.5">Tax ID: {doc.from.taxId}</div>}
            </div>
          </div>

          <div className="text-right shrink-0">
            <h1
              style={{ color: accent }}
              className="text-3xl font-bold tracking-tight uppercase"
            >
              {doc.title || (doc.type === "invoice" ? "INVOICE" : "QUOTATION")}
            </h1>
            <div className={`text-sm font-semibold text-slate-700 mt-1 ${monoClass}`}>
              #{doc.documentNumber}
            </div>
            <div className="mt-4 space-y-1 text-xs text-slate-600">
              <div>
                <span className="text-slate-400">Issue Date: </span>
                <span className={`font-medium text-slate-800 ${monoClass}`}>{doc.issueDate}</span>
              </div>
              {doc.dueDate && (
                <div>
                  <span className="text-slate-400">{dateLabel}: </span>
                  <span className={`font-medium text-slate-800 ${monoClass}`}>{doc.dueDate}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className={`print-only-container bg-white text-slate-900 w-[210mm] min-h-[297mm] mx-auto shadow-xl border border-slate-200/80 flex flex-col justify-between ${fontClass}`}
    >
      <div>
        {renderHeader()}

        {/* Bill To & Metadata */}
        <div className="px-10 py-6 grid grid-cols-12 gap-6">
          <div className="col-span-7">
            <div
              style={{ color: accent }}
              className="text-[11px] font-bold uppercase tracking-wider mb-1.5"
            >
              {doc.type === "invoice" ? "Bill To" : "Prepared For"}
            </div>
            <div className="text-sm font-semibold text-slate-900">
              {doc.to.name || "Client Name"}
            </div>
            <div className="text-xs text-slate-600 leading-relaxed whitespace-pre-line mt-1">
              {doc.to.address && <div>{doc.to.address}</div>}
              {doc.to.email && <div>{doc.to.email}</div>}
              {doc.to.phone && <div>{doc.to.phone}</div>}
              {doc.to.taxId && <div className="mt-0.5">Tax ID: {doc.to.taxId}</div>}
            </div>
          </div>

          <div className="col-span-5 flex flex-col justify-start items-end text-right">
            {template === "editorial-split" && (
              <div className="mb-3 space-y-1 text-xs">
                <div>
                  <span className="text-slate-400">Issue Date: </span>
                  <span className={`font-medium text-slate-800 ${monoClass}`}>{doc.issueDate}</span>
                </div>
                {doc.dueDate && (
                  <div>
                    <span className="text-slate-400">{dateLabel}: </span>
                    <span className={`font-medium text-slate-800 ${monoClass}`}>{doc.dueDate}</span>
                  </div>
                )}
              </div>
            )}

            {doc.customFields.length > 0 && (
              <div className="w-full max-w-[240px] space-y-1.5 bg-slate-50 rounded-lg p-3 border border-slate-100 text-left">
                {doc.customFields.map((cf) => (
                  <div key={cf.id} className="flex justify-between gap-2 text-xs">
                    <span className="text-slate-500 font-medium">{cf.label}:</span>
                    <span className="text-slate-900 font-semibold text-right">{cf.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Line Items Table */}
        <div className="px-10 py-2">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr
                style={{
                  backgroundColor: template === "editorial-split" ? "#f8fafc" : accent,
                  color: template === "editorial-split" ? "#0f172a" : "#ffffff",
                }}
                className="text-[11px] font-semibold uppercase tracking-wider"
              >
                {doc.columns.showSku && (
                  <th className="py-2.5 px-3 rounded-tl-md">SKU</th>
                )}
                <th
                  className={`py-2.5 px-3 ${
                    !doc.columns.showSku ? "rounded-tl-md" : ""
                  }`}
                >
                  Item & Description
                </th>
                <th className="py-2.5 px-3 text-right">Qty</th>
                {doc.columns.showUnit && <th className="py-2.5 px-3">Unit</th>}
                <th className="py-2.5 px-3 text-right">Rate</th>
                {doc.columns.showItemDiscount && (
                  <th className="py-2.5 px-3 text-right">Disc %</th>
                )}
                {doc.taxMode === "per-item" && doc.columns.showItemTax && (
                  <th className="py-2.5 px-3 text-right">{doc.taxLabel || "Tax"} %</th>
                )}
                <th className="py-2.5 px-3 text-right rounded-tr-md">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {doc.items.map((item, idx) => {
                const line = calculateLineItem(item, {
                  showItemDiscount: doc.columns.showItemDiscount,
                  showItemTax: doc.columns.showItemTax,
                  taxMode: doc.taxMode,
                });
                return (
                  <tr
                    key={item.id}
                    className={`print-break-inside-avoid ${
                      idx % 2 === 1 ? "bg-slate-50/50" : "bg-white"
                    }`}
                  >
                    {doc.columns.showSku && (
                      <td className={`py-3 px-3 text-slate-500 align-top ${monoClass}`}>
                        {item.sku || "—"}
                      </td>
                    )}
                    <td className="py-3 px-3 align-top">
                      <div className="font-semibold text-slate-900">
                        {item.name || "Untitled Item"}
                      </div>
                      {item.description && (
                        <div className="text-[11px] text-slate-500 mt-0.5 whitespace-pre-line">
                          {item.description}
                        </div>
                      )}
                    </td>
                    <td className={`py-3 px-3 text-right align-top text-slate-700 ${monoClass}`}>
                      {item.quantity}
                    </td>
                    {doc.columns.showUnit && (
                      <td className="py-3 px-3 align-top text-slate-500">
                        {item.unit || "—"}
                      </td>
                    )}
                    <td className={`py-3 px-3 text-right align-top text-slate-700 ${monoClass}`}>
                      {formatCurrency(item.rate, doc.currency)}
                    </td>
                    {doc.columns.showItemDiscount && (
                      <td className={`py-3 px-3 text-right align-top text-slate-600 ${monoClass}`}>
                        {item.discountPercent ? `${item.discountPercent}%` : "—"}
                      </td>
                    )}
                    {doc.taxMode === "per-item" && doc.columns.showItemTax && (
                      <td className={`py-3 px-3 text-right align-top text-slate-600 ${monoClass}`}>
                        {item.taxPercent ? `${item.taxPercent}%` : "—"}
                      </td>
                    )}
                    <td
                      className={`py-3 px-3 text-right align-top font-semibold text-slate-900 ${monoClass}`}
                    >
                      {formatCurrency(line.total, doc.currency)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals Summary */}
        <div className="px-10 py-6 flex justify-end print-break-inside-avoid">
          <div className="w-full max-w-[300px] space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span className={`font-medium text-slate-900 ${monoClass}`}>
                {formatCurrency(totals.subtotal, doc.currency)}
              </span>
            </div>

            {totals.itemDiscountsTotal > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Item Discounts</span>
                <span className={monoClass}>
                  -{formatCurrency(totals.itemDiscountsTotal, doc.currency)}
                </span>
              </div>
            )}

            {totals.overallDiscountAmount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>
                  Discount
                  {doc.overallDiscountType === "percent"
                    ? ` (${doc.overallDiscountValue}%)`
                    : ""}
                </span>
                <span className={monoClass}>
                  -{formatCurrency(totals.overallDiscountAmount, doc.currency)}
                </span>
              </div>
            )}

            {doc.taxMode !== "none" && totals.taxTotal > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>
                  {doc.taxLabel || "Tax"}
                  {doc.taxMode === "overall" ? ` (${doc.overallTaxPercent}%)` : ""}
                </span>
                <span className={`font-medium text-slate-900 ${monoClass}`}>
                  {formatCurrency(totals.taxTotal, doc.currency)}
                </span>
              </div>
            )}

            {totals.shipping > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Shipping & Handling</span>
                <span className={`font-medium text-slate-900 ${monoClass}`}>
                  {formatCurrency(totals.shipping, doc.currency)}
                </span>
              </div>
            )}

            <div
              style={{ borderColor: accent }}
              className="border-t-2 pt-2.5 mt-2 flex justify-between items-center text-sm font-bold text-slate-900"
            >
              <span>Total ({doc.currency})</span>
              <span style={{ color: accent }} className={`text-lg ${monoClass}`}>
                {formatCurrency(totals.grandTotal, doc.currency)}
              </span>
            </div>

            {doc.type === "invoice" && totals.amountPaid > 0 && (
              <>
                <div className="flex justify-between text-slate-600 pt-1">
                  <span>Amount Paid</span>
                  <span className={monoClass}>
                    -{formatCurrency(totals.amountPaid, doc.currency)}
                  </span>
                </div>
                <div className="flex justify-between items-center bg-slate-100 rounded-md px-3 py-2 font-bold text-slate-900">
                  <span>Balance Due</span>
                  <span className={monoClass}>
                    {formatCurrency(totals.balanceDue, doc.currency)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Footer: Notes, Terms, Payment Details & Signature */}
      <div className="px-10 pb-10 pt-6 border-t border-slate-100 space-y-6 print-break-inside-avoid">
        <div className="grid grid-cols-12 gap-6 text-xs">
          <div className="col-span-7 space-y-4">
            {doc.notes && (
              <div>
                <div className="font-semibold text-slate-800 uppercase tracking-wider text-[10px] mb-1">
                  Notes
                </div>
                <p className="text-slate-600 whitespace-pre-line leading-relaxed">
                  {doc.notes}
                </p>
              </div>
            )}
            {doc.terms && (
              <div>
                <div className="font-semibold text-slate-800 uppercase tracking-wider text-[10px] mb-1">
                  Terms & Conditions
                </div>
                <p className="text-slate-500 whitespace-pre-line leading-relaxed">
                  {doc.terms}
                </p>
              </div>
            )}
            {doc.paymentDetails && (
              <div>
                <div className="font-semibold text-slate-800 uppercase tracking-wider text-[10px] mb-1">
                  Payment Details
                </div>
                <p className="text-slate-600 whitespace-pre-line leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-100">
                  {doc.paymentDetails}
                </p>
              </div>
            )}
          </div>

          {doc.signature.enabled && (
            <div className="col-span-5 flex flex-col justify-end items-end text-right">
              <div className="w-48">
                {doc.signature.imageDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={doc.signature.imageDataUrl}
                    alt="Signature"
                    className="h-14 w-auto ml-auto object-contain mb-1"
                  />
                ) : (
                  <div className="h-12" />
                )}
                <div className="border-t border-slate-300 pt-1.5">
                  <div className="font-semibold text-slate-900 text-xs">
                    {doc.signature.name || "Authorized Signatory"}
                  </div>
                  {doc.signature.title && (
                    <div className="text-[11px] text-slate-500">{doc.signature.title}</div>
                  )}
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">
                    {doc.signature.label || "Authorized Signature"}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


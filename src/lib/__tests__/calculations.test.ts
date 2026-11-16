import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateDocumentTotals,
  calculateLineItem,
  formatCurrency,
  roundCurrency,
} from "../calculations.ts";
import type { DocumentRecord, LineItem } from "../../types/document.ts";

function makeBaseDoc(overrides: Partial<DocumentRecord> = {}): DocumentRecord {
  return {
    id: "doc-1",
    type: "invoice",
    status: "draft",
    documentNumber: "INV-0001",
    title: "INVOICE",
    issueDate: "2026-11-14",
    dueDate: "2026-11-28",
    currency: "USD",
    branding: {
      logoDataUrl: "",
      logoSize: 48,
      accentColor: "#0f172a",
      templateId: "modern-minimal",
      fontStyle: "sans",
    },
    from: { name: "TrussEngage", email: "", phone: "", address: "", taxId: "" },
    to: { name: "Acme Corp", email: "", phone: "", address: "", taxId: "" },
    customFields: [],
    columns: {
      showSku: false,
      showUnit: true,
      showItemDiscount: true,
      showItemTax: true,
    },
    items: [],
    taxMode: "overall",
    taxLabel: "Tax",
    overallTaxPercent: 10,
    overallDiscountType: "percent",
    overallDiscountValue: 0,
    shipping: 0,
    amountPaid: 0,
    notes: "",
    terms: "",
    paymentDetails: "",
    signature: {
      enabled: false,
      label: "Authorized Signature",
      name: "",
      title: "",
      imageDataUrl: "",
    },
    createdAt: "2026-11-14T00:00:00.000Z",
    updatedAt: "2026-11-14T00:00:00.000Z",
    ...overrides,
  };
}

describe("roundCurrency", () => {
  it("handles NaN, Infinity, and normal rounding", () => {
    assert.equal(roundCurrency(Number.NaN), 0);
    assert.equal(roundCurrency(Number.POSITIVE_INFINITY), 0);
    assert.equal(roundCurrency(10.005), 10.01);
  });
});

describe("calculateLineItem", () => {
  const sampleItem: LineItem = {
    id: "1",
    sku: "SKU-1",
    name: "Design Sprint",
    description: "",
    quantity: 2,
    unit: "hrs",
    rate: 150,
    discountPercent: 10,
    taxPercent: 18,
  };

  it("computes per-item discount and per-item tax", () => {
    const res = calculateLineItem(sampleItem, {
      showItemDiscount: true,
      showItemTax: true,
      taxMode: "per-item",
    });
    assert.equal(res.gross, 300);
    assert.equal(res.discountAmount, 30);
    assert.equal(res.netBeforeTax, 270);
    assert.equal(res.taxAmount, 48.6);
    assert.equal(res.total, 318.6);
  });

  it("ignores item discount and tax when columns/mode disabled", () => {
    const res = calculateLineItem(sampleItem, {
      showItemDiscount: false,
      showItemTax: true,
      taxMode: "overall",
    });
    assert.equal(res.gross, 300);
    assert.equal(res.discountAmount, 0);
    assert.equal(res.taxAmount, 0);
    assert.equal(res.total, 300);
  });

  it("clamps negative quantities, negative rates, and >100% discounts", () => {
    const edgeItem: LineItem = {
      ...sampleItem,
      quantity: -5,
      rate: -100,
      discountPercent: 150,
      taxPercent: -10,
    };
    const res = calculateLineItem(edgeItem, {
      showItemDiscount: true,
      showItemTax: true,
      taxMode: "per-item",
    });
    assert.equal(res.gross, 0);
    assert.equal(res.discountAmount, 0);
    assert.equal(res.taxAmount, 0);
    assert.equal(res.total, 0);
  });
});

describe("calculateDocumentTotals", () => {
  it("computes overall discount, overall tax, shipping, and balance due", () => {
    const doc = makeBaseDoc({
      items: [
        {
          id: "1",
          sku: "",
          name: "Development",
          description: "",
          quantity: 10,
          unit: "hrs",
          rate: 100,
          discountPercent: 0,
          taxPercent: 0,
        },
      ],
      overallDiscountType: "fixed",
      overallDiscountValue: 100,
      taxMode: "overall",
      overallTaxPercent: 15,
      shipping: 25,
      amountPaid: 300,
    });

    const totals = calculateDocumentTotals(doc);
    assert.equal(totals.subtotal, 1000);
    assert.equal(totals.overallDiscountAmount, 100);
    assert.equal(totals.taxableSubtotal, 900);
    assert.equal(totals.taxTotal, 135);
    assert.equal(totals.shipping, 25);
    assert.equal(totals.grandTotal, 1060);
    assert.equal(totals.balanceDue, 760);
  });

  it("clamps fixed overall discount to subtotal and handles taxMode none", () => {
    const doc = makeBaseDoc({
      items: [
        {
          id: "1",
          sku: "",
          name: "Audit",
          description: "",
          quantity: 1,
          unit: "svc",
          rate: 200,
          discountPercent: 0,
          taxPercent: 20,
        },
      ],
      overallDiscountType: "fixed",
      overallDiscountValue: 999,
      taxMode: "none",
      overallTaxPercent: 20,
    });
    const totals = calculateDocumentTotals(doc);
    assert.equal(totals.overallDiscountAmount, 200);
    assert.equal(totals.taxableSubtotal, 0);
    assert.equal(totals.taxTotal, 0);
    assert.equal(totals.grandTotal, 0);
  });

  it("does not subtract amountPaid for quotations", () => {
    const doc = makeBaseDoc({
      type: "quotation",
      items: [
        {
          id: "1",
          sku: "",
          name: "Proposal",
          description: "",
          quantity: 1,
          unit: "project",
          rate: 500,
          discountPercent: 0,
          taxPercent: 0,
        },
      ],
      overallTaxPercent: 0,
      amountPaid: 200,
    });
    const totals = calculateDocumentTotals(doc);
    assert.equal(totals.grandTotal, 500);
    assert.equal(totals.amountPaid, 0);
    assert.equal(totals.balanceDue, 500);
  });
});

describe("formatCurrency", () => {
  it("formats USD with 2 decimals and JPY with 0 decimals", () => {
    assert.equal(formatCurrency(1234.5, "USD"), "$1,234.50");
    assert.equal(formatCurrency(1234, "JPY"), "¥1,234");
  });
});

import type { DocumentRecord, LineItem } from "@/types/document";

export interface LineItemTotals {
  gross: number;
  discountAmount: number;
  netBeforeTax: number;
  taxAmount: number;
  total: number;
}

export interface DocumentTotals {
  subtotal: number;
  itemDiscountsTotal: number;
  overallDiscountAmount: number;
  taxableSubtotal: number;
  taxTotal: number;
  shipping: number;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
}

export const CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "AED", symbol: "AED", name: "UAE Dirham" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
] as const;

export function roundCurrency(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateLineItem(
  item: LineItem,
  options: { showItemDiscount: boolean; showItemTax: boolean; taxMode: DocumentRecord["taxMode"] }
): LineItemTotals {
  const qty = Math.max(0, Number(item.quantity) || 0);
  const rate = Math.max(0, Number(item.rate) || 0);
  const gross = roundCurrency(qty * rate);

  const discountPct = options.showItemDiscount
    ? Math.min(100, Math.max(0, Number(item.discountPercent) || 0))
    : 0;
  const discountAmount = roundCurrency((gross * discountPct) / 100);
  const netBeforeTax = roundCurrency(gross - discountAmount);

  const taxPct =
    options.taxMode === "per-item" && options.showItemTax
      ? Math.max(0, Number(item.taxPercent) || 0)
      : 0;
  const taxAmount = roundCurrency((netBeforeTax * taxPct) / 100);
  const total = roundCurrency(netBeforeTax + taxAmount);

  return {
    gross,
    discountAmount,
    netBeforeTax,
    taxAmount,
    total,
  };
}

export function calculateDocumentTotals(doc: DocumentRecord): DocumentTotals {
  let subtotal = 0;
  let itemDiscountsTotal = 0;
  let perItemTaxTotal = 0;

  for (const item of doc.items) {
    const line = calculateLineItem(item, {
      showItemDiscount: doc.columns.showItemDiscount,
      showItemTax: doc.columns.showItemTax,
      taxMode: doc.taxMode,
    });
    subtotal = roundCurrency(subtotal + line.gross);
    itemDiscountsTotal = roundCurrency(itemDiscountsTotal + line.discountAmount);
    perItemTaxTotal = roundCurrency(perItemTaxTotal + line.taxAmount);
  }

  const netAfterItemDiscounts = roundCurrency(subtotal - itemDiscountsTotal);

  let overallDiscountAmount = 0;
  const rawDiscount = Math.max(0, Number(doc.overallDiscountValue) || 0);
  if (doc.overallDiscountType === "percent") {
    const clampedPct = Math.min(100, rawDiscount);
    overallDiscountAmount = roundCurrency((netAfterItemDiscounts * clampedPct) / 100);
  } else {
    overallDiscountAmount = roundCurrency(Math.min(netAfterItemDiscounts, rawDiscount));
  }

  const taxableSubtotal = roundCurrency(Math.max(0, netAfterItemDiscounts - overallDiscountAmount));

  let taxTotal = 0;
  if (doc.taxMode === "per-item") {
    taxTotal = perItemTaxTotal;
  } else if (doc.taxMode === "overall") {
    const overallPct = Math.max(0, Number(doc.overallTaxPercent) || 0);
    taxTotal = roundCurrency((taxableSubtotal * overallPct) / 100);
  }

  const shipping = roundCurrency(Math.max(0, Number(doc.shipping) || 0));
  const grandTotal = roundCurrency(taxableSubtotal + taxTotal + shipping);
  const amountPaid =
    doc.type === "invoice" ? roundCurrency(Math.max(0, Number(doc.amountPaid) || 0)) : 0;
  const balanceDue = roundCurrency(Math.max(0, grandTotal - amountPaid));

  return {
    subtotal,
    itemDiscountsTotal,
    overallDiscountAmount,
    taxableSubtotal,
    taxTotal,
    shipping,
    grandTotal,
    amountPaid,
    balanceDue,
  };
}

export function formatCurrency(amount: number, currencyCode: string = "USD"): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode || "USD",
      minimumFractionDigits: currencyCode === "JPY" ? 0 : 2,
      maximumFractionDigits: currencyCode === "JPY" ? 0 : 2,
    }).format(amount || 0);
  } catch {
    return `${currencyCode} ${(amount || 0).toFixed(2)}`;
  }
}


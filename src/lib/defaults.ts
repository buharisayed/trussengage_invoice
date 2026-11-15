import type {
  CompanySettings,
  DocumentRecord,
  DocumentType,
  LineItem,
} from "@/types/document";

export function formatDocNumber(prefix: string, num: number): string {
  return `${prefix}${String(num).padStart(4, "0")}`;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function createEmptyLineItem(): LineItem {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `item-${Date.now()}-${Math.random()}`,
    sku: "",
    name: "",
    description: "",
    quantity: 1,
    unit: "pcs",
    rate: 0,
    discountPercent: 0,
    taxPercent: 0,
  };
}

export function getDefaultSettings(): CompanySettings {
  return {
    from: {
      name: "TrussEngage Studio",
      email: "billing@trussengage.com",
      phone: "+1 (555) 234-5678",
      address: "420 Innovation Way, Suite 300\nSan Francisco, CA 94107",
      taxId: "TAX-94-281904",
      website: "https://trussengage.com",
    },
    logoDataUrl: "",
    logoSize: 52,
    accentColor: "#2563eb",
    templateId: "modern-minimal",
    fontStyle: "sans",
    currency: "USD",
    taxLabel: "Tax",
    defaultTaxPercent: 10,
    invoicePrefix: "INV-",
    quotationPrefix: "QUO-",
    nextInvoiceNumber: 1002,
    nextQuotationNumber: 1002,
    defaultNotes: "Thank you for your business. Please reach out if you have any questions.",
    defaultTerms: "Payment is due within 14 days of issue. Late payments may incur a 1.5% monthly fee.",
    defaultPaymentDetails: "Bank: Silicon Valley Commercial Bank\nAccount Name: TrussEngage Studio\nRouting: 121000358 | Account: 883920194",
    signature: {
      enabled: true,
      label: "Authorized Signature",
      name: "Alex Morgan",
      title: "Managing Director",
      imageDataUrl: "",
    },
  };
}

export function createDocumentFromSettings(
  type: DocumentType,
  settings: CompanySettings,
  overrideNumber?: string
): DocumentRecord {
  const now = new Date().toISOString();
  const docNumber =
    overrideNumber ??
    (type === "invoice"
      ? formatDocNumber(settings.invoicePrefix, settings.nextInvoiceNumber)
      : formatDocNumber(settings.quotationPrefix, settings.nextQuotationNumber));

  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `doc-${Date.now()}`,
    type,
    status: "draft",
    documentNumber: docNumber,
    title: type === "invoice" ? "INVOICE" : "QUOTATION",
    issueDate: todayISO(),
    dueDate: addDaysISO(type === "invoice" ? 14 : 30),
    currency: settings.currency,
    branding: {
      logoDataUrl: settings.logoDataUrl,
      logoSize: settings.logoSize,
      accentColor: settings.accentColor,
      templateId: settings.templateId,
      fontStyle: settings.fontStyle,
    },
    from: { ...settings.from },
    to: {
      name: "",
      email: "",
      phone: "",
      address: "",
      taxId: "",
    },
    customFields: [],
    columns: {
      showSku: false,
      showUnit: true,
      showItemDiscount: false,
      showItemTax: false,
    },
    items: [createEmptyLineItem()],
    taxMode: settings.defaultTaxPercent > 0 ? "overall" : "none",
    taxLabel: settings.taxLabel,
    overallTaxPercent: settings.defaultTaxPercent,
    overallDiscountType: "percent",
    overallDiscountValue: 0,
    shipping: 0,
    amountPaid: 0,
    notes: settings.defaultNotes,
    terms: settings.defaultTerms,
    paymentDetails: type === "invoice" ? settings.defaultPaymentDetails : "",
    signature: { ...settings.signature },
    createdAt: now,
    updatedAt: now,
  };
}


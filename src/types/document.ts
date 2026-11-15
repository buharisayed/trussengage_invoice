export type DocumentType = "invoice" | "quotation";

export type DocumentStatus =
  | "draft"
  | "sent"
  | "paid"
  | "accepted"
  | "declined"
  | "overdue";

export type TemplateId = "modern-minimal" | "bold-executive" | "editorial-split";

export type FontStyle = "sans" | "serif" | "mono-accent";

export type TaxMode = "per-item" | "overall" | "none";

export type DiscountMode = "percent" | "fixed";

export interface PartyDetails {
  name: string;
  email: string;
  phone: string;
  address: string;
  taxId: string;
  website?: string;
}

export interface LineItem {
  id: string;
  sku: string;
  name: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  discountPercent: number;
  taxPercent: number;
}

export interface ColumnConfig {
  showSku: boolean;
  showUnit: boolean;
  showItemDiscount: boolean;
  showItemTax: boolean;
}

export interface CustomField {
  id: string;
  label: string;
  value: string;
}

export interface SignatureConfig {
  enabled: boolean;
  label: string;
  name: string;
  title: string;
  imageDataUrl: string;
}

export interface DocumentBranding {
  logoDataUrl: string;
  logoSize: number; // height in px (e.g. 36 - 96)
  accentColor: string;
  templateId: TemplateId;
  fontStyle: FontStyle;
}

export interface DocumentRecord {
  id: string;
  type: DocumentType;
  status: DocumentStatus;
  documentNumber: string;
  title: string; // e.g., "INVOICE" or "QUOTATION" (editable)
  issueDate: string;
  dueDate: string; // Due date for invoice, Valid until for quotation
  currency: string;
  branding: DocumentBranding;
  from: PartyDetails;
  to: PartyDetails;
  customFields: CustomField[];
  columns: ColumnConfig;
  items: LineItem[];
  taxMode: TaxMode;
  taxLabel: string;
  overallTaxPercent: number;
  overallDiscountType: DiscountMode;
  overallDiscountValue: number;
  shipping: number;
  amountPaid: number;
  notes: string;
  terms: string;
  paymentDetails: string;
  signature: SignatureConfig;
  convertedFromId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClientRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  taxId: string;
  createdAt: string;
}

export interface CompanySettings {
  from: PartyDetails;
  logoDataUrl: string;
  logoSize: number;
  accentColor: string;
  templateId: TemplateId;
  fontStyle: FontStyle;
  currency: string;
  taxLabel: string;
  defaultTaxPercent: number;
  invoicePrefix: string;
  quotationPrefix: string;
  nextInvoiceNumber: number;
  nextQuotationNumber: number;
  defaultNotes: string;
  defaultTerms: string;
  defaultPaymentDetails: string;
  signature: SignatureConfig;
}

export interface DatabaseSchema {
  settings: CompanySettings;
  clients: ClientRecord[];
  documents: DocumentRecord[];
}


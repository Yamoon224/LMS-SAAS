import type { Invoice } from "./invoice";

export interface InvoicePdfData {
  invoice: Invoice;
  customerName: string;
  customerEmail: string | null;
}

export interface InvoicePdfRendererPort {
  render(data: InvoicePdfData): Promise<Buffer>;
}

export const INVOICE_PDF_RENDERER = Symbol("INVOICE_PDF_RENDERER");

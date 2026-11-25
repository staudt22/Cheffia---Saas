/**
 * Receipt extraction (OCR / AI) — architecture placeholder.
 *
 * Not implemented yet. Forkly does NOT pretend to read receipts: uploads are
 * stored as attachments only. When an extractor is added it should implement
 * this interface, run server-side only, and return suggestions the user
 * confirms before anything is saved.
 */
export interface ReceiptSuggestion {
  description?: string;
  amount?: number;
  date?: string; // yyyy-MM-dd
  supplierName?: string;
  category?: string;
  confidence: number; // 0..1
}

export interface ReceiptExtractor {
  /** storagePath is "<restaurant_id>/<file>" in the private "receipts" bucket. */
  extract(storagePath: string): Promise<ReceiptSuggestion>;
}

export const receiptExtractionAvailable = false;

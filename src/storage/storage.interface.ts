/** Allowed MIME types for invoice document uploads. */
export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

/** Maximum upload size in bytes (10 MB). */
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export interface UploadInput {
  /** Invoice ID — used to build the storage path. */
  invoiceId: string;
  /** Original file name (e.g. "invoice-2024.pdf"). */
  fileName: string;
  /** Raw file content. */
  buffer: Buffer;
  /** MIME type – must be one of ALLOWED_MIME_TYPES. */
  mimeType: string;
}

export interface UploadResult {
  /** Provider-specific key needed to delete / retrieve the URL later. */
  storageKey: string;
  /** Publicly-accessible (or signed) URL of the stored document. */
  url: string;
  /** Size of the stored file in bytes. */
  bytes: number;
}

/**
 * Abstract storage contract for invoice documents.
 *
 * Implementations MUST:
 *  - validate mimeType against ALLOWED_MIME_TYPES
 *  - reject files larger than MAX_FILE_SIZE_BYTES
 *  - never expose provider credentials to callers
 */
export interface StorageProvider {
  upload(input: UploadInput): Promise<UploadResult>;
  delete(storageKey: string): Promise<void>;
  getUrl(storageKey: string): string;
}

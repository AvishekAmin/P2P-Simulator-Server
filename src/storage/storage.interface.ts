/** Allowed MIME types for invoice document uploads. */
export const ALLOWED_MIME_TYPES = ["application/pdf", "image/png", "image/jpeg"] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

/**
 * Cloudinary's canonical delivery format for each allowed MIME type.
 *
 * JPEG maps to `jpg`, not `jpeg` — that is the format Cloudinary stores and
 * serves, and asking for a different extension triggers an on-the-fly
 * conversion rather than a plain read of the stored asset.
 */
export const FORMAT_BY_MIME_TYPE: Record<AllowedMimeType, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
};

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
  /**
   * Fetch the stored bytes back — the invoice worker needs them to send to Gemini.
   *
   * `mimeType` is required because the delivery URL must name the format
   * explicitly; see getUrl().
   */
  download(storageKey: string, mimeType: string): Promise<Buffer>;
  delete(storageKey: string): Promise<void>;
  /**
   * Build a delivery URL for a stored object.
   *
   * `mimeType` is not optional: a provider whose delivery path encodes the
   * format as a file extension cannot tell `{key}` from `{key-minus-suffix}` +
   * format unless the format is stated. Leaving it off makes any storage key
   * containing a dot resolve to the wrong object.
   */
  getUrl(storageKey: string, mimeType: string): string;
}

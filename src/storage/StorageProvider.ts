export interface UploadInput {
  organizationId: string;
  /** Logical resource this file belongs to, e.g. an invoice ID. */
  resourceId: string;
  fileName: string;
  buffer: Buffer;
  mimeType: string;
}

export interface UploadResult {
  /** Provider-specific identifier needed to download/delete/sign later. */
  storageKey: string;
  bytes: number;
}

export interface StorageProvider {
  upload(input: UploadInput): Promise<UploadResult>;
  download(storageKey: string): Promise<Buffer>;
  delete(storageKey: string): Promise<void>;
  getSignedUrl(storageKey: string, expiresInSeconds?: number): Promise<string>;
}

import { v2 as cloudinary } from "cloudinary";
import { AppError } from "../utils/AppError.js";
import type {
  AllowedMimeType,
  StorageProvider,
  UploadInput,
  UploadResult,
} from "./storage.interface.js";
import {
  ALLOWED_MIME_TYPES,
  FORMAT_BY_MIME_TYPE,
  MAX_FILE_SIZE_BYTES,
} from "./storage.interface.js";

/**
 * Magic-byte signature checks for each allowed MIME type. The caller-supplied
 * `mimeType` metadata is untrusted — this confirms the buffer actually is what
 * it claims to be before it reaches the Cloudinary upload path.
 */
const SIGNATURE_CHECKS: Record<AllowedMimeType, (buffer: Buffer) => boolean> = {
  "application/pdf": (buffer) => buffer.subarray(0, 4).toString("latin1") === "%PDF",
  "image/png": (buffer) =>
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a,
  "image/jpeg": (buffer) =>
    buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
};

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Build the Cloudinary public_id under the `p2p/invoices/{invoiceId}` folder.
 * File extension is stripped because Cloudinary adds it automatically based on
 * the detected resource type.
 */
export function buildPublicId(invoiceId: string, fileName: string): string {
  const baseName = fileName.replace(/\.[^/.]+$/, "");
  return `p2p/invoices/${invoiceId}/${baseName}`;
}

/**
 * Cloudinary's delivery format for a stored MIME type.
 *
 * Throws VALIDATION_ERROR rather than guessing: a stored MIME type outside the
 * allowed set can never produce a working URL, so the invoice worker should
 * treat it as terminal instead of retrying it three times.
 */
function formatForMimeType(mimeType: string): string {
  const format = FORMAT_BY_MIME_TYPE[mimeType as AllowedMimeType];

  if (!format) {
    throw AppError.validation(`Cannot build a delivery URL for unsupported file type: ${mimeType}`);
  }

  return format;
}

/**
 * Validate file type and size before uploading.
 * Throws AppError.validation on failure.
 */
function validateFile(mimeType: string, buffer: Buffer): void {
  if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType)) {
    throw AppError.validation(
      `Unsupported file type: ${mimeType}. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}`,
    );
  }

  const bufferSize = buffer.length;

  if (bufferSize > MAX_FILE_SIZE_BYTES) {
    const maxMB = MAX_FILE_SIZE_BYTES / (1024 * 1024);
    throw AppError.validation(
      `File size (${(bufferSize / (1024 * 1024)).toFixed(1)} MB) exceeds the ${maxMB} MB limit`,
    );
  }

  if (bufferSize === 0) {
    throw AppError.validation("File is empty");
  }

  const matchesSignature = SIGNATURE_CHECKS[mimeType as AllowedMimeType](buffer);
  if (!matchesSignature) {
    throw AppError.validation(`File content does not match the declared type: ${mimeType}`);
  }
}

export class CloudinaryStorage implements StorageProvider {
  /**
   * Upload an invoice document to Cloudinary.
   *
   * Documents are stored under `p2p/invoices/{invoiceId}/` with
   * `resource_type: "auto"` so PDFs and images are both accepted.
   * The `type: "authenticated"` flag prevents unauthenticated public access.
   */
  async upload(input: UploadInput): Promise<UploadResult> {
    validateFile(input.mimeType, input.buffer);

    const publicId = buildPublicId(input.invoiceId, input.fileName);

    try {
      const result = await new Promise<{
        public_id: string;
        secure_url: string;
        bytes: number;
        format?: string;
      }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            public_id: publicId,
            resource_type: "auto",
            type: "authenticated",
            overwrite: false,
          },
          (error, uploadResult) => {
            if (error || !uploadResult) {
              reject(error ?? new Error("Cloudinary upload returned no result"));
              return;
            }
            resolve(uploadResult);
          },
        );
        stream.end(input.buffer);
      });

      const expectedFormat = formatForMimeType(input.mimeType);

      // getUrl() derives the format from the MIME type rather than from this
      // response, because download() only has the stored MIME type to work
      // from. If Cloudinary ever disagrees, say so here — at upload time, with
      // the file in hand — instead of leaving a deny to be debugged later.
      if (result.format && result.format !== expectedFormat) {
        console.warn(
          `Cloudinary stored ${result.public_id} as format "${result.format}" but ${input.mimeType} maps to "${expectedFormat}" — delivery URLs for this object may not resolve.`,
        );
      }

      return {
        storageKey: result.public_id,
        url: this.getUrl(result.public_id, input.mimeType),
        bytes: result.bytes,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.dependencyUnavailable("Failed to upload document to Cloudinary", {
        cause: error instanceof Error ? error.message : error,
      });
    }
  }

  /**
   * Fetch a stored document back as raw bytes.
   *
   * Assets are uploaded with `type: "authenticated"`, so the signed URL from
   * getUrl() is the only way to read them — an unsigned delivery URL 401s.
   */
  async download(storageKey: string, mimeType: string): Promise<Buffer> {
    let response: Response;

    try {
      response = await fetch(this.getUrl(storageKey, mimeType));
    } catch (error) {
      throw AppError.dependencyUnavailable("Failed to download document from Cloudinary", {
        cause: error instanceof Error ? error.message : error,
      });
    }

    if (!response.ok) {
      // A 4xx means the object is gone, renamed, or not readable with this
      // signature — every retry gets the same answer, so the caller must be able
      // to tell it apart from an outage. 408/429 are the retryable exceptions.
      const isRetryable =
        response.status >= 500 || response.status === 408 || response.status === 429;

      if (!isRetryable) {
        throw AppError.notFound("Invoice document is not retrievable from Cloudinary", {
          storageKey,
          status: response.status,
        });
      }

      throw AppError.dependencyUnavailable("Failed to download document from Cloudinary", {
        storageKey,
        status: response.status,
      });
    }

    return Buffer.from(await response.arrayBuffer());
  }

  /**
   * Delete a document from Cloudinary by its storage key (public_id).
   */
  async delete(storageKey: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(storageKey, { type: "authenticated", invalidate: true });
    } catch (error) {
      throw AppError.dependencyUnavailable("Failed to delete document from Cloudinary", {
        cause: error instanceof Error ? error.message : error,
      });
    }
  }

  /**
   * Build and return a Cloudinary delivery URL for the given storage key.
   * This is a server-side only method — the URL is never exposed to the
   * frontend directly.
   *
   * `format` is not decorative. Cloudinary reads the segment after the LAST dot
   * of the delivery path as the requested format and everything before it as
   * the public_id, so `.../receipt.pdf` is indistinguishable from public_id
   * `.../receipt` + format `pdf`. Omitting the format therefore breaks every
   * key whose own name contains a dot — buildPublicId("inv-1", "Invoice_v1.2.png")
   * yields `.../Invoice_v1.2`, which Cloudinary would resolve as public_id
   * `.../Invoice_v1` + format `2` and deny. Naming the format puts the real
   * public_id entirely to the left of the last dot, which is correct for any
   * base name.
   */
  getUrl(storageKey: string, mimeType: string): string {
    return cloudinary.url(storageKey, {
      resource_type: "image",
      type: "authenticated",
      secure: true,
      sign_url: true,
      format: formatForMimeType(mimeType),
    });
  }
}

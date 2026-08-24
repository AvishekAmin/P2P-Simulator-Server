import { v2 as cloudinary } from "cloudinary";
import { AppError } from "../utils/AppError.js";
import type { StorageProvider, UploadInput, UploadResult } from "./storage.interface.js";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from "./storage.interface.js";

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
 * Validate file type and size before uploading.
 * Throws AppError.validation on failure.
 */
function validateFile(mimeType: string, bufferSize: number): void {
  if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType)) {
    throw AppError.validation(
      `Unsupported file type: ${mimeType}. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}`,
    );
  }

  if (bufferSize > MAX_FILE_SIZE_BYTES) {
    const maxMB = MAX_FILE_SIZE_BYTES / (1024 * 1024);
    throw AppError.validation(
      `File size (${(bufferSize / (1024 * 1024)).toFixed(1)} MB) exceeds the ${maxMB} MB limit`,
    );
  }

  if (bufferSize === 0) {
    throw AppError.validation("File is empty");
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
    validateFile(input.mimeType, input.buffer.length);

    const publicId = buildPublicId(input.invoiceId, input.fileName);

    try {
      const result = await new Promise<{
        public_id: string;
        secure_url: string;
        bytes: number;
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

      return {
        storageKey: result.public_id,
        url: result.secure_url,
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
   * Delete a document from Cloudinary by its storage key (public_id).
   */
  async delete(storageKey: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(storageKey, { type: "authenticated" });
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
   */
  getUrl(storageKey: string): string {
    return cloudinary.url(storageKey, {
      resource_type: "auto",
      type: "authenticated",
      secure: true,
      sign_url: true,
    });
  }
}

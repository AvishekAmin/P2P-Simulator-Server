import { v2 as cloudinary } from "cloudinary";
import { AppError } from "../utils/AppError.js";
import type { StorageProvider, UploadInput, UploadResult } from "./StorageProvider.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Organization-scoped folder layout mirrors the S3 convention from
// CLAUDE.md §18: organizations/{organizationId}/invoices/{invoiceId}/...
export function buildPublicId(
  organizationId: string,
  resourceId: string,
  fileName: string,
): string {
  const safeFileName = fileName.replace(/\.[^/.]+$/, "");
  return `organizations/${organizationId}/invoices/${resourceId}/${safeFileName}`;
}

export class CloudinaryStorageProvider implements StorageProvider {
  async upload(input: UploadInput): Promise<UploadResult> {
    const publicId = buildPublicId(input.organizationId, input.resourceId, input.fileName);

    try {
      const result = await new Promise<{ public_id: string; bytes: number }>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            public_id: publicId,
            resource_type: "auto",
            // Assets are never publicly readable; access requires a signed
            // delivery URL generated via getSignedUrl().
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
        uploadStream.end(input.buffer);
      });

      return { storageKey: result.public_id, bytes: result.bytes };
    } catch (error) {
      throw AppError.dependencyUnavailable("Failed to upload document to Cloudinary", {
        cause: error instanceof Error ? error.message : error,
      });
    }
  }

  async download(storageKey: string): Promise<Buffer> {
    const url = await this.getSignedUrl(storageKey, 60);
    const response = await fetch(url);
    if (!response.ok) {
      throw AppError.dependencyUnavailable("Failed to download document from Cloudinary");
    }
    return Buffer.from(await response.arrayBuffer());
  }

  async delete(storageKey: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(storageKey, { type: "authenticated" });
    } catch (error) {
      throw AppError.dependencyUnavailable("Failed to delete document from Cloudinary", {
        cause: error instanceof Error ? error.message : error,
      });
    }
  }

  async getSignedUrl(storageKey: string, expiresInSeconds = 300): Promise<string> {
    // NOTE: the Cloudinary account needs "Allow delivery of PDF and ZIP
    // files" enabled (Settings > Security) for invoice PDFs to be servable.
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
    return cloudinary.utils.private_download_url(storageKey, "", {
      resource_type: "auto",
      type: "authenticated",
      expires_at: expiresAt,
    });
  }
}

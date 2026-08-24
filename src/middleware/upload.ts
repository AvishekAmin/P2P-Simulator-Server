import type { NextFunction, Request, Response } from "express";
import multer, { MulterError } from "multer";
import { MAX_FILE_SIZE_BYTES } from "../storage/storage.interface.js";
import { AppError } from "../utils/AppError.js";

/**
 * Files are held in memory, never on disk: the buffer goes straight to
 * Cloudinary and is thrown away. At 10 MB a file with a handful of concurrent
 * uploads that is cheap, and it avoids leaving invoice documents in a temp dir.
 */
const invoiceUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1 },
}).single("file");

/**
 * Multer throws its own error class, which the error handler would report as a
 * 500. Translate it so a file that is too large or sent under the wrong field
 * name gets the same VALIDATION_ERROR envelope as any other bad input.
 *
 * MIME type, size and magic bytes are checked authoritatively in
 * src/storage/cloudinary.storage.ts — deliberately not duplicated here.
 */
export function uploadInvoiceFile(req: Request, res: Response, next: NextFunction): void {
  invoiceUpload(req, res, (error: unknown) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof MulterError) {
      next(AppError.validation(describeMulterError(error), { field: error.field }));
      return;
    }

    next(error);
  });
}

function describeMulterError(error: MulterError): string {
  switch (error.code) {
    case "LIMIT_FILE_SIZE": {
      const maxMB = MAX_FILE_SIZE_BYTES / (1024 * 1024);
      return `File size exceeds the ${maxMB} MB limit`;
    }
    case "LIMIT_FILE_COUNT":
      return "Only one file may be uploaded per invoice";
    case "LIMIT_UNEXPECTED_FILE":
      return 'Unexpected file field. The document must be sent as "file"';
    default:
      return `Upload failed: ${error.message}`;
  }
}

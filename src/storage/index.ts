import { CloudinaryStorage } from "./cloudinary.storage.js";
import type { StorageProvider } from "./storage.interface.js";

export type { StorageProvider, UploadInput, UploadResult } from "./storage.interface.js";
export { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from "./storage.interface.js";

let provider: StorageProvider | undefined;

/**
 * Lazily constructed singleton, mirroring getAIProvider(). Every caller — the
 * upload controller and the invoice worker — goes through this, so tests mock
 * one module rather than the Cloudinary SDK.
 */
export function getStorageProvider(): StorageProvider {
  provider ??= new CloudinaryStorage();
  return provider;
}

import { describe, expect, it, vi, beforeEach } from "vitest";
import { AppError } from "../src/utils/AppError.js";
import type { UploadInput } from "../src/storage/storage.interface.js";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from "../src/storage/storage.interface.js";

// ---------------------------------------------------------------------------
// Mock the cloudinary SDK before importing the module under test.
// ---------------------------------------------------------------------------

const mockUploadStream = vi.fn();
const mockDestroy = vi.fn();
const mockUrl = vi.fn();

vi.mock("cloudinary", () => ({
  v2: {
    config: vi.fn(),
    uploader: {
      upload_stream: mockUploadStream,
      destroy: mockDestroy,
    },
    url: mockUrl,
  },
}));

// Import after the mock is registered so the module picks up the stub.
const { CloudinaryStorage, buildPublicId } = await import(
  "../src/storage/cloudinary.storage.js"
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function validInput(overrides: Partial<UploadInput> = {}): UploadInput {
  return {
    invoiceId: "inv-001",
    fileName: "receipt.pdf",
    buffer: Buffer.from("fake-pdf-content"),
    mimeType: "application/pdf",
    ...overrides,
  };
}

/**
 * Configure mockUploadStream so it immediately resolves with a fake
 * Cloudinary upload result.
 */
function stubSuccessfulUpload(bytes = 1024) {
  mockUploadStream.mockImplementation((_opts: unknown, cb: Function) => {
    const fakeResult = {
      public_id: "p2p/invoices/inv-001/receipt",
      secure_url: "https://res.cloudinary.com/test/image/authenticated/p2p/invoices/inv-001/receipt.pdf",
      bytes,
    };
    // Return a stream-like object with an `end` method.
    return {
      end: () => cb(null, fakeResult),
    };
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("buildPublicId", () => {
  it("builds the correct path under p2p/invoices/{invoiceId}", () => {
    expect(buildPublicId("inv-42", "scan.pdf")).toBe("p2p/invoices/inv-42/scan");
  });

  it("strips the file extension", () => {
    expect(buildPublicId("inv-1", "photo.invoice.png")).toBe("p2p/invoices/inv-1/photo.invoice");
  });
});

describe("CloudinaryStorage", () => {
  let storage: InstanceType<typeof CloudinaryStorage>;

  beforeEach(() => {
    vi.clearAllMocks();
    storage = new CloudinaryStorage();
  });

  // -----------------------------------------------------------------------
  // Validation
  // -----------------------------------------------------------------------

  describe("upload – validation", () => {
    it("rejects unsupported MIME types", async () => {
      const input = validInput({ mimeType: "application/zip" });

      await expect(storage.upload(input)).rejects.toThrow(AppError);
      await expect(storage.upload(input)).rejects.toMatchObject({
        code: "VALIDATION_ERROR",
      });
    });

    it.each(ALLOWED_MIME_TYPES)("accepts MIME type %s", async (mime) => {
      stubSuccessfulUpload();
      const input = validInput({ mimeType: mime });

      const result = await storage.upload(input);
      expect(result).toHaveProperty("storageKey");
    });

    it("rejects files exceeding MAX_FILE_SIZE_BYTES", async () => {
      const oversizedBuffer = Buffer.alloc(MAX_FILE_SIZE_BYTES + 1);
      const input = validInput({ buffer: oversizedBuffer });

      await expect(storage.upload(input)).rejects.toThrow(AppError);
      await expect(storage.upload(input)).rejects.toMatchObject({
        code: "VALIDATION_ERROR",
      });
    });

    it("rejects empty files", async () => {
      const input = validInput({ buffer: Buffer.alloc(0) });

      await expect(storage.upload(input)).rejects.toThrow(AppError);
      await expect(storage.upload(input)).rejects.toMatchObject({
        code: "VALIDATION_ERROR",
      });
    });
  });

  // -----------------------------------------------------------------------
  // Upload (happy path)
  // -----------------------------------------------------------------------

  describe("upload – success", () => {
    it("returns storageKey, url, and bytes", async () => {
      stubSuccessfulUpload(2048);
      const input = validInput();

      const result = await storage.upload(input);

      expect(result).toEqual({
        storageKey: "p2p/invoices/inv-001/receipt",
        url: expect.stringContaining("cloudinary.com"),
        bytes: 2048,
      });
    });

    it("calls cloudinary upload_stream with correct options", async () => {
      stubSuccessfulUpload();
      const input = validInput();

      await storage.upload(input);

      expect(mockUploadStream).toHaveBeenCalledWith(
        expect.objectContaining({
          public_id: "p2p/invoices/inv-001/receipt",
          resource_type: "auto",
          type: "authenticated",
          overwrite: false,
        }),
        expect.any(Function),
      );
    });
  });

  // -----------------------------------------------------------------------
  // Upload – Cloudinary errors
  // -----------------------------------------------------------------------

  describe("upload – Cloudinary failure", () => {
    it("wraps SDK errors as DEPENDENCY_UNAVAILABLE", async () => {
      mockUploadStream.mockImplementation((_opts: unknown, cb: Function) => ({
        end: () => cb(new Error("Network timeout")),
      }));

      const input = validInput();

      await expect(storage.upload(input)).rejects.toThrow(AppError);
      await expect(storage.upload(input)).rejects.toMatchObject({
        code: "DEPENDENCY_UNAVAILABLE",
      });
    });
  });

  // -----------------------------------------------------------------------
  // Delete
  // -----------------------------------------------------------------------

  describe("delete", () => {
    it("calls cloudinary.uploader.destroy with the storage key", async () => {
      mockDestroy.mockResolvedValue({ result: "ok" });

      await storage.delete("p2p/invoices/inv-001/receipt");

      expect(mockDestroy).toHaveBeenCalledWith("p2p/invoices/inv-001/receipt", {
        type: "authenticated",
      });
    });

    it("wraps SDK errors as DEPENDENCY_UNAVAILABLE", async () => {
      mockDestroy.mockRejectedValue(new Error("Cloudinary is down"));

      await expect(storage.delete("key")).rejects.toThrow(AppError);
      await expect(storage.delete("key")).rejects.toMatchObject({
        code: "DEPENDENCY_UNAVAILABLE",
      });
    });
  });

  // -----------------------------------------------------------------------
  // getUrl
  // -----------------------------------------------------------------------

  describe("getUrl", () => {
    it("delegates to cloudinary.url with authenticated + signed options", () => {
      mockUrl.mockReturnValue("https://res.cloudinary.com/signed-url");

      const url = storage.getUrl("p2p/invoices/inv-001/receipt");

      expect(url).toBe("https://res.cloudinary.com/signed-url");
      expect(mockUrl).toHaveBeenCalledWith("p2p/invoices/inv-001/receipt", {
        resource_type: "auto",
        type: "authenticated",
        secure: true,
        sign_url: true,
      });
    });
  });
});

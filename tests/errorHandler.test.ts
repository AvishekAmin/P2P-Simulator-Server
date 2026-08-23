import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { errorHandler } from "../src/middleware/errorHandler.js";
import { AppError } from "../src/utils/AppError.js";

function mockResponse() {
  const res: Partial<Response> = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res as Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
}

describe("errorHandler", () => {
  it("maps AppError to its declared status code and envelope", () => {
    const res = mockResponse();
    const error = AppError.notFound("Invoice not found");

    errorHandler(error, {} as Request, res, (() => {}) as NextFunction);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: "NOT_FOUND", message: "Invoice not found" }),
      }),
    );
  });

  it("maps ZodError to a 400 VALIDATION_ERROR envelope", () => {
    const res = mockResponse();
    const schema = z.object({ quantity: z.number() });
    const parseResult = schema.safeParse({ quantity: "not-a-number" });
    expect(parseResult.success).toBe(false);

    errorHandler(parseResult.error, {} as Request, res, (() => {}) as NextFunction);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: "VALIDATION_ERROR" }),
      }),
    );
  });

  it("falls back to a 500 INTERNAL_ERROR envelope for unknown errors", () => {
    const res = mockResponse();

    errorHandler(new Error("boom"), {} as Request, res, (() => {}) as NextFunction);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: "INTERNAL_ERROR" }),
      }),
    );
  });
});

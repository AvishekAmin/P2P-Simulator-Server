import type { Response } from "express";
import type { ErrorCode } from "./AppError.js";

interface SuccessBody<T> {
  success: true;
  data: T;
  error: null;
  requestId: string;
}

interface ErrorBody {
  success: false;
  data: null;
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
  requestId: string;
}

export function sendSuccess<T>(res: Response, data: T, status = 200): Response<SuccessBody<T>> {
  const body: SuccessBody<T> = {
    success: true,
    data,
    error: null,
    requestId: res.req.requestId,
  };
  return res.status(status).json(body);
}

export function sendError(
  res: Response,
  code: ErrorCode,
  message: string,
  status: number,
  details?: unknown,
): Response<ErrorBody> {
  const body: ErrorBody = {
    success: false,
    data: null,
    error: { code, message, ...(details !== undefined ? { details } : {}) },
    requestId: res.req.requestId,
  };
  return res.status(status).json(body);
}

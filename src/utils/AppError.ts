export const ERROR_CODES = [
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "INVALID_STATE",
  "AI_PROCESSING_FAILED",
  "STORAGE_ERROR",
  "QUEUE_ERROR",
  "MATCH_FAILED",
  "PAYMENT_BLOCKED",
  "RATE_LIMITED",
  "DEPENDENCY_UNAVAILABLE",
  "INTERNAL_ERROR",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INVALID_STATE: 409,
  AI_PROCESSING_FAILED: 502,
  STORAGE_ERROR: 502,
  QUEUE_ERROR: 503,
  MATCH_FAILED: 422,
  PAYMENT_BLOCKED: 422,
  RATE_LIMITED: 429,
  DEPENDENCY_UNAVAILABLE: 503,
  INTERNAL_ERROR: 500,
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly details?: unknown;
  readonly isOperational = true;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = STATUS_BY_CODE[code];
    this.details = details;
    Error.captureStackTrace?.(this, AppError);
  }

  static validation(message: string, details?: unknown): AppError {
    return new AppError("VALIDATION_ERROR", message, details);
  }

  static unauthorized(message = "Authentication required"): AppError {
    return new AppError("UNAUTHORIZED", message);
  }

  static forbidden(message = "You do not have access to this resource"): AppError {
    return new AppError("FORBIDDEN", message);
  }

  static notFound(message = "Resource not found"): AppError {
    return new AppError("NOT_FOUND", message);
  }

  static conflict(message: string, details?: unknown): AppError {
    return new AppError("CONFLICT", message, details);
  }

  static invalidState(message: string, details?: unknown): AppError {
    return new AppError("INVALID_STATE", message, details);
  }

  static dependencyUnavailable(message: string, details?: unknown): AppError {
    return new AppError("DEPENDENCY_UNAVAILABLE", message, details);
  }

  static internal(message = "An unexpected error occurred"): AppError {
    return new AppError("INTERNAL_ERROR", message);
  }
}

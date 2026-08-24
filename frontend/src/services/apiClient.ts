import type { ApiResponse } from "@/types/api";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") || "http://localhost:4000";

const DEFAULT_ORG_ID = "dev-org";

export class ApiError extends Error {
  code: string;
  details?: unknown;
  status: number;

  constructor(message: string, code = "INTERNAL_ERROR", status = 500, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

interface RequestOptions extends RequestInit {
  organizationId?: string;
  params?: Record<string, string | number | boolean | undefined | null>;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { organizationId = DEFAULT_ORG_ID, params, headers, ...rest } = options;

  let url = `${API_BASE_URL}/api/v1${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        searchParams.append(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    "x-organization-id": organizationId,
    ...(headers as Record<string, string>),
  };

  let response: Response;
  try {
    response = await fetch(url, {
      ...rest,
      headers: requestHeaders,
    });
  } catch (err) {
    throw new ApiError(
      err instanceof Error ? err.message : "Network error connecting to backend",
      "NETWORK_ERROR",
      0
    );
  }

  let body: ApiResponse<T>;
  try {
    body = (await response.json()) as ApiResponse<T>;
  } catch {
    throw new ApiError(
      `Unexpected server response (HTTP ${response.status})`,
      "INVALID_RESPONSE",
      response.status
    );
  }

  if (!body.success) {
    throw new ApiError(
      body.error?.message || "An unknown API error occurred",
      body.error?.code || "API_ERROR",
      response.status,
      body.error?.details
    );
  }

  return body.data;
}

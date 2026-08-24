import { apiRequest } from "./apiClient";
import type {
  Requisition,
  RequisitionListResponse,
  ListRequisitionsParams,
  RequisitionChatResult,
} from "@/types/requisition";

/**
 * Requisition API Service
 * Handles communication with the PR2 Requisitions backend.
 */
export const requisitionService = {
  /**
   * List requisitions with optional status filter and cursor-based pagination.
   * Calls: GET /api/v1/requisitions?status=...&limit=...&cursor=...
   */
  async list(params?: ListRequisitionsParams): Promise<RequisitionListResponse> {
    return apiRequest<RequisitionListResponse>("/requisitions", {
      method: "GET",
      params: {
        status: params?.status,
        limit: params?.limit ?? 20,
        cursor: params?.cursor,
      },
    });
  },

  /**
   * Fetch full requisition details by ID.
   * Calls: GET /api/v1/requisitions/:id
   */
  async getById(id: string): Promise<Requisition> {
    return apiRequest<Requisition>(`/requisitions/${id}`, {
      method: "GET",
    });
  },

  /**
   * Send a follow-up user clarification/correction message.
   * Calls: POST /api/v1/requisitions/:id/messages
   */
  async sendMessage(id: string, input: string): Promise<RequisitionChatResult> {
    return apiRequest<RequisitionChatResult>(`/requisitions/${id}/messages`, {
      method: "POST",
      body: JSON.stringify({ input }),
    });
  },
};

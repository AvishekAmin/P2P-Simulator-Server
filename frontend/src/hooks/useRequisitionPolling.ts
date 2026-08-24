import { useState, useEffect, useRef, useCallback } from "react";
import { requisitionService } from "@/services/requisition.service";
import { ApiError } from "@/services/apiClient";
import type {
  Requisition,
  RequisitionPollingState,
  RequisitionChatResult,
} from "@/types/requisition";

const MAX_POLL_ATTEMPTS = 30; // 30 seconds total
const POLL_INTERVAL_MS = 1000;

interface UseRequisitionPollingReturn {
  requisition: Requisition | null;
  isLoading: boolean;
  error: string | null;
  pollingState: RequisitionPollingState;
  isPolling: boolean;
  pollAttempt: number;
  isSubmitting: boolean;
  submitError: string | null;
  refresh: () => Promise<void>;
  sendMessage: (input: string) => Promise<RequisitionChatResult | null>;
  stopPolling: () => void;
}

function derivePollingState(data: Requisition | null): RequisitionPollingState {
  if (!data) return "IDLE";

  switch (data.status) {
    case "PROCESSING":
      return "PROCESSING_EXTRACTION";
    case "REQUIREMENTS_EXTRACTED":
      return "SOURCING";
    case "SUPPLIER_SELECTED":
    case "PO_CREATED":
      return "COMPLETED";
    case "NEEDS_CLARIFICATION":
      return "NEEDS_CLARIFICATION";
    case "FAILED":
      return "FAILED";
    case "CREATED":
    default:
      return "IDLE";
  }
}

/**
 * Custom hook to manage Requisition data fetching, conversational clarification,
 * and the asynchronous polling state machine (Phase 3D).
 */
export function useRequisitionPolling(id: string): UseRequisitionPollingReturn {
  const [requisition, setRequisition] = useState<Requisition | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pollingState, setPollingState] = useState<RequisitionPollingState>("IDLE");
  const [isPolling, setIsPolling] = useState(false);
  const [pollAttempt, setPollAttempt] = useState(0);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);
  const pollAttemptRef = useRef(0);
  const inFlightRef = useRef(false);
  const requestSeqRef = useRef(0);
  const isMountedRef = useRef(true);
  const pollExecutorRef = useRef<((targetId: string, currentSeq: number) => Promise<void>) | null>(null);

  // Stop polling safely
  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    isPollingRef.current = false;
    inFlightRef.current = false;
    setIsPolling(false);
  }, []);

  // Update polling executor ref on each render
  useEffect(() => {
    pollExecutorRef.current = async (targetId: string, currentSeq: number) => {
      if (!isMountedRef.current || !isPollingRef.current || targetId !== id) {
        return;
      }

      // Check timeout boundary
      if (pollAttemptRef.current >= MAX_POLL_ATTEMPTS) {
        stopPolling();
        setPollingState("TIMEOUT");
        return;
      }

      if (inFlightRef.current) {
        pollTimerRef.current = setTimeout(() => {
          pollExecutorRef.current?.(targetId, currentSeq);
        }, POLL_INTERVAL_MS);
        return;
      }

      inFlightRef.current = true;
      pollAttemptRef.current += 1;
      setPollAttempt(pollAttemptRef.current);

      try {
        const data = await requisitionService.getById(targetId);

        if (!isMountedRef.current || currentSeq !== requestSeqRef.current) {
          inFlightRef.current = false;
          return;
        }

        setRequisition(data);
        const nextState = derivePollingState(data);
        setPollingState(nextState);

        const isTransient = data.status === "PROCESSING" || data.status === "REQUIREMENTS_EXTRACTED";

        inFlightRef.current = false;

        if (isTransient && pollAttemptRef.current < MAX_POLL_ATTEMPTS) {
          pollTimerRef.current = setTimeout(() => {
            pollExecutorRef.current?.(targetId, currentSeq);
          }, POLL_INTERVAL_MS);
        } else if (isTransient && pollAttemptRef.current >= MAX_POLL_ATTEMPTS) {
          stopPolling();
          setPollingState("TIMEOUT");
        } else {
          stopPolling();
        }
      } catch (err) {
        if (!isMountedRef.current || currentSeq !== requestSeqRef.current) {
          inFlightRef.current = false;
          return;
        }
        inFlightRef.current = false;
        stopPolling();
        setPollingState("ERROR");
        console.error("Polling cycle error:", err);
      }
    };
  }, [id, stopPolling]);

  // Start polling
  const startPolling = useCallback(
    (targetId: string) => {
      stopPolling();
      isPollingRef.current = true;
      pollAttemptRef.current = 0;
      setPollAttempt(0);
      setIsPolling(true);

      const seq = requestSeqRef.current;
      pollTimerRef.current = setTimeout(() => {
        pollExecutorRef.current?.(targetId, seq);
      }, POLL_INTERVAL_MS);
    },
    [stopPolling]
  );

  // Initial load and refresh effect
  useEffect(() => {
    if (!id) return;
    isMountedRef.current = true;
    let isCancelled = false;

    requestSeqRef.current += 1;
    const currentSeq = requestSeqRef.current;

    async function loadData() {
      try {
        const data = await requisitionService.getById(id);

        if (isCancelled || currentSeq !== requestSeqRef.current) {
          return;
        }

        setRequisition(data);
        const derived = derivePollingState(data);
        setPollingState(derived);
        setError(null);

        // Initiate polling only for active transient states
        if (data.status === "PROCESSING" || data.status === "REQUIREMENTS_EXTRACTED") {
          startPolling(id);
        }
      } catch (err) {
        if (isCancelled || currentSeq !== requestSeqRef.current) {
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load requisition");
        setPollingState("ERROR");
      } finally {
        if (!isCancelled && currentSeq === requestSeqRef.current) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isCancelled = true;
      stopPolling();
    };
  }, [id, refreshTrigger, startPolling, stopPolling]);

  // Manual refresh action
  const refresh = useCallback(async () => {
    stopPolling();
    setIsLoading(true);
    setRefreshTrigger((prev) => prev + 1);
  }, [stopPolling]);

  // Send clarification message
  const sendMessage = useCallback(
    async (input: string): Promise<RequisitionChatResult | null> => {
      if (!id || isSubmitting) return null;

      setIsSubmitting(true);
      setSubmitError(null);
      stopPolling();

      requestSeqRef.current += 1;
      const currentSeq = requestSeqRef.current;

      try {
        const result = await requisitionService.sendMessage(id, input);

        if (!isMountedRef.current || currentSeq !== requestSeqRef.current) {
          return null;
        }

        // Re-read latest state from server
        const updated = await requisitionService.getById(id);
        if (!isMountedRef.current || currentSeq !== requestSeqRef.current) {
          return null;
        }

        setRequisition(updated);
        const derived = derivePollingState(updated);
        setPollingState(derived);

        // Initiate polling if result or status is transient
        if (
          result.status === "PROCESSING" ||
          result.status === "REQUIREMENTS_EXTRACTED" ||
          updated.status === "PROCESSING" ||
          updated.status === "REQUIREMENTS_EXTRACTED"
        ) {
          startPolling(id);
        }

        return result;
      } catch (err) {
        if (isMountedRef.current && currentSeq === requestSeqRef.current) {
          setSubmitError(
            err instanceof Error ? err.message : "Failed to send message"
          );

          // On 409 INVALID_STATE or any state conflict, sync state with real backend GET
          if (err instanceof ApiError && err.status === 409) {
            try {
              const fresh = await requisitionService.getById(id);
              if (isMountedRef.current && currentSeq === requestSeqRef.current) {
                setRequisition(fresh);
                setPollingState(derivePollingState(fresh));
              }
            } catch {
              // Ignore background sync error
            }
          }
        }
        return null;
      } finally {
        if (isMountedRef.current && currentSeq === requestSeqRef.current) {
          setIsSubmitting(false);
        }
      }
    },
    [id, isSubmitting, stopPolling, startPolling]
  );

  return {
    requisition,
    isLoading,
    error,
    pollingState,
    isPolling,
    pollAttempt,
    isSubmitting,
    submitError,
    refresh,
    sendMessage,
    stopPolling,
  };
}

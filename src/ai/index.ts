import type { AIProvider } from "./AIProvider.js";
import { DEFAULT_MODEL, GeminiProvider } from "./GeminiProvider.js";

export type { AIProvider } from "./AIProvider.js";

/** Single source of truth for the model name recorded in AIProcessingLog. */
export const AI_MODEL = DEFAULT_MODEL;

let provider: AIProvider | undefined;

/**
 * Lazily constructed singleton so workers don't build a client per job, and so
 * the SDK isn't instantiated at import time (which would require GEMINI_API_KEY
 * in every process that merely imports a module touching AI).
 */
export function getAIProvider(): AIProvider {
  provider ??= new GeminiProvider();
  return provider;
}

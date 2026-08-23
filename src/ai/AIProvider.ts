export interface GenerateStructuredOptions {
  systemPrompt: string;
  userPrompt: string;
  /** Name + version for AI processing logs, e.g. "requisition/system.v1". */
  promptName: string;
}

export interface AnalyzeDocumentOptions {
  systemPrompt: string;
  document: Buffer;
  mimeType: string;
  promptName: string;
}

/**
 * AI interprets, it never decides (CLAUDE.md core principle). Every method
 * returns raw text; callers are responsible for JSON.parse + Zod validation
 * before trusting anything the model returned.
 */
export interface AIProvider {
  generateStructured(options: GenerateStructuredOptions): Promise<string>;
  analyzeDocument(options: AnalyzeDocumentOptions): Promise<string>;
}

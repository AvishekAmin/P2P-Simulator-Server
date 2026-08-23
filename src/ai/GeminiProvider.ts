import { GoogleGenAI } from "@google/genai";
import { AppError } from "../utils/AppError.js";
import { withTimeout } from "../utils/withTimeout.js";
import type {
  AIProvider,
  AnalyzeDocumentOptions,
  GenerateStructuredOptions,
} from "./AIProvider.js";

export const DEFAULT_MODEL = "gemini-3.6-flash";
const REQUEST_TIMEOUT_MS = 30_000;

export class GeminiProvider implements AIProvider {
  private readonly client: GoogleGenAI;

  constructor() {
    this.client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  async generateStructured({
    systemPrompt,
    userPrompt,
    promptName,
  }: GenerateStructuredOptions): Promise<string> {
    try {
      const response = await withTimeout(
        this.client.models.generateContent({
          model: DEFAULT_MODEL,
          contents: userPrompt,
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: "application/json",
          },
        }),
        REQUEST_TIMEOUT_MS,
      );
      const text = response.text;
      if (!text) {
        throw new Error("Empty response from Gemini");
      }
      return text;
    } catch (error) {
      throw AppError.dependencyUnavailable(`Gemini request failed (${promptName})`, {
        cause: error instanceof Error ? error.message : error,
      });
    }
  }

  async analyzeDocument({
    systemPrompt,
    document,
    mimeType,
    promptName,
  }: AnalyzeDocumentOptions): Promise<string> {
    try {
      const response = await withTimeout(
        this.client.models.generateContent({
          model: DEFAULT_MODEL,
          contents: [
            {
              role: "user",
              parts: [
                { inlineData: { data: document.toString("base64"), mimeType } },
                { text: "Extract the structured data described in the system instructions." },
              ],
            },
          ],
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: "application/json",
          },
        }),
        REQUEST_TIMEOUT_MS,
      );
      const text = response.text;
      if (!text) {
        throw new Error("Empty response from Gemini");
      }
      return text;
    } catch (error) {
      throw AppError.dependencyUnavailable(`Gemini document analysis failed (${promptName})`, {
        cause: error instanceof Error ? error.message : error,
      });
    }
  }
}

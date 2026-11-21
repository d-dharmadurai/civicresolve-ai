import { GoogleGenAI, type GenerateContentResponse } from "@google/genai";
import { GEMINI_MODEL } from "./constants.ts";

export interface GeminiModelsClient {
  generateContent(params: unknown): Promise<Pick<GenerateContentResponse, "text">>;
}

export interface GeminiClientLike {
  models: GeminiModelsClient;
}

/** Creates the real Gemini client. The API key is read from the server environment only. */
export function getGeminiClient(): GeminiClientLike {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not configured. Please add your Gemini API key in Settings > Secrets."
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { "User-Agent": "aistudio-build" } },
  });
}

export interface HttpErrorInfo {
  statusCode: number;
  message: string;
}

/** Translates SDK/network failures into an HTTP status and a user-facing message. */
export function mapGeminiHttpError(err: unknown, fallbackMessage: string): HttpErrorInfo {
  const message = err instanceof Error ? err.message : fallbackMessage;
  const lower = message.toLowerCase();

  if (lower.includes("api_key") || lower.includes("permission") || lower.includes("403")) {
    return { statusCode: 403, message };
  }
  if (lower.includes("quota") || lower.includes("429") || lower.includes("resource_exhausted")) {
    return { statusCode: 429, message };
  }
  return { statusCode: 500, message };
}

interface GenerateParams {
  contents: unknown;
  config?: Record<string, unknown>;
  emptyMessage: string;
}

async function generateRawText(ai: GeminiClientLike, params: GenerateParams): Promise<string> {
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: params.contents,
    config: params.config,
  });
  const text = (response.text ?? "").trim();
  if (!text) throw new Error(params.emptyMessage);
  return text;
}

/** Calls Gemini and parses its structured JSON reply, throwing on empty/invalid output. */
export async function generateJson<T>(
  ai: GeminiClientLike,
  params: GenerateParams & { schema: Record<string, unknown>; systemInstruction: string }
): Promise<Partial<T>> {
  const text = await generateRawText(ai, {
    contents: params.contents,
    emptyMessage: params.emptyMessage,
    config: {
      systemInstruction: params.systemInstruction,
      responseMimeType: "application/json",
      responseSchema: params.schema,
    },
  });
  return JSON.parse(text) as Partial<T>;
}

/** Calls Gemini for a plain-text answer (used by the chat assistant). */
export function generateText(
  ai: GeminiClientLike,
  params: GenerateParams & { systemInstruction: string }
): Promise<string> {
  return generateRawText(ai, {
    contents: params.contents,
    emptyMessage: params.emptyMessage,
    config: { systemInstruction: params.systemInstruction },
  });
}

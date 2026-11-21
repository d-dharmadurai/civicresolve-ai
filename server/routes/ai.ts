import type { Express, Response } from "express";
import {
  ISSUE_CATEGORIES,
  type AnalyzeIssueRequest,
  type AnalyzeIssueResult,
  type AssistantChatMessage,
  type AutoDraftRequest,
  type AutoDraftResult,
  type CivicIssue,
  type IssueCategory,
  type VoiceFormatRequest,
  type VoiceFormatResult,
} from "../../src/types/civic.ts";
import { generateTicketId } from "../../src/utils/civicHelpers.ts";
import { CATEGORY_TO_DEPARTMENT, FIRST_NEW_TICKET_NUMBER } from "../constants.ts";
import {
  generateJson,
  generateText,
  getGeminiClient,
  mapGeminiHttpError,
  type GeminiClientLike,
} from "../gemini.ts";
import {
  ASSISTANT_SYSTEM_INSTRUCTION,
  AUTO_DRAFT_PROMPT,
  AUTO_DRAFT_SCHEMA,
  AUTO_DRAFT_SYSTEM_INSTRUCTION,
  TRIAGE_SCHEMA,
  TRIAGE_SYSTEM_INSTRUCTION,
  VOICE_FORMAT_SCHEMA,
  VOICE_FORMAT_SYSTEM_INSTRUCTION,
  buildTriagePrompt,
} from "../prompts.ts";
import {
  coerceCategory,
  coerceDepartment,
  coercePriority,
  coerceRiskFactors,
  coerceSlaHours,
  sanitizeText,
  validateAndNormalizeImage,
} from "../validation.ts";
import type { IssueStore } from "./issues.ts";

interface AiRouteOptions {
  store: IssueStore;
  geminiClient?: GeminiClientLike;
}

type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

const ASSISTANT_HISTORY_LIMIT = 6;

function sendGeminiError(res: Response, route: string, err: unknown, fallback: string): void {
  console.error(`Error in ${route}:`, err);
  const { statusCode, message } = mapGeminiHttpError(err, fallback);
  res.status(statusCode).json({ error: message });
}

function formatAssistantHistory(history: unknown): string {
  if (!Array.isArray(history)) return "";
  return (history as AssistantChatMessage[])
    .slice(-ASSISTANT_HISTORY_LIMIT)
    .filter(
      (item) =>
        item &&
        (item.role === "user" || item.role === "assistant") &&
        typeof item.content === "string"
    )
    .map(
      (item) =>
        `${item.role === "user" ? "Citizen" : "Assistant"}: ${sanitizeText(item.content, 500)}`
    )
    .join("\n");
}

/** Registers every Gemini-backed endpoint (triage, auto-draft, voice, assistant). */
export function registerAiRoutes(app: Express, options: AiRouteOptions): void {
  const { store } = options;
  let nextIssueNumber = FIRST_NEW_TICKET_NUMBER;
  const getClient = () => options.geminiClient ?? getGeminiClient();

  app.post("/api/voice-format", async (req, res) => {
    try {
      const body = (req.body ?? {}) as Partial<VoiceFormatRequest>;
      const transcript = sanitizeText(body.transcript, 2000);
      const language = body.language === "ta-IN" ? "ta-IN" : "en-IN";

      if (!transcript) {
        res.status(400).json({
          error: "Spoken transcript text is required to format a voice complaint.",
        });
        return;
      }

      const parsed = await generateJson<VoiceFormatResult>(getClient(), {
        contents: `Spoken Citizen Input (Locale hint: ${language}):\n"${transcript}"`,
        systemInstruction: VOICE_FORMAT_SYSTEM_INSTRUCTION,
        schema: VOICE_FORMAT_SCHEMA,
        emptyMessage: "Gemini returned an empty voice formatting response.",
      });

      const title = sanitizeText(parsed.title, 160);
      const description = sanitizeText(parsed.description, 2000);
      if (!title || !description) {
        throw new Error("Could not format spoken input into a structured complaint.");
      }

      res.json({
        title,
        description,
        suggestedCategory: coerceCategory(parsed.suggestedCategory),
        suggestedPriority: coercePriority(parsed.suggestedPriority),
      });
    } catch (err: unknown) {
      sendGeminiError(
        res,
        "/api/voice-format",
        err,
        "Unable to format spoken voice complaint right now."
      );
    }
  });

  app.post("/api/auto-draft", async (req, res) => {
    try {
      const body = (req.body ?? {}) as Partial<AutoDraftRequest>;
      const image = validateAndNormalizeImage(body.imageBase64, body.imageMimeType);
      if (!image.ok) {
        res.status(400).json({ error: image.error });
        return;
      }

      const parsed = await generateJson<AutoDraftResult>(getClient(), {
        contents: {
          parts: [
            { inlineData: { mimeType: image.validMimeType, data: image.cleanBase64Data } },
            { text: AUTO_DRAFT_PROMPT },
          ],
        },
        systemInstruction: AUTO_DRAFT_SYSTEM_INSTRUCTION,
        schema: AUTO_DRAFT_SCHEMA,
        emptyMessage: "Gemini returned an empty auto-draft response.",
      });

      const title = sanitizeText(parsed.title, 160);
      const description = sanitizeText(parsed.description, 2000);
      if (!title || !description) {
        throw new Error("Could not extract valid draft details from the uploaded image.");
      }

      res.json({ title, description });
    } catch (err: unknown) {
      sendGeminiError(
        res,
        "/api/auto-draft",
        err,
        "Unexpected error drafting issue details from image."
      );
    }
  });

  app.post("/api/assistant", async (req, res) => {
    try {
      const body = (req.body ?? {}) as { message?: string; history?: unknown };
      const message = sanitizeText(body.message, 800);
      if (!message) {
        res.status(400).json({ error: "Please enter a question for the assistant." });
        return;
      }

      const history = formatAssistantHistory(body.history);
      const reply = sanitizeText(
        await generateText(getClient(), {
          contents: `${history ? `Recent Conversation:\n${history}\n\n` : ""}Citizen Question: ${message}`,
          systemInstruction: ASSISTANT_SYSTEM_INSTRUCTION,
          emptyMessage: "Assistant returned an empty response.",
        }),
        1500
      );
      if (!reply) {
        throw new Error("Assistant returned an empty response.");
      }

      res.json({ reply });
    } catch (err: unknown) {
      sendGeminiError(
        res,
        "/api/assistant",
        err,
        "Unable to reach CivicResolve AI Assistant right now."
      );
    }
  });

  app.post("/api/analyze-issue", async (req, res) => {
    try {
      const body = (req.body ?? {}) as AnalyzeIssueRequest;
      const title = sanitizeText(body.title, 160);
      const description = sanitizeText(body.description, 2000);
      const location = sanitizeText(body.location, 200);
      const categoryOverride: IssueCategory | undefined = ISSUE_CATEGORIES.includes(
        body.categoryOverride as IssueCategory
      )
        ? (body.categoryOverride as IssueCategory)
        : undefined;

      if (!title || !description || !location) {
        res.status(400).json({
          error: "Issue Title, Detailed Description, and Location are all required.",
        });
        return;
      }

      let image: Extract<ReturnType<typeof validateAndNormalizeImage>, { ok: true }> | null = null;
      if (body.imageBase64) {
        const check = validateAndNormalizeImage(body.imageBase64, body.imageMimeType);
        if (!check.ok) {
          res.status(400).json({ error: check.error });
          return;
        }
        image = check;
      }

      const parts: GeminiPart[] = [];
      if (image) {
        parts.push({
          inlineData: { mimeType: image.validMimeType, data: image.cleanBase64Data },
        });
      }
      parts.push({
        text: buildTriagePrompt({
          title,
          location,
          description,
          categoryOverride,
          hasImage: image !== null,
        }),
      });

      const parsed = await generateJson<AnalyzeIssueResult>(getClient(), {
        contents: { parts },
        systemInstruction: TRIAGE_SYSTEM_INSTRUCTION,
        schema: TRIAGE_SCHEMA,
        emptyMessage: "Gemini returned an empty triage response.",
      });

      const category = categoryOverride ?? coerceCategory(parsed.category);
      const priority = coercePriority(parsed.priority);
      const department = categoryOverride
        ? CATEGORY_TO_DEPARTMENT[categoryOverride]
        : coerceDepartment(parsed.recommendedDepartment, category);
      const nowIso = new Date().toISOString();

      const newIssue: CivicIssue = {
        id: generateTicketId(nextIssueNumber++),
        title,
        description,
        location,
        category,
        categoryOverridden: Boolean(categoryOverride),
        priority,
        recommendedDepartment: department,
        officialSummary:
          sanitizeText(parsed.officialSummary, 400) ||
          `${category} issue reported at ${location}.`,
        priorityReasoning:
          sanitizeText(parsed.priorityReasoning, 600) ||
          `Assigned ${priority} priority based on reported safety impact at ${location}.`,
        visualAnalysis:
          sanitizeText(parsed.visualAnalysis, 800) ||
          (image
            ? "Visual evidence attached and reviewed during AI triage."
            : "No photograph attached; field inspection required upon dispatch."),
        risk_factors: coerceRiskFactors(parsed.risk_factors, priority),
        sla_hours: coerceSlaHours(parsed.sla_hours, priority),
        status: "Reported",
        upvotes: 1,
        imageUrl: image?.sanitizedImageUrl ?? null,
        afterImageUrl: null,
        resolvedVerified: false,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      store.add(newIssue);
      res.status(201).json({ issue: newIssue });
    } catch (err: unknown) {
      sendGeminiError(
        res,
        "/api/analyze-issue",
        err,
        "Unexpected error analyzing civic issue with Gemini AI."
      );
    }
  });
}

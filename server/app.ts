import compression from "compression";
import express, { type Express } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { SEED_ISSUES } from "../src/data/seedIssues.ts";
import type { CivicIssue } from "../src/types/civic.ts";
import { JSON_BODY_LIMIT } from "./constants.ts";
import type { GeminiClientLike } from "./gemini.ts";
import { registerAiRoutes } from "./routes/ai.ts";
import { createIssueStore, registerIssueRoutes } from "./routes/issues.ts";

// Re-exported so existing consumers (and tests) keep a single import surface.
export {
  ALLOWED_IMAGE_MIME_TYPES,
  CATEGORY_TO_DEPARTMENT,
  DEFAULT_SLA_BY_PRIORITY,
} from "./constants.ts";
export {
  getGeminiClient,
  type GeminiClientLike,
  type GeminiModelsClient,
} from "./gemini.ts";
export { buildTriagePrompt } from "./prompts.ts";
export {
  coerceCategory,
  coerceDepartment,
  coercePriority,
  coerceRiskFactors,
  coerceSlaHours,
  isValidImageDataUrl,
  normalizeBase64,
  sanitizeText,
  validateAfterRepairImage,
} from "./validation.ts";

export interface CreateAppOptions {
  initialIssues?: CivicIssue[];
  geminiClient?: GeminiClientLike;
  enableRateLimit?: boolean;
}

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const AI_ENDPOINTS = [
  "/api/analyze-issue",
  "/api/auto-draft",
  "/api/voice-format",
  "/api/assistant",
] as const;

function applySecurityHeaders(app: Express): void {
  // Iframe-safe configuration so the app can be previewed inside AI Studio.
  app.use(
    helmet({
      xFrameOptions: false,
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy:
        process.env.NODE_ENV === "production"
          ? {
              directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                fontSrc: ["'self'", "https://fonts.gstatic.com"],
                imgSrc: ["'self'", "data:", "blob:", "https:"],
                frameSrc: ["'self'", "https://maps.google.com", "https://www.google.com"],
                connectSrc: ["'self'"],
                frameAncestors: ["'self'", "https://aistudio.google.com", "https://*.google.com"],
              },
            }
          : false,
    })
  );
}

function applyRateLimits(app: Express): void {
  const apiLimiter = rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: 150,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many API requests. Please wait a moment and try again." },
  });
  const aiLimiter = rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: 45,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: "AI analysis rate limit reached. Please wait before submitting additional requests.",
    },
  });

  app.use("/api/", apiLimiter);
  for (const endpoint of AI_ENDPOINTS) {
    app.use(endpoint, aiLimiter);
  }
}

export function createApp(options: CreateAppOptions = {}): Express {
  const app = express();
  const store = createIssueStore(options.initialIssues ?? SEED_ISSUES);

  app.set("trust proxy", 1);
  applySecurityHeaders(app);

  // Gzip/deflate JSON and static responses (issue lists embed large data URLs).
  app.use(compression());
  app.use(express.json({ limit: JSON_BODY_LIMIT }));

  if (options.enableRateLimit ?? process.env.NODE_ENV !== "test") {
    applyRateLimits(app);
  }

  registerIssueRoutes(app, store);
  registerAiRoutes(app, { store, geminiClient: options.geminiClient });

  return app;
}

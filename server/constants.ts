import type { DepartmentName, IssueCategory, IssuePriority } from "../src/types/civic.ts";

/** Gemini model used for every AI endpoint. */
export const GEMINI_MODEL = "gemini-2.5-flash";

/** Maximum accepted size (in characters) of a base64-encoded image payload. */
export const MAX_IMAGE_PAYLOAD_CHARS = 14_000_000;

/** Express JSON body limit; large enough for a 10 MB photo encoded as base64. */
export const JSON_BODY_LIMIT = "12mb";

/** First ticket number handed out to newly reported issues (seed data uses 1037-1041). */
export const FIRST_NEW_TICKET_NUMBER = 1042;

export const CATEGORY_TO_DEPARTMENT: Record<IssueCategory, DepartmentName> = {
  "Roads & Potholes": "Public Works & Roads Dept",
  "Sanitation & Garbage": "Solid Waste Management",
  "Streetlights & Electricity": "Electrical & Street Lighting",
  "Water Supply & Drainage": "Water Supply & Sewerage Board",
  "Parks & Public Spaces": "Parks & Recreation",
  "Traffic & Public Safety": "Traffic & Enforcement",
};

export const DEFAULT_SLA_BY_PRIORITY: Record<IssuePriority, number> = {
  Critical: 4,
  High: 12,
  Medium: 36,
  Low: 72,
};

export const ALLOWED_IMAGE_MIME_TYPES: ReadonlySet<string> = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

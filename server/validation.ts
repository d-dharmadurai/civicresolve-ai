import {
  DEPARTMENT_NAMES,
  ISSUE_CATEGORIES,
  ISSUE_PRIORITIES,
  type DepartmentName,
  type IssueCategory,
  type IssuePriority,
} from "../src/types/civic.ts";
import {
  ALLOWED_IMAGE_MIME_TYPES,
  CATEGORY_TO_DEPARTMENT,
  DEFAULT_SLA_BY_PRIORITY,
  MAX_IMAGE_PAYLOAD_CHARS,
} from "./constants.ts";

const DATA_URL_PATTERN = /^data:image\/(jpeg|jpg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/i;
const RAW_BASE64_PATTERN = /^[A-Za-z0-9+/=]+$/;

/**
 * Strips control characters and HTML angle brackets, trims whitespace,
 * and enforces a safe maximum character length.
 */
export function sanitizeText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, maxLength);
}

/** Removes the `data:<mime>;base64,` prefix, returning only the base64 payload. */
export function normalizeBase64(raw: string): string {
  const commaIdx = raw.indexOf(",");
  if (raw.startsWith("data:") && commaIdx !== -1) {
    return raw.slice(commaIdx + 1);
  }
  return raw;
}

export function isValidImageDataUrl(value: string): boolean {
  return value.startsWith("data:")
    ? DATA_URL_PATTERN.test(value)
    : RAW_BASE64_PATTERN.test(value);
}

/** Accepts an https/http URL or a validated image data URL for "After Repair" proof. */
export function validateAfterRepairImage(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const trimmed = value.trim();
  if (trimmed.length > MAX_IMAGE_PAYLOAD_CHARS) return null;

  if (trimmed.startsWith("data:")) {
    return isValidImageDataUrl(trimmed) ? trimmed : null;
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" || parsed.protocol === "http:"
      ? parsed.toString()
      : null;
  } catch {
    return null;
  }
}

export type ImageValidationResult =
  | {
      ok: true;
      cleanBase64Data: string;
      validMimeType: string;
      sanitizedImageUrl: string;
    }
  | { ok: false; error: string };

export function validateAndNormalizeImage(
  imageBase64: unknown,
  imageMimeType: unknown
): ImageValidationResult {
  if (typeof imageBase64 !== "string" || !imageBase64.trim()) {
    return { ok: false, error: "An uploaded photograph is required." };
  }
  if (imageBase64.length > MAX_IMAGE_PAYLOAD_CHARS) {
    return { ok: false, error: "Uploaded image exceeds the maximum allowed size." };
  }

  const mime = (typeof imageMimeType === "string" ? imageMimeType : "image/jpeg").toLowerCase();
  if (!ALLOWED_IMAGE_MIME_TYPES.has(mime)) {
    return {
      ok: false,
      error: "Unsupported image format. Please upload a PNG, JPG, WEBP, or GIF file.",
    };
  }

  const trimmedData = imageBase64.trim();
  if (!isValidImageDataUrl(trimmedData)) {
    return { ok: false, error: "Invalid image data encoding." };
  }

  const validMimeType = mime === "image/jpg" ? "image/jpeg" : mime;
  const cleanBase64Data = normalizeBase64(trimmedData);
  const sanitizedImageUrl = trimmedData.startsWith("data:")
    ? trimmedData
    : `data:${validMimeType};base64,${cleanBase64Data}`;

  return { ok: true, cleanBase64Data, validMimeType, sanitizedImageUrl };
}

export function coerceCategory(value: unknown): IssueCategory {
  return typeof value === "string" && ISSUE_CATEGORIES.includes(value as IssueCategory)
    ? (value as IssueCategory)
    : "Roads & Potholes";
}

export function coercePriority(value: unknown): IssuePriority {
  return typeof value === "string" && ISSUE_PRIORITIES.includes(value as IssuePriority)
    ? (value as IssuePriority)
    : "Medium";
}

export function coerceDepartment(value: unknown, category: IssueCategory): DepartmentName {
  return typeof value === "string" && DEPARTMENT_NAMES.includes(value as DepartmentName)
    ? (value as DepartmentName)
    : CATEGORY_TO_DEPARTMENT[category];
}

export function coerceRiskFactors(value: unknown, priority: IssuePriority): string[] {
  if (Array.isArray(value)) {
    const cleaned = value
      .map((item) => sanitizeText(item, 140))
      .filter(Boolean)
      .slice(0, 3);
    if (cleaned.length > 0) return cleaned;
  }
  return [`${priority}-tier municipal public safety risk requiring field inspection`];
}

export function coerceSlaHours(value: unknown, priority: IssuePriority): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    const rounded = Math.round(value);
    if (rounded >= 1 && rounded <= 720) return rounded;
  }
  return DEFAULT_SLA_BY_PRIORITY[priority];
}

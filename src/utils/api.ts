import type {
  AnalyzeIssueRequest,
  AssistantChatMessage,
  AutoDraftRequest,
  AutoDraftResult,
  CivicIssue,
  IssueStatus,
  VoiceFormatRequest,
  VoiceFormatResult,
} from "../types/civic";

/** Error thrown for any non-2xx API response; `message` is safe to show to citizens. */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(
  path: string,
  init: RequestInit | undefined,
  fallbackMessage: string
): Promise<T> {
  const res = await fetch(path, init);
  // Error bodies may be empty or non-JSON (e.g. proxy failures); never let that mask the status.
  const data: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const serverMessage =
      data && typeof data === "object" && "error" in data
        ? String((data as { error: unknown }).error)
        : "";
    throw new ApiError(serverMessage || fallbackMessage, res.status);
  }
  return data as T;
}

function postJson<T>(path: string, body: unknown, fallbackMessage: string): Promise<T> {
  return request<T>(
    path,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    fallbackMessage
  );
}

const issuePath = (issueId: string) => `/api/issues/${encodeURIComponent(issueId)}`;

export async function fetchIssues(signal?: AbortSignal): Promise<CivicIssue[]> {
  const data = await request<{ issues?: CivicIssue[] }>(
    "/api/issues",
    { signal },
    "Unable to load civic issues."
  );
  return Array.isArray(data.issues) ? data.issues : [];
}

export async function upvoteIssue(issueId: string): Promise<CivicIssue> {
  const data = await request<{ issue: CivicIssue }>(
    `${issuePath(issueId)}/upvote`,
    { method: "POST" },
    "Unable to confirm issue."
  );
  return data.issue;
}

export async function updateIssueStatus(
  issueId: string,
  status: IssueStatus,
  afterImageUrl?: string | null
): Promise<CivicIssue> {
  const payload: { status: IssueStatus; afterImageUrl?: string | null } = { status };
  if (afterImageUrl !== undefined) payload.afterImageUrl = afterImageUrl;

  const data = await request<{ issue: CivicIssue }>(
    issuePath(issueId),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    "Unable to update issue status."
  );
  return data.issue;
}

export async function analyzeIssue(payload: AnalyzeIssueRequest): Promise<CivicIssue> {
  const data = await postJson<{ issue: CivicIssue }>(
    "/api/analyze-issue",
    payload,
    "Failed to analyze civic issue."
  );
  return data.issue;
}

export function autoDraftFromPhoto(payload: AutoDraftRequest): Promise<AutoDraftResult> {
  return postJson<AutoDraftResult>(
    "/api/auto-draft",
    payload,
    "Failed to auto-draft issue details from photo."
  );
}

export function formatVoiceTranscript(payload: VoiceFormatRequest): Promise<VoiceFormatResult> {
  return postJson<VoiceFormatResult>(
    "/api/voice-format",
    payload,
    "Unable to format voice report."
  );
}

export async function askAssistant(
  message: string,
  history: AssistantChatMessage[]
): Promise<string> {
  const data = await postJson<{ reply: unknown }>(
    "/api/assistant",
    { message, history },
    "Unable to reach AI Assistant."
  );
  return String(data.reply);
}

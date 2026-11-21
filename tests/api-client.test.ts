import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  askAssistant,
  fetchIssues,
  updateIssueStatus,
  upvoteIssue,
} from "../src/utils/api.ts";

function mockFetch(response: { ok: boolean; status?: number; body?: unknown; badJson?: boolean }) {
  const fn = vi.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status ?? (response.ok ? 200 : 500),
    json: response.badJson
      ? () => Promise.reject(new SyntaxError("Unexpected token <"))
      : () => Promise.resolve(response.body),
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("API client", () => {
  it("returns the issues array and tolerates a malformed payload", async () => {
    mockFetch({ ok: true, body: { issues: [{ id: "CR-1" }] } });
    await expect(fetchIssues()).resolves.toEqual([{ id: "CR-1" }]);

    mockFetch({ ok: true, body: { issues: "nope" } });
    await expect(fetchIssues()).resolves.toEqual([]);
  });

  it("surfaces the server error message with its HTTP status", async () => {
    mockFetch({ ok: false, status: 404, body: { error: "Issue X was not found." } });
    const error = await upvoteIssue("X").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).message).toBe("Issue X was not found.");
    expect((error as ApiError).status).toBe(404);
  });

  it("falls back to a friendly message when the error body is not JSON", async () => {
    mockFetch({ ok: false, status: 502, badJson: true });
    await expect(askAssistant("hi", [])).rejects.toThrow("Unable to reach AI Assistant.");
  });

  it("URL-encodes ticket ids and only sends afterImageUrl when provided", async () => {
    const fetchMock = mockFetch({ ok: true, body: { issue: { id: "A/B" } } });

    await updateIssueStatus("A/B", "In Progress");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/issues/A%2FB");
    expect(JSON.parse(init.body as string)).toEqual({ status: "In Progress" });

    await updateIssueStatus("A/B", "Resolved", null);
    const [, secondInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(JSON.parse(secondInit.body as string)).toEqual({
      status: "Resolved",
      afterImageUrl: null,
    });
  });
});

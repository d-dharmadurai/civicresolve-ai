import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../server/app.ts";
import { generateJson, mapGeminiHttpError } from "../server/gemini.ts";
import { createIssueStore } from "../server/routes/issues.ts";
import { coerceRiskFactors, coerceSlaHours, validateAndNormalizeImage } from "../server/validation.ts";
import { SEED_ISSUES } from "../src/data/seedIssues.ts";

describe("server validation", () => {
  const PNG = "data:image/png;base64,iVBORw0KGgo=";

  it("accepts valid data URLs and normalizes jpg to jpeg", () => {
    const result = validateAndNormalizeImage(PNG, "image/png");
    expect(result).toMatchObject({ ok: true, validMimeType: "image/png", cleanBase64Data: "iVBORw0KGgo=" });

    const raw = validateAndNormalizeImage("iVBORw0KGgo=", "image/jpg");
    expect(raw).toMatchObject({ ok: true, validMimeType: "image/jpeg" });
    expect(raw.ok && raw.sanitizedImageUrl).toBe("data:image/jpeg;base64,iVBORw0KGgo=");
  });

  it("rejects missing, oversized, unsupported and malformed images", () => {
    expect(validateAndNormalizeImage("", "image/png")).toMatchObject({ ok: false });
    expect(validateAndNormalizeImage("x".repeat(14_000_001), "image/png")).toMatchObject({
      ok: false,
      error: expect.stringContaining("maximum"),
    });
    expect(validateAndNormalizeImage(PNG, "application/pdf")).toMatchObject({
      ok: false,
      error: expect.stringContaining("Unsupported"),
    });
    expect(validateAndNormalizeImage("data:image/png;base64,@@@", "image/png")).toMatchObject({
      ok: false,
      error: "Invalid image data encoding.",
    });
  });

  it("falls back to safe defaults for model output that is out of range", () => {
    expect(coerceSlaHours(0, "Critical")).toBe(4);
    expect(coerceSlaHours(721, "High")).toBe(12);
    expect(coerceSlaHours(24.4, "High")).toBe(24);
    expect(coerceRiskFactors(["<b>a</b>", "", "b", "c", "d"], "Low")).toEqual(["ba/b", "b", "c"]);
    expect(coerceRiskFactors(undefined, "Low")[0]).toContain("Low-tier");
  });
});

describe("Gemini helpers", () => {
  it("maps SDK failures to the right HTTP status", () => {
    expect(mapGeminiHttpError(new Error("API_KEY invalid"), "x").statusCode).toBe(403);
    expect(mapGeminiHttpError(new Error("RESOURCE_EXHAUSTED: quota"), "x").statusCode).toBe(429);
    expect(mapGeminiHttpError(new Error("boom"), "x").statusCode).toBe(500);
    expect(mapGeminiHttpError("not an error", "fallback")).toEqual({
      statusCode: 500,
      message: "fallback",
    });
  });

  it("throws the provided message when Gemini returns an empty response", async () => {
    const ai = { models: { generateContent: vi.fn().mockResolvedValue({ text: "  " }) } };
    await expect(
      generateJson(ai, {
        contents: "hi",
        systemInstruction: "s",
        schema: {},
        emptyMessage: "empty!",
      })
    ).rejects.toThrow("empty!");
  });
});

describe("issue store", () => {
  it("adds newest first, finds by id and replaces in place", () => {
    const store = createIssueStore(SEED_ISSUES);
    const original = store.find("CR-2026-1041");
    expect(original).toBeDefined();

    store.replace({ ...original!, upvotes: 99 });
    expect(store.find("CR-2026-1041")?.upvotes).toBe(99);
    expect(store.list()).toHaveLength(SEED_ISSUES.length);

    store.add({ ...original!, id: "CR-NEW" });
    expect(store.list()[0].id).toBe("CR-NEW");
  });

  it("does not mutate the seed array it was created from", () => {
    const seed = [...SEED_ISSUES];
    createIssueStore(seed).add({ ...seed[0], id: "CR-NEW" });
    expect(seed).toHaveLength(SEED_ISSUES.length);
  });
});

describe("HTTP performance behaviour", () => {
  it("gzips large JSON responses when the client accepts it", async () => {
    const big = SEED_ISSUES.map((issue) => ({ ...issue, description: "pothole ".repeat(500) }));
    const app = createApp({ initialIssues: big, enableRateLimit: false });

    const res = await request(app).get("/api/issues").set("Accept-Encoding", "gzip");

    expect(res.status).toBe(200);
    expect(res.headers["content-encoding"]).toBe("gzip");
    expect(res.body.issues).toHaveLength(big.length);
  });
});

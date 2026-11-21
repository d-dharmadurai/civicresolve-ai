import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import {
  CATEGORY_TO_DEPARTMENT,
  coerceCategory,
  coerceDepartment,
  coercePriority,
  createApp,
  isValidImageDataUrl,
  sanitizeText,
  type GeminiClientLike,
} from "../server/app.ts";
import { SEED_ISSUES } from "../src/data/seedIssues.ts";
import { ISSUE_CATEGORIES, ISSUE_PRIORITIES } from "../src/types/civic.ts";
import {
  computeAdminInsights,
  findPotentialDuplicates,
  formatIssuesToCsv,
  formatOfficialTicketBrief,
  generateTicketId,
} from "../src/utils/civicHelpers.ts";

function createMockGeminiClient(
  payload: Record<string, unknown> | string
): { client: GeminiClientLike; generateContent: ReturnType<typeof vi.fn> } {
  const text = typeof payload === "string" ? payload : JSON.stringify(payload);
  const generateContent = vi.fn().mockResolvedValue({ text });
  return {
    client: { models: { generateContent } },
    generateContent,
  };
}

describe("CivicResolve Input Sanitization, Duplicate Detection, Ticket IDs, CSV, & Admin Insights", () => {
  it("strips HTML brackets, control characters, and enforces maxLength", () => {
    const dirty = "  <script>alert(1)</script>Broken drain\u0007 on LB Road  ";
    const cleaned = sanitizeText(dirty, 100);
    expect(cleaned).toBe("scriptalert(1)/scriptBroken drain on LB Road");
    expect(sanitizeText("abcdefghij", 5)).toBe("abcde");
    expect(sanitizeText(null, 50)).toBe("");
  });

  it("generates standardized CR-YYYY-NNNN Ticket IDs with zero-padding", () => {
    expect(generateTicketId(1042)).toBe("CR-2026-1042");
    expect(generateTicketId(7)).toBe("CR-2026-0007");
    expect(generateTicketId(42, 2027)).toBe("CR-2027-0042");
  });

  it("formats complaints as RFC-4180 CSV and neutralizes spreadsheet formula injection", () => {
    const injectedIssue = {
      ...SEED_ISSUES[0],
      title: "=HYPERLINK(\"http://bad.test\", \"Click\"), Urgent",
    };
    const csv = formatIssuesToCsv([injectedIssue, SEED_ISSUES[1]]);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain('"Ticket ID","Title","Location"');
    expect(lines[1]).toContain('"CR-2026-1041"');
    expect(lines[1]).toContain('"\'=HYPERLINK(""http://bad.test"", ""Click""), Urgent"');
    expect(lines[1]).toContain('"4"');
  });

  it("validates image data URLs and base64 payloads", () => {
    expect(isValidImageDataUrl("data:image/png;base64,iVBORw0KGgo=")).toBe(true);
    expect(isValidImageDataUrl("data:image/jpeg;base64,/9j/4AAQSkZJRg==")).toBe(true);
    expect(isValidImageDataUrl("data:text/html;base64,PGh0bWw+")).toBe(false);
    expect(isValidImageDataUrl("javascript:alert(1)")).toBe(false);
  });

  it("coerces categories, priorities, and department fallbacks safely", () => {
    expect(coerceCategory("Water Supply & Drainage")).toBe("Water Supply & Drainage");
    expect(coerceCategory("Unknown Category")).toBe("Roads & Potholes");
    expect(coercePriority("Critical")).toBe("Critical");
    expect(coercePriority("Invalid")).toBe("Medium");
    expect(coerceDepartment("Electrical & Street Lighting", "Roads & Potholes")).toBe(
      "Electrical & Street Lighting"
    );
    expect(coerceDepartment("Invalid Dept", "Sanitation & Garbage")).toBe(
      CATEGORY_TO_DEPARTMENT["Sanitation & Garbage"]
    );
  });

  it("detects nearby unresolved duplicates and ignores resolved or unrelated issues", () => {
    const adyarMatch = findPotentialDuplicates(
      "Leaning streetlight with exposed wires",
      "LB Road, Adyar",
      SEED_ISSUES
    );
    expect(adyarMatch.length).toBeGreaterThan(0);
    expect(adyarMatch[0].id).toBe("CR-2026-1041");

    // Resolved T. Nagar garbage issue should not be flagged as an active duplicate
    const resolvedSkip = findPotentialDuplicates(
      "Overflowing waste bin on sidewalk",
      "Usman Road, T. Nagar",
      SEED_ISSUES
    );
    expect(resolvedSkip).toHaveLength(0);

    const unrelated = findPotentialDuplicates(
      "Fallen banyan branch inside park",
      "Semmozhi Poonga, Cathedral Road",
      SEED_ISSUES
    );
    expect(unrelated).toHaveLength(0);
  });

  it("computes admin priority breakdown, department workload, and formatted ticket briefs", () => {
    const insights = computeAdminInsights(SEED_ISSUES);
    expect(insights.totalIssues).toBe(5);
    expect(insights.unresolvedCount).toBe(4);
    expect(insights.priorityBreakdown.find((p) => p.priority === "Critical")).toEqual({
      priority: "Critical",
      count: 2,
      percentage: 40,
    });
    expect(insights.departmentWorkload.length).toBeGreaterThan(0);

    const brief = formatOfficialTicketBrief(SEED_ISSUES[0]);
    expect(brief).toContain("CR-2026-1041");
    expect(brief).toContain("Priority: Critical | Status: Reported | Est. SLA: 4h");
    expect(brief).toContain("Electrical & Street Lighting");
    expect(brief).toContain("Public Safety Risks:");
  });
});

describe("CivicResolve Express API Integration Tests", () => {
  it("returns seeded Chennai issues and applies security headers via Helmet", async () => {
    const app = createApp({ initialIssues: [...SEED_ISSUES], enableRateLimit: false });
    const res = await request(app).get("/api/issues");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.issues)).toBe(true);
    expect(res.body.issues).toHaveLength(5);
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-frame-options"]).toBeUndefined();
  });

  it("rejects issue submission with missing title, description, or location", async () => {
    const { client } = createMockGeminiClient({});
    const app = createApp({ geminiClient: client, enableRateLimit: false });

    const missingTitle = await request(app).post("/api/analyze-issue").send({
      title: "   ",
      description: "Streetlight broken near school.",
      location: "Adyar, Chennai",
    });
    expect(missingTitle.status).toBe(400);
    expect(missingTitle.body.error).toMatch(/required/i);

    const missingLocation = await request(app).post("/api/analyze-issue").send({
      title: "Broken Streetlight",
      description: "Pole leaning dangerously.",
      location: "",
    });
    expect(missingLocation.status).toBe(400);

    const missingDescription = await request(app).post("/api/analyze-issue").send({
      title: "Broken Streetlight",
      description: "",
      location: "Adyar, Chennai",
    });
    expect(missingDescription.status).toBe(400);
  });

  it("rejects unsupported image MIME types cleanly", async () => {
    const { client } = createMockGeminiClient({});
    const app = createApp({ geminiClient: client, enableRateLimit: false });

    const res = await request(app).post("/api/analyze-issue").send({
      title: "Suspicious upload",
      description: "Testing MIME type validation",
      location: "Anna Nagar, Chennai",
      imageBase64: "data:image/svg+xml;base64,PHN2Zz4=",
      imageMimeType: "image/svg+xml",
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/unsupported image format/i);
  });

  it("invokes Gemini 2.5 Flash multimodal schema triage with risk_factors & sla_hours", async () => {
    for (const priority of ISSUE_PRIORITIES) {
      const targetCategory = ISSUE_CATEGORIES[ISSUE_PRIORITIES.indexOf(priority) % ISSUE_CATEGORIES.length];
      const expectedDepartment = CATEGORY_TO_DEPARTMENT[targetCategory];

      const { client, generateContent } = createMockGeminiClient({
        category: targetCategory,
        priority,
        recommendedDepartment: expectedDepartment,
        officialSummary: `Official dispatch summary for ${targetCategory} at Mylapore.`,
        priorityReasoning: `Assigned ${priority} priority due to safety conditions.`,
        visualAnalysis: "Uploaded site photo shows clear structural defect.",
        risk_factors: [
          "Pedestrian slip and fall hazard near intersection",
          "Nighttime visibility obstruction for two-wheelers",
        ],
        sla_hours: priority === "Critical" ? 4 : priority === "High" ? 18 : 48,
      });

      const app = createApp({
        initialIssues: [...SEED_ISSUES],
        geminiClient: client,
        enableRateLimit: false,
      });

      const res = await request(app).post("/api/analyze-issue").send({
        title: `<b>Hazard</b> report (${priority})`,
        description: "Detailed citizen description of hazard at crossing.",
        location: "Luz Church Road, Mylapore, Chennai 600004",
        imageBase64: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
        imageMimeType: "image/png",
      });

      expect(res.status).toBe(201);
      expect(res.body.issue.id).toBe("CR-2026-1042");
      expect(res.body.issue.priority).toBe(priority);
      expect(res.body.issue.category).toBe(targetCategory);
      expect(res.body.issue.recommendedDepartment).toBe(expectedDepartment);
      expect(res.body.issue.status).toBe("Reported");
      expect(res.body.issue.upvotes).toBe(1);
      expect(res.body.issue.risk_factors).toHaveLength(2);
      expect(typeof res.body.issue.sla_hours).toBe("number");
      expect(res.body.issue.resolvedVerified).toBe(false);
      // HTML brackets stripped from title
      expect(res.body.issue.title).toBe(`bHazard/b report (${priority})`);

      expect(generateContent).toHaveBeenCalledTimes(1);
      const callArg = generateContent.mock.calls[0][0] as {
        model: string;
        contents: { parts: Array<{ inlineData?: { mimeType: string; data: string }; text?: string }> };
        config: { responseMimeType: string; responseSchema: unknown };
      };
      expect(callArg.model).toBe("gemini-2.5-flash");
      expect(callArg.config.responseMimeType).toBe("application/json");
      expect(callArg.config.responseSchema).toBeDefined();
      expect(callArg.contents.parts).toHaveLength(2);
      expect(callArg.contents.parts[0].inlineData?.mimeType).toBe("image/png");
    }
  });

  it("formats casual Tamil/English voice transcripts into structured complaints via POST /api/voice-format", async () => {
    const { client, generateContent } = createMockGeminiClient({
      title: "Overflowing Stormwater Drain Near Adyar Bus Depot",
      description:
        "Sewage and stormwater have been overflowing across the main lane near Adyar bus depot, creating slippery road conditions and foul odor.",
      suggestedCategory: "Water Supply & Drainage",
      suggestedPriority: "High",
    });

    const app = createApp({ geminiClient: client, enableRateLimit: false });

    const emptyVoice = await request(app)
      .post("/api/voice-format")
      .send({ transcript: "   ", language: "ta-IN" });
    expect(emptyVoice.status).toBe(400);

    const res = await request(app).post("/api/voice-format").send({
      transcript: "Adyar bus stand pakkathula drain thanni romba overflow aagudhu",
      language: "ta-IN",
    });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Overflowing Stormwater Drain Near Adyar Bus Depot");
    expect(res.body.suggestedCategory).toBe("Water Supply & Drainage");
    expect(res.body.suggestedPriority).toBe("High");
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it("auto-drafts title and description from an uploaded photo via POST /api/auto-draft", async () => {
    const { client, generateContent } = createMockGeminiClient({
      title: "Waterlogged Asphalt Crater Near Pedestrian Crossing",
      description:
        "A wide asphalt cavity filled with standing water sits adjacent to the white crosswalk markings, posing a skid hazard to two-wheelers.",
    });

    const app = createApp({ geminiClient: client, enableRateLimit: false });

    const missingImg = await request(app).post("/api/auto-draft").send({});
    expect(missingImg.status).toBe(400);

    const res = await request(app).post("/api/auto-draft").send({
      imageBase64: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      imageMimeType: "image/png",
    });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Waterlogged Asphalt Crater Near Pedestrian Crossing");
    expect(res.body.description).toContain("asphalt cavity");
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it("answers citizen questions via POST /api/assistant using Gemini 2.5 Flash", async () => {
    const { client, generateContent } = createMockGeminiClient(
      "Electrical & Street Lighting handles damaged streetlight poles and exposed overhead wiring."
    );

    const app = createApp({ geminiClient: client, enableRateLimit: false });

    const emptyMsg = await request(app).post("/api/assistant").send({ message: "   " });
    expect(emptyMsg.status).toBe(400);

    const res = await request(app).post("/api/assistant").send({
      message: "Which department handles broken streetlights?",
      history: [],
    });

    expect(res.status).toBe(200);
    expect(res.body.reply).toContain("Electrical & Street Lighting");
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it("increments community upvote counters via POST /api/issues/:id/upvote", async () => {
    const app = createApp({ initialIssues: [...SEED_ISSUES], enableRateLimit: false });
    const targetId = SEED_ISSUES[0].id;
    const initialUpvotes = SEED_ISSUES[0].upvotes;

    const res = await request(app).post(`/api/issues/${targetId}/upvote`);
    expect(res.status).toBe(200);
    expect(res.body.issue.upvotes).toBe(initialUpvotes + 1);

    const missingRes = await request(app).post("/api/issues/CR-9999-0000/upvote");
    expect(missingRes.status).toBe(404);
  });

  it("respects citizen categoryOverride and maps to the matching department", async () => {
    const { client } = createMockGeminiClient({
      category: "Roads & Potholes",
      priority: "High",
      recommendedDepartment: "Public Works & Roads Dept",
      officialSummary: "Stormwater drainage overflow reported on Velachery Bypass.",
      priorityReasoning: "Standing water impacts commuter safety.",
      visualAnalysis: "No photo attached.",
      risk_factors: ["Standing water splash hazard", "Pedestrian footpath blockage"],
      sla_hours: 18,
    });

    const app = createApp({ geminiClient: client, enableRateLimit: false });
    const res = await request(app).post("/api/analyze-issue").send({
      title: "Blocked roadside drain",
      description: "Water pooling near residential gate.",
      location: "Velachery, Chennai",
      categoryOverride: "Water Supply & Drainage",
    });

    expect(res.status).toBe(201);
    expect(res.body.issue.category).toBe("Water Supply & Drainage");
    expect(res.body.issue.categoryOverridden).toBe(true);
    expect(res.body.issue.recommendedDepartment).toBe("Water Supply & Sewerage Board");
  });

  it("returns an explicit error when Gemini fails instead of masking errors", async () => {
    const failingClient: GeminiClientLike = {
      models: {
        generateContent: vi.fn().mockRejectedValue(new Error("GEMINI_API_KEY invalid or missing")),
      },
    };
    const app = createApp({ geminiClient: failingClient, enableRateLimit: false });

    const res = await request(app).post("/api/analyze-issue").send({
      title: "Streetlight outage",
      description: "Entire stretch dark since last night.",
      location: "T. Nagar, Chennai",
    });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/GEMINI_API_KEY/i);
  });

  it("transitions issue status, attaches verified afterImageUrl proof, and validates payloads", async () => {
    const app = createApp({ initialIssues: [...SEED_ISSUES], enableRateLimit: false });
    const targetId = SEED_ISSUES[0].id; // Initially "Reported"

    const toInProgress = await request(app)
      .patch(`/api/issues/${targetId}`)
      .send({ status: "In Progress" });
    expect(toInProgress.status).toBe(200);
    expect(toInProgress.body.issue.status).toBe("In Progress");
    expect(toInProgress.body.issue.resolvedVerified).toBe(false);

    const invalidAfterPhoto = await request(app)
      .patch(`/api/issues/${targetId}`)
      .send({ status: "Resolved", afterImageUrl: "javascript:alert(1)" });
    expect(invalidAfterPhoto.status).toBe(400);

    const toResolvedWithProof = await request(app)
      .patch(`/api/issues/${targetId}`)
      .send({
        status: "Resolved",
        afterImageUrl: "https://example.com/repaired-pole.jpg",
      });
    expect(toResolvedWithProof.status).toBe(200);
    expect(toResolvedWithProof.body.issue.status).toBe("Resolved");
    expect(toResolvedWithProof.body.issue.afterImageUrl).toBe(
      "https://example.com/repaired-pole.jpg"
    );
    expect(toResolvedWithProof.body.issue.resolvedVerified).toBe(true);

    const listRes = await request(app).get("/api/issues");
    const updated = listRes.body.issues.find((i: { id: string }) => i.id === targetId);
    expect(updated.status).toBe("Resolved");
    expect(updated.resolvedVerified).toBe(true);

    const invalidStatus = await request(app)
      .patch(`/api/issues/${targetId}`)
      .send({ status: "Archived" });
    expect(invalidStatus.status).toBe(400);

    const notFound = await request(app)
      .patch("/api/issues/CR-9999-0000")
      .send({ status: "Resolved" });
    expect(notFound.status).toBe(404);
  });
});

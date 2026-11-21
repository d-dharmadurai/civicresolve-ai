import { Type } from "@google/genai";
import { ISSUE_CATEGORIES, ISSUE_PRIORITIES, type IssueCategory } from "../src/types/civic.ts";

export const TRIAGE_SYSTEM_INSTRUCTION =
  "You are an expert civic infrastructure triage specialist for Chennai. Always return strictly valid JSON matching the requested schema.";

export const AUTO_DRAFT_SYSTEM_INSTRUCTION =
  "You are a helpful civic reporting assistant. Extract accurate visual details from the photo without inventing street names not visible in the image.";

export const AUTO_DRAFT_PROMPT =
  "Inspect this urban civic issue photograph and draft a concise, clear citizen complaint Issue Title (max 100 chars) and a factual 2-3 sentence Detailed Description describing the visible defect, surroundings, and safety risks to pedestrians or vehicles.";

export const VOICE_FORMAT_SYSTEM_INSTRUCTION = `You are a bilingual Tamil + English municipal intake assistant for Chennai (CivicResolve).
Translate and format casual spoken citizen speech (including Tamil, English, or Tamil-English/Tanglish mix) into a clean, formal English civic issue report JSON containing:
- title: concise formal English headline (max 100 chars)
- description: clear 2-3 sentence formal English complaint description preserving every location/hazard detail
- suggestedCategory: strictly one of: ${ISSUE_CATEGORIES.join(", ")}
- suggestedPriority: strictly one of: ${ISSUE_PRIORITIES.join(", ")}`;

export const ASSISTANT_SYSTEM_INSTRUCTION = `You are the CivicResolve AI Assistant for Chennai citizens. Provide concise, accurate, helpful answers (2-4 sentences) about civic issue reporting on CivicResolve:
- Categories & Departments:
  1. Roads & Potholes -> Public Works & Roads Dept
  2. Sanitation & Garbage -> Solid Waste Management
  3. Streetlights & Electricity -> Electrical & Street Lighting
  4. Water Supply & Drainage -> Water Supply & Sewerage Board
  5. Parks & Public Spaces -> Parks & Recreation
  6. Traffic & Public Safety -> Traffic & Enforcement
- Priority Tiers:
  - Critical: Immediate life-safety hazards (exposed live wires, collapsed slabs, dark major intersection signals, severe open drainage).
  - High: Major commuter or sanitation hazards needing rapid 24-hour dispatch.
  - Medium: Moderate defects scheduled within 48-72 hours.
  - Low: Minor aesthetic or routine maintenance requests.
- Emergency Escalation: For active fires, electrocution incidents, or medical emergencies, advise calling local emergency services (112 / 100 / 101 / 108) immediately in addition to logging the civic ticket.
- Platform Workflow: Citizens submit a photo & location -> Gemini AI triages category, priority, SLA & risk factors -> Ticket enters the Public Issue Tracker (Reported -> In Progress -> Resolved) where neighbors can upvote/confirm urgent issues.`;

export const VOICE_FORMAT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    description: { type: Type.STRING },
    suggestedCategory: { type: Type.STRING },
    suggestedPriority: { type: Type.STRING },
  },
  required: ["title", "description", "suggestedCategory", "suggestedPriority"],
};

export const AUTO_DRAFT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: "Concise, clear civic issue title based on the photograph.",
    },
    description: {
      type: Type.STRING,
      description: "2-3 sentence factual description of visible damage and safety impact.",
    },
  },
  required: ["title", "description"],
};

export const TRIAGE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    category: {
      type: Type.STRING,
      description:
        "One of: Roads & Potholes, Sanitation & Garbage, Streetlights & Electricity, Water Supply & Drainage, Parks & Public Spaces, Traffic & Public Safety",
    },
    priority: { type: Type.STRING, description: "One of: Critical, High, Medium, Low" },
    recommendedDepartment: {
      type: Type.STRING,
      description:
        "One of: Public Works & Roads Dept, Solid Waste Management, Electrical & Street Lighting, Water Supply & Sewerage Board, Parks & Recreation, Traffic & Enforcement",
    },
    officialSummary: {
      type: Type.STRING,
      description: "Official 1-sentence municipal summary of the issue.",
    },
    priorityReasoning: {
      type: Type.STRING,
      description: "Safety and urgency justification for the assigned priority.",
    },
    visualAnalysis: {
      type: Type.STRING,
      description:
        "Visual image analysis notes from the submitted photo or inspection note if no image was provided.",
    },
    risk_factors: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "2-3 concise public safety risks posed by this hazard.",
    },
    sla_hours: {
      type: Type.INTEGER,
      description: "Estimated municipal resolution SLA in hours.",
    },
  },
  required: [
    "category",
    "priority",
    "recommendedDepartment",
    "officialSummary",
    "priorityReasoning",
    "visualAnalysis",
    "risk_factors",
    "sla_hours",
  ],
};

export function buildTriagePrompt(params: {
  title: string;
  location: string;
  description: string;
  categoryOverride?: IssueCategory;
  hasImage: boolean;
}): string {
  const { title, location, description, categoryOverride, hasImage } = params;
  const visualRule = hasImage
    ? "Provide specific, concrete visual observations from the attached photograph (materials, structural damage, water, wiring, surrounding pedestrian/traffic exposure)."
    : "Explicitly state that no photograph was attached, and summarize the visual inspection items field crews should verify on arrival.";

  return `You are a municipal civic triage engineer for Greater Chennai Corporation (GCC).
Analyze the citizen complaint below${hasImage ? " together with the attached photograph" : ""} and return a structured JSON triage assessment.

Citizen Report:
- Title: ${title}
- Location: ${location}
- Description: ${description}
${categoryOverride ? `- Citizen Requested Category Override: ${categoryOverride} (Note: Prioritize routing accurately while respecting this category context unless clearly unsafe)` : ""}

Classification Rules:
1. category MUST be exactly one of:
   - "Roads & Potholes"
   - "Sanitation & Garbage"
   - "Streetlights & Electricity"
   - "Water Supply & Drainage"
   - "Parks & Public Spaces"
   - "Traffic & Public Safety"
2. priority MUST be exactly one of:
   - "Critical": Immediate life-safety threat (live wires, collapsed road/drain slab near pedestrians, failed major intersection signal, severe flooding/open manhole).
   - "High": Significant hazard to motorists, cyclists, or sanitation health requiring rapid dispatch within 24 hours.
   - "Medium": Moderate infrastructure or drainage defect needing scheduled maintenance within 48-72 hours.
   - "Low": Minor aesthetic, routine cleaning, or non-urgent park upkeep issue.
3. recommendedDepartment MUST be exactly one of:
   - "Public Works & Roads Dept"
   - "Solid Waste Management"
   - "Electrical & Street Lighting"
   - "Water Supply & Sewerage Board"
   - "Parks & Recreation"
   - "Traffic & Enforcement"
4. officialSummary: Write a crisp, authoritative 1-sentence municipal dispatch summary referencing the location and core defect.
5. priorityReasoning: Explain clearly in 1-2 sentences why the assigned priority level is warranted based on safety risk, traffic exposure, and urgency.
6. visualAnalysis: ${visualRule}
7. risk_factors: Return an array of 2 to 3 short, specific public safety risks (each under 12 words).
8. sla_hours: Return an integer estimate for resolution SLA in hours (e.g., 4 for Critical, 12-24 for High, 36-48 for Medium, 48-72 for Low).`;
}

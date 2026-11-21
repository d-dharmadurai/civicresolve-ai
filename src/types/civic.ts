export type IssueCategory =
  | "Roads & Potholes"
  | "Sanitation & Garbage"
  | "Streetlights & Electricity"
  | "Water Supply & Drainage"
  | "Parks & Public Spaces"
  | "Traffic & Public Safety";

export type IssuePriority = "Critical" | "High" | "Medium" | "Low";

export type DepartmentName =
  | "Public Works & Roads Dept"
  | "Solid Waste Management"
  | "Electrical & Street Lighting"
  | "Water Supply & Sewerage Board"
  | "Parks & Recreation"
  | "Traffic & Enforcement";

export type IssueStatus = "Reported" | "In Progress" | "Resolved";

export interface CivicIssue {
  id: string;
  title: string;
  description: string;
  location: string;
  category: IssueCategory;
  categoryOverridden: boolean;
  priority: IssuePriority;
  recommendedDepartment: DepartmentName;
  officialSummary: string;
  priorityReasoning: string;
  visualAnalysis: string;
  risk_factors: string[];
  sla_hours: number;
  status: IssueStatus;
  upvotes: number;
  imageUrl: string | null;
  afterImageUrl?: string | null;
  resolvedVerified?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyzeIssueRequest {
  title: string;
  description: string;
  location: string;
  categoryOverride?: IssueCategory | "";
  imageBase64?: string | null;
  imageMimeType?: string | null;
}

export interface AnalyzeIssueResult {
  category: IssueCategory;
  priority: IssuePriority;
  recommendedDepartment: DepartmentName;
  officialSummary: string;
  priorityReasoning: string;
  visualAnalysis: string;
  risk_factors: string[];
  sla_hours: number;
}

export interface AutoDraftRequest {
  imageBase64: string;
  imageMimeType: string;
}

export interface AutoDraftResult {
  title: string;
  description: string;
}

export interface VoiceFormatRequest {
  transcript: string;
  language?: "en-IN" | "ta-IN";
}

export interface VoiceFormatResult {
  title: string;
  description: string;
  suggestedCategory: IssueCategory;
  suggestedPriority: IssuePriority;
}

export interface AssistantChatMessage {
  role: "user" | "assistant";
  content: string;
}

export const ISSUE_CATEGORIES: IssueCategory[] = [
  "Roads & Potholes",
  "Sanitation & Garbage",
  "Streetlights & Electricity",
  "Water Supply & Drainage",
  "Parks & Public Spaces",
  "Traffic & Public Safety",
];

export const ISSUE_PRIORITIES: IssuePriority[] = [
  "Critical",
  "High",
  "Medium",
  "Low",
];

export const ISSUE_STATUSES: IssueStatus[] = [
  "Reported",
  "In Progress",
  "Resolved",
];

export const DEPARTMENT_NAMES: DepartmentName[] = [
  "Public Works & Roads Dept",
  "Solid Waste Management",
  "Electrical & Street Lighting",
  "Water Supply & Sewerage Board",
  "Parks & Recreation",
  "Traffic & Enforcement",
];

export const CHENNAI_SAMPLE_LOCATIONS: string[] = [
  "2nd Avenue near Roundtana, Anna Nagar, Chennai 600040",
  "Usman Road Commercial Corridor, T. Nagar, Chennai 600017",
  "LB Road near Adyar Depot, Adyar, Chennai 600020",
  "100 Feet Bypass Road, Velachery, Chennai 600042",
  "Sholinganallur Junction, OMR, Chennai 600119",
  "Luz Church Road, Mylapore, Chennai 600004",
  "Nungambakkam High Road, Nungambakkam, Chennai 600034",
  "Kathipara Flyover Approach, Guindy, Chennai 600032",
];

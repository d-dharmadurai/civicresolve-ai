import {
  DEPARTMENT_NAMES,
  ISSUE_PRIORITIES,
  type CivicIssue,
  type DepartmentName,
  type IssuePriority,
} from "../types/civic";

const STOP_WORDS = new Set([
  "near",
  "road",
  "street",
  "avenue",
  "chennai",
  "with",
  "from",
  "that",
  "this",
  "have",
  "been",
  "during",
  "along",
  "bypass",
  "main",
  "lane",
  "next",
  "the",
  "and",
  "for",
  "into",
  "over",
]);

/**
 * Generates a standardized trackable civic ticket ID (e.g. CR-2026-1042).
 */
export function generateTicketId(sequenceNumber: number, year = 2026): string {
  const safeSeq = Math.max(1, Math.floor(sequenceNumber));
  return `CR-${year}-${String(safeSeq).padStart(4, "0")}`;
}

function tokenize(input: string): Set<string> {
  const words = input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w) && !/^\d{6}$/.test(w));
  return new Set(words);
}

/**
 * Checks whether a draft complaint title & location closely matches any existing
 * civic issues nearby so citizens can upvote an existing ticket instead of duplicating.
 */
export function findPotentialDuplicates(
  draftTitle: string,
  draftLocation: string,
  existingIssues: CivicIssue[]
): CivicIssue[] {
  const titleTokens = tokenize(draftTitle);
  const locationTokens = tokenize(draftLocation);

  if (titleTokens.size === 0 && locationTokens.size === 0) {
    return [];
  }

  const scored: Array<{ issue: CivicIssue; score: number }> = [];

  for (const issue of existingIssues) {
    if (issue.status === "Resolved") continue;

    const issueTitleTokens = tokenize(issue.title);
    const issueLocTokens = tokenize(issue.location);

    let titleMatches = 0;
    for (const token of titleTokens) {
      if (issueTitleTokens.has(token)) titleMatches++;
    }

    let locMatches = 0;
    for (const token of locationTokens) {
      if (issueLocTokens.has(token)) locMatches++;
    }

    const isNearbyMatch =
      (locMatches >= 1 && titleMatches >= 1) ||
      titleMatches >= 2 ||
      locMatches >= 2;

    if (isNearbyMatch) {
      scored.push({
        issue,
        score: titleMatches * 2 + locMatches * 2,
      });
    }
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((entry) => entry.issue);
}

export interface PriorityBreakdownItem {
  priority: IssuePriority;
  count: number;
  percentage: number;
}

export interface DepartmentWorkloadItem {
  department: DepartmentName;
  total: number;
  unresolved: number;
}

export interface AdminInsightsSummary {
  totalIssues: number;
  unresolvedCount: number;
  priorityBreakdown: PriorityBreakdownItem[];
  departmentWorkload: DepartmentWorkloadItem[];
}

export function computeAdminInsights(issues: CivicIssue[]): AdminInsightsSummary {
  const totalIssues = issues.length;
  const unresolvedCount = issues.filter((i) => i.status !== "Resolved").length;

  const priorityBreakdown: PriorityBreakdownItem[] = ISSUE_PRIORITIES.map((priority) => {
    const count = issues.filter((i) => i.priority === priority).length;
    const percentage = totalIssues > 0 ? Math.round((count / totalIssues) * 100) : 0;
    return { priority, count, percentage };
  });

  const departmentWorkload: DepartmentWorkloadItem[] = DEPARTMENT_NAMES.map(
    (department) => {
      const deptIssues = issues.filter((i) => i.recommendedDepartment === department);
      return {
        department,
        total: deptIssues.length,
        unresolved: deptIssues.filter((i) => i.status !== "Resolved").length,
      };
    }
  )
    .filter((d) => d.total > 0)
    .sort((a, b) => b.unresolved - a.unresolved || b.total - a.total);

  return {
    totalIssues,
    unresolvedCount,
    priorityBreakdown,
    departmentWorkload,
  };
}

export function formatOfficialTicketBrief(issue: CivicIssue): string {
  return [
    `CivicResolve Municipal Dispatch Brief — ${issue.id}`,
    `Title: ${issue.title}`,
    `Priority: ${issue.priority} | Status: ${issue.status} | Est. SLA: ${issue.sla_hours}h`,
    `Category: ${issue.category}`,
    `Assigned Department: ${issue.recommendedDepartment}`,
    `Location: ${issue.location}`,
    `Citizen Confirmations (Upvotes): ${issue.upvotes}`,
    `Public Safety Risks: ${issue.risk_factors.join("; ")}`,
    `Official Summary: ${issue.officialSummary}`,
    `Priority Reasoning: ${issue.priorityReasoning}`,
    `Visual Inspection: ${issue.visualAnalysis}`,
  ].join("\n");
}

function escapeCsvCell(raw: string | number | boolean | null | undefined): string {
  const str = String(raw ?? "");
  // Neutralize spreadsheet formula injection characters (=, +, -, @, tab, CR)
  const formulaSafe = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  const escaped = formulaSafe.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Formats an array of CivicIssue tickets into a clean RFC-4180 CSV export string.
 */
export function formatIssuesToCsv(issues: CivicIssue[]): string {
  const headers = [
    "Ticket ID",
    "Title",
    "Location",
    "Category",
    "Priority",
    "Status",
    "Assigned Department",
    "Upvotes",
    "SLA Hours",
    "Risk Factors",
    "Verified Resolution",
    "Official Summary",
    "Created At",
    "Updated At",
  ];

  const rows = issues.map((issue) =>
    [
      issue.id,
      issue.title,
      issue.location,
      issue.category,
      issue.priority,
      issue.status,
      issue.recommendedDepartment,
      issue.upvotes,
      issue.sla_hours,
      issue.risk_factors.join(" | "),
      issue.resolvedVerified ? "Yes" : "No",
      issue.officialSummary,
      issue.createdAt,
      issue.updatedAt,
    ]
      .map(escapeCsvCell)
      .join(",")
  );

  return [headers.map(escapeCsvCell).join(","), ...rows].join("\n");
}

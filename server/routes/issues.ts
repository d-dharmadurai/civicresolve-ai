import type { Express } from "express";
import { ISSUE_STATUSES, type CivicIssue, type IssueStatus } from "../../src/types/civic.ts";
import { sanitizeText, validateAfterRepairImage } from "../validation.ts";

/** In-memory issue store shared by the issue and AI routes. */
export interface IssueStore {
  list(): CivicIssue[];
  find(id: string): CivicIssue | undefined;
  add(issue: CivicIssue): void;
  replace(issue: CivicIssue): void;
}

export function createIssueStore(initial: CivicIssue[]): IssueStore {
  const issues = [...initial];
  return {
    list: () => issues,
    find: (id) => issues.find((item) => item.id === id),
    add: (issue) => {
      issues.unshift(issue);
    },
    replace: (issue) => {
      const index = issues.findIndex((item) => item.id === issue.id);
      if (index !== -1) issues[index] = issue;
    },
  };
}

interface StatusPatchBody {
  status?: IssueStatus;
  afterImageUrl?: string | null;
}

/** Registers the read, upvote and status-update endpoints for civic issues. */
export function registerIssueRoutes(app: Express, store: IssueStore): void {
  app.get("/api/issues", (_req, res) => {
    res.json({ issues: store.list() });
  });

  app.post("/api/issues/:id/upvote", (req, res) => {
    const id = sanitizeText(req.params.id, 40);
    const current = store.find(id);
    if (!current) {
      res.status(404).json({ error: `Issue ${id} was not found.` });
      return;
    }

    const updated: CivicIssue = {
      ...current,
      upvotes: current.upvotes + 1,
      updatedAt: new Date().toISOString(),
    };
    store.replace(updated);
    res.json({ issue: updated });
  });

  app.patch("/api/issues/:id", (req, res) => {
    const id = sanitizeText(req.params.id, 40);
    const { status, afterImageUrl } = (req.body ?? {}) as StatusPatchBody;

    if (!status || !ISSUE_STATUSES.includes(status)) {
      res.status(400).json({
        error: `Invalid status. Must be one of: ${ISSUE_STATUSES.join(", ")}.`,
      });
      return;
    }

    const current = store.find(id);
    if (!current) {
      res.status(404).json({ error: `Issue ${id} was not found.` });
      return;
    }

    let nextAfterImage = current.afterImageUrl ?? null;
    if (afterImageUrl !== undefined) {
      if (afterImageUrl === null || afterImageUrl === "") {
        nextAfterImage = null;
      } else {
        const validated = validateAfterRepairImage(afterImageUrl);
        if (!validated) {
          res.status(400).json({ error: "Invalid After Repair photo URL or image encoding." });
          return;
        }
        nextAfterImage = validated;
      }
    }

    const updated: CivicIssue = {
      ...current,
      status,
      afterImageUrl: nextAfterImage,
      resolvedVerified: status === "Resolved" && Boolean(nextAfterImage),
      updatedAt: new Date().toISOString(),
    };
    store.replace(updated);
    res.json({ issue: updated });
  });
}

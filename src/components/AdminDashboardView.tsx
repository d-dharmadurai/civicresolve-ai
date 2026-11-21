import { useMemo, useState, type ChangeEvent } from "react";
import {
  Building2,
  Camera,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock,
  Copy,
  Download,
  FileSpreadsheet,
  MapPin,
  ShieldAlert,
  ThumbsUp,
  Timer,
} from "lucide-react";
import {
  ISSUE_STATUSES,
  type CivicIssue,
  type IssuePriority,
  type IssueStatus,
} from "../types/civic";
import {
  computeAdminInsights,
  formatIssuesToCsv,
  formatOfficialTicketBrief,
} from "../utils/civicHelpers";
import {
  FOCUS_RING_CLASS,
  GoogleMapsLocationBar,
  IssueImage,
  PriorityBadge,
  RiskBreakdownPanel,
  StatusBadge,
  TicketIdChip,
  VerifiedResolutionBadge,
  formatRelativeTime,
} from "./Badges";

interface AdminDashboardViewProps {
  issues: CivicIssue[];
  onUpdateStatus: (
    issueId: string,
    newStatus: IssueStatus,
    afterImageUrl?: string | null
  ) => Promise<void>;
  onNotify?: (message: string) => void;
}

export const PRIORITY_WEIGHT: Record<IssuePriority, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};

const PRIORITY_BAR_COLORS: Record<IssuePriority, string> = {
  Critical: "bg-red-500",
  High: "bg-orange-400",
  Medium: "bg-yellow-400",
  Low: "bg-emerald-400",
};

export function sortIssuesByPriority(issues: CivicIssue[]): CivicIssue[] {
  return [...issues].sort((a, b) => {
    const weightDiff = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
    if (weightDiff !== 0) return weightDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function AdminDashboardView({
  issues,
  onUpdateStatus,
  onNotify,
}: AdminDashboardViewProps) {
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [afterImageDrafts, setAfterImageDrafts] = useState<Record<string, string>>({});
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusAnnouncement, setStatusAnnouncement] = useState<string>("");

  const insights = useMemo(() => computeAdminInsights(issues), [issues]);

  const kpiStats = useMemo(() => {
    const total = issues.length;
    const pending = issues.filter((i) => i.status !== "Resolved").length;
    const resolved = issues.filter((i) => i.status === "Resolved").length;
    const critical = issues.filter((i) => i.priority === "Critical").length;
    return { total, pending, resolved, critical };
  }, [issues]);

  const unresolvedUrgentIssues = useMemo(
    () =>
      issues.filter(
        (i) =>
          (i.priority === "Critical" || i.priority === "High") &&
          i.status !== "Resolved"
      ),
    [issues]
  );

  const sortedIssues = useMemo(() => {
    const base = urgentOnly ? unresolvedUrgentIssues : issues;
    return sortIssuesByPriority(base);
  }, [issues, unresolvedUrgentIssues, urgentOnly]);

  const handleStatusSelect = async (issueId: string, nextStatus: IssueStatus) => {
    setStatusError(null);
    setUpdatingId(issueId);
    try {
      await onUpdateStatus(issueId, nextStatus);
      setStatusAnnouncement(`Issue ${issueId} status updated to ${nextStatus}.`);
    } catch (err: unknown) {
      setStatusError(
        err instanceof Error ? err.message : "Failed to update complaint status."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSaveAfterPhoto = async (
    issueId: string,
    afterUrl: string | null
  ) => {
    setStatusError(null);
    setUpdatingId(issueId);
    try {
      await onUpdateStatus(issueId, "Resolved", afterUrl);
      setStatusAnnouncement(
        afterUrl
          ? `After-repair verification photo attached to ${issueId}.`
          : `After-repair verification photo cleared from ${issueId}.`
      );
    } catch (err: unknown) {
      setStatusError(
        err instanceof Error
          ? err.message
          : "Failed to save after-repair photo proof."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAfterFileChange = (
    issueId: string,
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setStatusError("Please select a valid image file (JPEG, PNG, or WebP).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (result) {
        setAfterImageDrafts((prev) => ({ ...prev, [issueId]: result }));
        void handleSaveAfterPhoto(issueId, result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCopySummary = async (issue: CivicIssue) => {
    const brief = formatOfficialTicketBrief(issue);
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(brief);
      }
      setCopiedId(issue.id);
      setStatusAnnouncement(`Copied official summary for ${issue.id} to clipboard.`);
      onNotify?.(`Copied dispatch brief for ${issue.id}`);
      setTimeout(() => {
        setCopiedId((prev) => (prev === issue.id ? null : prev));
      }, 2000);
    } catch {
      setStatusError("Unable to copy summary to clipboard in this browser context.");
    }
  };

  const handleExportBrief = (issue: CivicIssue) => {
    const brief = formatOfficialTicketBrief(issue);
    const blob = new Blob([brief], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${issue.id}_dispatch_brief.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    setStatusAnnouncement(`Exported official brief for ${issue.id}.`);
    onNotify?.(`Exported dispatch brief for ${issue.id}`);
  };

  const handleExportCsv = () => {
    const csv = formatIssuesToCsv(sortedIssues);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `civicresolve_complaints_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    setStatusAnnouncement(`Exported ${sortedIssues.length} complaints as CSV.`);
    onNotify?.(`Exported ${sortedIssues.length} complaints to CSV`);
  };

  const maxDeptCount = Math.max(
    1,
    ...insights.departmentWorkload.map((d) => d.total)
  );

  return (
    <section aria-labelledby="admin-heading" className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between border-b border-white/10 pb-6">
        <div className="max-w-2xl">
          <h1
            id="admin-heading"
            className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-white via-blue-100 to-blue-400 bg-clip-text text-transparent"
          >
            Municipal Admin Dashboard
          </h1>
          <p className="mt-2.5 text-sm sm:text-base text-slate-300 leading-relaxed">
            Priority-ordered dispatch console sorted by Critical risk first. Status updates
            and after-repair proof synchronize immediately with the Public Issue Tracker.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <span className="text-xs font-medium text-slate-300 tabular-nums">
            Showing {sortedIssues.length} of {issues.length} complaints
          </span>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={sortedIssues.length === 0}
            className={`inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 border border-blue-300/40 px-3.5 py-2 text-xs font-semibold text-white shadow-[0_0_16px_rgba(59,130,246,0.3)] transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 ${FOCUS_RING_CLASS}`}
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-white" aria-hidden="true" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Screen-reader polite live status update announcement */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {statusAnnouncement}
      </div>

      {/* 4 Glass KPI Summary Cards */}
      <div
        role="region"
        aria-label="Key performance indicators"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <div className="bg-slate-950/35 backdrop-blur-xl border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.4)] rounded-2xl p-5 flex items-center justify-between gap-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-400/40">
          <div>
            <div className="text-xs font-medium text-slate-300">Total Issues</div>
            <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-100">
              {kpiStats.total}
            </div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 border border-blue-400/30 text-blue-300">
            <ClipboardList className="h-5 w-5" aria-hidden="true" />
          </div>
        </div>

        <div className="bg-slate-950/35 backdrop-blur-xl border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.4)] rounded-2xl p-5 flex items-center justify-between gap-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-400/40">
          <div>
            <div className="text-xs font-medium text-slate-300">Pending</div>
            <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-amber-300">
              {kpiStats.pending}
            </div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-400/30 text-amber-300">
            <Clock className="h-5 w-5" aria-hidden="true" />
          </div>
        </div>

        <div className="bg-slate-950/35 backdrop-blur-xl border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.4)] rounded-2xl p-5 flex items-center justify-between gap-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-400/40">
          <div>
            <div className="text-xs font-medium text-slate-300">Resolved</div>
            <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-emerald-300">
              {kpiStats.resolved}
            </div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-300">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          </div>
        </div>

        <div className="bg-slate-950/35 backdrop-blur-xl border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.4)] rounded-2xl p-5 flex items-center justify-between gap-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-red-400/45">
          <div>
            <div className="text-xs font-medium text-slate-300">Critical</div>
            <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-red-300">
              {kpiStats.critical}
            </div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/15 border border-red-400/35 text-red-300">
            <ShieldAlert className="h-5 w-5" aria-hidden="true" />
          </div>
        </div>
      </div>

      {/* Department Workload Horizontal CSS Bar Breakdown & Priority Breakdown */}
      <div
        role="region"
        aria-label="Department workload and priority breakdown"
        className="bg-slate-950/35 backdrop-blur-xl border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.4)] rounded-2xl p-5 grid grid-cols-1 lg:grid-cols-12 gap-6"
      >
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              Priority Breakdown
            </h2>
            <span className="text-xs text-slate-300 font-mono tabular-nums">
              {insights.unresolvedCount} open / {insights.totalIssues} total
            </span>
          </div>
          <div className="space-y-2.5">
            {insights.priorityBreakdown.map((item) => (
              <div key={item.priority} className="flex items-center gap-3 text-xs">
                <span className="w-16 font-medium text-slate-200 shrink-0">
                  {item.priority}
                </span>
                <div className="flex-1 h-2 rounded-full bg-white/[0.06] border border-white/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${PRIORITY_BAR_COLORS[item.priority]}`}
                    style={{ width: `${Math.max(item.count > 0 ? 8 : 0, item.percentage)}%` }}
                  />
                </div>
                <span className="w-16 text-right font-mono tabular-nums text-slate-300 shrink-0">
                  {item.count} ({item.percentage}%)
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-7 lg:border-l lg:border-white/10 lg:pl-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              Department Workload
            </h2>
            <span className="text-[11px] text-slate-300">Open vs. Total</span>
          </div>
          <div className="space-y-2.5">
            {insights.departmentWorkload.map((dept) => {
              const totalWidthPct = Math.round((dept.total / maxDeptCount) * 100);
              const openWidthPct =
                dept.total > 0 ? Math.round((dept.unresolved / dept.total) * 100) : 0;
              return (
                <div key={dept.department} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-200 truncate">
                      {dept.department}
                    </span>
                    <span className="font-mono text-xs tabular-nums shrink-0">
                      <span className="font-semibold text-amber-300">{dept.unresolved}</span>
                      <span className="text-slate-400">/{dept.total}</span>
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white/[0.06] border border-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500/35 overflow-hidden transition-all duration-500"
                      style={{ width: `${Math.max(12, totalWidthPct)}%` }}
                    >
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-amber-400 transition-all duration-500"
                        style={{ width: `${openWidthPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* High-Priority Alert Banner */}
      {unresolvedUrgentIssues.length > 0 ? (
        <div
          role="region"
          aria-label="High priority unresolved complaints alert"
          className="rounded-2xl border border-red-400/40 bg-red-950/35 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-red-300 mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <h2 className="text-sm font-semibold text-red-100">
                <span className="font-mono tabular-nums">{unresolvedUrgentIssues.length}</span>{" "}
                unresolved Critical or High priority{" "}
                {unresolvedUrgentIssues.length === 1 ? "issue requires" : "issues require"}{" "}
                immediate dispatch
              </h2>
              <p className="mt-0.5 text-xs text-red-200/85 leading-relaxed">
                Critical electrical, traffic signal, and roadway hazards are pinned to the top
                of the queue below.
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-pressed={urgentOnly}
            onClick={() => setUrgentOnly((prev) => !prev)}
            className={`inline-flex items-center justify-center rounded-xl border border-red-300/40 bg-red-500/20 hover:bg-red-500/35 backdrop-blur-sm px-4 py-2 text-xs font-semibold text-red-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${FOCUS_RING_CLASS}`}
          >
            {urgentOnly ? "Show All Priorities" : "Filter Urgent Unresolved"}
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-400/35 bg-emerald-950/35 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-300 shrink-0" aria-hidden="true" />
            <p className="text-sm font-medium text-emerald-100">
              All Critical and High priority complaints have been resolved.
            </p>
          </div>
          {urgentOnly && (
            <button
              type="button"
              onClick={() => setUrgentOnly(false)}
              className={`rounded-xl border border-emerald-300/40 bg-emerald-500/20 px-3.5 py-1.5 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/35 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${FOCUS_RING_CLASS}`}
            >
              Show All Issues
            </button>
          )}
        </div>
      )}

      {statusError && (
        <div
          role="alert"
          className="rounded-xl border border-red-400/50 bg-red-500/20 backdrop-blur-sm px-4 py-3 text-sm text-red-100"
        >
          {statusError}
        </div>
      )}

      {/* Priority-Sorted Glass Management Panel */}
      <div className="bg-slate-950/35 backdrop-blur-xl border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.4)] rounded-2xl overflow-hidden divide-y divide-white/10">
        {sortedIssues.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-300">
            No complaints match the current filter.
          </div>
        ) : (
          sortedIssues.map((issue) => {
            const isCopied = copiedId === issue.id;
            const isVerified =
              issue.status === "Resolved" &&
              Boolean(issue.resolvedVerified || issue.afterImageUrl);
            const draftAfterUrl =
              afterImageDrafts[issue.id] ?? issue.afterImageUrl ?? "";

            return (
              <article
                key={issue.id}
                aria-label={`Admin complaint ${issue.id}: ${issue.title}`}
                className="p-5 sm:p-6 hover:bg-white/[0.04] transition-colors duration-200"
              >
                <div className="flex flex-col lg:flex-row lg:items-start gap-5">
                  {/* Thumbnail (shows Before vs. After if resolved with proof) */}
                  <div className="w-full sm:w-44 shrink-0 space-y-2">
                    <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]">
                      <IssueImage
                        src={issue.imageUrl}
                        alt={`Photograph of ${issue.title} at ${issue.location}`}
                        className="h-32 w-full object-cover"
                      />
                    </div>
                    {issue.status === "Resolved" && issue.afterImageUrl && (
                      <div className="overflow-hidden rounded-xl border border-emerald-400/40 bg-white/[0.04] relative">
                        <IssueImage
                          src={issue.afterImageUrl}
                          alt={`After repair photograph for ${issue.title}`}
                          className="h-24 w-full object-cover"
                        />
                        <span className="absolute bottom-1.5 left-1.5 rounded bg-emerald-950/90 border border-emerald-400/45 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-200">
                          After Repair
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Details & AI Triage Notes */}
                  <div className="flex-1 min-w-0 space-y-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <TicketIdChip
                        ticketId={issue.id}
                        onCopied={(id) => onNotify?.(`Copied Ticket ID ${id}`)}
                      />
                      <PriorityBadge priority={issue.priority} />
                      <StatusBadge status={issue.status} />
                      {isVerified && <VerifiedResolutionBadge />}
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-400/35 px-2 py-0.5 text-[11px] font-mono font-semibold tabular-nums text-amber-200">
                        <Timer className="h-3 w-3" aria-hidden="true" />
                        <span>Est. SLA: {issue.sla_hours}h</span>
                      </span>
                      <span className="text-xs font-medium text-slate-200">{issue.category}</span>
                      <span className="text-xs text-slate-500" aria-hidden="true">
                        ·
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-mono tabular-nums text-amber-200">
                        <ThumbsUp className="h-3 w-3" aria-hidden="true" />
                        <span>{issue.upvotes}</span>
                      </span>
                      <span className="text-xs text-slate-500" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-xs text-slate-400 tabular-nums">
                        {formatRelativeTime(issue.createdAt)}
                      </span>
                    </div>

                    <h3 className="text-base font-semibold text-slate-100">
                      {issue.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-blue-300 shrink-0" aria-hidden="true" />
                        <span>{issue.location}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 font-medium text-slate-100">
                        <Building2
                          className="h-3.5 w-3.5 text-amber-300 shrink-0"
                          aria-hidden="true"
                        />
                        <span>{issue.recommendedDepartment}</span>
                      </span>
                    </div>

                    <GoogleMapsLocationBar
                      location={issue.location}
                      issueTitle={issue.title}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-white/10 text-xs leading-relaxed">
                      <div>
                        <span className="block font-semibold text-slate-100 mb-0.5">
                          AI Official Summary
                        </span>
                        <p className="text-slate-300 leading-relaxed">{issue.officialSummary}</p>
                      </div>
                      <div>
                        <span className="block font-semibold text-slate-100 mb-0.5">
                          Visual Image Analysis
                        </span>
                        <p className="text-slate-300 leading-relaxed">{issue.visualAnalysis}</p>
                      </div>
                    </div>

                    <RiskBreakdownPanel
                      riskFactors={issue.risk_factors}
                      slaHours={issue.sla_hours}
                    />

                    {/* After Repair Photo Proof Panel when issue is Resolved */}
                    {issue.status === "Resolved" && (
                      <div className="rounded-xl border border-emerald-400/25 bg-emerald-950/30 backdrop-blur-md p-3.5 space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <label
                            htmlFor={`after-photo-url-${issue.id}`}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-100"
                          >
                            <Camera className="h-3.5 w-3.5 text-emerald-300" aria-hidden="true" />
                            <span>After Repair Photo Proof (Optional)</span>
                          </label>
                          <label
                            htmlFor={`after-photo-file-${issue.id}`}
                            className={`inline-flex items-center gap-1 rounded-lg border border-emerald-300/35 bg-emerald-500/15 hover:bg-emerald-500/25 px-2.5 py-1 text-[11px] font-semibold text-emerald-100 cursor-pointer transition-colors ${FOCUS_RING_CLASS}`}
                          >
                            <span>Upload Photo</span>
                            <input
                              id={`after-photo-file-${issue.id}`}
                              type="file"
                              accept="image/jpeg,image/png,image/webp,image/gif"
                              onChange={(e) => handleAfterFileChange(issue.id, e)}
                              className="sr-only"
                            />
                          </label>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            id={`after-photo-url-${issue.id}`}
                            type="url"
                            value={draftAfterUrl}
                            onChange={(e) =>
                              setAfterImageDrafts((prev) => ({
                                ...prev,
                                [issue.id]: e.target.value,
                              }))
                            }
                            placeholder="https://... or upload an after-repair photo"
                            className="flex-1 rounded-lg bg-slate-950/40 backdrop-blur-md border border-white/15 px-3 py-1.5 text-xs text-white placeholder-slate-400 focus:bg-slate-950/60 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors"
                          />
                          <button
                            type="button"
                            disabled={updatingId === issue.id}
                            onClick={() =>
                              void handleSaveAfterPhoto(
                                issue.id,
                                draftAfterUrl.trim() || null
                              )
                            }
                            className={`rounded-lg border border-emerald-300/40 bg-emerald-500/20 hover:bg-emerald-500/30 px-3 py-1.5 text-xs font-semibold text-emerald-100 whitespace-nowrap cursor-pointer disabled:opacity-50 ${FOCUS_RING_CLASS}`}
                          >
                            Save Proof
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Interactive Glass Status Dropdown & Copy/Export Actions */}
                  <div className="lg:w-52 shrink-0 flex flex-col gap-2.5 pt-2 lg:pt-0 border-t lg:border-t-0 border-white/10">
                    <div>
                      <label
                        htmlFor={`status-${issue.id}`}
                        className="block text-xs font-semibold text-slate-200 mb-1.5"
                      >
                        Dispatch Status
                      </label>
                      <select
                        id={`status-${issue.id}`}
                        value={issue.status}
                        disabled={updatingId === issue.id}
                        onChange={(e) =>
                          handleStatusSelect(issue.id, e.target.value as IssueStatus)
                        }
                        className={`w-full rounded-xl bg-slate-950/40 backdrop-blur-md border border-white/15 px-3 py-2 text-sm font-medium text-white focus:bg-slate-950/60 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-60 cursor-pointer transition-colors ${FOCUS_RING_CLASS}`}
                      >
                        {ISSUE_STATUSES.map((statusOption) => (
                          <option key={statusOption} value={statusOption}>
                            {statusOption}
                          </option>
                        ))}
                      </select>
                      <span className="mt-1 block text-[11px] text-slate-400 tabular-nums">
                        Updated {formatRelativeTime(issue.updatedAt)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void handleCopySummary(issue)}
                        aria-label={`Copy official summary for ${issue.id}`}
                        className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${FOCUS_RING_CLASS} ${
                          isCopied
                            ? "bg-emerald-500/20 border-emerald-400/45 text-emerald-200"
                            : "bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-md border-white/10 text-slate-200 hover:text-white"
                        }`}
                      >
                        {isCopied ? (
                          <>
                            <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            <span>Copy Summary</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleExportBrief(issue)}
                        aria-label={`Export official summary text file for ${issue.id}`}
                        title="Export Brief (.txt)"
                        className={`inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-md p-1.5 text-slate-200 hover:text-white transition-colors cursor-pointer ${FOCUS_RING_CLASS}`}
                      >
                        <Download className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

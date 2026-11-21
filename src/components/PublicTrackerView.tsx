import { useDeferredValue, useMemo, useState } from "react";
import {
  Building2,
  ChevronDown,
  ChevronUp,
  MapPin,
  Search,
  Tag,
  ThumbsUp,
  Timer,
} from "lucide-react";
import {
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  type CivicIssue,
  type IssuePriority,
  type IssueStatus,
} from "../types/civic";
import {
  FOCUS_RING_CLASS,
  GoogleMapsLocationBar,
  IssueImage,
  PriorityBadge,
  ProgressSteps,
  RiskBreakdownPanel,
  StatusBadge,
  TicketIdChip,
  VerifiedResolutionBadge,
  formatRelativeTime,
} from "./Badges";

interface PublicTrackerViewProps {
  issues: CivicIssue[];
  highlightedIssueId?: string | null;
  upvotedIds?: Record<string, boolean>;
  onUpvoteIssue?: (issueId: string) => Promise<void>;
  onGoToReport: () => void;
  onNotify?: (message: string) => void;
}

export function PublicTrackerView({
  issues,
  highlightedIssueId,
  upvotedIds = {},
  onUpvoteIssue,
  onGoToReport,
  onNotify,
}: PublicTrackerViewProps) {
  const [statusFilter, setStatusFilter] = useState<"All" | IssueStatus>("All");
  const [priorityFilter, setPriorityFilter] = useState<"All" | IssuePriority>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [upvotingId, setUpvotingId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const total = issues.length;
    const reported = issues.filter((i) => i.status === "Reported").length;
    const inProgress = issues.filter((i) => i.status === "In Progress").length;
    const resolved = issues.filter((i) => i.status === "Resolved").length;
    return { total, reported, inProgress, resolved };
  }, [issues]);

  // Defer filtering so typing in the search box stays responsive on long issue lists.
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const filteredIssues = useMemo(() => {
    const q = deferredSearchQuery.trim().toLowerCase();
    return issues.filter((issue) => {
      if (statusFilter !== "All" && issue.status !== statusFilter) return false;
      if (priorityFilter !== "All" && issue.priority !== priorityFilter) return false;
      if (!q) return true;
      return (
        issue.id.toLowerCase().includes(q) ||
        issue.title.toLowerCase().includes(q) ||
        issue.location.toLowerCase().includes(q) ||
        issue.category.toLowerCase().includes(q) ||
        issue.recommendedDepartment.toLowerCase().includes(q) ||
        issue.officialSummary.toLowerCase().includes(q)
      );
    });
  }, [issues, statusFilter, priorityFilter, deferredSearchQuery]);

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleUpvoteClick = async (issueId: string) => {
    if (!onUpvoteIssue || upvotedIds[issueId] || upvotingId === issueId) return;
    setUpvotingId(issueId);
    try {
      await onUpvoteIssue(issueId);
    } finally {
      setUpvotingId(null);
    }
  };

  const resetFilters = () => {
    setStatusFilter("All");
    setPriorityFilter("All");
    setSearchQuery("");
  };

  return (
    <section aria-labelledby="tracker-heading" className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-white/10 pb-6">
        <div className="max-w-2xl">
          <h1
            id="tracker-heading"
            className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-white via-blue-100 to-blue-400 bg-clip-text text-transparent"
          >
            Public Issue Tracker
          </h1>
          <p className="mt-2.5 text-sm sm:text-base text-slate-300 leading-relaxed">
            Transparent real-time visibility into reported Chennai civic issues, community
            confirmations, departmental assignments, and resolution milestones.
          </p>
        </div>
        <button
          type="button"
          onClick={onGoToReport}
          className={`inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 border border-blue-300/40 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(59,130,246,0.35)] transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer ${FOCUS_RING_CLASS}`}
        >
          Report New Issue
        </button>
      </div>

      {/* Summary Stats Glass Bar */}
      <div
        role="region"
        aria-label="Issue summary statistics"
        className="grid grid-cols-2 lg:grid-cols-4 bg-slate-950/35 backdrop-blur-xl border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.4)] rounded-2xl divide-y lg:divide-y-0 lg:divide-x divide-white/10"
      >
        <div className="p-5">
          <div className="text-xs font-medium text-slate-300">Total Reported</div>
          <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-slate-100">
            {stats.total}
          </div>
        </div>
        <div className="p-5">
          <div className="text-xs font-medium text-slate-300">Awaiting Dispatch</div>
          <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-blue-300">
            {stats.reported}
          </div>
        </div>
        <div className="p-5">
          <div className="text-xs font-medium text-slate-300">In Progress</div>
          <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-amber-300">
            {stats.inProgress}
          </div>
        </div>
        <div className="p-5">
          <div className="text-xs font-medium text-slate-300">Resolved</div>
          <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-emerald-300">
            {stats.resolved}
          </div>
        </div>
      </div>

      {/* Search & Segmented Filter Glass Bar */}
      <div className="bg-slate-950/35 backdrop-blur-xl border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.4)] rounded-2xl p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="relative flex-1">
            <label htmlFor="tracker-search-input" className="sr-only">
              Search civic issues by neighborhood, ID, or department
            </label>
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
              aria-hidden="true"
            />
            <input
              id="tracker-search-input"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by neighborhood (Adyar, OMR, Anna Nagar), ID, or department..."
              className="w-full rounded-xl bg-slate-950/40 backdrop-blur-md border border-white/15 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-400 focus:bg-slate-950/60 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div
              role="group"
              aria-label="Filter by status"
              className="inline-flex items-center gap-1 rounded-xl bg-white/[0.04] backdrop-blur-md border border-white/10 p-1 overflow-x-auto"
            >
              {(["All", ...ISSUE_STATUSES] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  aria-pressed={statusFilter === status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer ${FOCUS_RING_CLASS} ${
                    statusFilter === status
                      ? "bg-blue-500/25 text-white shadow-[0_0_12px_rgba(59,130,246,0.25)] border border-blue-400/50"
                      : "text-slate-300 hover:text-white hover:bg-white/[0.06] border border-transparent"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            <div
              role="group"
              aria-label="Filter by priority"
              className="inline-flex items-center gap-1 rounded-xl bg-white/[0.04] backdrop-blur-md border border-white/10 p-1 overflow-x-auto"
            >
              {(["All", ...ISSUE_PRIORITIES] as const).map((priority) => (
                <button
                  key={priority}
                  type="button"
                  aria-pressed={priorityFilter === priority}
                  onClick={() => setPriorityFilter(priority)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer ${FOCUS_RING_CLASS} ${
                    priorityFilter === priority
                      ? "bg-blue-500/25 text-white shadow-[0_0_12px_rgba(59,130,246,0.25)] border border-blue-400/50"
                      : "text-slate-300 hover:text-white hover:bg-white/[0.06] border border-transparent"
                  }`}
                >
                  {priority}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Live Result Count */}
      <div aria-live="polite" className="text-xs font-medium text-slate-300 tabular-nums">
        Showing {filteredIssues.length} of {issues.length} civic issues
      </div>

      {/* Issue Glass Cards Grid */}
      {filteredIssues.length === 0 ? (
        <div className="bg-slate-950/35 backdrop-blur-xl border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.4)] rounded-2xl p-12 text-center">
          <h2 className="text-base font-semibold text-slate-100">
            No matching civic issues found
          </h2>
          <p className="mt-1.5 text-sm text-slate-300">
            Adjust your status or priority filters, or clear the search query to inspect all
            Chennai reports.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className={`mt-4 inline-flex items-center justify-center rounded-xl border border-blue-400/40 bg-blue-500/20 px-4 py-2 text-sm font-semibold text-blue-100 hover:bg-blue-500/30 transition-colors cursor-pointer ${FOCUS_RING_CLASS}`}
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredIssues.map((issue) => {
            const isHighlighted = highlightedIssueId === issue.id;
            const isExpanded = Boolean(expandedIds[issue.id]);
            const hasUpvoted = Boolean(upvotedIds[issue.id]);
            const isVerified =
              issue.status === "Resolved" &&
              Boolean(issue.resolvedVerified || issue.afterImageUrl);

            return (
              <article
                key={issue.id}
                aria-label={`Civic issue ${issue.id}: ${issue.title}`}
                className={`bg-slate-950/35 backdrop-blur-xl rounded-2xl border shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-0.5 ${
                  isHighlighted
                    ? "border-blue-400/70 ring-2 ring-blue-500/30"
                    : "border-white/15 hover:border-blue-400/40"
                }`}
              >
                {issue.status === "Resolved" && issue.afterImageUrl ? (
                  <div className="border-b border-white/10 bg-white/[0.03]">
                    <div className="px-4 py-2 bg-emerald-950/50 border-b border-emerald-400/20 flex items-center justify-between text-xs font-semibold text-emerald-100">
                      <span>Before vs. After Resolution Proof</span>
                      <VerifiedResolutionBadge />
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-white/10">
                      <div className="relative">
                        <IssueImage
                          src={issue.imageUrl}
                          alt={`Before repair photograph of ${issue.title}`}
                          className="h-48 w-full object-cover"
                        />
                        <span className="absolute bottom-2 left-2 rounded-md bg-slate-950/80 border border-white/20 px-2 py-0.5 text-[11px] font-semibold text-white">
                          Before
                        </span>
                      </div>
                      <div className="relative">
                        <IssueImage
                          src={issue.afterImageUrl}
                          alt={`After repair photograph of ${issue.title}`}
                          className="h-48 w-full object-cover"
                        />
                        <span className="absolute bottom-2 left-2 rounded-md bg-emerald-950/85 border border-emerald-400/45 px-2 py-0.5 text-[11px] font-semibold text-emerald-200">
                          After Repair
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  issue.imageUrl && (
                    <div className="border-b border-white/10 bg-white/[0.03]">
                      <IssueImage
                        src={issue.imageUrl}
                        alt={`Photograph of ${issue.title} at ${issue.location}`}
                        className="h-56 w-full object-cover"
                      />
                    </div>
                  )
                )}

                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-lg font-semibold text-slate-100 leading-snug">
                        {issue.title}
                      </h2>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <PriorityBadge priority={issue.priority} />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                      <TicketIdChip
                        ticketId={issue.id}
                        onCopied={(id) => onNotify?.(`Copied Ticket ID ${id}`)}
                      />
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 border border-amber-400/35 px-2 py-0.5 text-[11px] font-mono font-semibold tabular-nums text-amber-200">
                        <Timer className="h-3 w-3" aria-hidden="true" />
                        <span>Est. SLA: {issue.sla_hours}h</span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-blue-300 shrink-0" aria-hidden="true" />
                        <span>{issue.location}</span>
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums text-slate-400">
                        {formatRelativeTime(issue.createdAt)}
                      </span>
                    </div>

                    <GoogleMapsLocationBar
                      location={issue.location}
                      issueTitle={issue.title}
                    />

                    <p className="text-sm text-slate-300 leading-relaxed">
                      {issue.officialSummary}
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 text-xs text-slate-300 border-t border-white/10">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                        <span className="inline-flex items-center gap-1.5">
                          <Tag className="h-3.5 w-3.5 text-blue-300 shrink-0" aria-hidden="true" />
                          <span className="font-medium text-slate-100">{issue.category}</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Building2
                            className="h-3.5 w-3.5 text-amber-300 shrink-0"
                            aria-hidden="true"
                          />
                          <span className="font-medium text-slate-100">
                            {issue.recommendedDepartment}
                          </span>
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <StatusBadge status={issue.status} />
                        {isVerified && <VerifiedResolutionBadge />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="pt-3 border-t border-white/10 space-y-3 text-xs text-slate-300 leading-relaxed rounded-xl bg-white/[0.04] backdrop-blur-md p-4">
                        <div>
                          <span className="font-semibold text-slate-100">Citizen Report: </span>
                          <span>{issue.description}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-slate-100">Priority Reasoning: </span>
                          <span>{issue.priorityReasoning}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-slate-100">AI Visual Inspection: </span>
                          <span>{issue.visualAnalysis}</span>
                        </div>
                        <RiskBreakdownPanel
                          riskFactors={issue.risk_factors}
                          slaHours={issue.sla_hours}
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <ProgressSteps status={issue.status} />
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <button
                        type="button"
                        aria-pressed={hasUpvoted}
                        disabled={hasUpvoted || upvotingId === issue.id}
                        onClick={() => void handleUpvoteClick(issue.id)}
                        aria-label={`Upvote and confirm issue ${issue.id}, currently ${issue.upvotes} confirmations`}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all duration-200 whitespace-nowrap cursor-pointer disabled:cursor-default ${FOCUS_RING_CLASS} ${
                          hasUpvoted
                            ? "bg-emerald-500/20 border-emerald-400/45 text-emerald-200"
                            : "bg-blue-500/15 hover:bg-blue-500/25 border-blue-400/35 text-blue-100 hover:text-white"
                        }`}
                      >
                        <ThumbsUp className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span>
                          {hasUpvoted ? "Confirmed" : "Upvote / Confirm Issue"}
                        </span>
                        <span className="font-mono tabular-nums ml-0.5 px-1.5 py-0.5 rounded bg-white/[0.08] text-[11px]">
                          {issue.upvotes}
                        </span>
                      </button>

                      <button
                        type="button"
                        aria-expanded={isExpanded}
                        onClick={() => toggleExpanded(issue.id)}
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-blue-300 hover:text-blue-200 transition-colors cursor-pointer ${FOCUS_RING_CLASS}`}
                      >
                        <span>
                          {isExpanded ? "Hide AI Triage Details" : "Inspect AI Triage Details"}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

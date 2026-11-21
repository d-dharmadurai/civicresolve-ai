import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  FileText,
  Tag,
} from "lucide-react";
import type { CivicIssue } from "../../types/civic";
import {
  FOCUS_RING_CLASS,
  GoogleMapsLocationBar,
  IssueImage,
  PriorityBadge,
  RiskBreakdownPanel,
  StatusBadge,
  TicketIdChip,
  formatRelativeTime,
} from "../Badges";

interface TriageResultCardProps {
  issue: CivicIssue;
  onViewInTracker: (issueId: string) => void;
  onReset: () => void;
  onCopied?: (message: string) => void;
}

/** Shows the AI triage outcome (category, department, risks, SLA) for a newly logged ticket. */
export function TriageResultCard({
  issue,
  onViewInTracker,
  onReset,
  onCopied,
}: TriageResultCardProps) {
  return (
    <div className="bg-slate-950/35 backdrop-blur-xl border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.4)] rounded-2xl overflow-hidden">
      <div className="bg-emerald-500/15 border-b border-emerald-400/25 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CheckCircle2
            className="h-5 w-5 text-emerald-300 shrink-0"
            aria-hidden="true"
          />
          <h2 className="text-sm font-semibold text-emerald-100">
            AI Triage Complete &amp; Logged
          </h2>
        </div>
        <TicketIdChip
          ticketId={issue.id}
          onCopied={(id) => onCopied?.(`Copied Ticket ID ${id}`)}
        />
      </div>

      {issue.imageUrl && (
        <IssueImage
          src={issue.imageUrl}
          alt={`Photograph of ${issue.title} at ${issue.location}`}
          className="h-48 w-full object-cover border-b border-white/15"
        />
      )}

      <div className="p-6 space-y-5">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2.5">
            <PriorityBadge priority={issue.priority} />
            <StatusBadge status={issue.status} />
          </div>
          <h3 className="text-lg font-semibold text-slate-100 leading-snug">
            {issue.title}
          </h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-300">
            <span>{issue.location}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums text-slate-400">
              {formatRelativeTime(issue.createdAt)}
            </span>
          </div>
        </div>

        <GoogleMapsLocationBar
          location={issue.location}
          issueTitle={issue.title}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/10">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
              <Tag className="h-3.5 w-3.5 text-blue-300" aria-hidden="true" />
              <span>Detected Category</span>
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-100">
              {issue.category}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
              <Building2 className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
              <span>Assigned Department</span>
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-100">
              {issue.recommendedDepartment}
            </p>
          </div>
        </div>

        <RiskBreakdownPanel
          riskFactors={issue.risk_factors}
          slaHours={issue.sla_hours}
        />

        <div className="pt-4 border-t border-white/10 space-y-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mb-1">
              <FileText className="h-3.5 w-3.5 text-blue-300" aria-hidden="true" />
              <span>Official Municipal Summary</span>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed">
              {issue.officialSummary}
            </p>
          </div>

          <div>
            <div className="text-xs font-medium text-slate-400 mb-1">
              Priority Reasoning
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              {issue.priorityReasoning}
            </p>
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mb-1">
              <Eye className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
              <span>Visual Image Analysis</span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              {issue.visualAnalysis}
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => onViewInTracker(issue.id)}
            className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 border border-blue-300/40 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_16px_rgba(59,130,246,0.3)] transition-all whitespace-nowrap cursor-pointer ${FOCUS_RING_CLASS}`}
          >
            <span>View in Public Tracker</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onReset}
            className={`inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-md px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors whitespace-nowrap cursor-pointer ${FOCUS_RING_CLASS}`}
          >
            New Report
          </button>
        </div>
      </div>
    </div>
  );
}

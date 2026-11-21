import { useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  ImageOff,
  Info,
  Map as MapIcon,
  ShieldAlert,
  ShieldCheck,
  Timer,
  Wrench,
} from "lucide-react";
import type { IssuePriority, IssueStatus } from "../types/civic";

const PRIORITY_STYLES: Record<
  IssuePriority,
  {
    container: string;
    icon: typeof ShieldAlert;
  }
> = {
  Critical: {
    container:
      "bg-red-500/20 border-red-400/50 text-red-200 shadow-[0_0_14px_rgba(239,68,68,0.28)]",
    icon: ShieldAlert,
  },
  High: {
    container:
      "bg-orange-500/20 border-orange-400/50 text-orange-200 shadow-[0_0_12px_rgba(249,115,22,0.25)]",
    icon: AlertTriangle,
  },
  Medium: {
    container:
      "bg-yellow-500/20 border-yellow-400/45 text-yellow-200 shadow-[0_0_10px_rgba(234,179,8,0.2)]",
    icon: Clock,
  },
  Low: {
    container:
      "bg-emerald-500/20 border-emerald-400/45 text-emerald-200 shadow-[0_0_10px_rgba(16,185,129,0.2)]",
    icon: Info,
  },
};

const STATUS_STYLES: Record<
  IssueStatus,
  {
    container: string;
    icon: typeof AlertCircle;
  }
> = {
  Reported: {
    container: "bg-blue-500/20 border-blue-400/45 text-blue-200",
    icon: AlertCircle,
  },
  "In Progress": {
    container:
      "bg-amber-500/20 border-amber-400/45 text-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.2)]",
    icon: Wrench,
  },
  Resolved: {
    container:
      "bg-emerald-500/20 border-emerald-400/45 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.24)]",
    icon: CheckCircle2,
  },
};

export const FOCUS_RING_CLASS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#060B19]";

export function buildGoogleMapsSearchUrl(location: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

export function buildGoogleMapsEmbedUrl(location: string): string {
  return `https://maps.google.com/maps?q=${encodeURIComponent(location)}&z=15&output=embed`;
}

export function PriorityBadge({ priority }: { priority: IssuePriority }) {
  const style = PRIORITY_STYLES[priority];
  const Icon = style.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border backdrop-blur-sm px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap shrink-0 ${style.container}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{priority}</span>
    </span>
  );
}

export function StatusBadge({ status }: { status: IssueStatus }) {
  const style = STATUS_STYLES[status];
  const Icon = style.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border backdrop-blur-sm px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap shrink-0 ${style.container}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{status}</span>
    </span>
  );
}

export function VerifiedResolutionBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/60 bg-emerald-500/25 px-2.5 py-0.5 text-xs font-semibold text-emerald-100 shadow-[0_0_12px_rgba(16,185,129,0.28)] whitespace-nowrap shrink-0">
      <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>Verified Resolution</span>
    </span>
  );
}

export function TicketIdChip({
  ticketId,
  onCopied,
}: {
  ticketId: string;
  onCopied?: (ticketId: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(ticketId);
      }
      setCopied(true);
      onCopied?.(ticketId);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard failure in restricted contexts
    }
  };

  return (
    <div className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-md border border-white/10 px-2.5 py-1 transition-colors">
      <span className="font-mono text-xs font-semibold tabular-nums text-blue-300">
        {ticketId}
      </span>
      <button
        type="button"
        onClick={() => void handleCopy()}
        aria-label={`Copy Ticket ID ${ticketId}`}
        title="Copy Ticket ID"
        className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium transition-colors cursor-pointer ${FOCUS_RING_CLASS} ${
          copied
            ? "bg-emerald-500/25 text-emerald-200"
            : "text-slate-300 hover:text-white hover:bg-white/10"
        }`}
      >
        {copied ? (
          <>
            <Check className="h-3 w-3" aria-hidden="true" />
            <span>Copied</span>
          </>
        ) : (
          <>
            <Copy className="h-3 w-3" aria-hidden="true" />
            <span>Copy Ticket ID</span>
          </>
        )}
      </button>
    </div>
  );
}

export function RiskBreakdownPanel({
  riskFactors,
  slaHours,
}: {
  riskFactors: string[];
  slaHours: number;
}) {
  return (
    <div className="rounded-xl bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-md border border-white/10 p-4 space-y-2.5 transition-colors">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-100">
          AI Public Safety Risk Breakdown
        </span>
        <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 border border-amber-400/35 px-2 py-0.5 text-[11px] font-mono font-semibold tabular-nums text-amber-200">
          <Timer className="h-3 w-3" aria-hidden="true" />
          <span>Est. SLA: {slaHours}h</span>
        </span>
      </div>
      <ul className="space-y-1.5 text-xs text-slate-300 leading-relaxed">
        {riskFactors.map((risk, idx) => (
          <li key={idx} className="flex items-start gap-2">
            <span className="text-blue-400 font-bold" aria-hidden="true">
              •
            </span>
            <span>{risk}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ProgressSteps({ status }: { status: IssueStatus }) {
  const steps: IssueStatus[] = ["Reported", "In Progress", "Resolved"];
  const activeIndex = steps.indexOf(status);

  return (
    <div
      role="group"
      aria-label={`Resolution progress: ${status}`}
      className="pt-3.5 border-t border-white/10 space-y-2"
    >
      {/* Segmented 3-Step Visual Progress Bar */}
      <div className="grid grid-cols-3 gap-1.5" aria-hidden="true">
        {steps.map((step, index) => {
          const isCompleted = index < activeIndex || status === "Resolved";
          const isCurrent = index === activeIndex && status !== "Resolved";
          return (
            <div
              key={step}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                isCompleted
                  ? "bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.45)]"
                  : isCurrent
                    ? "bg-gradient-to-r from-blue-500 to-amber-400 shadow-[0_0_8px_rgba(59,130,246,0.45)]"
                    : "bg-white/10"
              }`}
            />
          );
        })}
      </div>

      {/* Step Labels */}
      <div className="grid grid-cols-3 gap-1.5 text-[11px]">
        {steps.map((step, index) => {
          const isCompleted = index < activeIndex || status === "Resolved";
          const isCurrent = index === activeIndex && status !== "Resolved";
          return (
            <div
              key={step}
              className={`flex items-center gap-1.5 ${
                index === 1 ? "justify-center" : index === 2 ? "justify-end" : "justify-start"
              }`}
            >
              <span
                aria-hidden="true"
                className={`inline-flex h-4 w-4 items-center justify-center rounded text-[10px] font-mono font-bold tabular-nums border ${
                  isCompleted
                    ? "bg-emerald-500/25 border-emerald-400/60 text-emerald-200"
                    : isCurrent
                      ? "bg-blue-500/25 border-blue-400/60 text-blue-200"
                      : "bg-white/5 border-white/15 text-slate-400"
                }`}
              >
                {isCompleted ? "✓" : index + 1}
              </span>
              <span
                className={`whitespace-nowrap ${
                  isCompleted
                    ? "font-semibold text-emerald-200"
                    : isCurrent
                      ? "font-semibold text-white"
                      : "font-medium text-slate-400"
                }`}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function GoogleMapsLocationBar({
  location,
  issueTitle,
}: {
  location: string;
  issueTitle: string;
}) {
  const [showEmbed, setShowEmbed] = useState(false);

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={buildGoogleMapsSearchUrl(location)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`View ${issueTitle} location (${location}) on Google Maps in a new tab`}
          className={`inline-flex items-center gap-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 border border-blue-400/30 px-2.5 py-1 text-xs font-medium text-blue-200 hover:text-white transition-colors whitespace-nowrap ${FOCUS_RING_CLASS}`}
        >
          <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>View on Google Maps</span>
        </a>

        <button
          type="button"
          onClick={() => setShowEmbed((prev) => !prev)}
          aria-expanded={showEmbed}
          aria-label={`${showEmbed ? "Hide" : "Preview"} interactive Google Map for ${location}`}
          className={`inline-flex items-center gap-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-md border border-white/10 px-2.5 py-1 text-xs font-medium text-slate-200 hover:text-white transition-colors whitespace-nowrap cursor-pointer ${FOCUS_RING_CLASS}`}
        >
          <MapIcon className="h-3.5 w-3.5 shrink-0 text-blue-300" aria-hidden="true" />
          <span>{showEmbed ? "Hide Map" : "Preview Map"}</span>
        </button>
      </div>

      {showEmbed && (
        <div className="overflow-hidden rounded-xl border border-white/15 bg-slate-950/40 backdrop-blur-md">
          <iframe
            title={`Google Maps preview for ${location}`}
            src={buildGoogleMapsEmbedUrl(location)}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="h-44 w-full border-0"
          />
        </div>
      )}
    </div>
  );
}

export function IssueImage({
  src,
  alt,
  className = "h-52 w-full object-cover",
}: {
  src: string | null;
  alt: string;
  className?: string;
}) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        role="img"
        aria-label={`No photograph attached for ${alt}`}
        className={`flex flex-col items-center justify-center bg-white/5 text-white/50 ${className}`}
      >
        <ImageOff className="h-6 w-6 mb-1.5" aria-hidden="true" />
        <span className="text-xs font-medium text-white/60">No photo attached</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
}

export function formatRelativeTime(isoDate: string): string {
  const timestamp = new Date(isoDate).getTime();
  if (Number.isNaN(timestamp)) return "Just now";
  const diffMs = Date.now() - timestamp;
  const diffMins = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

import { CheckCircle2, Mic, ShieldAlert, Sparkles, type LucideIcon } from "lucide-react";

interface StepConfig {
  number: number;
  title: string;
  description: string;
  Icon: LucideIcon;
  badgeClass: string;
  iconClass: string;
  hoverBorderClass: string;
}

const STEPS: StepConfig[] = [
  {
    number: 1,
    title: "Voice (Tamil/English), GPS & Photo Auto-Draft",
    description:
      "Speak in English or Tamil, capture live GPS coordinates, or drop a photo for instant AI complaint drafting and duplicate checks.",
    Icon: Mic,
    badgeClass:
      "from-blue-500 to-blue-600 text-white shadow-[0_0_16px_rgba(59,130,246,0.45)]",
    iconClass: "text-blue-300",
    hoverBorderClass: "hover:border-blue-400/35",
  },
  {
    number: 2,
    title: "Safety Risk Breakdown & SLA Estimation",
    description:
      "Gemini identifies specific public safety risks, sets resolution SLA hours, and grades urgency from Critical to Low.",
    Icon: ShieldAlert,
    badgeClass:
      "from-amber-400 to-orange-500 text-slate-950 shadow-[0_0_16px_rgba(245,158,11,0.4)]",
    iconClass: "text-amber-300",
    hoverBorderClass: "hover:border-amber-400/35",
  },
  {
    number: 3,
    title: "Trackable Ticket ID & Verified Resolution",
    description:
      "Receive a trackable CR-2026 ticket ID and monitor Before vs. After repair proof in the Public Issue Tracker.",
    Icon: CheckCircle2,
    badgeClass:
      "from-emerald-400 to-emerald-600 text-slate-950 shadow-[0_0_16px_rgba(16,185,129,0.4)]",
    iconClass: "text-emerald-300",
    hoverBorderClass: "hover:border-emerald-400/35",
  },
];

/** Placeholder shown beside the form until a report has been triaged. */
export function TriageStepper() {
  return (
    <div className="bg-slate-950/35 backdrop-blur-xl border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.4)] rounded-2xl p-6 sm:p-7 space-y-6">
      <div className="space-y-2.5">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/15 border border-blue-400/35 px-2.5 py-1 text-[11px] font-semibold text-blue-200">
          <Sparkles className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
          <span>Powered by Gemini</span>
        </div>
        <h2 className="text-lg font-bold text-slate-100">How AI Triage Works</h2>
        <p className="text-sm text-slate-300 leading-relaxed">
          Every citizen submission is evaluated using multimodal Gemini analysis to standardize
          incident dispatch across Chennai municipal zones.
        </p>
      </div>

      <ol className="relative space-y-5 before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-blue-500/80 before:via-amber-400/60 before:to-emerald-400/80">
        {STEPS.map(({ number, title, description, Icon, badgeClass, iconClass, hoverBorderClass }) => (
          <li key={number} className="relative pl-12">
            <span
              className={`absolute left-0 top-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br text-xs font-mono font-bold ${badgeClass}`}
            >
              {number}
            </span>
            <div
              className={`rounded-xl bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-md border border-white/10 p-4 space-y-1.5 transition-all duration-300 ${hoverBorderClass}`}
            >
              <div className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <Icon className={`h-4 w-4 shrink-0 ${iconClass}`} aria-hidden="true" />
                <span>{title}</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{description}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="rounded-xl bg-amber-500/10 backdrop-blur-md border border-amber-400/25 px-4 py-3 text-xs text-amber-100/90 leading-relaxed">
        Tip: Click <strong className="font-semibold text-amber-300">Demo Sample Fill</strong> above
        to populate a realistic Mylapore hazard with site photo evidence in one click.
      </div>
    </div>
  );
}

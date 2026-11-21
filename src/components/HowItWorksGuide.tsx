import { Building2, Camera, CheckCircle2, Sparkles } from "lucide-react";

export const WORKFLOW_STEPS = [
  {
    step: "Step 1",
    title: "Report Issue",
    detail: "Photo + Voice + GPS Location",
    description:
      "Snap a site photo, speak in English or Tamil, or pin your live GPS coordinates on a Chennai street landmark.",
    icon: Camera,
    badgeGradient: "from-blue-500 to-blue-600 shadow-[0_0_14px_rgba(59,130,246,0.45)]",
    accent: "text-blue-300 bg-blue-500/15 border-blue-400/35",
  },
  {
    step: "Step 2",
    title: "Gemini AI Triage",
    detail: "Category, Priority & Risk SLA",
    description:
      "Multimodal Gemini 2.5 Flash classifies the defect, identifies public safety risks, and estimates resolution SLA.",
    icon: Sparkles,
    badgeGradient: "from-amber-400 to-orange-500 shadow-[0_0_14px_rgba(245,158,11,0.4)]",
    accent: "text-amber-300 bg-amber-500/15 border-amber-400/35",
  },
  {
    step: "Step 3",
    title: "Department Dispatch",
    detail: "GCC Municipal Routing",
    description:
      "Trackable CR-2026 ticket routes directly to Roads, Electrical, Water, Waste, Parks, or Traffic teams.",
    icon: Building2,
    badgeGradient: "from-sky-400 to-blue-600 shadow-[0_0_14px_rgba(56,189,248,0.35)]",
    accent: "text-sky-300 bg-sky-500/15 border-sky-400/35",
  },
  {
    step: "Step 4",
    title: "Live Tracking & Resolution",
    detail: "Before vs. After Proof",
    description:
      "Neighbors confirm urgent issues and monitor Reported → In Progress → Verified Resolution proof.",
    icon: CheckCircle2,
    badgeGradient: "from-emerald-400 to-emerald-600 shadow-[0_0_14px_rgba(16,185,129,0.4)]",
    accent: "text-emerald-300 bg-emerald-500/15 border-emerald-400/35",
  },
];

export function HowItWorksStrip() {
  return (
    <div
      role="region"
      aria-label="How CivicResolve works in 4 steps"
      className="bg-slate-950/35 backdrop-blur-xl border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.4)] rounded-2xl p-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {WORKFLOW_STEPS.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={item.step}
              className="flex items-center gap-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-md border border-white/10 px-3.5 py-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-400/30"
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${item.accent}`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-mono font-semibold uppercase tracking-wide text-slate-400">
                  {idx + 1}. {item.step}
                </div>
                <div className="text-xs font-semibold text-slate-100 truncate">
                  {item.title}
                </div>
                <div className="text-[11px] text-slate-300 truncate leading-relaxed">
                  {item.detail}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

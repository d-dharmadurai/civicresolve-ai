import { useEffect } from "react";
import { Sparkles, X } from "lucide-react";
import { FOCUS_RING_CLASS } from "./Badges";
import { WORKFLOW_STEPS } from "./HowItWorksGuide";

export function HowItWorksModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#060B19]/75 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="how-it-works-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-slate-950/70 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.55)] overflow-hidden"
      >
        <div className="flex items-center justify-between border-b border-white/15 px-6 py-4 bg-white/[0.04]">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/15 border border-blue-400/35 px-2.5 py-0.5 text-[11px] font-semibold text-blue-200">
              <Sparkles className="h-3 w-3 text-amber-300" aria-hidden="true" />
              <span>Powered by Gemini</span>
            </div>
            <h2
              id="how-it-works-modal-title"
              className="text-lg font-bold text-slate-100"
            >
              How CivicResolve Works
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close How It Works guide"
            className={`rounded-lg bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 p-2 text-slate-300 hover:text-white transition-colors cursor-pointer ${FOCUS_RING_CLASS}`}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6">
          <ol className="relative space-y-5 before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-blue-500/70 before:via-amber-400/60 before:to-emerald-400/70">
            {WORKFLOW_STEPS.map((item, idx) => {
              const Icon = item.icon;
              return (
                <li key={item.step} className="relative pl-12">
                  <div
                    className={`absolute left-0 top-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br text-xs font-mono font-bold text-white ${item.badgeGradient}`}
                  >
                    {idx + 1}
                  </div>
                  <div className="rounded-xl bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-md border border-white/10 p-3.5 space-y-1 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                        <Icon className="h-4 w-4 text-blue-300" aria-hidden="true" />
                        <span>{item.title}</span>
                      </h3>
                      <span className="text-[11px] font-medium text-amber-300">
                        {item.detail}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="border-t border-white/15 px-6 py-4 flex justify-end bg-white/[0.04]">
          <button
            type="button"
            onClick={onClose}
            className={`rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 border border-blue-300/40 px-5 py-2 text-xs font-semibold text-white shadow-[0_0_16px_rgba(59,130,246,0.35)] transition-all cursor-pointer ${FOCUS_RING_CLASS}`}
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}

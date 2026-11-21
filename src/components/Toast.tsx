import { CheckCircle2, X } from "lucide-react";
import { FOCUS_RING_CLASS } from "./Badges";

interface ToastProps {
  text: string;
  onDismiss: () => void;
}

/** Transient confirmation banner announced politely to screen readers. */
export function Toast({ text, onDismiss }: ToastProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 right-5 z-50 animate-toast-in max-w-sm rounded-xl bg-slate-950/75 backdrop-blur-xl border border-blue-400/40 px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.45)] flex items-center gap-3 text-xs font-medium text-slate-100"
    >
      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden="true" />
      <span className="flex-1">{text}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className={`rounded p-0.5 text-slate-400 hover:text-white transition-colors cursor-pointer ${FOCUS_RING_CLASS}`}
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

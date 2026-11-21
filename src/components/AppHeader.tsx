import { Award, HelpCircle, ShieldCheck, Sparkles } from "lucide-react";
import { FOCUS_RING_CLASS } from "./Badges";

export type ActiveTab = "report" | "tracker" | "admin";

const NAV_TABS: ReadonlyArray<{ id: ActiveTab; label: string }> = [
  { id: "report", label: "Report an Issue" },
  { id: "tracker", label: "Public Issue Tracker" },
  { id: "admin", label: "Admin Dashboard" },
];

interface AppHeaderProps {
  activeTab: ActiveTab;
  civicPoints: number;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenGuide: () => void;
}

const TAB_VARIANTS = {
  desktop: {
    base: "px-3.5 py-2 text-sm rounded-xl transition-all duration-200",
    active:
      "bg-blue-500/25 border-blue-400/50 text-white font-semibold shadow-[0_0_16px_rgba(59,130,246,0.28)]",
    idle: "bg-white/5 hover:bg-white/10 border-white/10 text-slate-200 hover:text-white",
  },
  mobile: {
    base: "px-3 py-1.5 text-xs rounded-lg transition-colors",
    active: "bg-blue-500/25 border-blue-400/50 text-white font-semibold",
    idle: "bg-white/[0.04] border-white/10 text-slate-300 hover:bg-white/[0.08]",
  },
} as const;

function TabButtons({
  variant,
  activeTab,
  onSelectTab,
}: {
  variant: keyof typeof TAB_VARIANTS;
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
}) {
  const styles = TAB_VARIANTS[variant];
  return (
    <>
      {NAV_TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectTab(tab.id)}
            aria-current={isActive ? "page" : undefined}
            className={`font-medium border whitespace-nowrap shrink-0 cursor-pointer ${styles.base} ${FOCUS_RING_CLASS} ${
              isActive ? styles.active : styles.idle
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </>
  );
}

function GuideButton({ variant, onClick }: { variant: keyof typeof TAB_VARIANTS; onClick: () => void }) {
  const isDesktop = variant === "desktop";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center font-medium border border-white/10 text-slate-200 whitespace-nowrap shrink-0 cursor-pointer ${FOCUS_RING_CLASS} ${
        isDesktop
          ? "gap-1.5 px-3 py-2 text-sm rounded-xl bg-white/5 hover:bg-white/10 hover:text-white transition-all duration-200"
          : "gap-1 px-3 py-1.5 text-xs rounded-lg bg-white/[0.04] hover:bg-white/[0.08]"
      }`}
    >
      <HelpCircle className={`text-amber-400 ${isDesktop ? "h-4 w-4" : "h-3.5 w-3.5"}`} aria-hidden="true" />
      <span>How It Works</span>
    </button>
  );
}

/** Sticky glass navigation bar with brand, primary tabs, civic points and a quick CTA. */
export function AppHeader({ activeTab, civicPoints, onSelectTab, onOpenGuide }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-slate-950/35 border-b border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.28)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => onSelectTab("report")}
          className={`inline-flex items-center gap-2.5 font-display text-xl font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0 cursor-pointer rounded-xl px-1.5 py-1 transition-opacity hover:opacity-95 ${FOCUS_RING_CLASS}`}
        >
          <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 border border-blue-300/40 shadow-[0_0_16px_rgba(59,130,246,0.45)]">
            <ShieldCheck className="h-4 w-4 text-white" aria-hidden="true" />
            <Sparkles
              className="absolute -top-1 -right-1 h-3 w-3 text-amber-300 drop-shadow"
              aria-hidden="true"
            />
          </span>
          <span className="bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
            CivicResolve
          </span>
        </button>

        <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-2">
          <TabButtons variant="desktop" activeTab={activeTab} onSelectTab={onSelectTab} />
          <GuideButton variant="desktop" onClick={onOpenGuide} />
        </nav>

        <div className="flex items-center gap-2.5 shrink-0">
          <div
            aria-label={`Community Impact: ${civicPoints} Civic Points earned this session`}
            title="Earn +50 pts per report and +10 pts per community upvote"
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500/15 border border-amber-400/35 backdrop-blur-md px-3 py-1.5 text-xs font-semibold text-amber-100 whitespace-nowrap shrink-0"
          >
            <Award className="h-3.5 w-3.5 text-amber-400 shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">Community Impact:</span>
            <span className="font-mono font-bold tabular-nums text-amber-200">{civicPoints} pts</span>
          </div>

          <button
            type="button"
            onClick={() => onSelectTab(activeTab === "report" ? "tracker" : "report")}
            className={`rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 border border-blue-300/40 px-4 py-2 text-xs font-semibold text-white shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer ${FOCUS_RING_CLASS}`}
          >
            {activeTab === "report" ? "View Tracker" : "New Report"}
          </button>
        </div>
      </div>

      <nav
        aria-label="Mobile navigation"
        className="md:hidden border-t border-white/10 bg-slate-950/45 backdrop-blur-lg px-4 py-2 flex items-center gap-2 overflow-x-auto"
      >
        <TabButtons variant="mobile" activeTab={activeTab} onSelectTab={onSelectTab} />
        <GuideButton variant="mobile" onClick={onOpenGuide} />
      </nav>
    </header>
  );
}

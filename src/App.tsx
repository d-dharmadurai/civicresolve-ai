import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { AppHeader, type ActiveTab } from "./components/AppHeader";
import { LiveAuroraBackground } from "./components/LiveAuroraBackground";
import { ReportIssueView } from "./components/ReportIssueView";
import { Toast } from "./components/Toast";
import { SEED_ISSUES } from "./data/seedIssues";
import type { CivicIssue, IssueStatus } from "./types/civic";
import { fetchIssues, updateIssueStatus, upvoteIssue } from "./utils/api";

// Only the landing "Report" view ships in the main bundle; everything else loads on demand.
const PublicTrackerView = lazy(() =>
  import("./components/PublicTrackerView").then((m) => ({ default: m.PublicTrackerView }))
);
const AdminDashboardView = lazy(() =>
  import("./components/AdminDashboardView").then((m) => ({ default: m.AdminDashboardView }))
);
const HowItWorksModal = lazy(() =>
  import("./components/HowItWorksModal").then((m) => ({ default: m.HowItWorksModal }))
);
const CivicAssistantWidget = lazy(() =>
  import("./components/CivicAssistantWidget").then((m) => ({ default: m.CivicAssistantWidget }))
);

const TOAST_DURATION_MS = 3200;
const POINTS_PER_REPORT = 50;
const POINTS_PER_UPVOTE = 10;

interface ToastMessage {
  id: number;
  text: string;
}

function ViewFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center py-24 text-sm text-slate-300"
    >
      Loading…
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("report");
  const [issues, setIssues] = useState<CivicIssue[]>(SEED_ISSUES);
  const [highlightedIssueId, setHighlightedIssueId] = useState<string | null>(null);
  const [upvotedIds, setUpvotedIds] = useState<Record<string, boolean>>({});
  const [civicPoints, setCivicPoints] = useState(0);
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const toastTimerRef = useRef<number | null>(null);
  // Points are awarded at most once per ticket/upvote. Tracking that in refs (instead of
  // inside state updaters) keeps updaters pure, so StrictMode double-invocation is harmless.
  const rewardedReportsRef = useRef(new Set<string>());
  const rewardedUpvotesRef = useRef(new Set<string>());

  const showToast = useCallback((text: string) => {
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    const id = Date.now();
    setToast({ id, text });
    toastTimerRef.current = window.setTimeout(() => {
      setToast((prev) => (prev?.id === id ? null : prev));
    }, TOAST_DURATION_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchIssues(controller.signal)
      .then(setIssues)
      .catch(() => {
        // Keep the seeded issues when the initial request fails or is aborted.
      });
    return () => controller.abort();
  }, []);

  const replaceIssue = useCallback((updated: CivicIssue) => {
    setIssues((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
  }, []);

  const handleIssueCreated = useCallback(
    (newIssue: CivicIssue) => {
      setIssues((prev) =>
        prev.some((item) => item.id === newIssue.id) ? prev : [newIssue, ...prev]
      );
      if (!rewardedReportsRef.current.has(newIssue.id)) {
        rewardedReportsRef.current.add(newIssue.id);
        setCivicPoints((points) => points + POINTS_PER_REPORT);
      }
      setHighlightedIssueId(newIssue.id);
      showToast(`Ticket ${newIssue.id} triaged & logged (+${POINTS_PER_REPORT} Civic Points)`);
    },
    [showToast]
  );

  const handleNavigateToTracker = useCallback((issueId?: string) => {
    if (issueId) setHighlightedIssueId(issueId);
    setActiveTab("tracker");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleUpdateStatus = useCallback(
    async (issueId: string, newStatus: IssueStatus, afterImageUrl?: string | null) => {
      replaceIssue(await updateIssueStatus(issueId, newStatus, afterImageUrl));
      showToast(
        afterImageUrl
          ? `After-repair proof saved for ${issueId}`
          : `${issueId} marked as ${newStatus}`
      );
    },
    [replaceIssue, showToast]
  );

  const handleUpvoteIssue = useCallback(
    async (issueId: string) => {
      replaceIssue(await upvoteIssue(issueId));
      setUpvotedIds((prev) => ({ ...prev, [issueId]: true }));
      if (!rewardedUpvotesRef.current.has(issueId)) {
        rewardedUpvotesRef.current.add(issueId);
        setCivicPoints((points) => points + POINTS_PER_UPVOTE);
      }
      showToast(`Confirmed issue ${issueId} (+${POINTS_PER_UPVOTE} Civic Points)`);
    },
    [replaceIssue, showToast]
  );

  return (
    <div className="relative min-h-screen flex flex-col text-slate-100">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-blue-500 focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white focus:shadow-xl"
      >
        Skip to main content
      </a>

      <LiveAuroraBackground />

      <AppHeader
        activeTab={activeTab}
        civicPoints={civicPoints}
        onSelectTab={setActiveTab}
        onOpenGuide={() => setIsHowItWorksOpen(true)}
      />

      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 focus:outline-none"
      >
        {activeTab === "report" && (
          <ReportIssueView
            existingIssues={issues}
            upvotedIds={upvotedIds}
            onUpvoteIssue={handleUpvoteIssue}
            onIssueCreated={handleIssueCreated}
            onNavigateToTracker={handleNavigateToTracker}
            onNotify={showToast}
          />
        )}
        <Suspense fallback={<ViewFallback />}>
          {activeTab === "tracker" && (
            <PublicTrackerView
              issues={issues}
              highlightedIssueId={highlightedIssueId}
              upvotedIds={upvotedIds}
              onUpvoteIssue={handleUpvoteIssue}
              onGoToReport={() => setActiveTab("report")}
              onNotify={showToast}
            />
          )}
          {activeTab === "admin" && (
            <AdminDashboardView
              issues={issues}
              onUpdateStatus={handleUpdateStatus}
              onNotify={showToast}
            />
          )}
        </Suspense>
      </main>

      <footer className="border-t border-white/15 bg-slate-950/35 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-300">
          <span>CivicResolve Municipal Triage Portal · Chennai</span>
          <span>Greater Chennai Corporation Departmental Routing</span>
        </div>
      </footer>

      {toast && <Toast text={toast.text} onDismiss={() => setToast(null)} />}

      <Suspense fallback={null}>
        {isHowItWorksOpen && (
          <HowItWorksModal isOpen={isHowItWorksOpen} onClose={() => setIsHowItWorksOpen(false)} />
        )}
        <CivicAssistantWidget />
      </Suspense>
    </div>
  );
}

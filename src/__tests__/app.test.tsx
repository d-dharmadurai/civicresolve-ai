// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminDashboardView, sortIssuesByPriority } from "../components/AdminDashboardView";
import { PublicTrackerView } from "../components/PublicTrackerView";
import { ReportIssueView } from "../components/ReportIssueView";
import { SEED_ISSUES } from "../data/seedIssues";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("PublicTrackerView Filtering, Stats, Upvotes, & Google Maps Integration", () => {
  it("renders summary metrics, filters by status/priority/search, supports upvotes, and provides Google Maps links", async () => {
    const onGoToReport = vi.fn();
    const onUpvoteIssue = vi.fn().mockResolvedValue(undefined);
    render(
      <PublicTrackerView
        issues={SEED_ISSUES}
        highlightedIssueId={null}
        onUpvoteIssue={onUpvoteIssue}
        onGoToReport={onGoToReport}
      />
    );

    // Summary stats: 5 total, 2 Reported, 2 In Progress, 1 Resolved
    expect(screen.getByText("Showing 5 of 5 civic issues")).toBeInTheDocument();

    // Upvote button works on issue cards
    const upvoteBtn = screen.getByRole("button", {
      name: /upvote and confirm issue CR-2026-1041/i,
    });
    fireEvent.click(upvoteBtn);
    await waitFor(() => {
      expect(onUpvoteIssue).toHaveBeenCalledWith("CR-2026-1041");
    });

    // Google Maps links exist for each issue
    const mapLinks = screen.getAllByRole("link", { name: /view .* on google maps/i });
    expect(mapLinks).toHaveLength(5);
    expect(mapLinks[0].getAttribute("href")).toContain(
      "https://www.google.com/maps/search/?api=1&query="
    );

    // Copy Ticket ID button copies CR-2026-1041
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    fireEvent.click(screen.getByRole("button", { name: /copy ticket id CR-2026-1041/i }));
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("CR-2026-1041");
    });

    // Expand AI Triage Details to inspect Risk Breakdown & SLA
    const inspectButtons = screen.getAllByRole("button", { name: /inspect ai triage details/i });
    fireEvent.click(inspectButtons[0]);
    expect(screen.getByText(/ai public safety risk breakdown/i)).toBeInTheDocument();

    // Filter by Status = Resolved -> 1 issue (T. Nagar)
    fireEvent.click(screen.getByRole("button", { name: "Resolved" }));
    expect(screen.getByText("Showing 1 of 5 civic issues")).toBeInTheDocument();
    expect(
      screen.getByText("Overflowing GCC Waste Compactor Bin on Pedestrian Sidewalk")
    ).toBeInTheDocument();

    // Reset Status to All, filter Priority = Critical -> 2 issues (Adyar & OMR)
    const statusGroup = screen.getByRole("group", { name: "Filter by status" });
    fireEvent.click(statusGroup.querySelector("button")!); // "All"
    fireEvent.click(screen.getByRole("button", { name: "Critical" }));
    expect(screen.getByText("Showing 2 of 5 civic issues")).toBeInTheDocument();

    // Search filter narrows down to Adyar
    const searchInput = screen.getByRole("searchbox", { name: /search civic issues/i });
    fireEvent.change(searchInput, { target: { value: "Adyar" } });
    expect(screen.getByText("Showing 1 of 5 civic issues")).toBeInTheDocument();
    expect(
      screen.getByText("Leaning Streetlight Pole with Exposed Live Wires")
    ).toBeInTheDocument();

    // Interactive Map Preview button expands an embedded Google Map iframe
    const previewBtn = screen.getByRole("button", { name: /preview interactive google map/i });
    fireEvent.click(previewBtn);
    const iframe = screen.getByTitle(/google maps preview for/i);
    expect(iframe).toBeInTheDocument();
    expect(iframe.getAttribute("src")).toContain("https://maps.google.com/maps?q=");
  });

  it("renders Verified Resolution badge and Before vs. After comparison when afterImageUrl is present", () => {
    const verifiedIssue = {
      ...SEED_ISSUES[4],
      status: "Resolved" as const,
      afterImageUrl: "https://example.com/after-repair.jpg",
      resolvedVerified: true,
    };

    render(
      <PublicTrackerView
        issues={[verifiedIssue]}
        onGoToReport={vi.fn()}
      />
    );

    expect(screen.getByText("Before vs. After Resolution Proof")).toBeInTheDocument();
    expect(screen.getAllByText("Verified Resolution").length).toBeGreaterThan(0);
    expect(screen.getByText("Before")).toBeInTheDocument();
    expect(screen.getByText("After Repair")).toBeInTheDocument();
  });
});

describe("AdminDashboardView Priority Sorting, Workload Summary, CSV Export, & Status Transitions", () => {
  it("sorts Critical issues before High, Medium, and Low", () => {
    const reversed = [...SEED_ISSUES].reverse();
    const sorted = sortIssuesByPriority(reversed);
    expect(sorted.map((i) => i.priority)).toEqual([
      "Critical",
      "Critical",
      "High",
      "Medium",
      "Low",
    ]);
  });

  it("displays workload breakdown, Export CSV, copy summary, and status dropdown", async () => {
    const onUpdateStatus = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    const createObjectURL = vi.fn().mockReturnValue("blob:csv-mock");
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });

    render(<AdminDashboardView issues={SEED_ISSUES} onUpdateStatus={onUpdateStatus} />);

    expect(screen.getByText("Priority Breakdown")).toBeInTheDocument();
    expect(screen.getByText("Department Workload")).toBeInTheDocument();

    // Export CSV button triggers blob download
    fireEvent.click(screen.getByRole("button", { name: /export csv/i }));
    expect(createObjectURL).toHaveBeenCalledTimes(1);

    // 3 unresolved Critical/High issues in SEED_ISSUES (2 Critical + 1 High)
    expect(
      screen.getByText(/unresolved Critical or High priority issues require immediate dispatch/i)
    ).toBeInTheDocument();

    // Copy summary copies formatted brief
    const copyBtn = screen.getByRole("button", {
      name: /copy official summary for CR-2026-1041/i,
    });
    fireEvent.click(copyBtn);
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(expect.stringContaining("CR-2026-1041"));
    });

    // Toggle urgent filter
    fireEvent.click(screen.getByRole("button", { name: "Filter Urgent Unresolved" }));
    expect(screen.getByText("Showing 3 of 5 complaints")).toBeInTheDocument();

    // Change status dropdown on CR-2026-1041 from Reported -> In Progress
    const statusSelect = screen.getAllByLabelText("Dispatch Status")[0] as HTMLSelectElement;
    expect(statusSelect.value).toBe("Reported");

    fireEvent.change(statusSelect, { target: { value: "In Progress" } });
    await waitFor(() => {
      expect(onUpdateStatus).toHaveBeenCalledWith("CR-2026-1041", "In Progress");
    });
  });
});

describe("ReportIssueView Form Accessibility, Voice Report, GPS, Duplicate Alert, & Demo Fill", () => {
  it("renders 4-step workflow strip, Voice/GPS controls, detects duplicates, and populates Demo Sample Fill", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
      })
    );

    render(
      <ReportIssueView
        existingIssues={SEED_ISSUES}
        onUpvoteIssue={vi.fn().mockResolvedValue(undefined)}
        onIssueCreated={vi.fn()}
        onNavigateToTracker={vi.fn()}
      />
    );

    expect(
      screen.getByRole("region", { name: /how civicresolve works in 4 steps/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /use current gps location/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /voice report/i })
    ).toBeInTheDocument();

    const titleInput = screen.getByLabelText(/issue title/i) as HTMLInputElement;
    const locationInput = screen.getByLabelText(/location \/ street landmark/i) as HTMLInputElement;
    const descInput = screen.getByLabelText(/detailed description/i) as HTMLTextAreaElement;

    // Typing matching title & location triggers Duplicate Issue Alert
    fireEvent.change(titleInput, { target: { value: "Leaning streetlight pole" } });
    fireEvent.change(locationInput, { target: { value: "LB Road, Adyar" } });
    expect(
      screen.getByText(/similar issue already reported nearby/i)
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /demo sample fill/i }));

    await waitFor(() => {
      expect(titleInput.value).toContain("Collapsed Roadside Drainage Slab");
    });
    expect(locationInput.value).toContain("Mylapore, Chennai");
    expect(descInput.value.length).toBeGreaterThan(30);
  });
});

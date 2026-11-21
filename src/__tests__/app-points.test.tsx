// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import { SEED_ISSUES } from "../data/seedIssues";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("App civic points", () => {
  it("awards +10 points exactly once per upvote, even under StrictMode double-invocation", async () => {
    const target = SEED_ISSUES[0];
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        return { ok: true, status: 200, json: async () => ({ issue: { ...target, upvotes: target.upvotes + 1 } }) };
      }
      return { ok: true, status: 200, json: async () => ({ issues: SEED_ISSUES }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    window.scrollTo = vi.fn();

    render(
      <StrictMode>
        <App />
      </StrictMode>
    );

    expect(screen.getByLabelText(/Community Impact: 0 Civic Points/i)).toBeInTheDocument();

    // Lazy-loaded tracker view
    fireEvent.click(screen.getAllByRole("button", { name: "Public Issue Tracker" })[0]);
    const upvote = await screen.findByRole(
      "button",
      { name: new RegExp(`upvote and confirm issue ${target.id}`, "i") },
      { timeout: 5000 }
    );
    fireEvent.click(upvote);

    await waitFor(() => {
      expect(screen.getByLabelText(/Community Impact: 10 Civic Points/i)).toBeInTheDocument();
    });
  });
});

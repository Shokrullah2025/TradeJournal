import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PreMarketBriefing from "./PreMarketBriefing";

// PreMarketBriefing renders a dismissible daily summary built from trade
// history via computeBriefingStats. It uses the real `new Date()` internally,
// so we feed past-dated (2024) trades that are always "history" relative to now.
const trade = (monthIdx, day, hour, pnl, instrument = "ES", status = "closed") => ({
  id: `${monthIdx}-${day}-${hour}-${pnl}`,
  status,
  exit_date: new Date(2024, monthIdx, day, hour, 0, 0),
  pnl,
  instrument,
});

// Five closed trades clears the minimum-history threshold so the card renders.
const enoughTrades = [
  trade(0, 8, 10, 100, "ES"),
  trade(0, 9, 10, 60, "NQ"),
  trade(0, 10, 11, -20, "ES"),
  trade(0, 11, 14, 40, "NQ"),
  trade(0, 12, 10, 25, "ES"),
  trade(0, 20, 9, 0, "CL", "open"),
];

describe("PreMarketBriefing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: nothing dismissed
    localStorage.getItem.mockReturnValue?.(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the briefing with enough history (happy path)", () => {
    render(<PreMarketBriefing trades={enoughTrades} user={{ firstName: "Sam" }} />);

    expect(screen.getByTestId("pre-market-briefing")).toBeInTheDocument();
    expect(screen.getByTestId("briefing-open-positions-value")).toBeInTheDocument();
  });

  it("greets the user by first name", () => {
    render(<PreMarketBriefing trades={enoughTrades} user={{ firstName: "Sam" }} />);

    expect(screen.getByRole("heading", { level: 2 }).textContent).toContain("Sam");
  });

  it("falls back to the email prefix when no name is set (edge case)", () => {
    render(
      <PreMarketBriefing
        trades={enoughTrades}
        user={{ email: "trader42@example.com" }}
      />
    );

    expect(screen.getByRole("heading", { level: 2 }).textContent).toContain(
      "trader42"
    );
  });

  it("falls back to 'trader' when there is no user (edge case)", () => {
    render(<PreMarketBriefing trades={enoughTrades} user={null} />);

    expect(screen.getByRole("heading", { level: 2 }).textContent).toContain(
      "trader"
    );
  });

  it("renders nothing when there is too little history (edge case)", () => {
    render(
      <PreMarketBriefing
        trades={[trade(0, 8, 10, 100), trade(0, 9, 10, 50)]}
        user={{ firstName: "Sam" }}
      />
    );

    expect(screen.queryByTestId("pre-market-briefing")).not.toBeInTheDocument();
  });

  it("renders nothing when there are no trades at all (edge case)", () => {
    render(<PreMarketBriefing trades={[]} user={{ firstName: "Sam" }} />);

    expect(screen.queryByTestId("pre-market-briefing")).not.toBeInTheDocument();
  });

  it("dismisses the card when the close button is clicked", () => {
    render(<PreMarketBriefing trades={enoughTrades} user={{ firstName: "Sam" }} />);

    expect(screen.getByTestId("pre-market-briefing")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("pre-market-briefing-dismiss-btn"));

    expect(screen.queryByTestId("pre-market-briefing")).not.toBeInTheDocument();
    expect(localStorage.setItem).toHaveBeenCalled();
  });

  it("still renders if localStorage access throws (error/edge resilience)", () => {
    const original = global.localStorage;
    global.localStorage = {
      getItem: () => {
        throw new Error("storage blocked");
      },
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };

    try {
      render(
        <PreMarketBriefing trades={enoughTrades} user={{ firstName: "Sam" }} />
      );
      expect(screen.getByTestId("pre-market-briefing")).toBeInTheDocument();
    } finally {
      global.localStorage = original;
    }
  });
});

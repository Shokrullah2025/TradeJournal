import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MobileSessionCard from "./MobileSessionCard";

const baseSession = {
  id: "abc",
  name: "Morning NQ scalps",
  symbol: "NQ",
  instrumentName: "NASDAQ 100 Futures",
  timeframe: "15m",
  strategy: "ICT",
  setup: "FVG",
  createdAt: "2026-06-20T12:00:00Z",
  initialBalance: 10000,
  endingBalance: 10500,
  trades: [{ pnl: 500 }],
  tags: ["win", "discipline"],
  note: "<p>Stuck to the plan</p>",
};

describe("MobileSessionCard", () => {
  it("renders the name, symbol, P&L and stable card testid (happy path)", () => {
    render(<MobileSessionCard session={baseSession} onOpen={vi.fn()} onPlay={vi.fn()} />);

    expect(screen.getByText("Morning NQ scalps")).toBeInTheDocument();
    expect(screen.getByText("NQ")).toBeInTheDocument();
    expect(screen.getByText("+$500.00")).toBeInTheDocument();
    expect(screen.getByTestId("session-card-abc")).toBeInTheDocument();
  });

  it("opens the detail on card click and plays without also opening", () => {
    const onOpen = vi.fn();
    const onPlay = vi.fn();
    render(<MobileSessionCard session={baseSession} onOpen={onOpen} onPlay={onPlay} />);

    fireEvent.click(screen.getByTestId("session-card-abc"));
    expect(onOpen).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId("session-card-play-btn-abc"));
    expect(onPlay).toHaveBeenCalledTimes(1);
    // The play button stops propagation, so the card's open handler must not fire again.
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("renders each tag with its stable testid", () => {
    render(<MobileSessionCard session={baseSession} onOpen={vi.fn()} onPlay={vi.fn()} />);

    expect(screen.getByTestId("session-card-tag-abc-win")).toBeInTheDocument();
    expect(screen.getByTestId("session-card-tag-abc-discipline")).toBeInTheDocument();
  });

  it("shows 'No result' and hides the play button with no trades/result (edge case)", () => {
    const session = { ...baseSession, endingBalance: null, trades: [] };
    render(<MobileSessionCard session={session} onOpen={vi.fn()} onPlay={vi.fn()} />);

    expect(screen.getByText("No result")).toBeInTheDocument();
    expect(screen.queryByTestId("session-card-play-btn-abc")).not.toBeInTheDocument();
  });

  it("renders a loss and falls back gracefully on sparse data (error resilience)", () => {
    const session = {
      id: "z9",
      name: "Bad day",
      symbol: null,
      createdAt: "2026-06-01T00:00:00Z",
      initialBalance: 10000,
      endingBalance: 9500,
      trades: [{ pnl: -500 }],
      tags: [],
    };
    render(<MobileSessionCard session={session} onOpen={vi.fn()} onPlay={vi.fn()} />);

    // P&L renders as "$-500.00" (prefix is empty for a loss).
    expect(screen.getByText("$-500.00")).toBeInTheDocument();
    // Missing symbol falls back to an em dash without throwing.
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});

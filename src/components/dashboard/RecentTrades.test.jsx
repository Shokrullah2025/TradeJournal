import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import RecentTrades from "./RecentTrades";

// RecentTrades renders a short list of trades or an empty state. These tests
// cover the empty state, a populated list, profit/loss formatting, the
// long/short badge, and the divider rule between (but not after) rows.
const makeTrade = (overrides = {}) => ({
  id: "t1",
  instrument: "AAPL",
  tradeType: "long",
  entryDate: "2024-01-02T10:00:00Z",
  quantity: 10,
  entryPrice: 150,
  pnl: 250,
  status: "closed",
  ...overrides,
});

describe("RecentTrades", () => {
  it("shows the empty state when there are no trades (edge case)", () => {
    render(<RecentTrades trades={[]} />);

    expect(screen.getByText("No trades yet")).toBeInTheDocument();
    expect(
      screen.getByText("Your recent trades will appear here")
    ).toBeInTheDocument();
  });

  it("renders trade details for each trade (happy path)", () => {
    const trades = [
      makeTrade({ id: "a", instrument: "AAPL", pnl: 250 }),
      makeTrade({ id: "b", instrument: "TSLA", tradeType: "short", pnl: -120 }),
    ];

    render(<RecentTrades trades={trades} />);

    expect(screen.getByText("AAPL")).toBeInTheDocument();
    expect(screen.getByText("TSLA")).toBeInTheDocument();
    expect(screen.getByText("LONG")).toBeInTheDocument();
    expect(screen.getByText("SHORT")).toBeInTheDocument();
    // "View all" action exists on the populated header
    expect(screen.getByText("View all")).toBeInTheDocument();
  });

  it("formats a winning trade with a leading + sign", () => {
    render(<RecentTrades trades={[makeTrade({ pnl: 1250 })]} />);

    expect(screen.getByText("+$1,250")).toBeInTheDocument();
  });

  it("formats a losing trade without a leading + sign", () => {
    render(<RecentTrades trades={[makeTrade({ pnl: -1250 })]} />);

    // No leading "+" is added; the value's own minus sign renders after the $
    expect(screen.getByText("$-1,250")).toBeInTheDocument();
  });

  it("does not render a divider after a single trade (edge case)", () => {
    const { container } = render(<RecentTrades trades={[makeTrade()]} />);

    expect(container.querySelector("hr")).toBeNull();
  });

  it("renders dividers between multiple trades but not after the last", () => {
    const trades = [
      makeTrade({ id: "a" }),
      makeTrade({ id: "b" }),
      makeTrade({ id: "c" }),
    ];

    const { container } = render(<RecentTrades trades={trades} />);

    // 3 trades -> 2 dividers
    expect(container.querySelectorAll("hr").length).toBe(2);
  });

  it("shows the open status badge for an open trade", () => {
    render(<RecentTrades trades={[makeTrade({ status: "open", pnl: 0 })]} />);

    expect(screen.getByText("open")).toBeInTheDocument();
  });
});

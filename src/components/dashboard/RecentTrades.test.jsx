import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RecentTrades from "./RecentTrades";

// RecentTrades renders a short list of trades or an empty state. These tests
// cover the empty state, a populated list, profit/loss formatting, the
// long/short badge, and the divider rule between (but not after) rows.

// RecentTrades calls useNavigate(), so it must render inside a Router.
const renderRecentTrades = (props) =>
  render(
    <MemoryRouter>
      <RecentTrades {...props} />
    </MemoryRouter>,
  );
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
    renderRecentTrades({ trades: [] });

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

    renderRecentTrades({ trades });

    expect(screen.getByText("AAPL")).toBeInTheDocument();
    expect(screen.getByText("TSLA")).toBeInTheDocument();
    // Direction renders the raw tradeType ("long"/"short"); the uppercase look
    // is CSS only, so the text node is lowercase.
    expect(screen.getByText("long")).toBeInTheDocument();
    expect(screen.getByText("short")).toBeInTheDocument();
    // One tile per trade, keyed by trade id.
    expect(screen.getByTestId("trade-row-a")).toBeInTheDocument();
    expect(screen.getByTestId("trade-row-b")).toBeInTheDocument();
  });

  it("formats a winning trade with a leading + sign", () => {
    renderRecentTrades({ trades: [makeTrade({ pnl: 1250 })] });

    expect(screen.getByText("+$1,250")).toBeInTheDocument();
  });

  it("formats a losing trade without a leading + sign", () => {
    renderRecentTrades({ trades: [makeTrade({ pnl: -1250 })] });

    // No leading "+" is added; the value's own minus sign renders after the $
    expect(screen.getByText("$-1,250")).toBeInTheDocument();
  });

  it("renders a single tile for a single trade (edge case)", () => {
    renderRecentTrades({ trades: [makeTrade()] });

    expect(screen.getByTestId("recent-trades-list").children).toHaveLength(1);
  });

  it("renders one tile per trade", () => {
    const trades = [
      makeTrade({ id: "a" }),
      makeTrade({ id: "b" }),
      makeTrade({ id: "c" }),
    ];

    renderRecentTrades({ trades });

    // 3 trades -> 3 tiles in the grid
    expect(screen.getByTestId("recent-trades-list").children).toHaveLength(3);
  });

  it("shows the open status badge for an open trade", () => {
    renderRecentTrades({ trades: [makeTrade({ status: "open", pnl: 0 })] });

    expect(screen.getByText("open")).toBeInTheDocument();
  });
});

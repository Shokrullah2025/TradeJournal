import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RecentTrades from "./RecentTrades";

// RecentTrades renders a short grid of trade tiles or an empty state. Each tile
// is a clickable element (role="button") that navigates to the Trades page, so
// the component must render inside a Router. These tests cover the empty state,
// a populated grid, profit/loss formatting, the long/short label, the status
// badge, and the "one tile per trade" rule.
const renderWithRouter = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

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
    renderWithRouter(<RecentTrades trades={[]} />);

    expect(screen.getByText("No trades yet")).toBeInTheDocument();
    expect(
      screen.getByText("Your recent trades will appear here")
    ).toBeInTheDocument();
  });

  it("renders trade details for each trade (happy path)", () => {
    const trades = [
      makeTrade({ id: "a", instrument: "AAPL", tradeType: "long", pnl: 250 }),
      makeTrade({ id: "b", instrument: "TSLA", tradeType: "short", pnl: -120 }),
    ];

    renderWithRouter(<RecentTrades trades={trades} />);

    expect(screen.getByText("AAPL")).toBeInTheDocument();
    expect(screen.getByText("TSLA")).toBeInTheDocument();
    // Direction label renders the raw lowercase tradeType (CSS uppercases it).
    expect(screen.getByText("long")).toBeInTheDocument();
    expect(screen.getByText("short")).toBeInTheDocument();
    // One clickable tile per trade.
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  it("formats a winning trade with a leading + sign", () => {
    renderWithRouter(<RecentTrades trades={[makeTrade({ pnl: 1250 })]} />);

    expect(screen.getByText("+$1,250")).toBeInTheDocument();
  });

  it("formats a losing trade without a leading + sign", () => {
    renderWithRouter(<RecentTrades trades={[makeTrade({ pnl: -1250 })]} />);

    // No leading "+" is added; the value's own minus sign renders after the $
    expect(screen.getByText("$-1,250")).toBeInTheDocument();
  });

  it("renders a single tile for one trade (edge case)", () => {
    renderWithRouter(<RecentTrades trades={[makeTrade()]} />);

    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("renders exactly one tile per trade", () => {
    const trades = [
      makeTrade({ id: "a" }),
      makeTrade({ id: "b" }),
      makeTrade({ id: "c" }),
    ];

    renderWithRouter(<RecentTrades trades={trades} />);

    // 3 trades -> 3 tiles
    expect(screen.getAllByRole("button")).toHaveLength(3);
  });

  it("shows the open status badge for an open trade", () => {
    renderWithRouter(<RecentTrades trades={[makeTrade({ status: "open", pnl: 0 })]} />);

    expect(screen.getByText("open")).toBeInTheDocument();
  });
});

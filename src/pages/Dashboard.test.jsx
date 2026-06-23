import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// The Dashboard page pulls everything from TradeContext + AuthContext. We mock
// both hooks so the page's own logic (stats cards, cumulative aggregation,
// recent-trades slicing, range toggle) is what's under test — not Supabase.
const ctx = vi.hoisted(() => ({
  trades: [],
  stats: {},
  user: null,
}));

vi.mock("../context/TradeContext", () => ({
  useTrades: () => ({ trades: ctx.trades, stats: ctx.stats }),
}));
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: ctx.user }),
}));

import Dashboard from "./Dashboard";

// RecentTrades calls useNavigate(), so the page must render inside a Router.
const renderDashboard = () =>
  render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  );

const closed = (date, pnl, overrides = {}) => ({
  id: `${date}-${pnl}`,
  status: "closed",
  instrument: "AAPL",
  tradeType: "long",
  entryDate: date,
  exitDate: date,
  createdAt: date,
  quantity: 10,
  entryPrice: 150,
  pnl,
  ...overrides,
});

const fullStats = {
  totalPnL: 1500,
  winRate: 66,
  maxDrawdown: 500,
  avgWin: 200,
  avgLoss: 100,
  totalTrades: 3,
  profitFactor: 2,
  sharpeRatio: 1.2,
};

const emptyStats = {
  totalPnL: 0,
  winRate: 0,
  maxDrawdown: 0,
  avgWin: 0,
  avgLoss: 0,
  totalTrades: 0,
  profitFactor: 0,
  sharpeRatio: 0,
};

describe("Dashboard page", () => {
  beforeEach(() => {
    ctx.trades = [];
    ctx.stats = emptyStats;
    ctx.user = { firstName: "Sam", email: "sam@example.com" };
    vi.clearAllMocks();
  });

  it("renders the header and the four stat cards (happy path)", () => {
    ctx.stats = fullStats;
    ctx.trades = [
      closed("2024-01-02T15:00:00Z", 600),
      closed("2024-01-03T15:00:00Z", -200),
      closed("2024-01-04T15:00:00Z", 1100),
    ];

    renderDashboard();

    expect(
      screen.getByRole("heading", { level: 1, name: "Dashboard" })
    ).toBeInTheDocument();
    expect(screen.getByText("Total P&L")).toBeInTheDocument();
    expect(screen.getByText("Win Rate")).toBeInTheDocument();
    expect(screen.getByText("Max Drawdown")).toBeInTheDocument();
    expect(screen.getByText("Avg Win/Loss")).toBeInTheDocument();
  });

  it("formats stat values from context (happy path)", () => {
    ctx.stats = fullStats;
    ctx.trades = [closed("2024-01-02T15:00:00Z", 1500)];

    renderDashboard();

    expect(screen.getByText("$1,500")).toBeInTheDocument(); // totalPnL
    expect(screen.getByText("66%")).toBeInTheDocument(); // winRate
    expect(screen.getByText("2.0:1")).toBeInTheDocument(); // avgWin/avgLoss
  });

  it("shows N/A for Avg Win/Loss when there are no wins or losses (edge case)", () => {
    ctx.stats = emptyStats;
    ctx.trades = [];

    renderDashboard();

    expect(screen.getByText("N/A")).toBeInTheDocument();
  });

  it("renders the recent-trades empty state when there are no trades (edge case)", () => {
    ctx.stats = emptyStats;
    ctx.trades = [];

    renderDashboard();

    expect(screen.getByText("No trades yet")).toBeInTheDocument();
  });

  it("renders the cumulative chart empty state with no closed trades (edge case)", () => {
    ctx.stats = emptyStats;
    ctx.trades = [];

    renderDashboard();

    expect(
      screen.getByTestId("cumulative-pnl-chart-empty-state")
    ).toBeInTheDocument();
  });

  it("shows the closed-trade count in the When You Win header", () => {
    ctx.stats = fullStats;
    ctx.trades = [
      closed("2024-01-02T15:00:00Z", 100),
      closed("2024-01-03T15:00:00Z", -50),
      { id: "open1", status: "open", instrument: "TSLA", tradeType: "long",
        entryDate: "2024-01-05T15:00:00Z", createdAt: "2024-01-05T15:00:00Z",
        quantity: 1, entryPrice: 10, pnl: 0 },
    ];

    renderDashboard();

    // 2 of the 3 trades are closed
    expect(screen.getByTestId("when-you-win-trade-count")).toHaveTextContent("2");
  });

  it("renders the cumulative P&L range toggle and responds to clicks", () => {
    ctx.stats = fullStats;
    ctx.trades = [
      closed("2024-01-02T15:00:00Z", 600),
      closed("2024-01-03T15:00:00Z", -200),
    ];

    renderDashboard();

    const toggle = screen.getByTestId("cumulative-pnl-range-toggle");
    expect(within(toggle).getByTestId("cumulative-pnl-range-30D-btn")).toBeInTheDocument();
    expect(within(toggle).getByTestId("cumulative-pnl-range-60D-btn")).toBeInTheDocument();
    expect(within(toggle).getByTestId("cumulative-pnl-range-1Y-btn")).toBeInTheDocument();

    // Clicking a different range must not throw and keeps the dashboard mounted.
    fireEvent.click(screen.getByTestId("cumulative-pnl-range-30D-btn"));
    expect(
      screen.getByRole("heading", { level: 1, name: "Dashboard" })
    ).toBeInTheDocument();
  });

  it("renders the AI insights section alongside Trade Outcomes", () => {
    ctx.stats = fullStats;
    ctx.trades = [closed("2024-01-02T15:00:00Z", 100)];

    renderDashboard();

    // The static insights card was replaced by the AIInsights component, which
    // renders its own header and a generate CTA when there are trades to analyze.
    expect(screen.getByText("AI Insights")).toBeInTheDocument();
    expect(screen.getByTestId("ai-insights-card")).toBeInTheDocument();
    expect(screen.getByTestId("ai-insights-generate-btn")).toBeInTheDocument();
    expect(screen.getByText("Trade Outcomes")).toBeInTheDocument();
  });

  it("limits recent trades to the five most recent (edge case)", () => {
    ctx.stats = fullStats;
    ctx.trades = Array.from({ length: 8 }, (_, i) =>
      closed(`2024-01-0${i + 1}T15:00:00Z`, (i + 1) * 10, {
        id: `tr-${i}`,
        instrument: `SYM${i}`,
      })
    );

    renderDashboard();

    // Newest 5 (SYM7..SYM3) show; the oldest (SYM0) must not.
    expect(screen.getByText("SYM7")).toBeInTheDocument();
    expect(screen.queryByText("SYM0")).not.toBeInTheDocument();
  });
});

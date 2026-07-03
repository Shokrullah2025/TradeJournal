import { describe, it, expect } from "vitest";
import { render as rtlRender, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider } from "../../contexts/ThemeContext";
import PnLChart from "./PnLChart_simple";

// The chart reads its colors from ThemeContext (light/dark), so tests render
// inside the real provider (matchMedia is mocked in tests/setup.js).
const render = (ui) => rtlRender(<ThemeProvider>{ui}</ThemeProvider>);

// PnLChart aggregates closed trades into per-day bars. Tests cover the empty
// state, aggregation/rendering of bars, filtering of invalid/zero-pnl data,
// and the hover tooltip interaction.
const closed = (date, pnl, extra = {}) => ({
  id: `${date}-${pnl}`,
  status: "closed",
  exit_date: date,
  pnl,
  instrument: "ES",
  ...extra,
});

describe("PnLChart", () => {
  it("shows the empty state with no trades (edge case)", () => {
    render(<PnLChart trades={[]} />);
    expect(screen.getByTestId("pnl-chart-empty-state")).toBeInTheDocument();
  });

  it("shows the empty state when trades prop is omitted (error/edge resilience)", () => {
    render(<PnLChart />);
    expect(screen.getByTestId("pnl-chart-empty-state")).toBeInTheDocument();
  });

  it("ignores open trades and shows the empty state if none are closed (edge case)", () => {
    render(
      <PnLChart trades={[{ id: "o", status: "open", exit_date: "2024-01-02", pnl: 100 }]} />
    );
    expect(screen.getByTestId("pnl-chart-empty-state")).toBeInTheDocument();
  });

  it("treats days that net to zero P&L as no data (edge case)", () => {
    // Two trades on the same day cancel out -> filtered by `pnl !== 0`
    render(
      <PnLChart
        trades={[
          closed("2024-01-02T15:00:00Z", 100),
          closed("2024-01-02T16:00:00Z", -100),
        ]}
      />
    );
    expect(screen.getByTestId("pnl-chart-empty-state")).toBeInTheDocument();
  });

  it("renders a bar per trading day (happy path)", () => {
    render(
      <PnLChart
        trades={[
          closed("2024-01-02T15:00:00Z", 300),
          closed("2024-01-03T15:00:00Z", -150),
          closed("2024-01-04T15:00:00Z", 80),
        ]}
      />
    );

    expect(screen.getByTestId("pnl-chart")).toBeInTheDocument();
    expect(screen.getByTestId("pnl-chart-bar-0")).toBeInTheDocument();
    expect(screen.getByTestId("pnl-chart-bar-1")).toBeInTheDocument();
    expect(screen.getByTestId("pnl-chart-bar-2")).toBeInTheDocument();
  });

  it("skips trades with unparseable dates (error/edge resilience)", () => {
    render(
      <PnLChart
        trades={[
          closed("not-a-date", 300),
          closed("2024-01-03T15:00:00Z", -150),
        ]}
      />
    );
    // Only the one valid day renders a bar
    expect(screen.getByTestId("pnl-chart-bar-0")).toBeInTheDocument();
    expect(screen.queryByTestId("pnl-chart-bar-1")).not.toBeInTheDocument();
  });

  it("shows a tooltip on hover over a bar's hit target", () => {
    const { container } = render(
      <PnLChart trades={[closed("2024-01-02T15:00:00Z", 500)]} />
    );

    const hitTarget = container.querySelector("rect.cursor-pointer");
    expect(hitTarget).toBeTruthy();
    fireEvent.mouseEnter(hitTarget, { clientX: 10, clientY: 10 });

    expect(screen.getByTestId("pnl-chart-tooltip")).toBeInTheDocument();
    expect(screen.getByTestId("pnl-chart-tooltip-value")).toHaveTextContent("+$500");
  });
});
